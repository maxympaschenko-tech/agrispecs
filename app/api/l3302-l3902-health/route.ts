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
      grossPowerRows,
      gearTransmissionRows,
      loaderRows,
      loaderFitments,
      serviceParts,
      versionedServiceFitments,
      hstFilterFitments,
    ] = await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260827_157_kubota_l3302_l3902_service_filters'`),
      count(`
        SELECT COUNT(*) AS count FROM machines m
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug IN ('l3302','l3902') AND m.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_versions mv
        JOIN machines m ON m.id=mv.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug IN ('l3302','l3902')
          AND mv.slug IN ('us-current-gear-4wd','us-current-hst-4wd') AND mv.is_current=1
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        WHERE mf.slug='kubota' AND m.slug IN ('l3302','l3902')
          AND mv.slug IN ('us-current-gear-4wd','us-current-hst-4wd')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        WHERE mf.slug='kubota' AND m.slug IN ('l3302','l3902')
          AND mv.slug IN ('us-current-gear-4wd','us-current-hst-4wd')
          AND sd.spec_key='engine.gross_power'
          AND ((m.slug='l3302' AND ms.value_number=33.0) OR (m.slug='l3902' AND ms.value_number=37.5))
          AND ms.confidence='official'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        WHERE mf.slug='kubota' AND m.slug IN ('l3302','l3902')
          AND mv.slug='us-current-gear-4wd'
          AND sd.spec_key='transmission.standard'
          AND ms.value_text LIKE '%8 forward / 8 reverse%'
          AND ms.confidence='official'
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
        WHERE mf.slug='kubota' AND m.slug IN ('l3302','l3902')
          AND a.slug='la526' AND ma.confidence='official'
      `),
      count(`
        SELECT COUNT(*) AS count FROM parts p
        JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='kubota'
          AND p.normalized_part_number IN ('HH16432430','HH1J143172','HH3A082623','TC82093230','HHK7014073')
          AND p.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('l3302','l3902')
          AND mv.slug IN ('us-current-gear-4wd','us-current-hst-4wd')
          AND p.normalized_part_number IN ('HH16432430','HH1J143172','HH3A082623','TC82093230','HHK7014073')
          AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('l3302','l3902')
          AND mv.slug='us-current-hst-4wd'
          AND p.normalized_part_number='HHK7014073'
          AND mp.fitment_confidence='high'
      `),
    ]);

    const checks = {
      migrationApplied: migrationApplied === 1,
      machineRows: machineRows === 2,
      currentVersions: currentVersions === 4,
      specificationRows: specificationRows === 128,
      grossPowerRows: grossPowerRows === 4,
      gearTransmissionRows: gearTransmissionRows === 2,
      loaderRows: loaderRows === 1,
      loaderFitments: loaderFitments === 2,
      serviceParts: serviceParts === 5,
      versionedServiceFitments: versionedServiceFitments === 18,
      hstFilterFitments: hstFilterFitments === 2,
    };
    const ok = Object.values(checks).every(Boolean);

    return NextResponse.json({
      ok,
      expectedLatestMigration: '20260827_157_kubota_l3302_l3902_service_filters',
      checks,
      values: {
        machineRows,currentVersions,specificationRows,grossPowerRows,gearTransmissionRows,
        loaderRows,loaderFitments,serviceParts,versionedServiceFitments,hstFilterFitments,
      },
      expected: {
        machineRows:2,currentVersions:4,specificationRows:128,grossPowerRows:4,gearTransmissionRows:2,
        loaderRows:1,loaderFitments:2,serviceParts:5,versionedServiceFitments:18,hstFilterFitments:2,
      },
    }, {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control':'no-store, max-age=0', 'X-Robots-Tag':'noindex, nofollow' },
    });
  } catch (error) {
    console.error('Kubota L3302/L3902 health check failed:', error);
    return NextResponse.json({ ok:false, error:'Kubota L3302/L3902 health check failed' }, {
      status:500,
      headers:{ 'Cache-Control':'no-store, max-age=0', 'X-Robots-Tag':'noindex, nofollow' },
    });
  }
}
