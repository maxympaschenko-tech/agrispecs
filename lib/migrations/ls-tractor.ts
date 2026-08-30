import type { DbMigration } from '@/lib/db-migration-types';
import { lsTractorMt1CurrentUsMigration } from '@/lib/migrations/20260830_370_ls_tractor_mt1_current_us';
import { lsTractorMt1LoadersMigration } from '@/lib/migrations/20260830_371_ls_tractor_mt1_loaders';
import { lsTractorNewMt2eCurrentUsMigration } from '@/lib/migrations/20260830_372_ls_tractor_new_mt2e_current_us';

export const lsTractorMigrations: DbMigration[] = [
  lsTractorMt1CurrentUsMigration,
  lsTractorMt1LoadersMigration,
  lsTractorNewMt2eCurrentUsMigration,
];
