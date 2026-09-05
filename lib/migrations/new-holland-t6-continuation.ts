import type { DbMigration } from '@/lib/db-migration-types';
import { newHollandT6CurrentEnrichmentMigration } from '@/lib/migrations/20260905_644_new_holland_t6_current_enrichment';
import { newHollandT6ServiceIntervalsMigration } from '@/lib/migrations/20260905_645_new_holland_t6_service_intervals';

export const newHollandT6ContinuationMigrations: DbMigration[] = [
  newHollandT6CurrentEnrichmentMigration,
  newHollandT6ServiceIntervalsMigration,
];
