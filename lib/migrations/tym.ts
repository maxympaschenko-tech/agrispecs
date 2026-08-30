import type { DbMigration } from '@/lib/db-migration-types';
import { tymSeries1CurrentUsMigration } from '@/lib/migrations/20260830_398_tym_series1_current_us';
import { tymSeries2CurrentUsMigration } from '@/lib/migrations/20260830_399_tym_series2_current_us';

export const tymMigrations: DbMigration[] = [
  tymSeries1CurrentUsMigration,
  tymSeries2CurrentUsMigration,
];
