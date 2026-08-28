import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db';

type CountRow=RowDataPacket&{n:number};
async function count(db:Awaited<ReturnType<typeof getDbReady>>,sql:string,params:unknown[]=[]){const[r]=await db.query<CountRow[]>(sql,params);return Number(r[0]?.n||0)}

export const dynamic='force-dynamic';
export async function GET(){
 const db=await getDbReady();
 const migrationIds=['20260828_251_case_ih_farmall_small_utility_c_current_specs','20260828_252_case_ih_farmall_small_utility_c_l565_loader'];
 const migrations=await count(db,`SELECT COUNT(*) n FROM schema_migrations WHERE migration_id IN (?,?)`,migrationIds);
 const machines=await count(db,`SELECT COUNT(*) n FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug IN ('farmall-65c','farmall-75c')`);
 const versions=await count(db,`SELECT COUNT(*) n FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug IN ('farmall-65c','farmall-75c') AND mv.slug='united-states-current-2026-08' AND mv.is_current=TRUE`);
 const specs=await count(db,`SELECT COUNT(*) n FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug IN ('farmall-65c','farmall-75c') AND ms.confidence='official'`);
 const loader=await count(db,`SELECT COUNT(*) n FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='case-ih' AND a.slug='l565-farmall-small-utility-c' AND a.data_status='verified'`);
 const fitments=await count(db,`SELECT COUNT(*) n FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN attachments a ON a.id=ma.attachment_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug IN ('farmall-65c','farmall-75c') AND a.slug='l565-farmall-small-utility-c' AND ma.confidence='official'`);
 const sources=await count(db,`SELECT COUNT(*) n FROM source_records sr JOIN sources s ON s.id=sr.source_id WHERE s.domain='caseih.com' AND sr.external_id IN ('case-ih-farmall-65c-current-us','case-ih-farmall-75c-current-us','case-ih-farmall-small-utility-c-l565-current')`);
 const checks={migrations:migrations===2,machines:machines===2,versions:versions===2,specs:specs>=10,loader:loader===1,fitments:fitments===2,sources:sources===3};
 const ok=Object.values(checks).every(Boolean);
 return NextResponse.json({ok,checks,counts:{migrations,machines,versions,specs,loader,fitments,sources}},{status:ok?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
}
