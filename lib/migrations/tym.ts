import type { DbMigration } from '@/lib/db-migration-types';
import { tymSeries1CurrentUsMigration } from '@/lib/migrations/20260830_398_tym_series1_current_us';
import { tymSeries2CurrentUsMigration } from '@/lib/migrations/20260830_399_tym_series2_current_us';
import { tymSeries1Series2AttachmentsMigration } from '@/lib/migrations/20260830_400_tym_series1_series2_attachments';
import { tymSeries3CoreCurrentUsMigration } from '@/lib/migrations/20260830_401_tym_series3_15_platform_current_us';
import { tymSeries3T3025T3035CurrentUsMigration } from '@/lib/migrations/20260830_402_tym_series3_t3025_t3035_current_us';
import { tymSeries3T394T474CurrentUsMigration } from '@/lib/migrations/20260830_403_tym_series3_t394_t474_current_us';
import { tymSeries3AttachmentsMigration } from '@/lib/migrations/20260830_404_tym_series3_attachments';
import { tymSeries4TwentyPlatformCurrentUsMigration } from '@/lib/migrations/20260830_405_tym_series4_20_platform_current_us';
import { tymSeries4TymYanmarCurrentUsMigration } from '@/lib/migrations/20260830_406_tym_series4_tym_yanmar_current_us';
import { tymSeries4T4058pCurrentUsMigration } from '@/lib/migrations/20260830_407_tym_series4_t4058p_current_us';

export const tymMigrations: DbMigration[] = [
  tymSeries1CurrentUsMigration,
  tymSeries2CurrentUsMigration,
  tymSeries1Series2AttachmentsMigration,
  tymSeries3CoreCurrentUsMigration,
  tymSeries3T3025T3035CurrentUsMigration,
  tymSeries3T394T474CurrentUsMigration,
  tymSeries3AttachmentsMigration,
  tymSeries4TwentyPlatformCurrentUsMigration,
  tymSeries4TymYanmarCurrentUsMigration,
  tymSeries4T4058pCurrentUsMigration,
];
