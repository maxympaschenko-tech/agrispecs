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
      narrowRows,coreAttachmentRows,loaderFitments,bh77HighFitments,narrowLoaderRestrictionRows,
      serviceParts,versionedServiceFitments,hstFilterFitments,narrowHstFilterFitments,supersessionRows,
      snowBlowerRows,snowFitments,snowRestrictionRows,mowerRows,mowerFitments,lx2620MowerFitments,lx3520B1017Rows,
    ]=await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260828_186_kubota_lx20_mowers'`),
      count(`SELECT COUNT(*) AS count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('lx2620','lx3520','lx4020') AND m.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug IN ('lx2620','lx3520','lx4020') AND mv.is_current=1 AND mv.slug IN ('us-current-hsd-rops','us-current-hsdc-cab','us-current-suhsd-rops','us-current-dtn-narrow','us-current-suhsdc-cab')`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE mf.slug='kubota' AND m.slug IN ('lx2620','lx3520','lx4020') AND mv.is_current=1`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug IN ('lx2620','lx3520','lx4020') AND mv.is_current=1 AND sd.spec_key='engine.gross_power' AND ((m.slug='lx2620' AND ms.value_number=23.3) OR (m.slug='lx3520' AND ms.value_number=34.9) OR (m.slug='lx4020' AND ms.value_number=39.8))`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND mv.is_current=1 AND sd.spec_key='pto.rated_power' AND ((m.slug='lx2620' AND ms.value_number=19.4) OR (m.slug='lx3520' AND ((mv.slug='us-current-dtn-narrow' AND ms.value_number=29.6) OR (mv.slug<>'us-current-dtn-narrow' AND ms.value_number=28.7))) OR (m.slug='lx4020' AND ((mv.slug='us-current-hsd-rops' AND ms.value_number=32.6) OR (mv.slug='us-current-hsdc-cab' AND ms.value_number=31.2))))`),
      count(`SELECT COUNT(*) AS count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mf.slug='kubota' AND m.slug='lx3520' AND mv.slug='us-current-dtn-narrow' AND ((sd.spec_key='dimensions.overall_width' AND ms.value_number=39.4) OR (sd.spec_key='pto.rated_power' AND ms.value_number=29.6) OR (sd.spec_key='hydraulics.main_pump_capacity' AND ms.value_number=9.1))`),
      count(`SELECT COUNT(*) AS count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='kubota' AND ((a.slug='la535' AND a.attachment_type='front-loader') OR (a.slug='la545' AND a.attachment_type='front-loader') OR (a.slug='bh77' AND a.attachment_type='backhoe')) AND a.data_status='verified'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug IN ('lx2620','lx3520','lx4020') AND a.slug IN ('la535','la545') AND ma.confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug IN ('lx2620','lx3520','lx4020') AND a.slug='bh77' AND ma.confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug='lx3520' AND a.slug='la545' AND ma.compatibility_note LIKE '%excludes the LX3520DTN%'`),
      count(`SELECT COUNT(*) AS count FROM parts p JOIN manufacturers mf ON mf.id=p.manufacturer_id WHERE mf.slug='kubota' AND p.normalized_part_number IN ('HH15032094','6A32059930','6C06099414','3272158242','HHK7014073','HH16032093','R140142270','R240142280','6C83055120','6C83055220','HH66036060','HHK3216774') AND p.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug IN ('lx2620','lx3520','lx4020') AND mv.is_current=1 AND p.normalized_part_number IN ('HH15032094','6A32059930','6C06099414','3272158242','HHK7014073','HH16032093','R140142270','R240142280','6C83055120','6C83055220','HH66036060','HHK3216774') AND mp.fitment_confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug IN ('lx3520','lx4020') AND p.normalized_part_number='HH66036060' AND mp.fitment_confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE mf.slug='kubota' AND m.slug='lx3520' AND mv.slug='us-current-dtn-narrow' AND p.normalized_part_number='HH66036060'`),
      count(`SELECT COUNT(*) AS count FROM part_cross_references pcr JOIN parts oldp ON oldp.id=pcr.part_id JOIN parts newp ON newp.id=pcr.cross_part_id JOIN manufacturers mf ON mf.id=oldp.manufacturer_id WHERE mf.slug='kubota' AND pcr.relation_type='replaces' AND ((newp.normalized_part_number='HHK3216774' AND oldp.normalized_part_number IN ('HHK3216772','HH3A082630','HHK3216770','3A43182630','K316116770','K759132050')) OR (newp.normalized_part_number='HHK7014073' AND oldp.normalized_part_number IN ('HHK7014070','K756114070','K756114073')) OR (newp.normalized_part_number='HH16032093' AND oldp.normalized_part_number IN ('1627132090','1627132092','1627132093','1627132099','HH16032090')))`),
      count(`SELECT COUNT(*) AS count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='kubota' AND a.attachment_type='snow-blower' AND a.slug IN ('lx2963','lx2970','lx2980') AND a.data_status='verified'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug IN ('lx2620','lx3520','lx4020') AND a.slug IN ('lx2963','lx2970','lx2980') AND ma.confidence='official'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug IN ('lx2620','lx3520') AND a.slug IN ('lx2963','lx2970','lx2980') AND ma.compatibility_note LIKE '%excludes%'`),
      count(`SELECT COUNT(*) AS count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='kubota' AND a.attachment_type='mid-mount-mower' AND a.slug IN ('rck60-40lx','rc72-40lx') AND a.data_status='verified'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug IN ('lx3520','lx4020') AND a.slug IN ('rck60-40lx','rc72-40lx') AND ma.confidence='high'`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug='lx2620' AND a.slug IN ('rck60-40lx','rc72-40lx')`),
      count(`SELECT COUNT(*) AS count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN attachments a ON a.id=ma.attachment_id WHERE mf.slug='kubota' AND m.slug='lx3520' AND a.slug IN ('rck60-40lx','rc72-40lx') AND ma.compatibility_note LIKE '%B1017%'`),
    ]);

    const checks={
      migrationApplied:migrationApplied===1,machineRows:machineRows===3,currentVersions:currentVersions===9,
      specificationRows:specificationRows===261,grossPowerRows:grossPowerRows===9,ptoPowerRows:ptoPowerRows===9,narrowRows:narrowRows===3,
      coreAttachmentRows:coreAttachmentRows===3,loaderFitments:loaderFitments===3,bh77HighFitments:bh77HighFitments===3,narrowLoaderRestrictionRows:narrowLoaderRestrictionRows===1,
      serviceParts:serviceParts===12,versionedServiceFitments:versionedServiceFitments===56,hstFilterFitments:hstFilterFitments===5,narrowHstFilterFitments:narrowHstFilterFitments===0,supersessionRows:supersessionRows===14,
      snowBlowerRows:snowBlowerRows===3,snowFitments:snowFitments===9,snowRestrictionRows:snowRestrictionRows===6,
      mowerRows:mowerRows===2,mowerFitments:mowerFitments===4,lx2620MowerFitments:lx2620MowerFitments===0,lx3520B1017Rows:lx3520B1017Rows===2,
    };
    const ok=Object.values(checks).every(Boolean);

    return NextResponse.json({
      ok,
      expectedLatestLX20Migration:'20260828_186_kubota_lx20_mowers',
      checks,
      values:{machineRows,currentVersions,specificationRows,grossPowerRows,ptoPowerRows,narrowRows,coreAttachmentRows,loaderFitments,bh77HighFitments,narrowLoaderRestrictionRows,serviceParts,versionedServiceFitments,hstFilterFitments,narrowHstFilterFitments,supersessionRows,snowBlowerRows,snowFitments,snowRestrictionRows,mowerRows,mowerFitments,lx2620MowerFitments,lx3520B1017Rows},
    },{
      status:ok?200:503,
      headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'},
    });
  }catch(error){
    console.error('Kubota LX20 health check failed:',error);
    return NextResponse.json({ok:false,error:'Kubota LX20 health check failed'},{status:500,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  }
}
