import type { DbMigration } from '@/lib/db-migration-types';
import { newHollandT6CurrentEnrichmentMigration } from '@/lib/migrations/20260905_644_new_holland_t6_current_enrichment';

export const newHollandT6ContinuationMigrations: DbMigration[] = [
  newHollandT6CurrentEnrichmentMigration,
];
