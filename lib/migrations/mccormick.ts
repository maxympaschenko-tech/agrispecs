import type { DbMigration } from '@/lib/db-migration-types';
import { mccormickX8CurrentUsMigration } from '@/lib/migrations/20260830_436_mccormick_x8_current_us';

export const mccormickMigrations: DbMigration[] = [
  mccormickX8CurrentUsMigration,
];
