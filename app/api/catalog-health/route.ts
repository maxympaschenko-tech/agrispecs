import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CountRow = RowDataPacket & { count: number };
type MigrationRow = RowDataPacket & { applied: number; latest: string | null };

async function tableExists(tableName: string) {
  const [rows] = await getDb().query<CountRow[]>(`
    SELECT COUNT(*) AS count
    FROM information_schema.tables
    WHERE table_schema = DATABASE() AND table_name = ?
  `, [tableName]);
  return Number(rows[0]?.count || 0) > 0;
}

async function count(sql: string, params: unknown[] = []) {
  const [rows] = await getDb().query<CountRow[]>(sql, params);
  return Number(rows[0]?.count || 0);
}

export async function GET() {
  try {
    const db = getDb();
    const hasMigrations = await tableExists('schema_migrations');
    const hasMaintenance = await tableExists('maintenance_tasks');
    const hasCapacities = await tableExists('machine_capacities');
    const hasImages = await tableExists('machine_images');

    let migrationStatus = { applied: 0, latest: null as string | null };
    if (hasMigrations) {
      const [rows] = await db.query<MigrationRow[]>(`
        SELECT COUNT(*) AS applied, MAX(id) AS latest FROM schema_migrations
      `);
      migrationStatus = {
        applied: Number(rows[0]?.applied || 0),
        latest: rows[0]?.latest || null,
      };
    }

    const [johnDeereMachines, publishableJohnDeere, verifiedParts, fitments] = await Promise.all([
      count(`SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere'`),
      count(`SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM parts WHERE data_status='verified'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts`),
    ]);

    const [maintenanceTasks, capacityRecords, machineImages, maintenance3D, maintenance3E, maintenance3R, maintenance4Series] = await Promise.all([
      hasMaintenance ? count(`SELECT COUNT(*) AS count FROM maintenance_tasks`) : Promise.resolve(0),
      hasCapacities ? count(`SELECT COUNT(*) AS count FROM machine_capacities`) : Promise.resolve(0),
      hasImages ? count(`SELECT COUNT(*) AS count FROM machine_images`) : Promise.resolve(0),
      hasMaintenance ? count(`
        SELECT COUNT(*) AS count
        FROM maintenance_tasks mt
        JOIN machines m ON m.id=mt.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug IN ('3025d','3035d','3043d')
      `) : Promise.resolve(0),
      hasMaintenance ? count(`
        SELECT COUNT(*) AS count
        FROM maintenance_tasks mt
        JOIN machines m ON m.id=mt.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug IN ('3025e','3032e','3038e')
      `) : Promise.resolve(0),
      hasMaintenance ? count(`
        SELECT COUNT(*) AS count
        FROM maintenance_tasks mt
        JOIN machines m ON m.id=mt.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug IN ('3033r','3039r','3046r')
      `) : Promise.resolve(0),
      hasMaintenance ? count(`
        SELECT COUNT(*) AS count
        FROM maintenance_tasks mt
        JOIN machines m ON m.id=mt.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug IN ('4044m','4052m','4066m','4044r','4052r','4066r','4075r')
      `) : Promise.resolve(0),
    ]);

    return NextResponse.json({
      ok: true,
      migrations: migrationStatus,
      expectedLatestMigration: '20260827_100_4044m_fuel_water_correction',
      johnDeere: {
        machines: johnDeereMachines,
        publishable: publishableJohnDeere,
      },
      parts: {
        verified: verifiedParts,
        fitments,
      },
      maintenance: {
        total: maintenanceTasks,
        johnDeere3D: maintenance3D,
        johnDeere3E: maintenance3E,
        johnDeere3R: maintenance3R,
        johnDeere4Series: maintenance4Series,
      },
      capacityRecords,
      machineImages,
      tables: {
        schemaMigrations: hasMigrations,
        maintenanceTasks: hasMaintenance,
        machineCapacities: hasCapacities,
        machineImages: hasImages,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (error) {
    console.error('Catalog health check failed:', error);
    return NextResponse.json({ ok: false, error: 'Catalog health check failed' }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }
}
