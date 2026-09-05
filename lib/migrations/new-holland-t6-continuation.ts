import type { DbMigration } from '@/lib/db-migration-types';
import { newHollandT6CurrentEnrichmentMigration } from '@/lib/migrations/20260905_644_new_holland_t6_current_enrichment';
import { newHollandT6ServiceIntervalsMigration } from '@/lib/migrations/20260905_645_new_holland_t6_service_intervals';
import { newHollandT6Manual90478716MaintenanceMigration } from '@/lib/migrations/20260905_646_new_holland_t6_manual_90478716_maintenance';
import { newHollandT6StageVEngineOilFilterMigration } from '@/lib/migrations/20260905_647_new_holland_t6_stagev_engine_oil_filter';
import { newHollandT6StageVFuelFiltersMigration } from '@/lib/migrations/20260905_648_new_holland_t6_stagev_fuel_filters';
import { newHollandT6StageVAirFiltersMigration } from '@/lib/migrations/20260905_649_new_holland_t6_stagev_air_filters';
import { newHollandT6StageVHydraulicFiltersMigration } from '@/lib/migrations/20260905_650_new_holland_t6_stagev_hydraulic_filters';
import { newHollandT6StageVDefModuleFilterMigration } from '@/lib/migrations/20260905_651_new_holland_t6_stagev_def_module_filter';

export const newHollandT6ContinuationMigrations: DbMigration[] = [
  newHollandT6CurrentEnrichmentMigration,
  newHollandT6ServiceIntervalsMigration,
  newHollandT6Manual90478716MaintenanceMigration,
  newHollandT6StageVEngineOilFilterMigration,
  newHollandT6StageVFuelFiltersMigration,
  newHollandT6StageVAirFiltersMigration,
  newHollandT6StageVHydraulicFiltersMigration,
  newHollandT6StageVDefModuleFilterMigration,
];
