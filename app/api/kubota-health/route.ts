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
    const [migrationApplied,publishableM7060,currentVersions,specs] = await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260827_133_kubota_m7060_current_specs'`),
      count(`
        SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug='m7060' AND m.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_versions mv
        JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug='m7060'
          AND mv.slug IN ('us-current-8f8r','us-current-12f12r') AND mv.is_current=1
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        WHERE mf.slug='kubota' AND m.slug='m7060'
          AND mv.slug IN ('us-current-8f8r','us-current-12f12r')
      `),
    ]);

    return NextResponse.json({
      ok: true,
      expectedLatestKubotaMigration: '20260827_133_kubota_m7060_current_specs',
      migrationApplied: migrationApplied === 1,
      publishableM7060,
      expectedPublishableM7060: 1,
      currentConfigurationVersions: currentVersions,
      expectedCurrentConfigurationVersions: 2,
      specificationRecords: specs,
      expectedSpecificationRecords: 32,
    }, {
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  } catch (error) {
    console.error('Kubota health check failed:', error);
    return NextResponse.json({ ok:false, error:'Kubota health check failed' }, {
      status:500,
      headers:{ 'Cache-Control':'no-store, max-age=0', 'X-Robots-Tag':'noindex, nofollow' },
    });
  }
}
