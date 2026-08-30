import type { DbMigration } from '@/lib/db-migration-types';
import { bobcat2000CurrentUsMigration } from '@/lib/migrations/20260830_360_bobcat_2000_current_us';
import { bobcat4000CurrentUsMigration } from '@/lib/migrations/20260830_361_bobcat_4000_current_us';
import { bobcat5000CurrentUsMigration } from '@/lib/migrations/20260830_362_bobcat_5000_current_us';
import { bobcat1000CurrentUsMigration } from '@/lib/migrations/20260830_363_bobcat_1000_current_us';
import { bobcatLoadersCurrentUsMigration } from '@/lib/migrations/20260830_364_bobcat_loaders_current_us';
import { bobcat40005000MaintenanceKitsMigration } from '@/lib/migrations/20260830_365_bobcat_4000_5000_maintenance_kits';
import { bobcat1000MaintenanceKitsMigration } from '@/lib/migrations/20260830_366_bobcat_1000_maintenance_kits';

export const bobcatMigrations: DbMigration[] = [
  bobcat2000CurrentUsMigration,
  bobcat4000CurrentUsMigration,
  bobcat5000CurrentUsMigration,
  bobcat1000CurrentUsMigration,
  bobcatLoadersCurrentUsMigration,
  bobcat40005000MaintenanceKitsMigration,
  bobcat1000MaintenanceKitsMigration,
];
