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
      migrationApplied,
      machineRows,
      currentVersions,
      specificationRows,
      currentGrossPowerRows,
      bx2680CurrentPowerRows,
      bx2680LegacyPowerRows,
      attachmentRows,
      attachmentFitments,
      bt603Fitments,
      mowerRows,
      mowerFitments,
      easyOverBarTireRestrictionRows,
      serviceParts,
      versionedServiceFitments,
      bx2680CorrectOilFitments,
      bx2680IncorrectOilFitments,
      otherBxCurrentOilFitments,
      supersessionRows,
    ]=await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260827_174_kubota_bx_mowers'`),
      count(`
        SELECT COUNT(*) AS count FROM machines m
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug IN ('bx1880','bx2380','bx2680','bx23s')
          AND m.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_versions mv
        JOIN machines m ON m.id=mv.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug IN ('bx1880','bx2380','bx2680','bx23s')
          AND mv.slug='us-current-hst-4wd' AND mv.is_current=1
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        WHERE mf.slug='kubota' AND m.slug IN ('bx1880','bx2380','bx2680','bx23s')
          AND mv.slug='us-current-hst-4wd'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        WHERE mf.slug='kubota' AND mv.slug='us-current-hst-4wd' AND sd.spec_key='engine.gross_power' AND (
          (m.slug='bx1880' AND ms.value_number=16.6) OR
          (m.slug='bx2380' AND ms.value_number=21.6) OR
          (m.slug='bx2680' AND ms.value_number=23.3) OR
          (m.slug='bx23s' AND ms.value_number=21.6)
        )
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        WHERE mf.slug='kubota' AND m.slug='bx2680' AND mv.slug='us-current-hst-4wd'
          AND ((sd.spec_key='engine.gross_power' AND ms.value_number=23.3)
            OR (sd.spec_key='pto.rated_power' AND ms.value_number=19.2))
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        WHERE mf.slug='kubota' AND m.slug='bx2680' AND mv.slug='us-current-hst-4wd'
          AND ((sd.spec_key='engine.gross_power' AND ms.value_number=24.8)
            OR (sd.spec_key='pto.rated_power' AND ms.value_number=19.5))
      `),
      count(`
        SELECT COUNT(*) AS count FROM attachments a
        JOIN manufacturers mf ON mf.id=a.manufacturer_id
        WHERE mf.slug='kubota' AND a.slug IN ('la344','la344s','la340','la340s','bt603')
          AND a.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND m.slug IN ('bx1880','bx2380','bx2680','bx23s')
          AND a.slug IN ('la344','la344s','la340','la340s','bt603')
          AND ma.confidence='official'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND m.slug='bx23s' AND a.slug='bt603'
          AND a.attachment_type='backhoe' AND ma.confidence='official'
      `),
      count(`
        SELECT COUNT(*) AS count FROM attachments a
        JOIN manufacturers mf ON mf.id=a.manufacturer_id
        WHERE mf.slug='kubota'
          AND a.slug IN ('rck48-18bx','rck54-23bx','rck60b-23bx','rck54d-26bx-1','rck60d-26bx-1')
          AND a.attachment_type IN ('mid-mount-mower','easy-over-mower')
          AND a.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND m.slug IN ('bx1880','bx2380','bx2680','bx23s')
          AND a.slug IN ('rck48-18bx','rck54-23bx','rck60b-23bx','rck54d-26bx-1','rck60d-26bx-1')
          AND ma.confidence='official'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND m.slug IN ('bx2380','bx2680','bx23s')
          AND a.slug IN ('rck54d-26bx-1','rck60d-26bx-1')
          AND ma.compatibility_note LIKE '%not compatible with bar tires%'
      `),
      count(`
        SELECT COUNT(*) AS count FROM parts p
        JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='kubota'
          AND p.normalized_part_number IN ('HH1J032430','HH15032094','1258143012','K121182320','HHK2036994')
          AND p.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('bx1880','bx2380','bx2680','bx23s')
          AND mv.slug='us-current-hst-4wd'
          AND p.normalized_part_number IN ('HH1J032430','HH15032094','1258143012','K121182320','HHK2036994')
          AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug='bx2680' AND mv.slug='us-current-hst-4wd'
          AND p.normalized_part_number='HH15032094' AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug='bx2680' AND mv.slug='us-current-hst-4wd'
          AND p.normalized_part_number='HH1J032430'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('bx1880','bx2380','bx23s')
          AND mv.slug='us-current-hst-4wd'
          AND p.normalized_part_number='HH1J032430' AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM part_cross_references pcr
        JOIN parts oldp ON oldp.id=pcr.part_id
        JOIN parts newp ON newp.id=pcr.cross_part_id
        JOIN manufacturers mf ON mf.id=oldp.manufacturer_id
        WHERE mf.slug='kubota' AND pcr.relation_type='replaces' AND (
          (oldp.normalized_part_number='HH15032430' AND newp.normalized_part_number='HH1J032430') OR
          (oldp.normalized_part_number='HHK2036990' AND newp.normalized_part_number='HHK2036994') OR
          (oldp.normalized_part_number='K256136990' AND newp.normalized_part_number='HHK2036994') OR
          (oldp.normalized_part_number='HH15032090' AND newp.normalized_part_number='HH15032094') OR
          (oldp.normalized_part_number='1524132090' AND newp.normalized_part_number='HH15032094')
        )
      `),
    ]);

    const checks={
      migrationApplied:migrationApplied===1,
      machineRows:machineRows===4,
      currentVersions:currentVersions===4,
      specificationRows:specificationRows===108,
      currentGrossPowerRows:currentGrossPowerRows===4,
      bx2680CurrentPowerRows:bx2680CurrentPowerRows===2,
      bx2680LegacyPowerRows:bx2680LegacyPowerRows===0,
      attachmentRows:attachmentRows===5,
      attachmentFitments:attachmentFitments===9,
      bt603Fitments:bt603Fitments===1,
      mowerRows:mowerRows===5,
      mowerFitments:mowerFitments===14,
      easyOverBarTireRestrictionRows:easyOverBarTireRestrictionRows===6,
      serviceParts:serviceParts===5,
      versionedServiceFitments:versionedServiceFitments===16,
      bx2680CorrectOilFitments:bx2680CorrectOilFitments===1,
      bx2680IncorrectOilFitments:bx2680IncorrectOilFitments===0,
      otherBxCurrentOilFitments:otherBxCurrentOilFitments===3,
      supersessionRows:supersessionRows===5,
    };
    const ok=Object.values(checks).every(Boolean);

    return NextResponse.json({
      ok,
      expectedLatestBXMigration:'20260827_174_kubota_bx_mowers',
      checks,
      values:{
        machineRows,currentVersions,specificationRows,currentGrossPowerRows,bx2680CurrentPowerRows,bx2680LegacyPowerRows,
        attachmentRows,attachmentFitments,bt603Fitments,mowerRows,mowerFitments,easyOverBarTireRestrictionRows,
        serviceParts,versionedServiceFitments,bx2680CorrectOilFitments,bx2680IncorrectOilFitments,otherBxCurrentOilFitments,supersessionRows,
      },
      expected:{
        machineRows:4,currentVersions:4,specificationRows:108,currentGrossPowerRows:4,bx2680CurrentPowerRows:2,bx2680LegacyPowerRows:0,
        attachmentRows:5,attachmentFitments:9,bt603Fitments:1,mowerRows:5,mowerFitments:14,easyOverBarTireRestrictionRows:6,
        serviceParts:5,versionedServiceFitments:16,bx2680CorrectOilFitments:1,bx2680IncorrectOilFitments:0,otherBxCurrentOilFitments:3,supersessionRows:5,
      },
    },{
      status:ok?200:503,
      headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'},
    });
  }catch(error){
    console.error('Kubota BX health check failed:',error);
    return NextResponse.json({ok:false,error:'Kubota BX health check failed'},{
      status:500,
      headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'},
    });
  }
}
