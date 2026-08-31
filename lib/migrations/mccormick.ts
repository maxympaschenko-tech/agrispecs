import type { DbMigration } from '@/lib/db-migration-types';
import { mccormickX8CurrentUsMigration } from '@/lib/migrations/20260830_436_mccormick_x8_current_us';
import { mccormickX76CurrentUsMigration } from '@/lib/migrations/20260830_437_mccormick_x7_6_current_us';
import { mccormickX7SwbCurrentUsMigration } from '@/lib/migrations/20260830_438_mccormick_x7_swb_current_us';
import { mccormickX66CurrentUsMigration } from '@/lib/migrations/20260830_439_mccormick_x6_6_current_us';
import { mccormickX6CurrentUsMigration } from '@/lib/migrations/20260830_440_mccormick_x6_current_us';
import { mccormickX5CurrentUsMigration } from '@/lib/migrations/20260830_441_mccormick_x5_current_us';
import { mccormickX4CurrentUsMigration } from '@/lib/migrations/20260830_442_mccormick_x4_current_us';
import { mccormickX4fCurrentUsMigration } from '@/lib/migrations/20260830_443_mccormick_x4f_current_us';

export const mccormickMigrations: DbMigration[] = [
  mccormickX8CurrentUsMigration,
  mccormickX76CurrentUsMigration,
  mccormickX7SwbCurrentUsMigration,
  mccormickX66CurrentUsMigration,
  mccormickX6CurrentUsMigration,
  mccormickX5CurrentUsMigration,
  mccormickX4CurrentUsMigration,
  mccormickX4fCurrentUsMigration,
];
