import type { DbMigration } from '@/lib/db-migration-types';
import { newHollandT6CurrentEnrichmentMigration } from '@/lib/migrations/20260905_644_new_holland_t6_current_enrichment';
import { newHollandT6ServiceIntervalsMigration } from '@/lib/migrations/20260905_645_new_holland_t6_service_intervals';
import { newHollandT6Manual90478716MaintenanceMigration } from '@/lib/migrations/20260905_646_new_holland_t6_manual_90478716_maintenance';

export const newHollandT6ContinuationMigrations: DbMigration[] = [
  newHollandT6CurrentEnrichmentMigration,
  newHollandT6ServiceIntervalsMigration,
  newHollandT6Manual90478716MaintenanceMigration,
];
