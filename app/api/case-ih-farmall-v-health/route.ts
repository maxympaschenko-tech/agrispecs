import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
type CountRow = RowDataPacket & { count: number };
async function count(sql: string) { const db = await getDbReady(); const [rows] = await db.query<CountRow[]>(sql); return Number(rows[0]?.count || 0); }

export async function GET() {
  try {
    const [migrations,machines,versions,specs,sources] = await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260828_255_case_ih_farmall_v_current_registry'`),
      count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug IN ('farmall-80v','farmall-110v')`),
      count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id WHERE m.slug IN ('farmall-80v','farmall-110v') AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('farmall-80v','farmall-110v') AND sd.spec_key='application.type' AND ms.value_text='Specialty - Narrow'`),
      count(`SELECT COUNT(*) count FROM source_records WHERE external_id IN ('case-ih-farmall-80v-current-us','case-ih-farmall-110v-current-us')`),
    ]);
    const checks={migrations:migrations===1,machines:machines===2,versions:versions===2,specs:specs===2,sources:sources===2};
    const ok=Object.values(checks).every(Boolean);
    return NextResponse.json({ok,checks,values:{migrations,machines,versions,specs,sources}},{status:ok?200:503,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  } catch (error) {
    console.error(error);
    return NextResponse.json({ok:false,error:'Farmall V health check failed'},{status:500});
  }
}
