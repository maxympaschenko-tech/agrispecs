import type { DbMigration } from '@/lib/db-migration-types';
import { lsTractorMt1CurrentUsMigration } from '@/lib/migrations/20260830_370_ls_tractor_mt1_current_us';
import { lsTractorMt1LoadersMigration } from '@/lib/migrations/20260830_371_ls_tractor_mt1_loaders';
import { lsTractorNewMt2eCurrentUsMigration } from '@/lib/migrations/20260830_372_ls_tractor_new_mt2e_current_us';
import { lsTractorNewMt2eLoadersMigration } from '@/lib/migrations/20260830_373_ls_tractor_new_mt2e_loaders';
import { lsTractorMt2CurrentUsMigration } from '@/lib/migrations/20260830_374_ls_tractor_mt2_current_us';
import { lsTractorMt2LoaderFitmentMigration } from '@/lib/migrations/20260830_375_ls_tractor_mt2_loader_fitment';
import { lsTractorMt3eCurrentUsMigration } from '@/lib/migrations/20260830_376_ls_tractor_mt3e_current_us';
import { lsTractorMt3eLoadersMigration } from '@/lib/migrations/20260830_377_ls_tractor_mt3e_loaders';
import { lsTractorMt3CurrentUsMigration } from '@/lib/migrations/20260830_378_ls_tractor_mt3_current_us';
import { lsTractorMt3LowHpCurrentUsMigration } from '@/lib/migrations/20260830_379_ls_tractor_mt3_low_hp_current_us';
import { lsTractorMt3LoadersMigration } from '@/lib/migrations/20260830_380_ls_tractor_mt3_loaders';

export const lsTractorMigrations: DbMigration[] = [
  lsTractorMt1CurrentUsMigration,
  lsTractorMt1LoadersMigration,
  lsTractorNewMt2eCurrentUsMigration,
  lsTractorNewMt2eLoadersMigration,
  lsTractorMt2CurrentUsMigration,
  lsTractorMt2LoaderFitmentMigration,
  lsTractorMt3eCurrentUsMigration,
  lsTractorMt3eLoadersMigration,
  lsTractorMt3CurrentUsMigration,
  lsTractorMt3LowHpCurrentUsMigration,
  lsTractorMt3LoadersMigration,
];
