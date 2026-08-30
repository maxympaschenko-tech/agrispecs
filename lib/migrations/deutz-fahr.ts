import type { DbMigration } from '@/lib/db-migration-types';
import { deutzFahr4SeriesCurrentUsMigration } from '@/lib/migrations/20260830_413_deutz_fahr_4_series_current_us';
import { deutzFahr5dKeylineCurrentUsMigration } from '@/lib/migrations/20260830_414_deutz_fahr_5d_keyline_current_us';

export const deutzFahrMigrations: DbMigration[] = [
  deutzFahr4SeriesCurrentUsMigration,
  deutzFahr5dKeylineCurrentUsMigration,
];
