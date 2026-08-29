import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
export const dynamic='force-dynamic';export const revalidate=0;type R=RowDataPacket&{count:number};
const slugs="'workmaster-90-plus','workmaster-100-plus','workmaster-110-plus','workmaster-120-plus'";
async function count(sql:string){const db=await getDbReady();const[r]=await db.query<R[]>(sql);return Number(r[0]?.count||0)}
export async function GET(){try{const[migration,machines,versions,gross,pto,displacement,transmission,fuelTank,source]=await Promise.all([
 count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260829_288_new_holland_workmaster_plus_current_specs'`),
 count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug IN (${slugs})`),
 count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='engine.gross_power' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='pto.rated_power' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='engine.displacement' AND ms.value_number=3.6 AND ms.unit='L' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='transmission.options' AND ms.value_text='12x12 electronic power shuttle' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='capacities.fuel_tank' AND ms.value_number=34.3 AND ms.unit='US gal' AND ms.confidence='official'`),
 count(`SELECT COUNT(*) count FROM source_records WHERE external_id='new-holland-workmaster-plus-current-us-2026-08'`)]);const checks={migration:migration===1,machines:machines===4,currentVersions:versions===4,grossRows:gross===4,ptoRows:pto===4,displacementRows:displacement===4,transmissionRows:transmission===4,fuelTankRows:fuelTank===4,sourceRecord:source===1};const ok=Object.values(checks).every(Boolean);return NextResponse.json({ok,checks,values:{migration,machines,versions,gross,pto,displacement,transmission,fuelTank,source}},{status:ok?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}})}catch(error){console.error(error);return NextResponse.json({ok:false,error:'New Holland WORKMASTER PLUS health check failed'},{status:500})}}
