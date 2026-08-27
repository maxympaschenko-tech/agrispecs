import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CountRow = RowDataPacket & { count: number };

async function count(sql: string, params: unknown[] = []) {
  const db = await getDbReady();
  const [rows] = await db.query<CountRow[]>(sql, params);
  return Number(rows[0]?.count || 0);
}

export async function GET() {
  try {
    const [
      migrationApplied,
      publishableM60,
      currentVersions,
      verifiedLoaders,
      loaderFitments,
      oilFilterParts,
      oilFilterFitments,
      m5660ServiceParts,
      m5660ServiceFitments,
      m6060M7060ServiceParts,
      m6060M7060ServiceFitments,
      currentFuelFitments,
      legacyFuelActiveFitments,
      fuelReplacementChainEdges,
      m5660AirReplacementEdges,
    ] = await Promise.all([
      count(`SELECT COUNT(*) AS count FROM schema_migrations WHERE id='20260827_158_kubota_fuel_filter_full_supersession_chain'`),
      count(`
        SELECT COUNT(*) AS count FROM machines m
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug IN ('m5660su','m6060','m7060')
          AND m.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_versions mv
        JOIN machines m ON m.id=mv.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND (
          (m.slug='m5660su' AND mv.slug='us-current-8f8r') OR
          (m.slug='m6060' AND mv.slug='us-current-8f8r') OR
          (m.slug='m7060' AND mv.slug IN ('us-current-8f8r','us-current-12f12r'))
        ) AND mv.is_current=1
      `),
      count(`
        SELECT COUNT(*) AS count FROM attachments a
        JOIN manufacturers mf ON mf.id=a.manufacturer_id
        WHERE mf.slug='kubota' AND a.attachment_type='front-loader'
          AND a.slug IN ('la1154','la1154su') AND a.data_status='verified'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_attachments ma
        JOIN machines m ON m.id=ma.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN attachments a ON a.id=ma.attachment_id
        WHERE mf.slug='kubota' AND (
          (m.slug IN ('m6060','m7060') AND a.slug='la1154') OR
          (m.slug='m5660su' AND a.slug='la1154su')
        )
      `),
      count(`
        SELECT COUNT(*) AS count FROM parts p
        JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='kubota' AND p.normalized_part_number IN ('HH1C032430','HH16432430')
          AND p.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('m5660su','m6060','m7060')
          AND p.normalized_part_number IN ('HH1C032430','HH16432430')
          AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM parts p
        JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='kubota'
          AND p.normalized_part_number IN ('R140142270','R240142280','1G31143380','HH1J143172','HH16432430','HHTA037710')
          AND p.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug='m5660su'
          AND p.normalized_part_number IN ('R140142270','R240142280','1G31143380','HH1J143172','HH16432430','HHTA037710')
          AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM parts p
        JOIN manufacturers mf ON mf.id=p.manufacturer_id
        WHERE mf.slug='kubota'
          AND p.normalized_part_number IN ('HH1J143172','5980026110','3A11119130','HHTA037710')
          AND p.data_status IN ('partial','verified')
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('m6060','m7060')
          AND p.normalized_part_number IN ('HH1J143172','5980026110','3A11119130','HHTA037710')
          AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('m5660su','m6060','m7060')
          AND p.normalized_part_number='HH1J143172' AND mp.fitment_confidence='high'
      `),
      count(`
        SELECT COUNT(*) AS count FROM machine_parts mp
        JOIN machines m ON m.id=mp.machine_id
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        JOIN parts p ON p.id=mp.part_id
        WHERE mf.slug='kubota' AND m.slug IN ('m5660su','m6060','m7060')
          AND p.normalized_part_number IN ('1J80043170','1J80043172')
      `),
      count(`
        SELECT COUNT(*) AS count FROM part_cross_references pcr
        JOIN parts oldp ON oldp.id=pcr.part_id
        JOIN parts newp ON newp.id=pcr.cross_part_id
        JOIN manufacturers mf ON mf.id=oldp.manufacturer_id
        WHERE mf.slug='kubota' AND pcr.relation_type='replaces' AND (
          (oldp.normalized_part_number='1J80043170' AND newp.normalized_part_number='1J80043172') OR
          (oldp.normalized_part_number='1J80043172' AND newp.normalized_part_number='HH1J143172')
        )
      `),
      count(`
        SELECT COUNT(*) AS count FROM part_cross_references pcr
        JOIN parts oldp ON oldp.id=pcr.part_id
        JOIN parts newp ON newp.id=pcr.cross_part_id
        JOIN manufacturers mf ON mf.id=oldp.manufacturer_id
        WHERE mf.slug='kubota' AND pcr.relation_type='replaces' AND (
          (oldp.normalized_part_number='TC63093230' AND newp.normalized_part_number='R140142270') OR
          (oldp.normalized_part_number='1J46111220' AND newp.normalized_part_number='R240142280') OR
          (oldp.normalized_part_number='TC63093220' AND newp.normalized_part_number='R240142280') OR
          (oldp.normalized_part_number='TC63093222' AND newp.normalized_part_number='R240142280')
        )
      `),
    ]);

    const checks = {
      migrationApplied: migrationApplied === 1,
      publishableM60: publishableM60 === 3,
      currentVersions: currentVersions === 4,
      verifiedLoaders: verifiedLoaders === 2,
      loaderFitments: loaderFitments === 3,
      oilFilterParts: oilFilterParts === 2,
      oilFilterFitments: oilFilterFitments === 3,
      m5660ServiceParts: m5660ServiceParts === 6,
      m5660ServiceFitments: m5660ServiceFitments === 6,
      m6060M7060ServiceParts: m6060M7060ServiceParts === 4,
      m6060M7060ServiceFitments: m6060M7060ServiceFitments === 8,
      currentFuelFitments: currentFuelFitments === 3,
      legacyFuelActiveFitments: legacyFuelActiveFitments === 0,
      fuelReplacementChainEdges: fuelReplacementChainEdges === 2,
      m5660AirReplacementEdges: m5660AirReplacementEdges === 4,
    };
    const ok = Object.values(checks).every(Boolean);

    return NextResponse.json({
      ok,
      expectedLatestM60Migration: '20260827_158_kubota_fuel_filter_full_supersession_chain',
      checks,
      values: {
        publishableM60,currentVersions,verifiedLoaders,loaderFitments,oilFilterParts,oilFilterFitments,
        m5660ServiceParts,m5660ServiceFitments,m6060M7060ServiceParts,m6060M7060ServiceFitments,
        currentFuelFitments,legacyFuelActiveFitments,fuelReplacementChainEdges,m5660AirReplacementEdges,
      },
    }, {
      status: ok ? 200 : 503,
      headers: { 'Cache-Control':'no-store, max-age=0', 'X-Robots-Tag':'noindex, nofollow' },
    });
  } catch (error) {
    console.error('Kubota M60 health check failed:', error);
    return NextResponse.json({ ok:false, error:'Kubota M60 health check failed' }, {
      status:500,
      headers:{ 'Cache-Control':'no-store, max-age=0', 'X-Robots-Tag':'noindex, nofollow' },
    });
  }
}
