import type { DbMigration } from '@/lib/db-migration-types';
import { fendtCurrentUsCoreMigration } from '@/lib/migrations/20260829_310_fendt_current_us_core';
import { fendt600VarioCurrentUsMigration } from '@/lib/migrations/20260829_311_fendt_600_vario_current_us';

export const fendtMigrations: DbMigration[] = [
  fendtCurrentUsCoreMigration,
  fendt600VarioCurrentUsMigration,
];
