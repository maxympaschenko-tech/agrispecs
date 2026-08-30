import type { DbMigration } from '@/lib/db-migration-types';
import { versatileNemesisCurrentUsMigration } from '@/lib/migrations/20260830_432_versatile_nemesis_current_us';
import { versatileMfwdCurrentUsMigration } from '@/lib/migrations/20260830_433_versatile_mfwd_current_us';
import { versatile4wdCurrentUsMigration } from '@/lib/migrations/20260830_434_versatile_4wd_current_us';
import { versatileDeltaTrackCurrentUsMigration } from '@/lib/migrations/20260830_435_versatile_deltatrack_current_us';

export const versatileMigrations: DbMigration[] = [
  versatileNemesisCurrentUsMigration,
  versatileMfwdCurrentUsMigration,
  versatile4wdCurrentUsMigration,
  versatileDeltaTrackCurrentUsMigration,
];
