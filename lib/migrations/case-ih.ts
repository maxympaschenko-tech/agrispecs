import type { DbMigration } from '@/lib/db-migration-types';
import { caseIHAfsConnectPumaCurrentSpecsMigration } from '@/lib/migrations/20260828_227_case_ih_afs_connect_puma_current_specs';
import { caseIHAfsConnectPumaL117LoaderMigration } from '@/lib/migrations/20260828_228_case_ih_afs_connect_puma_l117_loader';
import { caseIHMagnumCurrentSpecsMigration } from '@/lib/migrations/20260828_229_case_ih_magnum_current_specs';
import { caseIHMagnumL118LoaderMigration } from '@/lib/migrations/20260828_230_case_ih_magnum_l118_loader';
import { caseIHSteigerCurrentSpecsMigration } from '@/lib/migrations/20260828_231_case_ih_steiger_current_specs';
import { caseIHOptumCurrentSpecsMigration } from '@/lib/migrations/20260828_232_case_ih_optum_current_specs';
import { caseIHMaxxumCurrentSpecsMigration } from '@/lib/migrations/20260828_233_case_ih_maxxum_current_specs';
import { caseIHMaxxumLoadersMigration } from '@/lib/migrations/20260828_234_case_ih_maxxum_loaders';

export const caseIHMigrations: DbMigration[] = [
  caseIHAfsConnectPumaCurrentSpecsMigration,
  caseIHAfsConnectPumaL117LoaderMigration,
  caseIHMagnumCurrentSpecsMigration,
  caseIHMagnumL118LoaderMigration,
  caseIHSteigerCurrentSpecsMigration,
  caseIHOptumCurrentSpecsMigration,
  caseIHMaxxumCurrentSpecsMigration,
  caseIHMaxxumLoadersMigration,
];
