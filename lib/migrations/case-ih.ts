import type { DbMigration } from '@/lib/db-migration-types';
import { caseIHAfsConnectPumaCurrentSpecsMigration } from '@/lib/migrations/20260828_227_case_ih_afs_connect_puma_current_specs';
import { caseIHAfsConnectPumaL117LoaderMigration } from '@/lib/migrations/20260828_228_case_ih_afs_connect_puma_l117_loader';

export const caseIHMigrations: DbMigration[] = [
  caseIHAfsConnectPumaCurrentSpecsMigration,
  caseIHAfsConnectPumaL117LoaderMigration,
];
