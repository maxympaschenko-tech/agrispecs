import type { DbMigration } from '@/lib/db-migration-types';
import { monarchMkvCurrentUsMigration } from '@/lib/migrations/20260831_467_monarch_mkv_current_us';

export const monarchTractorMigrations: DbMigration[] = [
  monarchMkvCurrentUsMigration,
];
