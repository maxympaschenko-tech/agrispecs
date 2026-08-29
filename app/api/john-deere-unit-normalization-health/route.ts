import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic='force-dynamic';
export const revalidate=0;
type R=RowDataPacket&{count:number};
async function count(sql:string){const db=await getDbReady();const[r]=await db.query<R[]>(sql);return Number(r[0]?.count||0)}

export async function GET(){
  try{
    const[migration,defUnit,hydUnit,defRows,hydRows]=await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260829_284_john_deere_unit_normalization_corrections'`),
      count(`SELECT COUNT(*) count FROM spec_definitions WHERE spec_key='capacities.def_tank' AND canonical_unit='L'`),
      count(`SELECT COUNT(*) count FROM spec_definitions WHERE spec_key='hydraulics.pump_rated_output' AND canonical_unit='L/min'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN ('5085m','5090m','5100m') AND mv.slug='united-states-current-2026-08' AND d.spec_key='capacities.def_tank' AND ms.unit='L' AND ms.value_number BETWEEN 12.11 AND 12.12`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN ('5090el','6120eh','6mh-155') AND mv.slug='united-states-current-2026-08' AND d.spec_key='hydraulics.pump_rated_output' AND ms.unit='L/min'`),
    ]);
    const checks={migration:migration===1,defCanonicalUnit:defUnit===1,hydraulicCanonicalUnit:hydUnit===1,normalizedDefRows:defRows===3,normalizedHydraulicRows:hydRows===3};
    const ok=Object.values(checks).every(Boolean);
    return NextResponse.json({ok,checks,values:{migration,defUnit,hydUnit,defRows,hydRows}},{status:ok?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  }catch(error){console.error(error);return NextResponse.json({ok:false,error:'John Deere unit normalization health check failed'},{status:500});}
}
