import type { DbMigration } from '@/lib/db-migration-types';
import { antonioCarraroNaFeaturedCurrentMigration } from '@/lib/migrations/20260831_471_antonio_carraro_na_featured_current';
import { antonioCarraroTtr4800AttachmentsMigration } from '@/lib/migrations/20260831_472_antonio_carraro_ttr_4800_attachments';

export const antonioCarraroMigrations: DbMigration[] = [
  antonioCarraroNaFeaturedCurrentMigration,
  antonioCarraroTtr4800AttachmentsMigration,
];
