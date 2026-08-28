import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic='force-dynamic';
export const revalidate=0;

type CountRow=RowDataPacket&{count:number};
async function count(sql:string,params:unknown[]=[]){
  const db=await getDbReady();
  const [rows]=await db.query<CountRow[]>(sql,params);
  return Number(rows[0]?.count||0);
}

export async function GET(){
  try{
    const [
      migrationApplied,machineRows,currentVersions,m7134CurrentVersions,incorrectM7134PremiumCurrent,
      specificationRows,grossPowerRows,ptoPowerRows,deluxeVersions,premiumVersions,kvtVersions,
      semiPowershiftRows,kvtTransmissionRows,deluxeRemoteRows,electronicRemoteRows,
      loaderRows,loaderFitments,serviceParts,serviceFitments,serviceSourceRows,
    ]=await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260828_206_kubota_m7_gen4_service_filters'`),
      count(`SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m7-134','m7-154','m7-174') AND m.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m7-134','m7-154','m7-174') AND mv.market_code='US' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='m7-134' AND mv.market_code='US' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='m7-134' AND mv.slug IN ('us-current-premium','us-current-premium-kvt') AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE mf.slug='kubota' AND m.slug IN ('m7-134','m7-154','m7-174') AND mv.market_code='US' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND mv.is_current=1 AND sd.spec_key='engine.gross_power' AND ((m.slug='m7-134' AND ms.value_number=128) OR (m.slug='m7-154' AND ms.value_number=148) OR (m.slug='m7-174' AND ms.value_number=168))`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND mv.is_current=1 AND sd.spec_key='pto.rated_power' AND ((m.slug='m7-134' AND ms.value_number=100) OR (m.slug='m7-154' AND ms.value_number=120) OR (m.slug='m7-174' AND ms.value_number=140))`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m7-134','m7-154','m7-174') AND mv.slug='us-current-deluxe' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m7-154','m7-174') AND mv.slug='us-current-premium' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m7-154','m7-174') AND mv.slug='us-current-premium-kvt' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m7-134','m7-154','m7-174') AND mv.is_current=1 AND sd.spec_key='transmission.type' AND ms.value_text='Semi-Powershift'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m7-154','m7-174') AND mv.is_current=1 AND sd.spec_key='transmission.type' AND ms.value_text='CVT'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m7-134','m7-154','m7-174') AND mv.is_current=1 AND sd.spec_key='hydraulics.remote_valves' AND ms.value_text='3 standard, up to 4 mechanical valves'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m7-154','m7-174') AND mv.is_current=1 AND sd.spec_key='hydraulics.remote_valves' AND ms.value_text='4 standard, up to 5 electronic valves'`),
      count(`SELECT COUNT(*) AS count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='kubota' AND a.slug='lm2606' AND a.attachment_type='front-loader' AND a.data_status='verified' AND a.lift_capacity_text LIKE '%5,776 lb%' AND a.lift_capacity_text LIKE '%5,765 lb%' AND a.lift_height_text LIKE '%167 in%'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug IN ('m7-134','m7-154','m7-174') AND a.slug='lm2606' AND ma.confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM parts p JOIN manufacturers mf ON mf.id=p.manufacturer_id WHERE mf.slug='kubota' AND p.normalized_part_number IN ('1J52043060','1G31143380','HH1J043172','6A67175090','3J03731510') AND p.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug IN ('m7-134','m7-154','m7-174') AND mv.is_current=1 AND p.normalized_part_number IN ('1J52043060','1G31143380','HH1J043172','6A67175090','3J03731510') AND mp.fitment_confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM source_records WHERE external_id IN ('messicks-m7-134s-m7-gen4-service-filters-2026-08','messicks-m7-154s-m7-gen4-service-filters-2026-08','messicks-m7-154p-m7-gen4-service-filters-2026-08','messicks-m7-154p-kvt-m7-gen4-service-filters-2026-08','messicks-m7-174s-m7-gen4-service-filters-2026-08','messicks-m7-174p-m7-gen4-service-filters-2026-08','messicks-m7-174p-kvt-m7-gen4-service-filters-2026-08')`),
    ]);

    const checks={
      migrationApplied:migrationApplied===1,machineRows:machineRows===3,currentVersions:currentVersions===7,
      m7134CurrentVersions:m7134CurrentVersions===1,incorrectM7134PremiumCurrent:incorrectM7134PremiumCurrent===0,
      specificationRows:specificationRows===217,grossPowerRows:grossPowerRows===7,ptoPowerRows:ptoPowerRows===7,
      deluxeVersions:deluxeVersions===3,premiumVersions:premiumVersions===2,kvtVersions:kvtVersions===2,
      semiPowershiftRows:semiPowershiftRows===5,kvtTransmissionRows:kvtTransmissionRows===2,
      deluxeRemoteRows:deluxeRemoteRows===3,electronicRemoteRows:electronicRemoteRows===4,
      loaderRows:loaderRows===1,loaderFitments:loaderFitments===3,
      serviceParts:serviceParts===5,serviceFitments:serviceFitments===35,serviceSourceRows:serviceSourceRows===7,
    };
    const ok=Object.values(checks).every(Boolean);

    return NextResponse.json({
      ok,
      expectedLatestM7Migration:'20260828_206_kubota_m7_gen4_service_filters',
      checks,
      values:{machineRows,currentVersions,m7134CurrentVersions,incorrectM7134PremiumCurrent,specificationRows,grossPowerRows,ptoPowerRows,deluxeVersions,premiumVersions,kvtVersions,semiPowershiftRows,kvtTransmissionRows,deluxeRemoteRows,electronicRemoteRows,loaderRows,loaderFitments,serviceParts,serviceFitments,serviceSourceRows},
    },{
      status:ok?200:503,
      headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'},
    });
  }catch(error){
    console.error('Kubota M7 Gen 4 health check failed:',error);
    return NextResponse.json({ok:false,error:'Kubota M7 Gen 4 health check failed'},{status:500,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  }
}
