import type { DbMigration } from '@/lib/db-migration-types';
import { claasArion600CurrentUsMigration } from '@/lib/migrations/20260830_426_claas_arion_600_current_us';
import { claasAxion800CurrentUsMigration } from '@/lib/migrations/20260830_427_claas_axion_800_current_us';

export const claasMigrations: DbMigration[] = [
  claasArion600CurrentUsMigration,
  claasAxion800CurrentUsMigration,
];
