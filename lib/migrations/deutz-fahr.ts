import type { DbMigration } from '@/lib/db-migration-types';
import { deutzFahr4SeriesCurrentUsMigration } from '@/lib/migrations/20260830_413_deutz_fahr_4_series_current_us';

export const deutzFahrMigrations: DbMigration[] = [
  deutzFahr4SeriesCurrentUsMigration,
];
