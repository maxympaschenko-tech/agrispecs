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
      standardM6141Rows,suspendedM6141Rows,standardM6141WeightRows,suspendedM6141WeightRows,
      loaderRows,loaderFitments,serviceParts,commonServiceFitments,smallEngineFitments,incorrectSmallEngineOnLarge,
      largeEngineFitments,incorrectLargeEngineOnSmall,serviceSourceRows,serviceSupersessionRows,
    ]=await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260828_200_kubota_m6_service_supersessions'`),
      count(`SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m6-101','m6-111','m6-131','m6-141') AND m.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m6-101','m6-111','m6-131','m6-141') AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE mf.slug='kubota' AND m.slug IN ('m6-101','m6-111','m6-131','m6-141') AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND mv.is_current=1 AND sd.spec_key='engine.gross_power' AND ((m.slug='m6-101' AND ms.value_number=104.5) OR (m.slug='m6-111' AND ms.value_number=114.1) OR (m.slug='m6-131' AND ms.value_number=131.6) OR (m.slug='m6-141' AND ms.value_number=141.4))`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND mv.is_current=1 AND sd.spec_key='pto.rated_power' AND ((m.slug='m6-101' AND ms.value_number=82) OR (m.slug='m6-111' AND ms.value_number=92) OR (m.slug='m6-131' AND ms.value_number=104) OR (m.slug='m6-141' AND ms.value_number=114))`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='m6-141' AND mv.slug='us-current-dtc-f-cab-4wd' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='m6-141' AND mv.slug='us-current-dtsc-f-suspended-cab-4wd' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='m6-141' AND mv.slug='us-current-dtc-f-cab-4wd' AND sd.spec_key='weight.tractor' AND ms.value_number=10945`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='m6-141' AND mv.slug='us-current-dtsc-f-suspended-cab-4wd' AND sd.spec_key='weight.tractor' AND ms.value_number=11387`),
      count(`SELECT COUNT(*) AS count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='kubota' AND a.slug IN ('la1955','la2255') AND a.attachment_type='front-loader' AND a.data_status='verified'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug IN ('m6-101','m6-111','m6-131','m6-141') AND a.slug IN ('la1955','la2255') AND ma.confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM parts p JOIN manufacturers mf ON mf.id=p.manufacturer_id WHERE mf.slug='kubota' AND p.normalized_part_number IN ('HH3S082590','6A67175090','T185571600','HH1C032430','5970026112','1G31143380','HH1J043172') AND p.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug IN ('m6-101','m6-111','m6-131','m6-141') AND mv.is_current=1 AND p.normalized_part_number IN ('HH3S082590','6A67175090','T185571600') AND mp.fitment_confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug IN ('m6-101','m6-111') AND mv.is_current=1 AND p.normalized_part_number IN ('HH1C032430','5970026112') AND mp.fitment_confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug IN ('m6-131','m6-141') AND mv.is_current=1 AND p.normalized_part_number IN ('HH1C032430','5970026112')`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug IN ('m6-131','m6-141') AND mv.is_current=1 AND p.normalized_part_number IN ('1G31143380','HH1J043172') AND mp.fitment_confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug IN ('m6-101','m6-111') AND mv.is_current=1 AND p.normalized_part_number IN ('1G31143380','HH1J043172')`),
      count(`SELECT COUNT(*) AS count FROM source_records WHERE external_id IN ('messicks-m6-101dtc-1-service-filters-2026-08','messicks-m6-111dtc-1-service-filters-2026-08','messicks-m6-131dtc-1-service-filters-2026-08','messicks-m6-141dtc-1-dtsc-1-service-filters-2026-08','messicks-hh3s0-82590-m6-current-fitment','messicks-hh1j0-43172-m6-current-fitment')`),
      count(`SELECT COUNT(*) AS count FROM part_cross_references pcr JOIN parts p ON p.id=pcr.part_id JOIN parts cp ON cp.id=pcr.cross_part_id JOIN manufacturers mf ON mf.id=p.manufacturer_id WHERE mf.slug='kubota' AND pcr.relation_type='replaces' AND ((p.normalized_part_number IN ('3Y20582590','HH3Y082590') AND cp.normalized_part_number='HH3S082590') OR (p.normalized_part_number IN ('1J52143170','1J52143172','HH1J043170') AND cp.normalized_part_number='HH1J043172') OR (p.normalized_part_number IN ('1583143380','1583143382') AND cp.normalized_part_number='1G31143380'))`),
    ]);

    const checks={
      migrationApplied:migrationApplied===1,machineRows:machineRows===4,currentVersions:currentVersions===5,specificationRows:specificationRows===140,
      grossPowerRows:grossPowerRows===5,ptoPowerRows:ptoPowerRows===5,standardM6141Rows:standardM6141Rows===1,suspendedM6141Rows:suspendedM6141Rows===1,
      standardM6141WeightRows:standardM6141WeightRows===1,suspendedM6141WeightRows:suspendedM6141WeightRows===1,
      loaderRows:loaderRows===2,loaderFitments:loaderFitments===4,serviceParts:serviceParts===7,commonServiceFitments:commonServiceFitments===15,
      smallEngineFitments:smallEngineFitments===4,incorrectSmallEngineOnLarge:incorrectSmallEngineOnLarge===0,
      largeEngineFitments:largeEngineFitments===6,incorrectLargeEngineOnSmall:incorrectLargeEngineOnSmall===0,serviceSourceRows:serviceSourceRows===6,
      serviceSupersessionRows:serviceSupersessionRows===7,
    };
    const ok=Object.values(checks).every(Boolean);

    return NextResponse.json({
      ok,
      expectedLatestM6Migration:'20260828_200_kubota_m6_service_supersessions',
      checks,
      values:{machineRows,currentVersions,specificationRows,grossPowerRows,ptoPowerRows,standardM6141Rows,suspendedM6141Rows,standardM6141WeightRows,suspendedM6141WeightRows,loaderRows,loaderFitments,serviceParts,commonServiceFitments,smallEngineFitments,incorrectSmallEngineOnLarge,largeEngineFitments,incorrectLargeEngineOnSmall,serviceSourceRows,serviceSupersessionRows},
    },{
      status:ok?200:503,
      headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'},
    });
  }catch(error){
    console.error('Kubota M6 health check failed:',error);
    return NextResponse.json({ok:false,error:'Kubota M6 health check failed'},{status:500,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  }
}
