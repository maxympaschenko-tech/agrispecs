import type { RowDataPacket } from 'mysql2';
import { getDb } from '@/lib/db';
import type { DbMigration } from '@/lib/db-migration-types';
import { johnDeere3Series2026Migration } from '@/lib/migrations/20260827_010_john_deere_3_series';
import { johnDeere4Series2026Migration } from '@/lib/migrations/20260827_020_john_deere_4_series';
import { johnDeere5ESeries2022Migration } from '@/lib/migrations/20260827_030_john_deere_5e_series';
import { johnDeere5MSeries2025Migration } from '@/lib/migrations/20260827_040_john_deere_5m_series';
import { johnDeere6MSeriesCurrentMigration } from '@/lib/migrations/20260827_050_john_deere_6m_series';
import { johnDeere6RSeriesCurrentMigration } from '@/lib/migrations/20260827_060_john_deere_6r_series';
import { johnDeereFiltersPartsMigration } from '@/lib/migrations/20260827_070_john_deere_filters_parts';
import { machineImagesMigration } from '@/lib/migrations/20260827_080_machine_images';
import { localMachineMediaMigration } from '@/lib/migrations/20260827_081_local_machine_media';
import { moreMachineImagesMigration } from '@/lib/migrations/20260827_082_more_machine_images';
import { maintenanceSchedulesMigration } from '@/lib/migrations/20260827_090_maintenance_schedules';
import { johnDeere2025RMaintenanceMigration } from '@/lib/migrations/20260827_091_2025r_maintenance';
import { johnDeere4066MMaintenanceMigration } from '@/lib/migrations/20260827_092_4066m_maintenance';
import { johnDeere5ECapacityVariantsMigration } from '@/lib/migrations/20260827_093_5e_capacity_variants';
import { johnDeere2032R2038RMaintenanceMigration } from '@/lib/migrations/20260827_094_2032r_2038r_maintenance';
import { johnDeere3EMY22MaintenanceMigration } from '@/lib/migrations/20260827_095_3e_my22_maintenance';
import { johnDeere3RMY24MaintenanceMigration } from '@/lib/migrations/20260827_096_3r_my24_maintenance';
import { johnDeere3DNorthAmericaMaintenanceMigration } from '@/lib/migrations/20260827_097_3d_north_america_maintenance';
import { johnDeere4SeriesMY24MaintenanceMigration } from '@/lib/migrations/20260827_098_4_series_my24_maintenance';
import { johnDeere4075RMaintenanceMigration } from '@/lib/migrations/20260827_099_4075r_maintenance';
import { johnDeere4044MFuelWaterCorrectionMigration } from '@/lib/migrations/20260827_100_4044m_fuel_water_correction';
import { johnDeere1023EMY22MaintenanceMigration } from '@/lib/migrations/20260827_101_1023e_my22_maintenance';
import { johnDeere5MVerifiedMaintenanceMigration } from '@/lib/migrations/20260827_102_5m_verified_maintenance';
import { johnDeere6RMY22MaintenanceMigration } from '@/lib/migrations/20260827_103_6r_my22_maintenance';
import { johnDeere6MVerifiedFitmentMigration } from '@/lib/migrations/20260827_104_6m_verified_fitment';
import { partSupersessionsMigration } from '@/lib/migrations/20260827_105_part_supersessions';
import { morePartSupersessionsMigration } from '@/lib/migrations/20260827_106_more_part_supersessions';
import { structuredSerialFitmentMigration } from '@/lib/migrations/20260827_107_structured_serial_fitment';
import { officialAftermarketAlternativesMigration } from '@/lib/migrations/20260827_108_official_aftermarket_alternatives';
import { johnDeereCompactSerialCutoversMigration } from '@/lib/migrations/20260827_109_compact_serial_cutovers';
import { compactPinGenerationCorrectionMigration } from '@/lib/migrations/20260827_110_compact_pin_generation_correction';
import { johnDeere3EFilterPakGenerationsMigration } from '@/lib/migrations/20260827_111_3e_filter_pak_generations';
import { filterPakReplacementsMigration } from '@/lib/migrations/20260827_112_filter_pak_replacements';
import { johnDeere4SeriesFilterPakReplacementMigration } from '@/lib/migrations/20260827_113_4_series_filter_pak_replacement';
import { ta25767SourceUrlCorrectionMigration } from '@/lib/migrations/20260827_114_ta25767_source_url_correction';
import { partComponentsMigration } from '@/lib/migrations/20260827_115_part_components';
import { oneSeriesFilterPakComponentsMigration } from '@/lib/migrations/20260827_116_1_series_filter_pak_components';
import { threeEFilterPakComponentsMigration } from '@/lib/migrations/20260827_117_3e_filter_pak_components';
import { lva21128ComponentsMigration } from '@/lib/migrations/20260827_118_lva21128_components';
import { catalogPerformanceIndexesMigration } from '@/lib/migrations/20260827_119_catalog_performance_indexes';
import { johnDeere5075MWearElectricalPartsMigration } from '@/lib/migrations/20260827_120_5075m_wear_electrical_parts';
import { johnDeere5095M5105MWearElectricalPartsMigration } from '@/lib/migrations/20260827_121_5095m_5105m_wear_electrical_parts';
import { johnDeere5MSteeringCrossReferencesMigration } from '@/lib/migrations/20260827_122_5m_steering_cross_references';
import { johnDeere5120MVerifiedMaintenancePartsMigration } from '@/lib/migrations/20260827_123_5120m_verified_maintenance_parts';
import { johnDeere5125MFT4VersionedMaintenanceMigration } from '@/lib/migrations/20260827_124_5125m_ft4_versioned_maintenance';
import { johnDeere5130MVerifiedAccessoryKitsMigration } from '@/lib/migrations/20260827_125_5130m_verified_accessory_kits';
import { loaderCompatibilityMigration } from '@/lib/migrations/20260827_126_loader_compatibility';
import { johnDeere6MLoaderMountingFramesMigration } from '@/lib/migrations/20260827_127_6m_loader_mounting_frames';
import { johnDeere6M6RLoaderCompatibilityMigration } from '@/lib/migrations/20260827_128_6m_6r_loader_compatibility';

type AppliedMigrationRow = RowDataPacket & { id: string };
type LockRow = RowDataPacket & { acquired: number | null };

const migrations: DbMigration[] = [
  {
    id: '20260827_000_existing_schema_baseline',
    description: 'Baseline for schema and data imported manually before automated migrations were enabled',
    apply: async () => {},
  },
  johnDeere3Series2026Migration,
  johnDeere4Series2026Migration,
  johnDeere5ESeries2022Migration,
  johnDeere5MSeries2025Migration,
  johnDeere6MSeriesCurrentMigration,
  johnDeere6RSeriesCurrentMigration,
  johnDeereFiltersPartsMigration,
  machineImagesMigration,
  localMachineMediaMigration,
  moreMachineImagesMigration,
  maintenanceSchedulesMigration,
  johnDeere2025RMaintenanceMigration,
  johnDeere4066MMaintenanceMigration,
  johnDeere5ECapacityVariantsMigration,
  johnDeere2032R2038RMaintenanceMigration,
  johnDeere3EMY22MaintenanceMigration,
  johnDeere3RMY24MaintenanceMigration,
  johnDeere3DNorthAmericaMaintenanceMigration,
  johnDeere4SeriesMY24MaintenanceMigration,
  johnDeere4075RMaintenanceMigration,
  johnDeere4044MFuelWaterCorrectionMigration,
  johnDeere1023EMY22MaintenanceMigration,
  johnDeere5MVerifiedMaintenanceMigration,
  johnDeere6RMY22MaintenanceMigration,
  johnDeere6MVerifiedFitmentMigration,
  partSupersessionsMigration,
  morePartSupersessionsMigration,
  structuredSerialFitmentMigration,
  officialAftermarketAlternativesMigration,
  johnDeereCompactSerialCutoversMigration,
  compactPinGenerationCorrectionMigration,
  johnDeere3EFilterPakGenerationsMigration,
  filterPakReplacementsMigration,
  johnDeere4SeriesFilterPakReplacementMigration,
  ta25767SourceUrlCorrectionMigration,
  partComponentsMigration,
  oneSeriesFilterPakComponentsMigration,
  threeEFilterPakComponentsMigration,
  lva21128ComponentsMigration,
  catalogPerformanceIndexesMigration,
  johnDeere5075MWearElectricalPartsMigration,
  johnDeere5095M5105MWearElectricalPartsMigration,
  johnDeere5MSteeringCrossReferencesMigration,
  johnDeere5120MVerifiedMaintenancePartsMigration,
  johnDeere5125MFT4VersionedMaintenanceMigration,
  johnDeere5130MVerifiedAccessoryKitsMigration,
  loaderCompatibilityMigration,
  johnDeere6MLoaderMountingFramesMigration,
  johnDeere6M6RLoaderCompatibilityMigration,
];

let migrationPromise: Promise<void> | null = null;

async function applyMigrations() {
  const pool = getDb();
  const connection = await pool.getConnection();

  try {
    const [lockRows] = await connection.query<LockRow[]>(
      "SELECT GET_LOCK('farm_machine_specs_schema_migrations', 10) AS acquired",
    );

    if (Number(lockRows[0]?.acquired || 0) !== 1) {
      throw new Error('Could not acquire database migration lock.');
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(191) NOT NULL PRIMARY KEY,
        description VARCHAR(500) NOT NULL,
        applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const [appliedRows] = await connection.query<AppliedMigrationRow[]>(
      'SELECT id FROM schema_migrations',
    );
    const applied = new Set(appliedRows.map((row) => row.id));

    for (const migration of migrations) {
      if (applied.has(migration.id)) continue;

      await connection.beginTransaction();
      try {
        await migration.apply(connection);
        await connection.query(
          'INSERT INTO schema_migrations (id, description) VALUES (?, ?)',
          [migration.id, migration.description],
        );
        await connection.commit();
        applied.add(migration.id);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }
  } finally {
    try {
      await connection.query("SELECT RELEASE_LOCK('farm_machine_specs_schema_migrations')");
    } finally {
      connection.release();
    }
  }
}

export async function ensureDatabaseMigrations() {
  if (!migrationPromise) {
    migrationPromise = applyMigrations().catch((error) => {
      migrationPromise = null;
      throw error;
    });
  }

  await migrationPromise;
}

export async function getDbReady() {
  await ensureDatabaseMigrations();
  return getDb();
}
