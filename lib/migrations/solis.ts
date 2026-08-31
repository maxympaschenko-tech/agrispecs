import type { DbMigration } from '@/lib/db-migration-types';
import { solisS24CurrentUsMigration } from '@/lib/migrations/20260831_454_solis_s24_current_us';
import { solisH24CurrentUsMigration } from '@/lib/migrations/20260831_455_solis_h24_current_us';
import { solisH243200vLoaderMigration } from '@/lib/migrations/20260831_456_solis_h24_3200v_loader';
import { solisS75CurrentUsMigration } from '@/lib/migrations/20260831_457_solis_s75_current_us';

export const solisMigrations: DbMigration[] = [
  solisS24CurrentUsMigration,
  solisH24CurrentUsMigration,
  solisH243200vLoaderMigration,
  solisS75CurrentUsMigration,
];
