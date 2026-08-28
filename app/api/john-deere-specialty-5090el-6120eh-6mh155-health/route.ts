import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic='force-dynamic';
export const revalidate=0;
type R=RowDataPacket&{count:number};
const slugs="'5090el','6120eh','6mh-155'";
async function count(sql:string){const db=await getDbReady();const[r]=await db.query<R[]>(sql);return Number(r[0]?.count||0)}

export async function GET(){
  try{
    const[migration,machines,versions,ratedHp,ptoRows,max6mh,ipm6mh,sources]=await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260828_271_john_deere_specialty_5090el_6120eh_6mh155_current_specs'`),
      count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug IN (${slugs})`),
      count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id WHERE m.slug IN (${slugs}) AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='engine.rated_power' AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN ('5090el','6120eh') AND d.spec_key='pto.rated_power' AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug='6mh-155' AND d.spec_key='engine.maximum_power' AND ms.value_number=171 AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug='6mh-155' AND d.spec_key='engine.ipm_additional_power' AND ms.value_number=20 AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM source_records WHERE external_id IN ('john-deere-specialty-tractors-current-us-2026-08','john-deere-6000s-pricebook-2025-11-05')`),
    ]);
    const checks={migration:migration===1,machines:machines===3,currentVersions:versions===3,ratedHorsepowerRows:ratedHp===3,verifiedPtoRows:ptoRows===2,verified6MHMaxPower:max6mh===1,verified6MHIPM:ipm6mh===1,sourceRecords:sources===2};
    const ok=Object.values(checks).every(Boolean);
    return NextResponse.json({ok,checks,values:{migration,machines,versions,ratedHp,ptoRows,max6mh,ipm6mh,sources}},{status:ok?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  }catch(error){console.error(error);return NextResponse.json({ok:false,error:'John Deere specialty 5090EL/6120EH/6MH155 health check failed'},{status:500});}
}
