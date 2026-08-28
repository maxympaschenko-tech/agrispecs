import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic='force-dynamic';
export const revalidate=0;

type CountRow=RowDataPacket&{count:number};
async function count(sql:string){const db=await getDbReady();const [rows]=await db.query<CountRow[]>(sql);return Number(rows[0]?.count||0);}
const slugs="'vestrum-100','vestrum-110','vestrum-120','vestrum-130'";

export async function GET(){try{
  const [migrationApplied,machines,currentVersions,specRows,displacementRows,ratedRows,maxRows,ptoRows,hydraulicRows,hitchRows,loaderRows,loaderFitments,sourceRows]=await Promise.all([
    count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260828_236_case_ih_vestrum_l113_loader'`),
    count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug IN (${slugs})`),
    count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
    count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08'`),
    count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.displacement' AND ms.value_number=4.5`),
    count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.rated_power' AND ((m.slug='vestrum-100' AND ms.value_number=100) OR (m.slug='vestrum-110' AND ms.value_number=110) OR (m.slug='vestrum-120' AND ms.value_number=120) OR (m.slug='vestrum-130' AND ms.value_number=130))`),
    count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.maximum_power' AND ((m.slug='vestrum-100' AND ms.value_number=110) OR (m.slug='vestrum-110' AND ms.value_number=120) OR (m.slug='vestrum-120' AND ms.value_number=130) OR (m.slug='vestrum-130' AND ms.value_number=140))`),
    count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mv.slug='united-states-current-2026-08' AND sd.spec_key='pto.rated_power' AND ((m.slug='vestrum-100' AND ms.value_number=76) OR (m.slug='vestrum-110' AND ms.value_number=88) OR (m.slug='vestrum-120' AND ms.value_number=102) OR (m.slug='vestrum-130' AND ms.value_number=111))`),
    count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND sd.spec_key='hydraulics.main_pump_max_flow' AND ms.value_number=28.5`),
    count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND sd.spec_key='hitch.rear_max_lift_capacity' AND ms.value_number=6700`),
    count(`SELECT COUNT(*) count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='case-ih' AND a.slug='l113-vestrum' AND a.attachment_type='front-loader' AND a.data_status='verified'`),
    count(`SELECT COUNT(*) count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN attachments a ON a.id=ma.attachment_id WHERE m.slug IN (${slugs}) AND a.slug='l113-vestrum' AND ma.confidence='official'`),
    count(`SELECT COUNT(*) count FROM source_records WHERE external_id IN ('case-ih-vestrum-current-us-100-130-2026-08','case-ih-vestrum-100-current-us','case-ih-vestrum-110-current-us','case-ih-vestrum-120-current-us','case-ih-vestrum-130-current-us','case-ih-vestrum-l113-loader-current')`),
  ]);
  const checks={migrationApplied:migrationApplied===1,machines:machines===4,currentVersions:currentVersions===4,specRows:specRows===36,displacementRows:displacementRows===4,ratedRows:ratedRows===4,maxRows:maxRows===4,ptoRows:ptoRows===4,hydraulicRows:hydraulicRows===4,hitchRows:hitchRows===4,loaderRows:loaderRows===1,loaderFitments:loaderFitments===4,sourceRows:sourceRows===6};
  const ok=Object.values(checks).every(Boolean);
  return NextResponse.json({ok,expectedLatestCaseIHVestrumMigration:'20260828_236_case_ih_vestrum_l113_loader',checks,values:{migrationApplied,machines,currentVersions,specRows,displacementRows,ratedRows,maxRows,ptoRows,hydraulicRows,hitchRows,loaderRows,loaderFitments,sourceRows}},{status:ok?200:503,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
}catch(error){console.error('Case IH Vestrum health check failed:',error);return NextResponse.json({ok:false,error:'Case IH Vestrum health check failed'},{status:500,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});}}
