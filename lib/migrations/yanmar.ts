import type { DbMigration } from '@/lib/db-migration-types';
import { yanmarSaYm2CurrentUsMigration } from '@/lib/migrations/20260830_350_yanmar_sa_ym2_current_us';
import { yanmarSaYm2LoadersMigration } from '@/lib/migrations/20260830_351_yanmar_sa_ym2_loaders';
import { yanmarYt2Ym3CurrentUsMigration } from '@/lib/migrations/20260830_352_yanmar_yt2_ym3_current_us';
import { yanmarYt3SmCurrentUsMigration } from '@/lib/migrations/20260830_353_yanmar_yt3_sm_current_us';
import { yanmarMaintenanceIntervalsMigration } from '@/lib/migrations/20260830_354_yanmar_maintenance_intervals';

export const yanmarMigrations: DbMigration[] = [
  yanmarSaYm2CurrentUsMigration,
  yanmarSaYm2LoadersMigration,
  yanmarYt2Ym3CurrentUsMigration,
  yanmarYt3SmCurrentUsMigration,
  yanmarMaintenanceIntervalsMigration,
];
