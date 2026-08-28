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

const slugs = "'farmall-80n','farmall-90n','farmall-100n','farmall-110n','farmall-120n'";

export async function GET() {
  try {
    const [migrations, machines, versions, specs, hpRows, ptoRows, sources] = await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260828_254_case_ih_farmall_n_current_specs'`),
      count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug IN (${slugs})`),
      count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE sd.spec_key='engine.rated_power' AND ((m.slug='farmall-80n' AND ms.value_number=74) OR (m.slug='farmall-90n' AND ms.value_number=85) OR (m.slug='farmall-100n' AND ms.value_number=99) OR (m.slug='farmall-110n' AND ms.value_number=106) OR (m.slug='farmall-120n' AND ms.value_number=119))`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE sd.spec_key='pto.rated_power' AND ((m.slug='farmall-80n' AND ms.value_number=65) OR (m.slug='farmall-90n' AND ms.value_number=75) OR (m.slug='farmall-100n' AND ms.value_number=87) OR (m.slug='farmall-110n' AND ms.value_number=96) OR (m.slug='farmall-120n' AND ms.value_number=102))`),
      count(`SELECT COUNT(*) count FROM source_records WHERE external_id IN ('case-ih-farmall-80n-current-us','case-ih-farmall-90n-current-us','case-ih-farmall-100n-current-us','case-ih-farmall-110n-current-us','case-ih-farmall-120n-current-us')`),
    ]);
    const checks = { migrations: migrations === 1, machines: machines === 5, versions: versions === 5, specs: specs === 38, hpRows: hpRows === 5, ptoRows: ptoRows === 5, sources: sources === 5 };
    const ok = Object.values(checks).every(Boolean);
    return NextResponse.json({ ok, checks, values: { migrations, machines, versions, specs, hpRows, ptoRows, sources } }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Robots-Tag': 'noindex, nofollow' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: 'Farmall N health check failed' }, { status: 500 });
  }
}
