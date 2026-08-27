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
      publishableM7060,
      currentVersions,
      specs,
      verifiedLoaders,
      loaderCompatibilityRows,
      correctedPtoRows,
      hydraulicHitchBrakeRows,
    ] = await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260827_135_kubota_m7060_current_hydraulics_pto_correction'`),
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
      count(`
        SELECT COUNT(*) AS count FROM attachments a
        JOIN manufacturers mf ON mf.id=a.manufacturer_id
        WHERE mf.slug='kubota' AND a.attachment_type='front-loader'
          AND a.slug='la1154' AND a.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND m.slug='m7060' AND a.slug='la1154'
      `),
      count(`
        SELECT COUNT(*) AS count
        FROM machine_specs ms
        JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        WHERE mf.slug='kubota' AND m.slug='m7060' AND sd.spec_key='pto.rated_power'
          AND ((mv.slug='us-current-8f8r' AND ms.value_number=62)
            OR (mv.slug='us-current-12f12r' AND ms.value_number=60))
      `),
      count(`
        SELECT COUNT(*) AS count
        FROM machine_specs ms
        JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        WHERE mf.slug='kubota' AND m.slug='m7060'
          AND mv.slug IN ('us-current-8f8r','us-current-12f12r')
          AND sd.spec_key IN (
            'hydraulics.three_point_pump_capacity','hydraulics.control_system','hydraulics.remote_valves',
            'hitch.category','hitch.lift_capacity_24in','brakes.type','drivetrain.4wd_clutch'
          )
      `),
    ]);

    return NextResponse.json({
      ok: true,
      expectedLatestKubotaMigration: '20260827_135_kubota_m7060_current_hydraulics_pto_correction',
      migrationApplied: migrationApplied === 1,
      publishableM7060,
      expectedPublishableM7060: 1,
      currentConfigurationVersions: currentVersions,
      expectedCurrentConfigurationVersions: 2,
      specificationRecords: specs,
      expectedSpecificationRecords: 46,
      correctedPtoRows,
      expectedCorrectedPtoRows: 2,
      hydraulicHitchBrakeRows,
      expectedHydraulicHitchBrakeRows: 14,
      verifiedLoaders,
      expectedVerifiedLoaders: 1,
      loaderCompatibilityRows,
      expectedLoaderCompatibilityRows: 1,
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
