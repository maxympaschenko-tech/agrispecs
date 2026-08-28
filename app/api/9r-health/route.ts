import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type CountRow = RowDataPacket & { count: number };
async function count(sql: string) {
  const db = await getDbReady();
  const [rows] = await db.query<CountRow[]>(sql);
  return Number(rows[0]?.count || 0);
}

export async function GET() {
  try {
    const [
      migrationApplied,
      machineRows,
      currentVersions,
      specificationRows,
      wheelRows,
      jd14Rows,
      ratedPowerRows,
      maxPowerRows,
      ptoRows,
      serviceParts,
      currentServiceFitments,
      historicalSerialFitments,
      currentScvFitments,
      legacyScvFitments,
      officialSourceRows,
    ] = await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260828_224_john_deere_9r_service_filters'`),
      count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug IN ('9r-390','9r-440','9r-490','9r-540','9r-590','9r-640') AND m.data_status IN ('partial','verified')`),
      count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug IN ('9r-390','9r-440','9r-490','9r-540','9r-590','9r-640') AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE m.slug IN ('9r-390','9r-440','9r-490','9r-540','9r-590','9r-640') AND mv.slug='united-states-current-2026-08'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('9r-390','9r-440','9r-490','9r-540','9r-590','9r-640') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='configuration.track' AND ms.value_text='Wheel'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('9r-390','9r-440','9r-490','9r-540','9r-590','9r-640') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.model' AND ms.value_text='JD14'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.rated_power' AND ((m.slug='9r-390' AND ms.value_number=390) OR (m.slug='9r-440' AND ms.value_number=440) OR (m.slug='9r-490' AND ms.value_number=490) OR (m.slug='9r-540' AND ms.value_number=540) OR (m.slug='9r-590' AND ms.value_number=590) OR (m.slug='9r-640' AND ms.value_number=640))`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.maximum_power' AND ((m.slug='9r-390' AND ms.value_number=429) OR (m.slug='9r-440' AND ms.value_number=484) OR (m.slug='9r-490' AND ms.value_number=539) OR (m.slug='9r-540' AND ms.value_number=594) OR (m.slug='9r-590' AND ms.value_number=649) OR (m.slug='9r-640' AND ms.value_number=691))`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('9r-390','9r-440','9r-490','9r-540','9r-590','9r-640') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='pto.rated_power' AND ms.value_number=335`),
      count(`SELECT COUNT(*) count FROM parts p JOIN manufacturers mf ON mf.id=p.manufacturer_id WHERE mf.slug='john-deere' AND p.normalized_part_number IN ('TA17973','RE230985','DZ124761','DZ124786','RE572785','AT365869','RE577612','RE577250','TA21586','RE284091','RE593819','DZ110513','DZ114640','H216169','RE597019','RE269061') AND p.data_status='verified'`),
      count(`SELECT COUNT(*) count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE m.slug IN ('9r-390','9r-440','9r-490','9r-540','9r-590','9r-640') AND mv.slug='united-states-current-2026-08' AND p.normalized_part_number IN ('TA17973','RE230985','DZ124761','DZ124786','RE572785','AT365869','RE577612','RE577250','TA21586','RE284091','RE593819','DZ110513','DZ114640','H216169','RE597019') AND mp.fitment_confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN parts p ON p.id=mp.part_id WHERE m.slug IN ('9r-390','9r-440','9r-490','9r-540','9r-590','9r-640') AND mp.machine_version_id IS NULL AND p.normalized_part_number='RE269061' AND mp.fitment_confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN machine_versions mv ON mv.id=mp.machine_version_id JOIN parts p ON p.id=mp.part_id WHERE m.slug IN ('9r-390','9r-440','9r-490','9r-540','9r-590','9r-640') AND mv.slug='united-states-current-2026-08' AND p.normalized_part_number='TA21586' AND mp.serial_from='085001' AND mp.fitment_confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_parts mp JOIN machines m ON m.id=mp.machine_id JOIN parts p ON p.id=mp.part_id WHERE m.slug IN ('9r-390','9r-440','9r-490','9r-540','9r-590','9r-640') AND mp.machine_version_id IS NULL AND p.normalized_part_number='RE269061' AND mp.serial_to='084999' AND mp.fitment_confidence='official'`),
      count(`SELECT COUNT(*) count FROM source_records WHERE external_id IN ('john-deere-9r-390-640-current-techpub-2025-03','john-deere-9-series-390-640-official-specifications','john-deere-rx571082-9r-ft4-service-guide')`),
    ]);

    const checks = {
      migrationApplied: migrationApplied === 1,
      machineRows: machineRows === 6,
      currentVersions: currentVersions === 6,
      specificationRows: specificationRows === 96,
      wheelRows: wheelRows === 6,
      jd14Rows: jd14Rows === 6,
      ratedPowerRows: ratedPowerRows === 6,
      maxPowerRows: maxPowerRows === 6,
      ptoRows: ptoRows === 6,
      serviceParts: serviceParts === 16,
      currentServiceFitments: currentServiceFitments === 90,
      historicalSerialFitments: historicalSerialFitments === 6,
      currentScvFitments: currentScvFitments === 6,
      legacyScvFitments: legacyScvFitments === 6,
      officialSourceRows: officialSourceRows === 3,
    };
    const ok = Object.values(checks).every(Boolean);

    return NextResponse.json(
      {
        ok,
        expectedLatest9RMigration:'20260828_224_john_deere_9r_service_filters',
        checks,
        values:{machineRows,currentVersions,specificationRows,wheelRows,jd14Rows,ratedPowerRows,maxPowerRows,ptoRows,serviceParts,currentServiceFitments,historicalSerialFitments,currentScvFitments,legacyScvFitments,officialSourceRows},
      },
      { status: ok ? 200 : 503, headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'} },
    );
  } catch (error) {
    console.error('John Deere 9R health check failed:',error);
    return NextResponse.json({ok:false,error:'John Deere 9R health check failed'},{status:500,headers:{'Cache-Control':'no-store, max-age=0','X-Robots-Tag':'noindex, nofollow'}});
  }
}
