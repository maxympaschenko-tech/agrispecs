import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
export const dynamic='force-dynamic';export const revalidate=0;type R=RowDataPacket&{count:number};
const slugs="'ts6-110','ts6-120','ts6-120-high-clearance','ts6-130','ts6-140'";
async function count(sql:string){const db=await getDbReady();const[r]=await db.query<R[]>(sql);return Number(r[0]?.count||0)}
export async function GET(){try{const[migration,machines,versions,rated,pto,emissions,highClearance,source]=await Promise.all([
 count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260829_287_new_holland_ts6_series_ii_current_specs'`),
 count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug IN (${slugs})`),
 count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='engine.rated_power' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='pto.rated_power' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='engine.emissions' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug='ts6-120-high-clearance' AND d.spec_key='configuration.application' AND ms.value_text='High-clearance specialty' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM source_records WHERE external_id='new-holland-ts6-series-ii-current-us-2026-08'`)]);const checks={migration:migration===1,machines:machines===5,currentVersions:versions===5,ratedRows:rated===5,ptoRows:pto===5,emissionsRows:emissions===5,highClearance:highClearance===1,sourceRecord:source===1};const ok=Object.values(checks).every(Boolean);return NextResponse.json({ok,checks,values:{migration,machines,versions,rated,pto,emissions,highClearance,source}},{status:ok?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})}catch(error){console.error(error);return NextResponse.json({ok:false,error:'New Holland TS6 Series II health check failed'},{status:500})}}
