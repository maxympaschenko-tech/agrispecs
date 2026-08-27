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
    const [
      migrationApplied,
      machineRows,
      currentVersions,
      specificationRows,
      currentGrossPowerRows,
      loaderRows,
      loaderFitments,
      serviceParts,
      versionedServiceFitments,
      hstFilterFitments,
      filterSupersessions,
    ] = await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260827_153_kubota_l2502_filter_supersessions'`),
      count(`
        SELECT COUNT(*) AS count FROM machines m
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug='l2502' AND m.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_versions mv
        JOIN machines m ON m.id=mv.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug='l2502'
          AND mv.slug IN ('us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd')
          AND mv.is_current=1
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        WHERE mf.slug='kubota' AND m.slug='l2502'
          AND mv.slug IN ('us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        WHERE mf.slug='kubota' AND m.slug='l2502'
          AND mv.slug IN ('us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd')
          AND sd.spec_key='engine.gross_power' AND ms.value_number=23.3
      `),
      count(`
        SELECT COUNT(*) AS count FROM attachments a
        JOIN manufacturers mf ON mf.id=a.manufacturer_id
        WHERE mf.slug='kubota' AND a.slug='la526' AND a.attachment_type='front-loader' AND a.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND m.slug='l2502' AND a.slug='la526' AND ma.confidence='official'
      `),
      count(`
        SELECT COUNT(*) AS count FROM parts p
        JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='kubota'
          AND p.normalized_part_number IN ('HH16432430','6A32059930','HH3A082623','TC82093230','HHK7014073')
          AND p.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug='l2502'
          AND mv.slug IN ('us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd')
          AND p.normalized_part_number IN ('HH16432430','6A32059930','HH3A082623','TC82093230','HHK7014073')
          AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug='l2502'
          AND mv.slug='us-current-hst-4wd'
          AND p.normalized_part_number='HHK7014073'
          AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM part_cross_references pcr
        JOIN parts oldp ON oldp.id=pcr.part_id
        JOIN parts newp ON newp.id=pcr.cross_part_id
        JOIN manufacturers mf ON mf.id=oldp.manufacturer_id
        WHERE mf.slug='kubota' AND pcr.relation_type='replaces' AND (
          (oldp.normalized_part_number='1641432434' AND newp.normalized_part_number='HH16432430') OR
          (oldp.normalized_part_number='TC42282620' AND newp.normalized_part_number='HH3A082623') OR
          (oldp.normalized_part_number='HHK7014070' AND newp.normalized_part_number='HHK7014073') OR
          (oldp.normalized_part_number='K756114070' AND newp.normalized_part_number='HHK7014073') OR
          (oldp.normalized_part_number='K756114073' AND newp.normalized_part_number='HHK7014073')
        )
      `),
    ]);

    const checks = {
      migrationApplied: migrationApplied === 1,
      machineRows: machineRows === 1,
      currentVersions: currentVersions === 3,
      specificationRows: specificationRows === 54,
      currentGrossPowerRows: currentGrossPowerRows === 3,
      loaderRows: loaderRows === 1,
      loaderFitments: loaderFitments === 1,
      serviceParts: serviceParts === 5,
      versionedServiceFitments: versionedServiceFitments === 13,
      hstFilterFitments: hstFilterFitments === 1,
      filterSupersessions: filterSupersessions === 5,
    };
    const ok = Object.values(checks).every(Boolean);

    return NextResponse.json({
      ok,
      expectedLatestL2502Migration: '20260827_153_kubota_l2502_filter_supersessions',
      checks,
      values: {
        machineRows,
        currentVersions,
        specificationRows,
        currentGrossPowerRows,
        loaderRows,
        loaderFitments,
        serviceParts,
        versionedServiceFitments,
        hstFilterFitments,
        filterSupersessions,
      },
      expected: {
        machineRows: 1,
        currentVersions: 3,
        specificationRows: 54,
        currentGrossPowerRows: 3,
        loaderRows: 1,
        loaderFitments: 1,
        serviceParts: 5,
        versionedServiceFitments: 13,
        hstFilterFitments: 1,
        filterSupersessions: 5,
      },
    }, {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control':'no-store, max-age=0', 'X-Robots-Tag':'noindex, nofollow' },
    });
  } catch (error) {
    console.error('Kubota L2502 health check failed:', error);
    return NextResponse.json({ ok:false, error:'Kubota L2502 health check failed' }, {
      status:500,
      headers:{ 'Cache-Control':'no-store, max-age=0', 'X-Robots-Tag':'noindex, nofollow' },
    });
  }
}
