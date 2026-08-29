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
    const [migration, machines, grossPower, ptoPower, stageV, transmission, runningGear] = await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260829_295_new_holland_tk4_current_specs'`),
      count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug IN ('tk4-80v','tk4-80f','tk4-100','tk4-100m')`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('tk4-80v','tk4-80f','tk4-100','tk4-100m') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.gross_power' AND ms.value_number IN (74,98) AND ms.unit='hp'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('tk4-80v','tk4-80f','tk4-100','tk4-100m') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='pto.rated_power' AND ms.value_number IN (65,86) AND ms.unit='hp'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('tk4-80v','tk4-80f','tk4-100','tk4-100m') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.emissions' AND ms.value_text='Stage V'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('tk4-80v','tk4-80f','tk4-100','tk4-100m') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='transmission.options' AND ms.value_text='Standard 8x8; optional 16x8 with creeper'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('tk4-80v','tk4-80f','tk4-100','tk4-100m') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='configuration.running_gear'`),
    ]);
    const checks = { migration: migration === 1, machines: machines === 4, grossPower: grossPower === 4, ptoPower: ptoPower === 4, stageV: stageV === 4, transmission: transmission === 4, runningGear: runningGear === 4 };
    const ok = Object.values(checks).every(Boolean);
    return NextResponse.json({ ok, checks, values: { migration, machines, grossPower, ptoPower, stageV, transmission, runningGear } }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: 'New Holland TK4 health check failed' }, { status: 500 });
  }
}
