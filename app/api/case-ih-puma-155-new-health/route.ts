import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type R = RowDataPacket & { count: number };
async function count(sql: string) {
  const db = await getDbReady();
  const [rows] = await db.query<R[]>(sql);
  return Number(rows[0]?.count || 0);
}

export async function GET() {
  try {
    const [migration, machine, version, specs, hp, displacement, pto, l116, source] = await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260828_261_case_ih_puma_155_new_current'`),
      count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug='puma-155-new'`),
      count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id WHERE m.slug='puma-155-new' AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id WHERE m.slug='puma-155-new' AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug='puma-155-new' AND sd.spec_key='engine.rated_power' AND ms.value_number=155`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug='puma-155-new' AND sd.spec_key='engine.displacement' AND ms.value_number=6.7`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug='puma-155-new' AND sd.spec_key='pto.rated_power'`),
      count(`SELECT COUNT(*) count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN attachments a ON a.id=ma.attachment_id WHERE m.slug='puma-155-new' AND a.slug='l116-puma' AND ma.confidence='official'`),
      count(`SELECT COUNT(*) count FROM source_records WHERE external_id='case-ih-puma-155-new-current-us'`),
    ]);
    const checks = { migration:migration===1, machine:machine===1, version:version===1, specs:specs===2, hp:hp===1, displacement:displacement===1, ptoOmitted:pto===0, l116:l116===1, source:source===1 };
    const ok = Object.values(checks).every(Boolean);
    return NextResponse.json({ok,checks,values:{migration,machine,version,specs,hp,displacement,pto,l116,source}},{status:ok?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  } catch (error) {
    console.error(error);
    return NextResponse.json({ok:false,error:'Puma 155 New health check failed'},{status:500});
  }
}
