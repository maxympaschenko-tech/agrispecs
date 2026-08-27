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
      publishableKubotaM60,
      m7060CurrentVersions,
      m6060CurrentVersions,
      m5660CurrentVersions,
      serviceReferenceVersions,
      m7060Specs,
      m6060Specs,
      m5660Specs,
      serviceCapacities,
      correctedCapacityProvenanceRows,
      verifiedLoaders,
      loaderCompatibilityRows,
      correctedPtoRows,
      hydraulicHitchBrakeRows,
      engineOilFilterParts,
      highConfidenceOilFilterFitments,
      serviceFilterParts,
      highConfidenceServiceFilterFitments,
      filterSupersessionRows,
    ] = await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260827_145_kubota_filter_supersessions'`),
      count(`
        SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug IN ('m5660su','m6060','m7060') AND m.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_versions mv
        JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug='m7060'
          AND mv.slug IN ('us-current-8f8r','us-current-12f12r') AND mv.is_current=1
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_versions mv
        JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug='m6060' AND mv.slug='us-current-8f8r' AND mv.is_current=1
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_versions mv
        JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug='m5660su' AND mv.slug='us-current-8f8r' AND mv.is_current=1
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_versions mv
        JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug='m7060' AND mv.slug='us-service-reference-2017' AND mv.is_current=0
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id
        WHERE mf.slug='kubota' AND m.slug='m7060' AND mv.slug IN ('us-current-8f8r','us-current-12f12r')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id
        WHERE mf.slug='kubota' AND m.slug='m6060' AND mv.slug='us-current-8f8r'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id
        WHERE mf.slug='kubota' AND m.slug='m5660su' AND mv.slug='us-current-8f8r'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_capacities mc JOIN machines m ON m.id=mc.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mc.machine_version_id
        WHERE mf.slug='kubota' AND m.slug='m7060' AND mv.slug='us-service-reference-2017'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_capacities mc JOIN machines m ON m.id=mc.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN source_records sr ON sr.id=mc.source_record_id
        WHERE mf.slug='kubota' AND m.slug='m7060'
          AND mc.system_key IN ('transmission-service-2017','front-differential-service-2017','front-axle-gear-service-2017')
          AND sr.external_id='kubota-m7060-capacities-bid-spec-2013-02-25'
      `),
      count(`
        SELECT COUNT(*) AS count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id
        WHERE mf.slug='kubota' AND a.attachment_type='front-loader' AND a.slug IN ('la1154','la1154su') AND a.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND (
          (m.slug IN ('m6060','m7060') AND a.slug='la1154') OR (m.slug='m5660su' AND a.slug='la1154su')
        )
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        WHERE mf.slug='kubota' AND m.slug='m7060' AND sd.spec_key='pto.rated_power'
          AND ((mv.slug='us-current-8f8r' AND ms.value_number=62) OR (mv.slug='us-current-12f12r' AND ms.value_number=60))
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        WHERE mf.slug='kubota' AND m.slug='m7060' AND mv.slug IN ('us-current-8f8r','us-current-12f12r')
          AND sd.spec_key IN ('hydraulics.three_point_pump_capacity','hydraulics.control_system','hydraulics.remote_valves','hitch.category','hitch.lift_capacity_24in','brakes.type','drivetrain.4wd_clutch')
      `),
      count(`
        SELECT COUNT(*) AS count FROM parts p
        JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='kubota'
          AND p.normalized_part_number IN ('HH1C032430','HH16432430')
          AND p.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota'
          AND m.slug IN ('m5660su','m6060','m7060')
          AND p.normalized_part_number IN ('HH1C032430','HH16432430')
          AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM parts p
        JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='kubota'
          AND p.normalized_part_number IN ('1J80043170','5980026110','3A11119130','HHTA037710')
          AND p.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota'
          AND m.slug IN ('m6060','m7060')
          AND p.normalized_part_number IN ('1J80043170','5980026110','3A11119130','HHTA037710')
          AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM part_cross_references pcr
        JOIN parts oldp ON oldp.id=pcr.part_id
        JOIN parts newp ON newp.id=pcr.cross_part_id
        JOIN manufacturers mf ON mf.id=oldp.manufacturer_id
        WHERE mf.slug='kubota' AND pcr.relation_type='replaces' AND (
          (oldp.normalized_part_number='3F75011220' AND newp.normalized_part_number='5980026110') OR
          (oldp.normalized_part_number='TA04037710' AND newp.normalized_part_number='T007037710') OR
          (oldp.normalized_part_number='T007037710' AND newp.normalized_part_number='HHTA037710')
        )
      `),
    ]);

    return NextResponse.json({
      ok: true,
      expectedLatestKubotaMigration: '20260827_145_kubota_filter_supersessions',
      migrationApplied: migrationApplied === 1,
      publishableKubotaM60,
      expectedPublishableKubotaM60: 3,
      m7060CurrentConfigurationVersions: m7060CurrentVersions,
      expectedM7060CurrentConfigurationVersions: 2,
      m6060CurrentConfigurationVersions: m6060CurrentVersions,
      expectedM6060CurrentConfigurationVersions: 1,
      m5660CurrentConfigurationVersions: m5660CurrentVersions,
      expectedM5660CurrentConfigurationVersions: 1,
      serviceReferenceVersions,
      expectedServiceReferenceVersions: 1,
      m7060SpecificationRecords: m7060Specs,
      expectedM7060SpecificationRecords: 46,
      m6060SpecificationRecords: m6060Specs,
      expectedM6060SpecificationRecords: 29,
      m5660SpecificationRecords: m5660Specs,
      expectedM5660SpecificationRecords: 28,
      serviceCapacities,
      expectedServiceCapacities: 5,
      correctedCapacityProvenanceRows,
      expectedCorrectedCapacityProvenanceRows: 3,
      correctedPtoRows,
      expectedCorrectedPtoRows: 2,
      hydraulicHitchBrakeRows,
      expectedHydraulicHitchBrakeRows: 14,
      verifiedLoaders,
      expectedVerifiedLoaders: 2,
      loaderCompatibilityRows,
      expectedLoaderCompatibilityRows: 3,
      engineOilFilterParts,
      expectedEngineOilFilterParts: 2,
      highConfidenceOilFilterFitments,
      expectedHighConfidenceOilFilterFitments: 3,
      serviceFilterParts,
      expectedServiceFilterParts: 4,
      highConfidenceServiceFilterFitments,
      expectedHighConfidenceServiceFilterFitments: 8,
      filterSupersessionRows,
      expectedFilterSupersessionRows: 3,
    }, {
      headers: { 'Cache-Control':'no-store, max-age=0', 'X-Robots-Tag':'noindex, nofollow' },
    });
  } catch (error) {
    console.error('Kubota health check failed:', error);
    return NextResponse.json({ ok:false, error:'Kubota health check failed' }, {
      status:500,
      headers:{ 'Cache-Control':'no-store, max-age=0', 'X-Robots-Tag':'noindex, nofollow' },
    });
  }
}
