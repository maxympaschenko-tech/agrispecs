import type { DbMigration } from '@/lib/db-migration-types';
import { deutzFahr4SeriesCurrentUsMigration } from '@/lib/migrations/20260830_413_deutz_fahr_4_series_current_us';
import { deutzFahr5dKeylineCurrentUsMigration } from '@/lib/migrations/20260830_414_deutz_fahr_5d_keyline_current_us';
import { deutzFahr5SeriesCurrentUsMigration } from '@/lib/migrations/20260830_415_deutz_fahr_5_series_current_us';
import { deutzFahr5SeriesLoaderMigration } from '@/lib/migrations/20260830_416_deutz_fahr_5_series_loader';
import { deutzFahr5gTbCurrentUsMigration } from '@/lib/migrations/20260830_417_deutz_fahr_5g_tb_current_us';
import { deutzFahr3060CurrentUsMigration } from '@/lib/migrations/20260830_418_deutz_fahr_3_series_3060_current_us';
import { deutzFahr6Series4cCurrentUsMigration } from '@/lib/migrations/20260830_419_deutz_fahr_6_series_4c_current_us';
import { deutzFahr6Series6cCurrentUsMigration } from '@/lib/migrations/20260830_420_deutz_fahr_6_series_6c_current_us';
import { deutzFahr7250TtvCurrentUsMigration } from '@/lib/migrations/20260830_421_deutz_fahr_7250_ttv_current_us';
import { deutzFahr8280TtvCurrentUsMigration } from '@/lib/migrations/20260830_422_deutz_fahr_8280_ttv_current_us';

export const deutzFahrMigrations: DbMigration[] = [
  deutzFahr4SeriesCurrentUsMigration,
  deutzFahr5dKeylineCurrentUsMigration,
  deutzFahr5SeriesCurrentUsMigration,
  deutzFahr5SeriesLoaderMigration,
  deutzFahr5gTbCurrentUsMigration,
  deutzFahr3060CurrentUsMigration,
  deutzFahr6Series4cCurrentUsMigration,
  deutzFahr6Series6cCurrentUsMigration,
  deutzFahr7250TtvCurrentUsMigration,
  deutzFahr8280TtvCurrentUsMigration,
];
