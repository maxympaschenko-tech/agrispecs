import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
type R = RowDataPacket & { count: number };
const slugs = "'puma-155-new','puma-165-new','puma-185-new'";
async function count(sql: string) { const db = await getDbReady(); const [r] = await db.query<R[]>(sql); return Number(r[0]?.count || 0); }

export async function GET() {
  try {
    const [migrations,machines,versions,specs,hp,pto,loaders,fitments,sources] = await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id IN ('20260828_261_case_ih_puma_155_new_current','20260828_262_case_ih_puma_165_185_new_current')`),
      count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug IN (${slugs})`),
      count(`SELECT COUNT(*) count FROM machine_versions v JOIN machines m ON m.id=v.machine_id WHERE m.slug IN (${slugs}) AND v.slug='united-states-current-2026-08' AND v.is_current=1`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions v ON v.id=ms.machine_version_id WHERE m.slug IN (${slugs}) AND v.slug='united-states-current-2026-08'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='engine.rated_power'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug IN (${slugs}) AND d.spec_key='pto.rated_power'`),
      count(`SELECT COUNT(*) count FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id WHERE mf.slug='case-ih' AND a.slug='l116-puma' AND a.data_status='verified'`),
      count(`SELECT COUNT(*) count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN attachments a ON a.id=ma.attachment_id WHERE m.slug IN (${slugs}) AND a.slug='l116-puma' AND ma.confidence='official'`),
      count(`SELECT COUNT(*) count FROM source_records WHERE external_id IN ('case-ih-puma-155-new-current-us','case-ih-puma-165-new-current-us','case-ih-puma-185-new-current-us','case-ih-puma-series-new-current-us')`),
    ]);
    const checks = { migrations:migrations===2, machines:machines===3, versions:versions===3, hpRows:hp===3, numericPtoOmitted:pto===0, loader:loaders===1, fitments:fitments===3, sources:sources===4, minimumSpecs:specs>=15 };
    const ok = Object.values(checks).every(Boolean);
    return NextResponse.json({ok,checks,values:{migrations,machines,versions,specs,hp,pto,loaders,fitments,sources}},{status:ok?200:503,headers:{'Cache-Control':'no-store','X-Robots-Tag':'noindex, nofollow'}});
  } catch (e) {
    console.error(e);
    return NextResponse.json({ok:false,error:'Puma Series New health check failed'},{status:500});
  }
}
