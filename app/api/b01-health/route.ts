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
      b2601CurrentRevisionRows,
      b2601LegacyRevisionRows,
      b2601HighConfidencePowerRows,
      attachmentRows,
      attachmentFitments,
      unsupportedNarrowAttachmentFitments,
      mowerRows,
      mowerFitments,
      gearMowerFitments,
      snowBlowerRows,
      snowBlowerFitments,
      narrowSnowBlowerFitments,
      serviceParts,
      versionedServiceFitments,
      hstFilterFitments,
      gearHstFilterFitments,
      b2401DirectServiceFitments,
    ]=await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260827_179_kubota_b01_snow_blowers'`),
      count(`
        SELECT COUNT(*) AS count FROM machines m
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug IN ('b2301','b2601','b2401dt','b2401dtn')
          AND m.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_versions mv
        JOIN machines m ON m.id=mv.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND (
          (m.slug IN ('b2301','b2601') AND mv.slug='us-current-hst-4wd') OR
          (m.slug='b2401dt' AND mv.slug='us-current-gear-4wd') OR
          (m.slug='b2401dtn' AND mv.slug='us-current-gear-narrow-4wd')
        ) AND mv.is_current=1
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        WHERE mf.slug='kubota' AND m.slug IN ('b2301','b2601','b2401dt','b2401dtn')
          AND mv.is_current=1
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        WHERE mf.slug='kubota' AND sd.spec_key='engine.gross_power' AND (
          (m.slug='b2301' AND mv.slug='us-current-hst-4wd' AND ms.value_number=20.9) OR
          (m.slug='b2601' AND mv.slug='us-current-hst-4wd' AND ms.value_number=23.3) OR
          (m.slug='b2401dt' AND mv.slug='us-current-gear-4wd' AND ms.value_number=21.9) OR
          (m.slug='b2401dtn' AND mv.slug='us-current-gear-narrow-4wd' AND ms.value_number=21.9)
        )
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        WHERE mf.slug='kubota' AND m.slug='b2601' AND mv.slug='us-current-hst-4wd'
          AND ((sd.spec_key='engine.gross_power' AND ms.value_number=23.3)
            OR (sd.spec_key='pto.rated_power' AND ms.value_number=19.4))
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        WHERE mf.slug='kubota' AND m.slug='b2601' AND mv.slug='us-current-hst-4wd'
          AND ((sd.spec_key='engine.gross_power' AND ms.value_number=24.3)
            OR (sd.spec_key='pto.rated_power' AND ms.value_number=19.5))
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_specs ms
        JOIN machines m ON m.id=ms.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=ms.machine_version_id
        JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
        WHERE mf.slug='kubota' AND m.slug='b2601' AND mv.slug='us-current-hst-4wd'
          AND sd.spec_key IN ('engine.gross_power','pto.rated_power')
          AND ms.confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM attachments a
        JOIN manufacturers mf ON mf.id=a.manufacturer_id
        WHERE mf.slug='kubota' AND ((a.slug='la435' AND a.attachment_type='front-loader') OR (a.slug='bh70' AND a.attachment_type='backhoe'))
          AND a.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND m.slug IN ('b2301','b2601')
          AND a.slug IN ('la435','bh70') AND ma.confidence='official'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND m.slug='b2401dtn'
          AND a.slug IN ('la435','bh70')
      `),
      count(`
        SELECT COUNT(*) AS count FROM attachments a
        JOIN manufacturers mf ON mf.id=a.manufacturer_id
        WHERE mf.slug='kubota' AND a.attachment_type='mid-mount-mower'
          AND a.slug IN ('rck54-32','rck60-32') AND a.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND m.slug IN ('b2301','b2601')
          AND a.slug IN ('rck54-32','rck60-32') AND ma.confidence='official'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND m.slug IN ('b2401dt','b2401dtn')
          AND a.slug IN ('rck54-32','rck60-32')
      `),
      count(`
        SELECT COUNT(*) AS count FROM attachments a
        JOIN manufacturers mf ON mf.id=a.manufacturer_id
        WHERE mf.slug='kubota' AND a.attachment_type='front-snow-blower'
          AND a.slug IN ('bx2816a','bx2830') AND a.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND m.slug IN ('b2301','b2601','b2401dt')
          AND a.slug IN ('bx2816a','bx2830') AND ma.confidence='official'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND m.slug='b2401dtn'
          AND a.slug IN ('bx2816a','bx2830')
      `),
      count(`
        SELECT COUNT(*) AS count FROM parts p
        JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='kubota'
          AND p.normalized_part_number IN ('HH15032094','6A32059930','6C06099414','3272158242','HH66036060','HH67037712')
          AND p.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('b2301','b2601','b2401dt','b2401dtn')
          AND p.normalized_part_number IN ('HH15032094','6A32059930','6C06099414','3272158242','HH66036060','HH67037712')
          AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN machine_versions mv ON mv.id=mp.machine_version_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('b2301','b2601')
          AND mv.slug='us-current-hst-4wd'
          AND p.normalized_part_number='HH66036060'
          AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('b2401dt','b2401dtn')
          AND p.normalized_part_number='HH66036060'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('b2401dt','b2401dtn')
          AND p.normalized_part_number IN ('HH15032094','6C06099414','3272158242')
          AND mp.fitment_confidence='high'
      `),
    ]);

    const checks={
      migrationApplied:migrationApplied===1,
      machineRows:machineRows===4,
      currentVersions:currentVersions===4,
      specificationRows:specificationRows===120,
      currentGrossPowerRows:currentGrossPowerRows===4,
      b2601CurrentRevisionRows:b2601CurrentRevisionRows===2,
      b2601LegacyRevisionRows:b2601LegacyRevisionRows===0,
      b2601HighConfidencePowerRows:b2601HighConfidencePowerRows===2,
      attachmentRows:attachmentRows===2,
      attachmentFitments:attachmentFitments===4,
      unsupportedNarrowAttachmentFitments:unsupportedNarrowAttachmentFitments===0,
      mowerRows:mowerRows===2,
      mowerFitments:mowerFitments===4,
      gearMowerFitments:gearMowerFitments===0,
      snowBlowerRows:snowBlowerRows===2,
      snowBlowerFitments:snowBlowerFitments===6,
      narrowSnowBlowerFitments:narrowSnowBlowerFitments===0,
      serviceParts:serviceParts===6,
      versionedServiceFitments:versionedServiceFitments===18,
      hstFilterFitments:hstFilterFitments===2,
      gearHstFilterFitments:gearHstFilterFitments===0,
      b2401DirectServiceFitments:b2401DirectServiceFitments===6,
    };
    const ok=Object.values(checks).every(Boolean);

    return NextResponse.json({
      ok,
      expectedLatestB01Migration:'20260827_179_kubota_b01_snow_blowers',
      checks,
      values:{
        machineRows,currentVersions,specificationRows,currentGrossPowerRows,b2601CurrentRevisionRows,b2601LegacyRevisionRows,b2601HighConfidencePowerRows,
        attachmentRows,attachmentFitments,unsupportedNarrowAttachmentFitments,mowerRows,mowerFitments,gearMowerFitments,
        snowBlowerRows,snowBlowerFitments,narrowSnowBlowerFitments,
        serviceParts,versionedServiceFitments,hstFilterFitments,gearHstFilterFitments,b2401DirectServiceFitments,
      },
      expected:{
        machineRows:4,currentVersions:4,specificationRows:120,currentGrossPowerRows:4,b2601CurrentRevisionRows:2,b2601LegacyRevisionRows:0,b2601HighConfidencePowerRows:2,
        attachmentRows:2,attachmentFitments:4,unsupportedNarrowAttachmentFitments:0,mowerRows:2,mowerFitments:4,gearMowerFitments:0,
        snowBlowerRows:2,snowBlowerFitments:6,narrowSnowBlowerFitments:0,
        serviceParts:6,versionedServiceFitments:18,hstFilterFitments:2,gearHstFilterFitments:0,b2401DirectServiceFitments:6,
      },
    },{
      status:ok?200:503,
      headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'},
    });
  }catch(error){
    console.error('Kubota B01 health check failed:',error);
    return NextResponse.json({ok:false,error:'Kubota B01 health check failed'},{
      status:500,
      headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'},
    });
  }
}
