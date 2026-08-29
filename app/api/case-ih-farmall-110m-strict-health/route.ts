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
    const [migration, rated, pto, station, drive, unsupported] = await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260829_290_case_ih_farmall_110m_strict_current_correction'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug='farmall-110m' AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.rated_power' AND ms.value_number=110 AND ms.unit='hp'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug='farmall-110m' AND mv.slug='united-states-current-2026-08' AND sd.spec_key='pto.rated_power' AND ms.value_number=93 AND ms.unit='hp'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug='farmall-110m' AND mv.slug='united-states-current-2026-08' AND sd.spec_key='configuration.station' AND ms.value_text='Cab'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug='farmall-110m' AND mv.slug='united-states-current-2026-08' AND sd.spec_key='configuration.drive' AND ms.value_text='4WD'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug='farmall-110m' AND mv.slug='united-states-current-2026-08' AND sd.spec_key IN ('transmission.options','emissions.compliance')`),
    ]);

    const checks = {
      migration: migration === 1,
      ratedPower: rated === 1,
      ptoPower: pto === 1,
      cab: station === 1,
      fourWheelDrive: drive === 1,
      unsupportedFieldsRemoved: unsupported === 0,
    };
    const ok = Object.values(checks).every(Boolean);

    return NextResponse.json(
      { ok, checks, values: { migration, rated, pto, station, drive, unsupported } },
      { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: 'Case IH Farmall 110M strict-current health check failed' }, { status: 500 });
  }
}
