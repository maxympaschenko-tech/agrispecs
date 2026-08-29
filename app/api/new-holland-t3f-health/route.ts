import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CountRow = RowDataPacket & { count: number };

async function count(sql: string) {
  const db = await getDbReady();
  const [rows] = await db.query<CountRow[]>(sql);
  return Number(rows[0]?.count || 0);
}

export async function GET() {
  try {
    const [migration, machines, grossPower, ptoPower, transmissions, drive, width] = await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260829_294_new_holland_t3f_current_specs'`),
      count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug IN ('t3-60f','t3-70f','t3-80f')`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('t3-60f','t3-70f','t3-80f') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.gross_power' AND ms.value_number IN (54,64,74) AND ms.unit='hp'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('t3-60f','t3-70f','t3-80f') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='pto.rated_power' AND ms.value_number IN (40,50,60) AND ms.unit='hp'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('t3-60f','t3-70f','t3-80f') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='transmission.options' AND ms.value_text='12x12 mechanical shuttle'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('t3-60f','t3-70f','t3-80f') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='configuration.drive' AND ms.value_text='4WD'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('t3-60f','t3-70f','t3-80f') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='dimensions.minimum_overall_width' AND ms.value_number=57 AND ms.unit='in'`),
    ]);

    const checks = {
      migration: migration === 1,
      machines: machines === 3,
      grossPower: grossPower === 3,
      ptoPower: ptoPower === 3,
      transmissions: transmissions === 3,
      drive: drive === 3,
      minimumWidth: width === 3,
    };
    const ok = Object.values(checks).every(Boolean);

    return NextResponse.json(
      { ok, checks, values: { migration, machines, grossPower, ptoPower, transmissions, drive, width } },
      { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: 'New Holland T3F health check failed' }, { status: 500 });
  }
}
