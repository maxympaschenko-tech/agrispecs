import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
export const dynamic='force-dynamic';export const revalidate=0;type R=RowDataPacket&{count:number};
const slugs="'t7-190-all-new','t7-190-classic','t7-190-sidewinder-ii','t7-210-all-new','t7-210-classic','t7-210-sidewinder-ii','t7-225-all-new','t7-225-sidewinder-ii','t7-230-classic'";
async function count(sql:string){const db=await getDbReady();const[r]=await db.query<R[]>(sql);return Number(r[0]?.count||0)}
export async function GET(){try{const[migration,machines,versions,rated,frames,variants,source]=await Promise.all([
 count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260829_283_new_holland_t7_current_visible_models'`),
 count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug IN (${slugs})`),
 count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='engine.rated_power' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='configuration.frame_size' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='configuration.variant' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM source_records WHERE external_id='new-holland-t7-current-us-visible-models-2026-08'`)]);const checks={migration:migration===1,machines:machines===9,currentVersions:versions===9,ratedHorsepowerRows:rated===9,frameRows:frames===9,variantRows:variants===9,sourceRecord:source===1};const ok=Object.values(checks).every(Boolean);return NextResponse.json({ok,checks,values:{migration,machines,versions,rated,frames,variants,source}},{status:ok?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})}catch(error){console.error(error);return NextResponse.json({ok:false,error:'New Holland T7 health check failed'},{status:500})}}
