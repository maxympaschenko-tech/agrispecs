import type { DbMigration } from '@/lib/db-migration-types';
import { ventrac4520CurrentUsMigration } from '@/lib/migrations/20260831_464_ventrac_4520_current_us';

export const ventracMigrations: DbMigration[] = [
  ventrac4520CurrentUsMigration,
];
