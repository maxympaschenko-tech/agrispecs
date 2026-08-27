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
    const hasPartComponents = await tableExists('part_components');

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

    const [
      johnDeereMachines,
      publishableJohnDeere,
      verifiedParts,
      fitments,
      crossReferences,
      alternativeRelations,
      serialConstrainedFitments,
      compactSerialFitments,
      filterPak3ESerialFitments,
      filterPakReplacementRelations,
      johnDeere5075MWearElectricalFitments,
    ] = await Promise.all([
      count(`SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere'`),
      count(`SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM parts WHERE data_status='verified'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts`),
      count(`SELECT COUNT(*) AS count FROM part_cross_references`),
      count(`SELECT COUNT(*) AS count FROM part_cross_references WHERE relation_type='alternative'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts WHERE serial_prefix IS NOT NULL OR serial_from IS NOT NULL OR serial_to IS NOT NULL`),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere'
          AND m.slug IN ('1023e','1025r','2025r','3032e')
          AND (mp.serial_prefix IS NOT NULL OR mp.serial_from IS NOT NULL OR mp.serial_to IS NOT NULL)
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN parts p ON p.id=mp.part_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug IN ('3032e','3038e')
          AND p.normalized_part_number IN ('LVA21128','LVA21037','TA26997')
          AND (mp.serial_prefix IS NOT NULL OR mp.serial_from IS NOT NULL OR mp.serial_to IS NOT NULL)
      `),
      count(`
        SELECT COUNT(*) AS count FROM part_cross_references x
        JOIN parts p ON p.id=x.part_id
        JOIN parts cp ON cp.id=x.cross_part_id
        WHERE x.relation_type='replaces'
          AND ((p.normalized_part_number='LVA23615' AND cp.normalized_part_number='TA25767')
            OR (p.normalized_part_number='LVA21038' AND cp.normalized_part_number='TA25768')
            OR (p.normalized_part_number='LVA21039' AND cp.normalized_part_number='TA25765')
            OR (p.normalized_part_number='TA15270' AND cp.normalized_part_number='TA25769'))
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN parts p ON p.id=mp.part_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug='5075m'
          AND p.normalized_part_number IN (
            'SJ20988','SJ27050','RE554568','DZ123153','AXE66451',
            'RE217616','RE217817','RE217819','RE271437','RE271440','RE271441'
          )
      `),
    ]);

    const [maintenanceTasks, capacityRecords, machineImages, partComponentRecords, maintenance1Series, maintenance3D, maintenance3E, maintenance3R, maintenance4Series, maintenance5M, maintenance6R, fitment6M] = await Promise.all([
      hasMaintenance ? count(`SELECT COUNT(*) AS count FROM maintenance_tasks`) : Promise.resolve(0),
      hasCapacities ? count(`SELECT COUNT(*) AS count FROM machine_capacities`) : Promise.resolve(0),
      hasImages ? count(`SELECT COUNT(*) AS count FROM machine_images`) : Promise.resolve(0),
      hasPartComponents ? count(`SELECT COUNT(*) AS count FROM part_components`) : Promise.resolve(0),
      hasMaintenance ? count(`
        SELECT COUNT(*) AS count FROM maintenance_tasks mt
        JOIN machines m ON m.id=mt.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug IN ('1023e','1025r')
      `) : Promise.resolve(0),
      hasMaintenance ? count(`
        SELECT COUNT(*) AS count FROM maintenance_tasks mt
        JOIN machines m ON m.id=mt.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug IN ('3025d','3035d','3043d')
      `) : Promise.resolve(0),
      hasMaintenance ? count(`
        SELECT COUNT(*) AS count FROM maintenance_tasks mt
        JOIN machines m ON m.id=mt.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug IN ('3025e','3032e','3038e')
      `) : Promise.resolve(0),
      hasMaintenance ? count(`
        SELECT COUNT(*) AS count FROM maintenance_tasks mt
        JOIN machines m ON m.id=mt.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug IN ('3033r','3039r','3046r')
      `) : Promise.resolve(0),
      hasMaintenance ? count(`
        SELECT COUNT(*) AS count FROM maintenance_tasks mt
        JOIN machines m ON m.id=mt.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug IN ('4044m','4052m','4066m','4044r','4052r','4066r','4075r')
      `) : Promise.resolve(0),
      hasMaintenance ? count(`
        SELECT COUNT(*) AS count FROM maintenance_tasks mt
        JOIN machines m ON m.id=mt.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug IN ('5075m','5095m','5105m')
      `) : Promise.resolve(0),
      hasMaintenance ? count(`
        SELECT COUNT(*) AS count FROM maintenance_tasks mt
        JOIN machines m ON m.id=mt.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug IN ('6r-110','6r-120','6r-130','6r-140','6r-150','6r-175','6r-195')
      `) : Promise.resolve(0),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug IN ('6m-95','6m-105','6m-115','6m-125','6m-130','6m-140','6m-150')
      `),
    ]);

    return NextResponse.json({
      ok: true,
      migrations: migrationStatus,
      expectedLatestMigration: '20260827_120_5075m_wear_electrical_parts',
      johnDeere: {
        machines: johnDeereMachines,
        publishable: publishableJohnDeere,
      },
      parts: {
        verified: verifiedParts,
        fitments,
        crossReferences,
        alternatives: alternativeRelations,
        serialConstrainedFitments,
        compactSerialFitments,
        johnDeere3EFilterPakSerialFitments: filterPak3ESerialFitments,
        filterPakReplacementRelations,
        partComponents: partComponentRecords,
        expectedPartComponentsAfter118: 73,
        johnDeere6MVerifiedFitments: fitment6M,
        johnDeere5075MWearElectricalFitments,
        expectedJohnDeere5075MWearElectricalFitmentsAfter120: 11,
      },
      maintenance: {
        total: maintenanceTasks,
        johnDeere1Series: maintenance1Series,
        johnDeere3D: maintenance3D,
        johnDeere3E: maintenance3E,
        johnDeere3R: maintenance3R,
        johnDeere4Series: maintenance4Series,
        johnDeere5MVerified: maintenance5M,
        johnDeere6RMY22: maintenance6R,
      },
      capacityRecords,
      machineImages,
      tables: {
        schemaMigrations: hasMigrations,
        maintenanceTasks: hasMaintenance,
        machineCapacities: hasCapacities,
        machineImages: hasImages,
        partComponents: hasPartComponents,
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
