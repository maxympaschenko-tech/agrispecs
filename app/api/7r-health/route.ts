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
      migrationApplied,machineRows,currentVersions,specificationRows,ratedPowerRows,maxPowerRows,ptoPowerRows,
      engine68Rows,engine90Rows,serviceParts,currentServiceFitments,historicalSerialFitments,
      engine68Fitments,engine90Fitments,wrong68On90,wrong90On68,currentScvFitments,legacyScvFitments,
      current9LSecondaryFitments,legacy9LSecondaryFitments,officialSourceRows,
    ]=await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260828_212_john_deere_7r_service_filters'`),
      count(`SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-210','7r-230','7r-250','7r-270','7r-290','7r-310','7r-330','7r-350') AND m.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-210','7r-230','7r-250','7r-270','7r-290','7r-310','7r-330','7r-350') AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-210','7r-230','7r-250','7r-270','7r-290','7r-310','7r-330','7r-350') AND mv.slug='united-states-current-2026-08'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE mf.slug='john-deere' AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.rated_power' AND ((m.slug='7r-210' AND ms.value_number=210) OR (m.slug='7r-230' AND ms.value_number=230) OR (m.slug='7r-250' AND ms.value_number=250) OR (m.slug='7r-270' AND ms.value_number=270) OR (m.slug='7r-290' AND ms.value_number=290) OR (m.slug='7r-310' AND ms.value_number=310) OR (m.slug='7r-330' AND ms.value_number=330) OR (m.slug='7r-350' AND ms.value_number=350))`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE mf.slug='john-deere' AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.maximum_power' AND ((m.slug='7r-210' AND ms.value_number=231) OR (m.slug='7r-230' AND ms.value_number=253) OR (m.slug='7r-250' AND ms.value_number=275) OR (m.slug='7r-270' AND ms.value_number=297) OR (m.slug='7r-290' AND ms.value_number=319) OR (m.slug='7r-310' AND ms.value_number=341) OR (m.slug='7r-330' AND ms.value_number=363) OR (m.slug='7r-350' AND ms.value_number=385))`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE mf.slug='john-deere' AND mv.slug='united-states-current-2026-08' AND sd.spec_key='pto.rated_power' AND ((m.slug='7r-210' AND ms.value_number=170) OR (m.slug='7r-230' AND ms.value_number=189) OR (m.slug='7r-250' AND ms.value_number=205) OR (m.slug='7r-270' AND ms.value_number=224) OR (m.slug='7r-290' AND ms.value_number=242) OR (m.slug IN ('7r-310','7r-330','7r-350') AND ms.value_number=260))`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-210','7r-230','7r-250','7r-270') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.displacement' AND ms.value_number=6.8`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-290','7r-310','7r-330','7r-350') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.displacement' AND ms.value_number=9`),
      count(`SELECT COUNT(*) AS count FROM parts p JOIN manufacturers mf ON mf.id=p.manufacturer_id WHERE mf.slug='john-deere' AND p.normalized_part_number IN ('AT365869','RE564863','F071151','RE284091','RE593819','H216169','RE577612','DZ114640','DZ124403','LVU14258','HXE135862','TA21586','RE269061','DZ115391','DZ115392','DZ105100','RE539279','RE539465','RE509672','DZ110558','DZ112918') AND p.data_status='verified'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-210','7r-230','7r-250','7r-270','7r-290','7r-310','7r-330','7r-350') AND mv.slug='united-states-current-2026-08' AND mp.fitment_confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-210','7r-230','7r-250','7r-270','7r-290','7r-310','7r-330','7r-350') AND mp.machine_version_id IS NULL AND mp.fitment_confidence='official' AND p.normalized_part_number IN ('RE269061','DZ112918')`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-210','7r-230','7r-250','7r-270') AND mv.slug='united-states-current-2026-08' AND p.normalized_part_number IN ('DZ115391','DZ115392','DZ105100','RE539279') AND mp.fitment_confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-290','7r-310','7r-330','7r-350') AND mv.slug='united-states-current-2026-08' AND p.normalized_part_number IN ('RE539465','DZ110558','RE509672') AND mp.fitment_confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-290','7r-310','7r-330','7r-350') AND p.normalized_part_number IN ('DZ115391','DZ115392','DZ105100','RE539279')`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-210','7r-230','7r-250','7r-270') AND p.normalized_part_number IN ('RE539465','DZ110558','RE509672','DZ112918')`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-210','7r-230','7r-250','7r-270','7r-290','7r-310','7r-330','7r-350') AND mv.slug='united-states-current-2026-08' AND p.normalized_part_number='TA21586' AND mp.serial_from='135001' AND mp.fitment_confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-210','7r-230','7r-250','7r-270','7r-290','7r-310','7r-330','7r-350') AND mp.machine_version_id IS NULL AND p.normalized_part_number='RE269061' AND mp.serial_to='134999' AND mp.fitment_confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-290','7r-310','7r-330','7r-350') AND mv.slug='united-states-current-2026-08' AND p.normalized_part_number='DZ110558' AND mp.serial_from='126000' AND mp.fitment_confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='john-deere' AND m.slug IN ('7r-290','7r-310','7r-330','7r-350') AND mp.machine_version_id IS NULL AND p.normalized_part_number='DZ112918' AND mp.serial_to='125999' AND mp.fitment_confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM source_records WHERE external_id IN ('john-deere-7r-pricebook-2026-05-05','john-deere-7r-series-specifications-210-350','john-deere-rx532521-7r-ft4-110101-service-guide')`),
    ]);

    const checks={
      migrationApplied:migrationApplied===1,machineRows:machineRows===8,currentVersions:currentVersions===8,specificationRows:specificationRows===144,
      ratedPowerRows:ratedPowerRows===8,maxPowerRows:maxPowerRows===8,ptoPowerRows:ptoPowerRows===8,engine68Rows:engine68Rows===4,engine90Rows:engine90Rows===4,
      serviceParts:serviceParts===21,currentServiceFitments:currentServiceFitments===124,historicalSerialFitments:historicalSerialFitments===12,
      engine68Fitments:engine68Fitments===16,engine90Fitments:engine90Fitments===12,wrong68On90:wrong68On90===0,wrong90On68:wrong90On68===0,
      currentScvFitments:currentScvFitments===8,legacyScvFitments:legacyScvFitments===8,current9LSecondaryFitments:current9LSecondaryFitments===4,legacy9LSecondaryFitments:legacy9LSecondaryFitments===4,
      officialSourceRows:officialSourceRows===3,
    };
    const ok=Object.values(checks).every(Boolean);
    return NextResponse.json({
      ok,expectedLatest7RMigration:'20260828_212_john_deere_7r_service_filters',checks,
      values:{machineRows,currentVersions,specificationRows,ratedPowerRows,maxPowerRows,ptoPowerRows,engine68Rows,engine90Rows,serviceParts,currentServiceFitments,historicalSerialFitments,engine68Fitments,engine90Fitments,wrong68On90,wrong90On68,currentScvFitments,legacyScvFitments,current9LSecondaryFitments,legacy9LSecondaryFitments,officialSourceRows},
    },{status:ok?200:503,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  }catch(error){
    console.error('John Deere 7R health check failed:',error);
    return NextResponse.json({ok:false,error:'John Deere 7R health check failed'},{status:500,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  }
}
