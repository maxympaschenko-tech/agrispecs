import type { DbMigration } from '@/lib/db-migration-types';
import { caseBSeriesSkidSteersCurrentMigration } from '@/lib/migrations/20260831_537_case_b_series_skid_steers_current';
import { caseBSeriesCompactTrackLoadersCurrentMigration } from '@/lib/migrations/20260831_538_case_b_series_compact_track_loaders_current';
import { caseCompactWheelLoadersCurrentMigration } from '@/lib/migrations/20260831_539_case_compact_wheel_loaders_current';
import { caseSmallArticulatedLoadersCurrentMigration } from '@/lib/migrations/20260831_540_case_small_articulated_loaders_current';
import { caseLargeWheelLoadersCurrentMigration } from '@/lib/migrations/20260831_541_case_large_wheel_loaders_current';
import { caseRoughTerrainForkliftsCurrentMigration } from '@/lib/migrations/20260831_542_case_rough_terrain_forklifts_current';

export const caseConstructionMigrations: DbMigration[] = [
  caseBSeriesSkidSteersCurrentMigration,
  caseBSeriesCompactTrackLoadersCurrentMigration,
  caseCompactWheelLoadersCurrentMigration,
  caseSmallArticulatedLoadersCurrentMigration,
  caseLargeWheelLoadersCurrentMigration,
  caseRoughTerrainForkliftsCurrentMigration,
];
