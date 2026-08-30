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
import { lsTractorMt3eLoaderCorrectionMigration } from '@/lib/migrations/20260830_381_ls_tractor_mt3e_loader_correction';
import { lsTractorNewMt4CurrentUsMigration } from '@/lib/migrations/20260830_382_ls_tractor_new_mt4_current_us';
import { lsTractorNewMt4LoaderMigration } from '@/lib/migrations/20260830_383_ls_tractor_new_mt4_loader';
import { lsTractorMt5CurrentUsMigration } from '@/lib/migrations/20260830_384_ls_tractor_mt5_current_us';
import { lsTractorMt5LoaderMigration } from '@/lib/migrations/20260830_385_ls_tractor_mt5_loader';
import { lsTractorNewMt7CurrentUsMigration } from '@/lib/migrations/20260830_386_ls_tractor_new_mt7_current_us';
import { lsTractorNewMt7LoaderMigration } from '@/lib/migrations/20260830_387_ls_tractor_new_mt7_loader';
import { lsTractorMt2sCurrentUsMigration } from '@/lib/migrations/20260830_388_ls_tractor_mt2s_current_us';
import { lsTractorMt2sAttachmentsMigration } from '@/lib/migrations/20260830_389_ls_tractor_mt2s_attachments';
import { lsTractorXjCurrentUsMigration } from '@/lib/migrations/20260830_390_ls_tractor_xj_current_us';
import { lsTractorXjAttachmentsMigration } from '@/lib/migrations/20260830_391_ls_tractor_xj_attachments';

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
  lsTractorMt3eLoaderCorrectionMigration,
  lsTractorNewMt4CurrentUsMigration,
  lsTractorNewMt4LoaderMigration,
  lsTractorMt5CurrentUsMigration,
  lsTractorMt5LoaderMigration,
  lsTractorNewMt7CurrentUsMigration,
  lsTractorNewMt7LoaderMigration,
  lsTractorMt2sCurrentUsMigration,
  lsTractorMt2sAttachmentsMigration,
  lsTractorXjCurrentUsMigration,
  lsTractorXjAttachmentsMigration,
];
