import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic='force-dynamic';
export const revalidate=0;
type R=RowDataPacket&{count:number};
const slugs="'boomer-35','boomer-40','boomer-45','boomer-50','boomer-55'";
async function count(sql:string){const db=await getDbReady();const[r]=await db.query<R[]>(sql);return Number(r[0]?.count||0)}
export async function GET(){try{const[migration,machines,versions,grossHp,emissions,transmissions,source]=await Promise.all([
 count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260828_275_new_holland_boomer_35_55_current_specs'`),
 count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug IN (${slugs})`),
 count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='engine.gross_power' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='engine.emissions' AND ms.value_text='Tier 4B Final' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='transmission.options' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM source_records WHERE external_id='new-holland-boomer-35-55-current-us-2026-08'`),
]);const checks={migration:migration===1,machines:machines===5,currentVersions:versions===5,grossHorsepowerRows:grossHp===5,emissionsRows:emissions===5,transmissionRows:transmissions===5,sourceRecord:source===1};const ok=Object.values(checks).every(Boolean);return NextResponse.json({ok,checks,values:{migration,machines,versions,grossHp,emissions,transmissions,source}},{status:ok?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})}catch(error){console.error(error);return NextResponse.json({ok:false,error:'New Holland Boomer 35-55 health check failed'},{status:500})}}
