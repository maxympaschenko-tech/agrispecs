import type { DbMigration } from '@/lib/db-migration-types';
import { caseBSeriesSkidSteersCurrentMigration } from '@/lib/migrations/20260831_537_case_b_series_skid_steers_current';
import { caseBSeriesCompactTrackLoadersCurrentMigration } from '@/lib/migrations/20260831_538_case_b_series_compact_track_loaders_current';

export const caseConstructionMigrations: DbMigration[] = [
  caseBSeriesSkidSteersCurrentMigration,
  caseBSeriesCompactTrackLoadersCurrentMigration,
];
