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

const currentSlugs =
  "'steiger-425','steiger-475','steiger-525','steiger-555','steiger-595','steiger-645','steiger-715','steiger-785'";

export async function GET() {
  try {
    const [
      migrationApplied,
      machines,
      currentVersions,
      specRows,
      ratedRows,
      maxRows,
      engineMakeRows,
      twelveNineRows,
      highHorsepowerDisplacementRows,
      transmissionRows,
      steiger785TransmissionRows,
      configurationRows,
      sourceRows,
    ] = await Promise.all([
      count(
        `SELECT COUNT(*) count FROM schema_migrations WHERE id='20260828_231_case_ih_steiger_current_specs'`,
      ),
      count(
        `SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug IN (${currentSlugs})`,
      ),
      count(
        `SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug IN (${currentSlugs}) AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`,
      ),
      count(
        `SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id WHERE m.slug IN (${currentSlugs}) AND mv.slug='united-states-current-2026-08'`,
      ),
      count(
        `SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${currentSlugs}) AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.rated_power' AND ((m.slug='steiger-425' AND ms.value_number=425) OR (m.slug='steiger-475' AND ms.value_number=475) OR (m.slug='steiger-525' AND ms.value_number=525) OR (m.slug='steiger-555' AND ms.value_number=555) OR (m.slug='steiger-595' AND ms.value_number=595) OR (m.slug='steiger-645' AND ms.value_number=645) OR (m.slug='steiger-715' AND ms.value_number=715) OR (m.slug='steiger-785' AND ms.value_number=785))`,
      ),
      count(
        `SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${currentSlugs}) AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.maximum_power' AND ((m.slug='steiger-425' AND ms.value_number=467) OR (m.slug='steiger-475' AND ms.value_number=522) OR (m.slug='steiger-525' AND ms.value_number=578) OR (m.slug='steiger-555' AND ms.value_number=614) OR (m.slug='steiger-595' AND ms.value_number=656) OR (m.slug='steiger-645' AND ms.value_number=699) OR (m.slug='steiger-715' AND ms.value_number=778) OR (m.slug='steiger-785' AND ms.value_number=853))`,
      ),
      count(
        `SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${currentSlugs}) AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.make' AND ms.value_text='FPT Industrial'`,
      ),
      count(
        `SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('steiger-425','steiger-475','steiger-525','steiger-555','steiger-595','steiger-645') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.displacement' AND ms.value_number=12.9`,
      ),
      count(
        `SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN ('steiger-715','steiger-785') AND mv.slug='united-states-current-2026-08' AND sd.spec_key='engine.displacement'`,
      ),
      count(
        `SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${currentSlugs}) AND mv.slug='united-states-current-2026-08' AND sd.spec_key='transmission.standard'`,
      ),
      count(
        `SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug='steiger-785' AND mv.slug='united-states-current-2026-08' AND sd.spec_key='transmission.standard'`,
      ),
      count(
        `SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions sd ON sd.id=ms.spec_definition_id WHERE m.slug IN (${currentSlugs}) AND mv.slug='united-states-current-2026-08' AND sd.spec_key='configuration.drive' AND ((m.slug='steiger-425' AND ms.value_text='Wheeled, Rowtrac') OR (m.slug='steiger-475' AND ms.value_text='Wheeled, Rowtrac, Quadtrac') OR (m.slug='steiger-525' AND ms.value_text='Wheeled, Rowtrac, Quadtrac, Scraper') OR (m.slug='steiger-555' AND ms.value_text='Wheeled, Quadtrac, Scraper') OR (m.slug='steiger-595' AND ms.value_text='Wheeled, Quadtrac, Scraper') OR (m.slug='steiger-645' AND ms.value_text='Wheeled, Quadtrac, Scraper') OR (m.slug='steiger-715' AND ms.value_text='Quadtrac') OR (m.slug='steiger-785' AND ms.value_text='Quadtrac'))`,
      ),
      count(
        `SELECT COUNT(*) count FROM source_records WHERE external_id IN ('case-ih-steiger-current-us-425-785-2026-08','case-ih-steiger-425-current-us','case-ih-steiger-475-current-us','case-ih-steiger-525-current-us','case-ih-steiger-555-current-us','case-ih-steiger-595-current-us','case-ih-steiger-645-current-us','case-ih-steiger-715-current-us','case-ih-steiger-785-current-us')`,
      ),
    ]);

    const checks = {
      migrationApplied: migrationApplied === 1,
      machines: machines === 8,
      currentVersions: currentVersions === 8,
      specRows: specRows === 45,
      ratedRows: ratedRows === 8,
      maxRows: maxRows === 8,
      engineMakeRows: engineMakeRows === 8,
      twelveNineRows: twelveNineRows === 6,
      highHorsepowerDisplacementRows: highHorsepowerDisplacementRows === 0,
      transmissionRows: transmissionRows === 7,
      steiger785TransmissionRows: steiger785TransmissionRows === 0,
      configurationRows: configurationRows === 8,
      sourceRows: sourceRows === 9,
    };
    const ok = Object.values(checks).every(Boolean);

    return NextResponse.json(
      {
        ok,
        expectedLatestCaseIHSteigerMigration: '20260828_231_case_ih_steiger_current_specs',
        checks,
        values: {
          migrationApplied,
          machines,
          currentVersions,
          specRows,
          ratedRows,
          maxRows,
          engineMakeRows,
          twelveNineRows,
          highHorsepowerDisplacementRows,
          transmissionRows,
          steiger785TransmissionRows,
          configurationRows,
          sourceRows,
        },
      },
      {
        status: ok ? 200 : 503,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      },
    );
  } catch (error) {
    console.error('Case IH Steiger health check failed:', error);
    return NextResponse.json(
      { ok: false, error: 'Case IH Steiger health check failed' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      },
    );
  }
}
