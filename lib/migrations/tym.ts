import type { DbMigration } from '@/lib/db-migration-types';
import { tymSeries1CurrentUsMigration } from '@/lib/migrations/20260830_398_tym_series1_current_us';

export const tymMigrations: DbMigration[] = [
  tymSeries1CurrentUsMigration,
];
