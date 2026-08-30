import type { DbMigration } from '@/lib/db-migration-types';
import { versatileNemesisCurrentUsMigration } from '@/lib/migrations/20260830_432_versatile_nemesis_current_us';

export const versatileMigrations: DbMigration[] = [
  versatileNemesisCurrentUsMigration,
];
