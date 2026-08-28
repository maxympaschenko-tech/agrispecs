import {NextResponse} from 'next/server';
import type {RowDataPacket} from 'mysql2';
import {getDbReady} from '@/lib/db-migrations';
export const dynamic='force-dynamic';export const revalidate=0;
type R=RowDataPacket&{count:number};const slugs="'farmall-90c','farmall-100c','farmall-110c','farmall-120c'";
async function count(sql:string){const db=await getDbReady();const [r]=await db.query<R[]>(sql);return Number(r[0]?.count||0)}
export async function GET(){try{const [m,v,s,h,l,f,src]=await Promise.all([
count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers f ON f.id=m.manufacturer_id WHERE f.slug='case-ih' AND m.slug IN (${slugs})`),
count(`SELECT COUNT(*) count FROM machine_versions v JOIN machines m ON m.id=v.machine_id WHERE m.slug IN (${slugs}) AND v.slug='united-states-current-2026-08' AND v.is_current=1`),
count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions v ON v.id=ms.machine_version_id WHERE m.slug IN (${slugs}) AND v.slug='united-states-current-2026-08'`),
count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions v ON v.id=ms.machine_version_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND v.slug='united-states-current-2026-08' AND d.spec_key='engine.rated_power'`),
count(`SELECT COUNT(*) count FROM attachments a JOIN manufacturers f ON f.id=a.manufacturer_id WHERE f.slug='case-ih' AND a.slug='l635-farmall-medium-utility-c' AND a.data_status='verified'`),
count(`SELECT COUNT(*) count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN attachments a ON a.id=ma.attachment_id WHERE m.slug IN (${slugs}) AND a.slug='l635-farmall-medium-utility-c' AND ma.confidence='official'`),
count(`SELECT COUNT(*) count FROM source_records WHERE external_id IN ('case-ih-farmall-90c-current-us','case-ih-farmall-100c-current-us','case-ih-farmall-110c-current-us','case-ih-farmall-120c-current-us','case-ih-farmall-medium-utility-c-l635-current')`)
]);const checks={machines:m===4,currentVersions:v===4,specRows:s===20,horsepowerRows:h===4,loader:l===1,fitments:f===4,sources:src===5};const ok=Object.values(checks).every(Boolean);return NextResponse.json({ok,checks,values:{m,v,s,h,l,f,src}},{status:ok?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})}catch(e){console.error(e);return NextResponse.json({ok:false},{status:500})}}
