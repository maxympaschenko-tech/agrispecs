import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type R = RowDataPacket & { count: number };
const slugs = "'5075en','5090en','5105en'";
async function count(sql: string) {
  const db = await getDbReady();
  const [rows] = await db.query<R[]>(sql);
  return Number(rows[0]?.count || 0);
}

export async function GET() {
  try {
    const [migration,machines,versions,ratedHp,pto5075,max5075,sources] = await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260828_270_john_deere_5en_current_specs'`),
      count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug IN (${slugs})`),
      count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND sd.spec_key='engine.rated_power' AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug='5075en' AND sd.spec_key='pto.rated_power' AND ms.value_number=58 AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug='5075en' AND sd.spec_key='engine.maximum_power' AND ms.value_number=75 AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM source_records WHERE external_id IN ('john-deere-5075en-current-us-2026-08','john-deere-5090en-current-us-2026-08','john-deere-5105en-current-us-2026-08')`),
    ]);
    const checks = {
      migration: migration === 1,
      machines: machines === 3,
      currentVersions: versions === 3,
      ratedHorsepowerRows: ratedHp === 3,
      verified5075Pto: pto5075 === 1,
      verified5075MaxPower: max5075 === 1,
      sourceRecords: sources === 3,
    };
    const ok = Object.values(checks).every(Boolean);
    return NextResponse.json({ ok, checks, values: { migration,machines,versions,ratedHp,pto5075,max5075,sources } }, { status: ok ? 200 : 503, headers: { 'Cache-Control':'no-store', 'X-Robots-Tag':'noindex, nofollow' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok:false, error:'John Deere 5EN health check failed' }, { status:500 });
  }
}
