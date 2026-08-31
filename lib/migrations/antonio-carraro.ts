import type { DbMigration } from '@/lib/db-migration-types';
import { antonioCarraroNaFeaturedCurrentMigration } from '@/lib/migrations/20260831_471_antonio_carraro_na_featured_current';

export const antonioCarraroMigrations: DbMigration[] = [
  antonioCarraroNaFeaturedCurrentMigration,
];
