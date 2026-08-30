import type { DbMigration } from '@/lib/db-migration-types';
import { tymSeries1CurrentUsMigration } from '@/lib/migrations/20260830_398_tym_series1_current_us';
import { tymSeries2CurrentUsMigration } from '@/lib/migrations/20260830_399_tym_series2_current_us';
import { tymSeries1Series2AttachmentsMigration } from '@/lib/migrations/20260830_400_tym_series1_series2_attachments';
import { tymSeries3CoreCurrentUsMigration } from '@/lib/migrations/20260830_401_tym_series3_15_platform_current_us';
import { tymSeries3T3025T3035CurrentUsMigration } from '@/lib/migrations/20260830_402_tym_series3_t3025_t3035_current_us';
import { tymSeries3T394T474CurrentUsMigration } from '@/lib/migrations/20260830_403_tym_series3_t394_t474_current_us';

export const tymMigrations: DbMigration[] = [
  tymSeries1CurrentUsMigration,
  tymSeries2CurrentUsMigration,
  tymSeries1Series2AttachmentsMigration,
  tymSeries3CoreCurrentUsMigration,
  tymSeries3T3025T3035CurrentUsMigration,
  tymSeries3T394T474CurrentUsMigration,
];
