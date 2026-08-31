import type { DbMigration } from '@/lib/db-migration-types';
import { bobcat2000CurrentUsMigration } from '@/lib/migrations/20260830_360_bobcat_2000_current_us';
import { bobcat4000CurrentUsMigration } from '@/lib/migrations/20260830_361_bobcat_4000_current_us';
import { bobcat5000CurrentUsMigration } from '@/lib/migrations/20260830_362_bobcat_5000_current_us';
import { bobcat1000CurrentUsMigration } from '@/lib/migrations/20260830_363_bobcat_1000_current_us';
import { bobcatLoadersCurrentUsMigration } from '@/lib/migrations/20260830_364_bobcat_loaders_current_us';
import { bobcat40005000MaintenanceKitsMigration } from '@/lib/migrations/20260830_365_bobcat_4000_5000_maintenance_kits';
import { bobcat1000MaintenanceKitsMigration } from '@/lib/migrations/20260830_366_bobcat_1000_maintenance_kits';
import { bobcatSkidSteerLoadersCurrentMigration } from '@/lib/migrations/20260831_547_bobcat_skid_steer_loaders_current';
import { bobcatCompactTrackLoadersCurrentMigration } from '@/lib/migrations/20260831_548_bobcat_compact_track_loaders_current';
import { bobcatCompactWheelLoadersCurrentMigration } from '@/lib/migrations/20260831_549_bobcat_compact_wheel_loaders_current';
import { bobcatLargeWheelLoadersCurrentMigration } from '@/lib/migrations/20260831_550_bobcat_large_wheel_loaders_current';
import { bobcatMiniExcavatorsCurrentMigration } from '@/lib/migrations/20260831_551_bobcat_mini_excavators_current';
import { bobcatMiniExcavatorSectionCorrectionMigration } from '@/lib/migrations/20260831_552_bobcat_mini_excavator_section_correction';

export const bobcatMigrations: DbMigration[] = [
  bobcat2000CurrentUsMigration,
  bobcat4000CurrentUsMigration,
  bobcat5000CurrentUsMigration,
  bobcat1000CurrentUsMigration,
  bobcatLoadersCurrentUsMigration,
  bobcat40005000MaintenanceKitsMigration,
  bobcat1000MaintenanceKitsMigration,
  bobcatSkidSteerLoadersCurrentMigration,
  bobcatCompactTrackLoadersCurrentMigration,
  bobcatCompactWheelLoadersCurrentMigration,
  bobcatLargeWheelLoadersCurrentMigration,
  bobcatMiniExcavatorsCurrentMigration,
  bobcatMiniExcavatorSectionCorrectionMigration,
];
