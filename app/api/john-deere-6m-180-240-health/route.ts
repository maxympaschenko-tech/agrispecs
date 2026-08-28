import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
export const dynamic='force-dynamic';export const revalidate=0;
type R=RowDataPacket&{count:number};async function count(sql:string){const db=await getDbReady();const[r]=await db.query<R[]>(sql);return Number(r[0]?.count||0)}
const slugs="'6m-180','6m-185','6m-200','6m-220','6m-230','6m-240'";
export async function GET(){try{const[mig,m,v,hp,maxHp,pto,src]=await Promise.all([
 count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260828_264_john_deere_6m_180_240_current_specs'`),
 count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug IN (${slugs})`),
 count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='engine.rated_power' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='engine.maximum_power' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='pto.rated_power' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM source_records WHERE external_id IN ('john-deere-6m-180-current-us-2026-08','john-deere-6m-185-current-us-2026-08','john-deere-6m-200-current-us-2026-08','john-deere-6m-220-current-us-2026-08','john-deere-6m-230-current-us-2026-08','john-deere-6m-240-current-us-2026-08')`),
]);const checks={migration:mig===1,machines:m===6,currentVersions:v===6,ratedHpRows:hp===6,maxHpRows:maxHp===6,ptoRows:pto===6,sources:src===6};const ok=Object.values(checks).every(Boolean);return NextResponse.json({ok,checks,values:{mig,m,v,hp,maxHp,pto,src}},{status:ok?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})}catch(error){console.error(error);return NextResponse.json({ok:false,error:'John Deere 6M 180-240 health check failed'},{status:500})}}
