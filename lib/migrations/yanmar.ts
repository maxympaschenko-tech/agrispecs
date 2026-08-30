import type { DbMigration } from '@/lib/db-migration-types';
import { yanmarSaYm2CurrentUsMigration } from '@/lib/migrations/20260830_350_yanmar_sa_ym2_current_us';

export const yanmarMigrations: DbMigration[] = [
  yanmarSaYm2CurrentUsMigration,
];
