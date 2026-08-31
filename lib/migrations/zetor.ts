import type { DbMigration } from '@/lib/db-migration-types';
import { zetorMSeriesSmallCurrentUsMigration } from '@/lib/migrations/20260831_446_zetor_m_series_small_current_us';
import { zetorM60CompactUtilityCurrentUsMigration } from '@/lib/migrations/20260831_447_zetor_m60_compact_utility_current_us';
import { zetorM70pscCurrentUsMigration } from '@/lib/migrations/20260831_448_zetor_m70psc_current_us';
import { zetorM88sscCurrentUsMigration } from '@/lib/migrations/20260831_449_zetor_m88ssc_current_us';
import { zetorM88LoadersMigration } from '@/lib/migrations/20260831_450_zetor_m88_loaders';
import { zetorPSeriesCurrentUsMigration } from '@/lib/migrations/20260831_451_zetor_p_series_current_us';
import { zetorPSeriesLoaderMigration } from '@/lib/migrations/20260831_452_zetor_p_series_loader';
import { zetorHd150HtCurrentUsMigration } from '@/lib/migrations/20260831_453_zetor_hd150_ht_current_us';

export const zetorMigrations: DbMigration[] = [
  zetorMSeriesSmallCurrentUsMigration,
  zetorM60CompactUtilityCurrentUsMigration,
  zetorM70pscCurrentUsMigration,
  zetorM88sscCurrentUsMigration,
  zetorM88LoadersMigration,
  zetorPSeriesCurrentUsMigration,
  zetorPSeriesLoaderMigration,
  zetorHd150HtCurrentUsMigration,
];
