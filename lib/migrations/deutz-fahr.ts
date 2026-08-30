import type { DbMigration } from '@/lib/db-migration-types';
import { deutzFahr4SeriesCurrentUsMigration } from '@/lib/migrations/20260830_413_deutz_fahr_4_series_current_us';
import { deutzFahr5dKeylineCurrentUsMigration } from '@/lib/migrations/20260830_414_deutz_fahr_5d_keyline_current_us';
import { deutzFahr5SeriesCurrentUsMigration } from '@/lib/migrations/20260830_415_deutz_fahr_5_series_current_us';
import { deutzFahr5SeriesLoaderMigration } from '@/lib/migrations/20260830_416_deutz_fahr_5_series_loader';
import { deutzFahr5gTbCurrentUsMigration } from '@/lib/migrations/20260830_417_deutz_fahr_5g_tb_current_us';

export const deutzFahrMigrations: DbMigration[] = [
  deutzFahr4SeriesCurrentUsMigration,
  deutzFahr5dKeylineCurrentUsMigration,
  deutzFahr5SeriesCurrentUsMigration,
  deutzFahr5SeriesLoaderMigration,
  deutzFahr5gTbCurrentUsMigration,
];
