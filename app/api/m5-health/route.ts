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
      migrationApplied,machineRows,currentVersions,m5091Versions,m5111Versions,specificationRows,grossPowerRows,ptoPowerRows,
      eightSpeedRows,twelveSpeedRows,twentyFourSpeedRows,twoWdRows,fourWdRows,lowLiftRows,highLiftRows,
      loaderRows,loaderFitments,serviceParts,coreServiceFitments,cabServiceFitments,openStationCabFilterFitments,variantServiceSources,
    ]=await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260828_194_kubota_m5_service_filters'`),
      count(`SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m5-091','m5-111') AND m.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m5-091','m5-111') AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='m5-091' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='m5-111' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE mf.slug='kubota' AND m.slug IN ('m5-091','m5-111') AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND mv.is_current=1 AND sd.spec_key='engine.gross_power' AND ((m.slug='m5-091' AND ms.value_number=92.5) OR (m.slug='m5-111' AND ms.value_number=105.6))`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND mv.is_current=1 AND sd.spec_key='pto.rated_power' AND ((m.slug='m5-091' AND ms.value_number=76) OR (m.slug='m5-111' AND ms.value_number=89))`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m5-091','m5-111') AND mv.is_current=1 AND sd.spec_key='transmission.standard' AND ms.value_text='F8/R8'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m5-091','m5-111') AND mv.is_current=1 AND sd.spec_key='transmission.standard' AND ms.value_text='F12/R12'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='m5-111' AND mv.is_current=1 AND sd.spec_key='transmission.standard' AND ms.value_text='F24/R24'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m5-091','m5-111') AND mv.is_current=1 AND sd.spec_key='drivetrain.type' AND ms.value_text='2WD'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m5-091','m5-111') AND mv.is_current=1 AND sd.spec_key='drivetrain.type' AND ms.value_text='4WD'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m5-091','m5-111') AND mv.is_current=1 AND sd.spec_key='hitch.lift_capacity_24in' AND ms.value_number=4630`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m5-091','m5-111') AND mv.is_current=1 AND sd.spec_key='hitch.lift_capacity_24in' AND ms.value_number=6063`),
      count(`SELECT COUNT(*) AS count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='kubota' AND a.slug='la1854' AND a.attachment_type='front-loader' AND a.data_status='verified' AND a.lift_capacity_text LIKE '%3,990 lb%' AND a.lift_capacity_text LIKE '%4,144 lb%'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug IN ('m5-091','m5-111') AND a.slug='la1854' AND ma.confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM parts p JOIN manufacturers mf ON mf.id=p.manufacturer_id WHERE mf.slug='kubota' AND p.normalized_part_number IN ('HH1C032430','5970026112','HHTA037710','6A67175090','T185571600') AND p.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug IN ('m5-091','m5-111') AND mv.is_current=1 AND p.normalized_part_number IN ('HH1C032430','5970026112','HHTA037710') AND mp.fitment_confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug IN ('m5-091','m5-111') AND mv.is_current=1 AND p.normalized_part_number IN ('6A67175090','T185571600') AND mv.configuration LIKE '%cab%' AND mp.fitment_confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug IN ('m5-091','m5-111') AND mv.is_current=1 AND p.normalized_part_number IN ('6A67175090','T185571600') AND mv.configuration LIKE '%open%'`),
      count(`SELECT COUNT(*) AS count FROM source_records WHERE external_id IN ('messicks-m5-091hf-service-filters-2026-08','messicks-m5-091hfc-service-filters-2026-08','messicks-m5-091hd-service-filters-2026-08','messicks-m5-091hd12-service-filters-2026-08','messicks-m5-091hdc-service-filters-2026-08','messicks-m5-091hdc12-service-filters-2026-08','messicks-m5-111hf-service-filters-2026-08','messicks-m5-111hfc-service-filters-2026-08','messicks-m5-111hd-service-filters-2026-08','messicks-m5-111hd12-service-filters-2026-08','messicks-m5-111hdc-service-filters-2026-08','messicks-m5-111hdc12-service-filters-2026-08','messicks-m5-111hdc24-service-filters-2026-08')`),
    ]);

    const checks={
      migrationApplied:migrationApplied===1,machineRows:machineRows===2,currentVersions:currentVersions===13,m5091Versions:m5091Versions===6,m5111Versions:m5111Versions===7,
      specificationRows:specificationRows===364,grossPowerRows:grossPowerRows===13,ptoPowerRows:ptoPowerRows===13,
      eightSpeedRows:eightSpeedRows===8,twelveSpeedRows:twelveSpeedRows===4,twentyFourSpeedRows:twentyFourSpeedRows===1,twoWdRows:twoWdRows===4,fourWdRows:fourWdRows===9,
      lowLiftRows:lowLiftRows===8,highLiftRows:highLiftRows===5,loaderRows:loaderRows===1,loaderFitments:loaderFitments===2,
      serviceParts:serviceParts===5,coreServiceFitments:coreServiceFitments===39,cabServiceFitments:cabServiceFitments===14,
      openStationCabFilterFitments:openStationCabFilterFitments===0,variantServiceSources:variantServiceSources===13,
    };
    const ok=Object.values(checks).every(Boolean);

    return NextResponse.json({
      ok,
      expectedLatestM5Migration:'20260828_194_kubota_m5_service_filters',
      checks,
      values:{machineRows,currentVersions,m5091Versions,m5111Versions,specificationRows,grossPowerRows,ptoPowerRows,eightSpeedRows,twelveSpeedRows,twentyFourSpeedRows,twoWdRows,fourWdRows,lowLiftRows,highLiftRows,loaderRows,loaderFitments,serviceParts,coreServiceFitments,cabServiceFitments,openStationCabFilterFitments,variantServiceSources},
    },{
      status:ok?200:503,
      headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'},
    });
  }catch(error){
    console.error('Kubota M5 health check failed:',error);
    return NextResponse.json({ok:false,error:'Kubota M5 health check failed'},{status:500,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  }
}
