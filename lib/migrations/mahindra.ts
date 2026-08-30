import type { DbMigration } from '@/lib/db-migration-types';
import { mahindra11002100CurrentUsMigration } from '@/lib/migrations/20260830_320_mahindra_1100_2100_current_us';

export const mahindraMigrations: DbMigration[] = [
  mahindra11002100CurrentUsMigration,
];
