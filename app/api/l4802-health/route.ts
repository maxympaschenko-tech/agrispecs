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
      migrationApplied,machineRows,currentVersions,specificationRows,grossPowerRows,ptoRows,
      loaderRows,loaderFitments,backhoeRows,backhoeFitments,serviceParts,versionedServiceFitments,hydraulicSupersessionRows,
    ]=await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260827_163_kubota_l4802_bh92_backhoe'`),
      count(`SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='l4802' AND m.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='l4802' AND mv.slug IN ('us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd') AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE mf.slug='kubota' AND m.slug='l4802' AND mv.slug IN ('us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd')`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='l4802' AND mv.slug IN ('us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd') AND sd.spec_key='engine.gross_power' AND ms.value_number=48.4`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='l4802' AND sd.spec_key='pto.rated_power' AND ((mv.slug IN ('us-current-gear-2wd','us-current-gear-4wd') AND ms.value_number=40.5) OR (mv.slug='us-current-hst-4wd' AND ms.value_number=39.0))`),
      count(`SELECT COUNT(*) AS count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='kubota' AND a.slug='la766' AND a.attachment_type='front-loader' AND a.data_status='verified'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug='l4802' AND a.slug='la766' AND a.attachment_type='front-loader' AND ma.confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='kubota' AND a.slug='bh92' AND a.attachment_type='backhoe' AND a.data_status='verified'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug='l4802' AND a.slug='bh92' AND a.attachment_type='backhoe' AND ma.confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM parts p JOIN manufacturers mf ON mf.id=p.manufacturer_id WHERE mf.slug='kubota' AND p.normalized_part_number IN ('HH16432430','HH1J143172','6C83055220','TE11242280','TE11216370','W950145101') AND p.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug='l4802' AND mv.slug IN ('us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd') AND p.normalized_part_number IN ('HH16432430','HH1J143172','6C83055220','TE11242280','TE11216370','W950145101') AND mp.fitment_confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM part_cross_references pcr JOIN parts oldp ON oldp.id=pcr.part_id JOIN parts newp ON newp.id=pcr.cross_part_id JOIN manufacturers mf ON mf.id=oldp.manufacturer_id WHERE mf.slug='kubota' AND pcr.relation_type='replaces' AND oldp.normalized_part_number='TC83037700' AND newp.normalized_part_number='W950145101'`),
    ]);

    const checks={
      migrationApplied:migrationApplied===1,
      machineRows:machineRows===1,
      currentVersions:currentVersions===3,
      specificationRows:specificationRows===90,
      grossPowerRows:grossPowerRows===3,
      ptoRows:ptoRows===3,
      loaderRows:loaderRows===1,
      loaderFitments:loaderFitments===1,
      backhoeRows:backhoeRows===1,
      backhoeFitments:backhoeFitments===1,
      serviceParts:serviceParts===6,
      versionedServiceFitments:versionedServiceFitments===18,
      hydraulicSupersessionRows:hydraulicSupersessionRows===1,
    };
    const ok=Object.values(checks).every(Boolean);

    return NextResponse.json({
      ok,
      expectedLatestL4802Migration:'20260827_163_kubota_l4802_bh92_backhoe',
      checks,
      values:{machineRows,currentVersions,specificationRows,grossPowerRows,ptoRows,loaderRows,loaderFitments,backhoeRows,backhoeFitments,serviceParts,versionedServiceFitments,hydraulicSupersessionRows},
      expected:{machineRows:1,currentVersions:3,specificationRows:90,grossPowerRows:3,ptoRows:3,loaderRows:1,loaderFitments:1,backhoeRows:1,backhoeFitments:1,serviceParts:6,versionedServiceFitments:18,hydraulicSupersessionRows:1},
    },{
      status:ok?200:503,
      headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'},
    });
  }catch(error){
    console.error('Kubota L4802 health check failed:',error);
    return NextResponse.json({ok:false,error:'Kubota L4802 health check failed'},{status:500,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  }
}
