import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type R = RowDataPacket & { count: number };

async function count(sql: string, params: unknown[] = []) {
  const db = await getDbReady();
  const [rows] = await db.query<R[]>(sql, params);
  return Number(rows[0]?.count || 0);
}

export async function GET() {
  try {
    const [migration, rated, maximum, pump, transmission, pto] = await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260829_289_john_deere_6m_120_oos_current_corrections'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug='6m-120-oos' AND mv.slug='united-states-current-2026-08' AND d.spec_key='engine.rated_power' AND ms.value_number=118 AND ms.unit='hp'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug='6m-120-oos' AND mv.slug='united-states-current-2026-08' AND d.spec_key='engine.maximum_power' AND ms.value_number=130 AND ms.unit='hp'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug='6m-120-oos' AND mv.slug='united-states-current-2026-08' AND d.spec_key='hydraulics.pump_rated_output' AND ms.value_number=97 AND ms.unit='L/min'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug='6m-120-oos' AND mv.slug='united-states-current-2026-08' AND d.spec_key='transmission.options' AND ms.value_text LIKE '%PowrReverser 16F/16R%' AND ms.value_text LIKE '%Powr8 32F/16R%'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug='6m-120-oos' AND mv.slug='united-states-current-2026-08' AND d.spec_key='pto.rated_power'`),
    ]);

    const checks = {
      migration: migration === 1,
      ratedPower: rated === 1,
      maximumPower: maximum === 1,
      pumpOutput: pump === 1,
      transmissionOptions: transmission === 1,
      currentPtoNotPublished: pto === 0,
    };
    const ok = Object.values(checks).every(Boolean);

    return NextResponse.json(
      { ok, checks, values: { migration, rated, maximum, pump, transmission, pto } },
      { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: 'John Deere 6M 120 OOS health check failed' }, { status: 500 });
  }
}
