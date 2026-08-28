import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type R = RowDataPacket & { count: number };
const slugs = "'6r-215','6r-230','6r-250'";
async function count(sql: string) {
  const db = await getDbReady();
  const [rows] = await db.query<R[]>(sql);
  return Number(rows[0]?.count || 0);
}

export async function GET() {
  try {
    const [migration,machines,versions,rated,max,ipmRated,ipmMax,engines,series] = await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260828_266_john_deere_6r_215_250_current_specs'`),
      count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug IN (${slugs})`),
      count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND sd.spec_key='engine.rated_power' AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND sd.spec_key='engine.maximum_power' AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND sd.spec_key='engine.rated_power_ipm' AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND sd.spec_key='engine.maximum_power_ipm' AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND sd.spec_key='engine.displacement' AND ms.value_number=6.8`),
      count(`SELECT COUNT(*) count FROM machines m JOIN machine_series s ON s.id=m.series_id WHERE m.slug IN (${slugs}) AND s.slug='6r-series'`),
    ]);
    const checks = {
      migration: migration === 1,
      machines: machines === 3,
      currentVersions: versions === 3,
      ratedPowerRows: rated === 3,
      maximumPowerRows: max === 3,
      ratedIpmRows: ipmRated === 3,
      maxIpmRows: ipmMax === 3,
      displacementRows: engines === 3,
      correctSeries: series === 3,
    };
    const ok = Object.values(checks).every(Boolean);
    return NextResponse.json({ ok, checks, values: { migration,machines,versions,rated,max,ipmRated,ipmMax,engines,series } }, { status: ok ? 200 : 503, headers: { 'Cache-Control':'no-store', 'X-Robots-Tag':'noindex, nofollow' } });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok:false, error:'John Deere 6R 215-250 health check failed' }, { status:500 });
  }
}
