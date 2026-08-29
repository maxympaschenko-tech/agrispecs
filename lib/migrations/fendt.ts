import type { DbMigration } from '@/lib/db-migration-types';
import { fendtCurrentUsCoreMigration } from '@/lib/migrations/20260829_310_fendt_current_us_core';

export const fendtMigrations: DbMigration[] = [
  fendtCurrentUsCoreMigration,
];
