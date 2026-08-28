import type { DbMigration } from '@/lib/db-migration-types';
import { johnDeere7RCurrentSpecsMigration } from '@/lib/migrations/20260828_211_john_deere_7r_current_specs';
import { johnDeere7RServiceFiltersMigration } from '@/lib/migrations/20260828_212_john_deere_7r_service_filters';
import { johnDeere8RCurrentSpecsMigration } from '@/lib/migrations/20260828_213_john_deere_8r_current_specs';
import { johnDeere8RServiceFiltersMigration } from '@/lib/migrations/20260828_214_john_deere_8r_service_filters';

export const johnDeereExpansionMigrations: DbMigration[] = [
  johnDeere7RCurrentSpecsMigration,
  johnDeere7RServiceFiltersMigration,
  johnDeere8RCurrentSpecsMigration,
  johnDeere8RServiceFiltersMigration,
];
