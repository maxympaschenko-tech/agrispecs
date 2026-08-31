import type { DbMigration } from '@/lib/db-migration-types';
import { zetorMSeriesSmallCurrentUsMigration } from '@/lib/migrations/20260831_446_zetor_m_series_small_current_us';

export const zetorMigrations: DbMigration[] = [
  zetorMSeriesSmallCurrentUsMigration,
];
