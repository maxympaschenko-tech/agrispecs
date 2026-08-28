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
      migrationApplied,machineRows,currentVersions,semiVersions,kvtVersions,specificationRows,grossPowerRows,ptoPowerRows,
      semiWeightRows,kvtWeightRows,cumminsRows,loaderRows,loaderFitments,transmissionCategoryRows,
      serviceParts,commonServiceFitments,kvtSuctionFitments,incorrectKvtSuctionOnSemi,serviceSourceRows,airFilterSupersessionRows,
    ]=await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260828_210_kubota_m8_air_filter_supersession'`),
      count(`SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m8-181','m8-201') AND m.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m8-181','m8-201') AND mv.market_code='US' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m8-181','m8-201') AND mv.slug='us-current-semi-powershift' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m8-181','m8-201') AND mv.slug='us-current-kvt' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE mf.slug='kubota' AND m.slug IN ('m8-181','m8-201') AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND mv.is_current=1 AND sd.spec_key='engine.gross_power' AND ((m.slug='m8-181' AND ms.value_number=180) OR (m.slug='m8-201' AND ms.value_number=200))`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND mv.is_current=1 AND sd.spec_key='pto.rated_power' AND ((m.slug='m8-181' AND ms.value_number=145) OR (m.slug='m8-201' AND ms.value_number=159))`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m8-181','m8-201') AND mv.slug='us-current-semi-powershift' AND sd.spec_key='weight.tractor' AND ms.value_number=17570`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m8-181','m8-201') AND mv.slug='us-current-kvt' AND sd.spec_key='weight.tractor' AND ms.value_number=18498`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m8-181','m8-201') AND mv.is_current=1 AND sd.spec_key='engine.make' AND ms.value_text='Cummins'`),
      count(`SELECT COUNT(*) AS count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='kubota' AND a.slug='m77' AND a.attachment_type='front-loader' AND a.data_status='verified' AND a.lift_capacity_text LIKE '%5,200 lb%' AND a.lift_height_text LIKE '%181.2 in%'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug IN ('m8-181','m8-201') AND a.slug='m77' AND ma.confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM part_categories WHERE slug='transmission-filters'`),
      count(`SELECT COUNT(*) AS count FROM parts p JOIN manufacturers mf ON mf.id=p.manufacturer_id WHERE mf.slug='kubota' AND p.normalized_part_number IN ('LBT0010184','LBT0010260','LBT0013504','LBT0010137','LBT0010216','LBT0010165','LBT0010218','LBT0010217','LBT0011021') AND p.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug IN ('m8-181','m8-201') AND mv.is_current=1 AND p.normalized_part_number IN ('LBT0010184','LBT0010260','LBT0013504','LBT0010137','LBT0010216','LBT0010165','LBT0010218','LBT0010217') AND mp.fitment_confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug IN ('m8-181','m8-201') AND mv.slug='us-current-kvt' AND p.normalized_part_number='LBT0011021' AND mp.fitment_confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug IN ('m8-181','m8-201') AND mv.slug='us-current-semi-powershift' AND p.normalized_part_number='LBT0011021'`),
      count(`SELECT COUNT(*) AS count FROM source_records WHERE external_id IN ('messicks-m8-181-m8-service-filters-2026-08','messicks-m8-181kvt-m8-service-filters-2026-08','messicks-m8-201-m8-service-filters-2026-08','messicks-m8-201kvt-m8-service-filters-2026-08')`),
      count(`SELECT COUNT(*) AS count FROM part_cross_references pcr JOIN parts oldp ON oldp.id=pcr.part_id JOIN parts newp ON newp.id=pcr.cross_part_id JOIN manufacturers mf ON mf.id=oldp.manufacturer_id WHERE mf.slug='kubota' AND oldp.normalized_part_number='LBT0013539' AND newp.normalized_part_number='LBT0010137' AND pcr.relation_type='replaces'`),
    ]);

    const checks={
      migrationApplied:migrationApplied===1,machineRows:machineRows===2,currentVersions:currentVersions===4,
      semiVersions:semiVersions===2,kvtVersions:kvtVersions===2,specificationRows:specificationRows===148,
      grossPowerRows:grossPowerRows===4,ptoPowerRows:ptoPowerRows===4,semiWeightRows:semiWeightRows===2,kvtWeightRows:kvtWeightRows===2,cumminsRows:cumminsRows===4,
      loaderRows:loaderRows===1,loaderFitments:loaderFitments===2,transmissionCategoryRows:transmissionCategoryRows===1,
      serviceParts:serviceParts===9,commonServiceFitments:commonServiceFitments===32,kvtSuctionFitments:kvtSuctionFitments===2,
      incorrectKvtSuctionOnSemi:incorrectKvtSuctionOnSemi===0,serviceSourceRows:serviceSourceRows===4,airFilterSupersessionRows:airFilterSupersessionRows===1,
    };
    const ok=Object.values(checks).every(Boolean);
    return NextResponse.json({
      ok,
      expectedLatestM8Migration:'20260828_210_kubota_m8_air_filter_supersession',
      checks,
      values:{machineRows,currentVersions,semiVersions,kvtVersions,specificationRows,grossPowerRows,ptoPowerRows,semiWeightRows,kvtWeightRows,cumminsRows,loaderRows,loaderFitments,transmissionCategoryRows,serviceParts,commonServiceFitments,kvtSuctionFitments,incorrectKvtSuctionOnSemi,serviceSourceRows,airFilterSupersessionRows},
    },{status:ok?200:503,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  }catch(error){
    console.error('Kubota M8 health check failed:',error);
    return NextResponse.json({ok:false,error:'Kubota M8 health check failed'},{status:500,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  }
}
