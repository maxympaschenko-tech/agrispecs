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
      migrationApplied,machineRows,currentVersions,specificationRows,grossPowerRows,ptoPowerRows,
      sixteenSpeedRows,thirtyTwoSpeedRows,twoWdRows,fourWdRows,openStationRows,cabRows,hydraulicRangeRows,
      twoWdWeightRows,fourWdWeightRows,loaderRows,loaderFitments,serviceParts,coreServiceFitments,cabFilterFitments,openStationCabFilterFitments,serviceSourceRows,
    ]=await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260828_203_kubota_m6s_service_filters'`),
      count(`SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND m.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1 AND sd.spec_key='engine.gross_power' AND ms.value_number=114.1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1 AND sd.spec_key='pto.rated_power' AND ms.value_number=95`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1 AND sd.spec_key='transmission.standard' AND ms.value_text='F16/R16'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1 AND sd.spec_key='transmission.standard' AND ms.value_text='F32/R32'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1 AND sd.spec_key='drivetrain.type' AND ms.value_text='2WD'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1 AND sd.spec_key='drivetrain.type' AND ms.value_text='4WD'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1 AND sd.spec_key='configuration.station' AND ms.value_text='Open Station'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1 AND sd.spec_key='configuration.station' AND ms.value_text='Cab'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1 AND sd.spec_key='hydraulics.pump_output_range' AND ms.value_text LIKE '17.2-17.6%'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1 AND sd.spec_key='weight.tractor' AND ms.value_number IN (6834,7341)`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1 AND sd.spec_key='weight.tractor' AND ms.value_number IN (8466,8973)`),
      count(`SELECT COUNT(*) AS count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='kubota' AND a.slug='la1941' AND a.attachment_type='front-loader' AND a.data_status='verified' AND a.lift_capacity_text LIKE '%4,178 lb%' AND a.lift_capacity_text LIKE '%4,299 lb%'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND a.slug='la1941' AND ma.confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM parts p JOIN manufacturers mf ON mf.id=p.manufacturer_id WHERE mf.slug='kubota' AND p.normalized_part_number IN ('HH1C032430','5970026112','HHTA037710','T185571600') AND p.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1 AND p.normalized_part_number IN ('HH1C032430','5970026112','HHTA037710') AND mp.fitment_confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1 AND p.normalized_part_number='T185571600' AND mv.configuration LIKE '%cab%' AND mp.fitment_confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug='m6s-111' AND mv.is_current=1 AND p.normalized_part_number='T185571600' AND mv.configuration LIKE '%open%'`),
      count(`SELECT COUNT(*) AS count FROM source_records WHERE external_id IN ('bingham-hh1c0-32430-m6s-fitment','coleman-59700-26112-m6s-fitment','mbtractor-hhta0-37710-m6s-fitment','bingham-t1855-71600-m6s-cab-fitment')`),
    ]);

    const checks={
      migrationApplied:migrationApplied===1,machineRows:machineRows===1,currentVersions:currentVersions===6,specificationRows:specificationRows===168,
      grossPowerRows:grossPowerRows===6,ptoPowerRows:ptoPowerRows===6,sixteenSpeedRows:sixteenSpeedRows===4,thirtyTwoSpeedRows:thirtyTwoSpeedRows===2,
      twoWdRows:twoWdRows===2,fourWdRows:fourWdRows===4,openStationRows:openStationRows===3,cabRows:cabRows===3,hydraulicRangeRows:hydraulicRangeRows===6,
      twoWdWeightRows:twoWdWeightRows===2,fourWdWeightRows:fourWdWeightRows===4,loaderRows:loaderRows===1,loaderFitments:loaderFitments===1,
      serviceParts:serviceParts===4,coreServiceFitments:coreServiceFitments===18,cabFilterFitments:cabFilterFitments===3,openStationCabFilterFitments:openStationCabFilterFitments===0,serviceSourceRows:serviceSourceRows===4,
    };
    const ok=Object.values(checks).every(Boolean);

    return NextResponse.json({
      ok,
      expectedLatestM6SMigration:'20260828_203_kubota_m6s_service_filters',
      checks,
      values:{machineRows,currentVersions,specificationRows,grossPowerRows,ptoPowerRows,sixteenSpeedRows,thirtyTwoSpeedRows,twoWdRows,fourWdRows,openStationRows,cabRows,hydraulicRangeRows,twoWdWeightRows,fourWdWeightRows,loaderRows,loaderFitments,serviceParts,coreServiceFitments,cabFilterFitments,openStationCabFilterFitments,serviceSourceRows},
    },{
      status:ok?200:503,
      headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'},
    });
  }catch(error){
    console.error('Kubota M6S health check failed:',error);
    return NextResponse.json({ok:false,error:'Kubota M6S health check failed'},{status:500,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  }
}
