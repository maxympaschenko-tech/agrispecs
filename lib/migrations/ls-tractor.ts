import type { DbMigration } from '@/lib/db-migration-types';
import { lsTractorMt1CurrentUsMigration } from '@/lib/migrations/20260830_370_ls_tractor_mt1_current_us';
import { lsTractorMt1LoadersMigration } from '@/lib/migrations/20260830_371_ls_tractor_mt1_loaders';

export const lsTractorMigrations: DbMigration[] = [
  lsTractorMt1CurrentUsMigration,
  lsTractorMt1LoadersMigration,
];
