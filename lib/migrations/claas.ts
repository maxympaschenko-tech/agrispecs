import type { DbMigration } from '@/lib/db-migration-types';
import { claasArion600CurrentUsMigration } from '@/lib/migrations/20260830_426_claas_arion_600_current_us';
import { claasAxion800CurrentUsMigration } from '@/lib/migrations/20260830_427_claas_axion_800_current_us';
import { claasAxion900CurrentUsMigration } from '@/lib/migrations/20260830_428_claas_axion_900_current_us';
import { claasXerion50004500CurrentUsMigration } from '@/lib/migrations/20260830_429_claas_xerion_5000_4500_current_us';

export const claasMigrations: DbMigration[] = [
  claasArion600CurrentUsMigration,
  claasAxion800CurrentUsMigration,
  claasAxion900CurrentUsMigration,
  claasXerion50004500CurrentUsMigration,
];
