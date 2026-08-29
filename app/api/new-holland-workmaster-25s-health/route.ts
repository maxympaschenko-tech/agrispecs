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
    const [baseMigration, enrichmentMigration, machine, version, hp, drive, transmission, pto, hitch, station, attachments, source] = await Promise.all([
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260828_276_new_holland_workmaster_25s_current_specs'`),
      count(`SELECT COUNT(*) count FROM schema_migrations WHERE id='20260829_293_new_holland_workmaster_25s_current_enrichment'`),
      count(`SELECT COUNT(*) count FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug='workmaster-25s'`),
      count(`SELECT COUNT(*) count FROM machine_versions mv JOIN machines m ON m.id=mv.machine_id WHERE m.slug='workmaster-25s' AND mv.slug='united-states-current-2026-08' AND mv.is_current=1`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug='workmaster-25s' AND d.spec_key='engine.gross_power' AND ms.value_number=24.7 AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug='workmaster-25s' AND d.spec_key='configuration.drive' AND ms.value_text='4WD' AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug='workmaster-25s' AND d.spec_key='transmission.options' AND ms.value_text='2-range hydrostatic transmission' AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug='workmaster-25s' AND mv.slug='united-states-current-2026-08' AND d.spec_key='pto.rated_power' AND ms.value_number=17.2 AND ms.unit='hp' AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug='workmaster-25s' AND mv.slug='united-states-current-2026-08' AND d.spec_key='hitch.rear_lift_capacity' AND ms.value_number=992 AND ms.unit='lb' AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_specs ms JOIN machines m ON m.id=ms.machine_id JOIN machine_versions mv ON mv.id=ms.machine_version_id JOIN spec_definitions d ON d.id=ms.spec_definition_id WHERE m.slug='workmaster-25s' AND mv.slug='united-states-current-2026-08' AND d.spec_key='configuration.station' AND ms.value_text='Cab or open-air ROPS' AND ms.confidence='official'`),
      count(`SELECT COUNT(*) count FROM machine_attachments ma JOIN machines m ON m.id=ma.machine_id JOIN attachments a ON a.id=ma.attachment_id WHERE m.slug='workmaster-25s' AND a.slug IN ('100lc-workmaster-25s','160gms-workmaster-25s','905gbl-workmaster-25s') AND ma.confidence='official'`),
      count(`SELECT COUNT(*) count FROM source_records WHERE external_id='new-holland-workmaster-25s-current-us-2026-08'`),
    ]);

    const checks = {
      baseMigration: baseMigration === 1,
      enrichmentMigration: enrichmentMigration === 1,
      machine: machine === 1,
      currentVersion: version === 1,
      grossHorsepower: hp === 1,
      drive: drive === 1,
      transmission: transmission === 1,
      ptoHorsepower: pto === 1,
      hitchLift: hitch === 1,
      operatorStation: station === 1,
      attachmentFitments: attachments === 3,
      sourceRecord: source === 1,
    };
    const ok = Object.values(checks).every(Boolean);

    return NextResponse.json(
      { ok, checks, values: { baseMigration, enrichmentMigration, machine, version, hp, drive, transmission, pto, hitch, station, attachments, source } },
      { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ ok: false, error: 'New Holland WORKMASTER 25S health check failed' }, { status: 500 });
  }
}
