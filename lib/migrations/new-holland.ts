import type { DbMigration } from '@/lib/db-migration-types';
import { newHollandPowerStarCurrentSpecsMigration } from '@/lib/migrations/20260828_272_new_holland_powerstar_current_specs';
import { newHollandWorkmaster5070CurrentSpecsMigration } from '@/lib/migrations/20260828_273_new_holland_workmaster_50_70_current_specs';
import { newHollandWorkmasterCompactCurrentSpecsMigration } from '@/lib/migrations/20260828_274_new_holland_workmaster_compact_current_specs';

export const newHollandMigrations: DbMigration[] = [
  newHollandPowerStarCurrentSpecsMigration,
  newHollandWorkmaster5070CurrentSpecsMigration,
  newHollandWorkmasterCompactCurrentSpecsMigration,
];
