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
      migrationApplied,machineRows,currentVersions,specificationRows,grossPowerRows,
      attachmentRows,attachmentFitments,bh92RopsRestrictionRows,
      serviceParts,versionedServiceFitments,hstFilterFitments,gearHstFilterFitments,hstFilterSupersessions,mx5400fProvenanceRows,oilSeparatorFitments,
    ]=await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260827_169_kubota_mx_oil_separator_filter'`),
      count(`
        SELECT COUNT(*) AS count FROM machines m
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug IN ('mx4900','mx5400','mx6000') AND m.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_versions mv
        JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND (
          (m.slug='mx4900' AND mv.slug IN ('us-current-gear-4wd','us-current-hst-4wd')) OR
          (m.slug='mx5400' AND mv.slug IN ('us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd')) OR
          (m.slug='mx6000' AND mv.slug='us-current-hst-4wd')
        ) AND mv.is_current=1
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        WHERE mf.slug='kubota' AND m.slug IN ('mx4900','mx5400','mx6000') AND mv.is_current=1
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        WHERE mf.slug='kubota' AND sd.spec_key='engine.gross_power' AND (
          (m.slug='mx4900' AND ((mv.slug='us-current-gear-4wd' AND ms.value_number=50.3) OR (mv.slug='us-current-hst-4wd' AND ms.value_number=51.8))) OR
          (m.slug='mx5400' AND ((mv.slug IN ('us-current-gear-2wd','us-current-gear-4wd') AND ms.value_number=55.5) OR (mv.slug='us-current-hst-4wd' AND ms.value_number=57.0))) OR
          (m.slug='mx6000' AND mv.slug='us-current-hst-4wd' AND ms.value_number=63.4)
        )
      `),
      count(`
        SELECT COUNT(*) AS count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id
        WHERE mf.slug='kubota' AND ((a.attachment_type='front-loader' AND a.slug='la1065') OR (a.attachment_type='backhoe' AND a.slug='bh92')) AND a.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND m.slug IN ('mx4900','mx5400','mx6000') AND a.slug IN ('la1065','bh92') AND ma.confidence='official'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND m.slug IN ('mx4900','mx5400','mx6000') AND a.slug='bh92'
          AND ma.compatibility_note LIKE '%cannot be used with cab models%'
      `),
      count(`
        SELECT COUNT(*) AS count FROM parts p JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='kubota' AND p.normalized_part_number IN ('HH16432430','HH1J143172','R140142270','HHTA037710','HHTA059900','1J77005810') AND p.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('mx4900','mx5400','mx6000')
          AND p.normalized_part_number IN ('HH16432430','HH1J143172','R140142270','HHTA037710','HHTA059900','1J77005810')
          AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('mx4900','mx5400','mx6000') AND mv.slug='us-current-hst-4wd'
          AND p.normalized_part_number='HHTA059900' AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('mx4900','mx5400','mx6000') AND mv.slug IN ('us-current-gear-2wd','us-current-gear-4wd')
          AND p.normalized_part_number='HHTA059900'
      `),
      count(`
        SELECT COUNT(*) AS count FROM part_cross_references pcr
        JOIN parts oldp ON oldp.id=pcr.part_id JOIN parts newp ON newp.id=pcr.cross_part_id
        JOIN manufacturers mf ON mf.id=oldp.manufacturer_id
        WHERE mf.slug='kubota' AND pcr.relation_type='replaces' AND newp.normalized_part_number='HHTA059900'
          AND oldp.normalized_part_number IN ('TA24059900','TA24059901','V051165320')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id
        JOIN source_records sr ON sr.id=mp.source_record_id
        WHERE mf.slug='kubota' AND m.slug='mx5400' AND mv.slug='us-current-gear-2wd'
          AND p.normalized_part_number IN ('HH16432430','HH1J143172','R140142270','HHTA037710')
          AND sr.external_id='messicks-kubota-mx5400f-service-filters'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('mx4900','mx5400','mx6000')
          AND p.normalized_part_number='1J77005810' AND mp.fitment_confidence='high'
      `),
    ]);

    const checks={
      migrationApplied:migrationApplied===1,
      machineRows:machineRows===3,
      currentVersions:currentVersions===6,
      specificationRows:specificationRows===168,
      grossPowerRows:grossPowerRows===6,
      attachmentRows:attachmentRows===2,
      attachmentFitments:attachmentFitments===6,
      bh92RopsRestrictionRows:bh92RopsRestrictionRows===3,
      serviceParts:serviceParts===6,
      versionedServiceFitments:versionedServiceFitments===33,
      hstFilterFitments:hstFilterFitments===3,
      gearHstFilterFitments:gearHstFilterFitments===0,
      hstFilterSupersessions:hstFilterSupersessions===3,
      mx5400fProvenanceRows:mx5400fProvenanceRows===4,
      oilSeparatorFitments:oilSeparatorFitments===6,
    };
    const ok=Object.values(checks).every(Boolean);

    return NextResponse.json({
      ok,
      expectedLatestMXMigration:'20260827_169_kubota_mx_oil_separator_filter',
      checks,
      values:{machineRows,currentVersions,specificationRows,grossPowerRows,attachmentRows,attachmentFitments,bh92RopsRestrictionRows,serviceParts,versionedServiceFitments,hstFilterFitments,gearHstFilterFitments,hstFilterSupersessions,mx5400fProvenanceRows,oilSeparatorFitments},
      expected:{machineRows:3,currentVersions:6,specificationRows:168,grossPowerRows:6,attachmentRows:2,attachmentFitments:6,bh92RopsRestrictionRows:3,serviceParts:6,versionedServiceFitments:33,hstFilterFitments:3,gearHstFilterFitments:0,hstFilterSupersessions:3,mx5400fProvenanceRows:4,oilSeparatorFitments:6},
    },{
      status:ok?200:503,
      headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'},
    });
  }catch(error){
    console.error('Kubota MX health check failed:',error);
    return NextResponse.json({ok:false,error:'Kubota MX health check failed'},{status:500,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  }
}
