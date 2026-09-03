import type { DbMigration } from '@/lib/db-migration-types';
import { newHollandT5110120SecondaryAirMigration } from '@/lib/migrations/20260903_615_new_holland_t5_110_120_secondary_air';
import { newHollandT5110120BrakeReservoirFilterMigration } from '@/lib/migrations/20260903_616_new_holland_t5_110_120_brake_reservoir_filter';

export const newHollandT5ContinuationMigrations: DbMigration[] = [
  newHollandT5110120SecondaryAirMigration,
  newHollandT5110120BrakeReservoirFilterMigration,
];
