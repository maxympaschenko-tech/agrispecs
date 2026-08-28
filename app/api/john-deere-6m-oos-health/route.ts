import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type R = RowDataPacket & { count: number };
const slugs = "'6m-110-oos','6m-120-oos','6m-130-oos','6m-145-oos','6m-155-oos'";
async function count(sql: string) {
  const db = await getDbReady();
  const [rows] = await db.query<R[]>(sql);
  return Number(rows[0]?.count || 0);
}

export async function GET() {
  try {
    const [migration,machines,versions,stations,ratedHp,sources,cabSlugCollisions] = await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260828_265_john_deere_6m_oos_current_specs'`),
      count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug IN (${slugs})`),
      count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND sd.spec_key='configuration.station' AND ms.value_text='Open Operator Station'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND sd.spec_key='engine.rated_power'`),
      count(`SELECT COUNT(*) count FROM source_records WHERE external_id IN ('john-deere-6m-110-oos-current-us-2026-08','john-deere-6m-120-oos-current-us-2026-08','john-deere-6m-130-oos-current-us-2026-08','john-deere-6m-145-oos-current-us-2026-08','john-deere-6m-155-oos-current-us-2026-08')`),
      count(`SELECT COUNT(*) count FROM machines WHERE slug IN ('6m-110','6m-120','6m-130','6m-145','6m-155') AND model_name LIKE '%Open Operator Station%'`),
    ]);
    const checks = {
      migration: migration === 1,
      machines: machines === 5,
      currentVersions: versions === 5,
      stationRows: stations === 5,
      ratedHorsepowerRows: ratedHp === 5,
      sourceRecords: sources === 5,
      noCabSlugCollisions: cabSlugCollisions === 0,
    };
    const ok = Object.values(checks).every(Boolean);
    return NextResponse.json({ ok, checks, values: { migration,machines,versions,stations,ratedHp,sources,cabSlugCollisions } }, { status: ok ? 200 : 503, headers: { 'Cache-Control':'no-store', 'X-Robots-Tag':'noindex, nofollow' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok:false, error:'John Deere 6M OOS health check failed' }, { status:500 });
  }
}
