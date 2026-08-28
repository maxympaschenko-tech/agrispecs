import type { DbMigration } from '@/lib/db-migration-types';
import { newHollandPowerStarCurrentSpecsMigration } from '@/lib/migrations/20260828_272_new_holland_powerstar_current_specs';

export const newHollandMigrations: DbMigration[] = [
  newHollandPowerStarCurrentSpecsMigration,
];
