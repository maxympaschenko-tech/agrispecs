import type { DbMigration } from '@/lib/db-migration-types';
import { caseIHAfsConnectPumaCurrentSpecsMigration } from '@/lib/migrations/20260828_227_case_ih_afs_connect_puma_current_specs';
import { caseIHAfsConnectPumaL117LoaderMigration } from '@/lib/migrations/20260828_228_case_ih_afs_connect_puma_l117_loader';
import { caseIHMagnumCurrentSpecsMigration } from '@/lib/migrations/20260828_229_case_ih_magnum_current_specs';
import { caseIHMagnumL118LoaderMigration } from '@/lib/migrations/20260828_230_case_ih_magnum_l118_loader';
import { caseIHSteigerCurrentSpecsMigration } from '@/lib/migrations/20260828_231_case_ih_steiger_current_specs';
import { caseIHOptumCurrentSpecsMigration } from '@/lib/migrations/20260828_232_case_ih_optum_current_specs';
import { caseIHMaxxumCurrentSpecsMigration } from '@/lib/migrations/20260828_233_case_ih_maxxum_current_specs';
import { caseIHMaxxumLoadersMigration } from '@/lib/migrations/20260828_234_case_ih_maxxum_loaders';
import { caseIHVestrumCurrentSpecsMigration } from '@/lib/migrations/20260828_235_case_ih_vestrum_current_specs';
import { caseIHVestrumL113LoaderMigration } from '@/lib/migrations/20260828_236_case_ih_vestrum_l113_loader';
import { caseIHFarmall100AProCurrentSpecsMigration } from '@/lib/migrations/20260828_237_case_ih_farmall_100a_pro_current_specs';
import { caseIHFarmall100AProLoadersMigration } from '@/lib/migrations/20260828_238_case_ih_farmall_100a_pro_loaders';
import { caseIHFarmallSmallUtilityACurrentSpecsMigration } from '@/lib/migrations/20260828_239_case_ih_farmall_small_utility_a_current_specs';
import { caseIHFarmallSmallUtilityALoadersMigration } from '@/lib/migrations/20260828_240_case_ih_farmall_small_utility_a_loaders';

export const caseIHMigrations: DbMigration[] = [
  caseIHAfsConnectPumaCurrentSpecsMigration,
  caseIHAfsConnectPumaL117LoaderMigration,
  caseIHMagnumCurrentSpecsMigration,
  caseIHMagnumL118LoaderMigration,
  caseIHSteigerCurrentSpecsMigration,
  caseIHOptumCurrentSpecsMigration,
  caseIHMaxxumCurrentSpecsMigration,
  caseIHMaxxumLoadersMigration,
  caseIHVestrumCurrentSpecsMigration,
  caseIHVestrumL113LoaderMigration,
  caseIHFarmall100AProCurrentSpecsMigration,
  caseIHFarmall100AProLoadersMigration,
  caseIHFarmallSmallUtilityACurrentSpecsMigration,
  caseIHFarmallSmallUtilityALoadersMigration,
];
