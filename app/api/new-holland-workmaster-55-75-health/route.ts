import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CountRow = RowDataPacket & { count: number };

async function count(sql: string, params: unknown[] = []) {
  const db = await getDbReady();
  const [rows] = await db.query<CountRow[]>(sql, params);
  return Number(rows[0]?.count || 0);
}

export async function GET() {
  try {
    const [migration, loaderMigration, machines, grossPower, ptoPower, cylinders, transmissions, ptoSpeed, loaderFitments] = await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260829_291_new_holland_workmaster_55_75_current_specs'`),
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260829_292_new_holland_workmaster_55_75_loaders'`),
      count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug IN ('workmaster-55','workmaster-65','workmaster-75')`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('workmaster-55','workmaster-65','workmaster-75') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.gross_power' AND ms.unit='hp' AND ms.value_number IN (54,64,74)`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('workmaster-55','workmaster-65','workmaster-75') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='pto.rated_power' AND ms.unit='hp' AND ms.value_number IN (40,50,60)`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('workmaster-55','workmaster-65','workmaster-75') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.cylinders' AND ms.value_number=3`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('workmaster-55','workmaster-65','workmaster-75') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='transmission.options' AND ms.value_text='12x12 power shuttle'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('workmaster-55','workmaster-65','workmaster-75') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='pto.speed' AND ms.value_number=540 AND ms.unit='rpm'`),
      count(`SELECT COUNT(*) count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN attachments a ON a.id=ma.attachment_id JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='new-holland' AND m.slug IN ('workmaster-55','workmaster-65','workmaster-75') AND a.slug IN ('550lu-workmaster-55-75','555lu-workmaster-55-75') AND ma.confidence='official'`),
    ]);

    const checks = {
      migration: migration === 1,
      loaderMigration: loaderMigration === 1,
      machines: machines === 3,
      grossPower: grossPower === 3,
      ptoPower: ptoPower === 3,
      cylinders: cylinders === 3,
      transmissions: transmissions === 3,
      ptoSpeed: ptoSpeed === 3,
      loaderFitments: loaderFitments === 6,
    };
    const ok = Object.values(checks).every(Boolean);

    return NextResponse.json(
      { ok, checks, values: { migration, loaderMigration, machines, grossPower, ptoPower, cylinders, transmissions, ptoSpeed, loaderFitments } },
      { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: 'New Holland WORKMASTER 55-75 health check failed' }, { status: 500 });
  }
}
