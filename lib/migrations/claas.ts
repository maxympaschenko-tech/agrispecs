import type { DbMigration } from '@/lib/db-migration-types';
import { claasArion600CurrentUsMigration } from '@/lib/migrations/20260830_426_claas_arion_600_current_us';

export const claasMigrations: DbMigration[] = [
  claasArion600CurrentUsMigration,
];
