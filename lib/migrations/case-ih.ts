import type { DbMigration } from '@/lib/db-migration-types';
import { caseIHAfsConnectPumaCurrentSpecsMigration } from '@/lib/migrations/20260828_227_case_ih_afs_connect_puma_current_specs';
import { caseIHAfsConnectPumaL117LoaderMigration } from '@/lib/migrations/20260828_228_case_ih_afs_connect_puma_l117_loader';
import { caseIHMagnumCurrentSpecsMigration } from '@/lib/migrations/20260828_229_case_ih_magnum_current_specs';
import { caseIHMagnumL118LoaderMigration } from '@/lib/migrations/20260828_230_case_ih_magnum_l118_loader';

export const caseIHMigrations: DbMigration[] = [
  caseIHAfsConnectPumaCurrentSpecsMigration,
  caseIHAfsConnectPumaL117LoaderMigration,
  caseIHMagnumCurrentSpecsMigration,
  caseIHMagnumL118LoaderMigration,
];
