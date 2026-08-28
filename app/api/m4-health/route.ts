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
      migrationApplied,overrideColumns,machineRows,currentVersions,specificationRows,currentGrossPowerRows,legacyGrossPowerRows,ptoPowerRows,
      remoteValveRows,loaderRows,loaderFitments,performanceOverrideRows,globalLA1154M60Values,
    ]=await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260828_189_kubota_m4_la1154_loader'`),
      count(`SELECT COUNT(*) AS count FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='machine_attachments' AND COLUMN_NAME IN ('performance_capacity_text','performance_height_text','performance_configuration_text')`),
      count(`SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m4d-061','m4-071','m4d-071') AND m.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('m4d-061','m4-071','m4d-071') AND mv.slug='us-current-hdc12-cab-4wd' AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE mf.slug='kubota' AND m.slug IN ('m4d-061','m4-071','m4d-071') AND mv.slug='us-current-hdc12-cab-4wd'`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND mv.slug='us-current-hdc12-cab-4wd' AND sd.spec_key='engine.gross_power' AND ((m.slug='m4d-061' AND ms.value_number=65.4) OR (m.slug IN ('m4-071','m4d-071') AND ms.value_number=72.1))`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m4-071','m4d-071') AND mv.slug='us-current-hdc12-cab-4wd' AND sd.spec_key='engine.gross_power' AND ms.value_number=73.2`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND mv.slug='us-current-hdc12-cab-4wd' AND sd.spec_key='pto.rated_power' AND ((m.slug='m4d-061' AND ms.value_number=52) OR (m.slug IN ('m4-071','m4d-071') AND ms.value_number=60))`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('m4d-061','m4-071','m4d-071') AND mv.slug='us-current-hdc12-cab-4wd' AND sd.spec_key='hydraulics.remote_valves'`),
      count(`SELECT COUNT(*) AS count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='kubota' AND a.slug='la1154' AND a.attachment_type='front-loader' AND a.data_status='verified'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug IN ('m4d-061','m4-071','m4d-071') AND a.slug='la1154' AND ma.confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug IN ('m4d-061','m4-071','m4d-071') AND a.slug='la1154' AND ma.performance_capacity_text LIKE '%2,674 lb%' AND ma.performance_capacity_text LIKE '%2,928 lb%' AND ma.performance_height_text LIKE '%133.0 in%' AND ma.performance_configuration_text IS NOT NULL`),
      count(`SELECT COUNT(*) AS count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='kubota' AND a.slug='la1154' AND a.lift_capacity_text LIKE '%2,469 lb%' AND a.lift_height_text LIKE '%132.7 in%'`),
    ]);

    const checks={
      migrationApplied:migrationApplied===1,overrideColumns:overrideColumns===3,machineRows:machineRows===3,currentVersions:currentVersions===3,
      specificationRows:specificationRows===90,currentGrossPowerRows:currentGrossPowerRows===3,legacyGrossPowerRows:legacyGrossPowerRows===0,ptoPowerRows:ptoPowerRows===3,remoteValveRows:remoteValveRows===3,
      loaderRows:loaderRows===1,loaderFitments:loaderFitments===3,performanceOverrideRows:performanceOverrideRows===3,globalLA1154M60Values:globalLA1154M60Values===1,
    };
    const ok=Object.values(checks).every(Boolean);

    return NextResponse.json({
      ok,
      expectedLatestM4Migration:'20260828_189_kubota_m4_la1154_loader',
      checks,
      values:{overrideColumns,machineRows,currentVersions,specificationRows,currentGrossPowerRows,legacyGrossPowerRows,ptoPowerRows,remoteValveRows,loaderRows,loaderFitments,performanceOverrideRows,globalLA1154M60Values},
    },{
      status:ok?200:503,
      headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'},
    });
  }catch(error){
    console.error('Kubota M4 health check failed:',error);
    return NextResponse.json({ok:false,error:'Kubota M4 health check failed'},{status:500,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  }
}
