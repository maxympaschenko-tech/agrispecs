import type { DbMigration } from '@/lib/db-migration-types';
import { bobcat2000CurrentUsMigration } from '@/lib/migrations/20260830_360_bobcat_2000_current_us';

export const bobcatMigrations: DbMigration[] = [
  bobcat2000CurrentUsMigration,
];
