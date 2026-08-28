import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
export const dynamic='force-dynamic';export const revalidate=0;
type CountRow=RowDataPacket&{count:number};async function count(sql:string){const db=await getDbReady();const[rows]=await db.query<CountRow[]>(sql);return Number(rows[0]?.count||0)}
const slugs="'puma-150','puma-165','puma-175'";
export async function GET(){try{const[migrations,machines,versions,specs,hpRows,ptoRows,loader,fitments,sources]=await Promise.all([
 count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260828_257_case_ih_puma_150_175_current'`),
 count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug IN (${slugs})`),
 count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08'`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE sd.spec_key='engine.rated_power' AND ((m.slug='puma-150' AND ms.value_number=150) OR (m.slug='puma-165' AND ms.value_number=165) OR (m.slug='puma-175' AND ms.value_number=180))`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE sd.spec_key='pto.rated_power' AND ((m.slug='puma-150' AND ms.value_number=125) OR (m.slug='puma-165' AND ms.value_number=140) OR (m.slug='puma-175' AND ms.value_number=150))`),
 count(`SELECT COUNT(*) count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='case-ih' AND a.slug='l116-puma' AND a.data_status='verified'`),
 count(`SELECT COUNT(*) count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN attachments a ON a.id=ma.attachment_id WHERE a.slug='l116-puma' AND m.slug IN ('puma-150','puma-165','puma-175','afs-connect-puma-185') AND ma.confidence='official'`),
 count(`SELECT COUNT(*) count FROM source_records WHERE external_id IN ('case-ih-puma-150-current-us','case-ih-puma-165-current-us','case-ih-puma-175-current-us','case-ih-puma-l116-current')`)
]);const checks={migrations:migrations===1,machines:machines===3,versions:versions===3,specs:specs===21,hpRows:hpRows===3,ptoRows:ptoRows===3,loader:loader===1,fitments:fitments===4,sources:sources===4};const ok=Object.values(checks).every(Boolean);return NextResponse.json({ok,checks,values:{migrations,machines,versions,specs,hpRows,ptoRows,loader,fitments,sources}},{status:ok?200:503,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}})}catch(error){console.error(error);return NextResponse.json({ok:false,error:'Puma 150-175 health check failed'},{status:500})}}
