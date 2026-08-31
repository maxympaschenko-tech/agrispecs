import type { DbMigration } from '@/lib/db-migration-types';
import { badBoy103040CurrentUsMigration } from '@/lib/migrations/20260831_460_bad_boy_10_30_40_current_us';
import { badBoy103040AttachmentsMigration } from '@/lib/migrations/20260831_461_bad_boy_10_30_40_attachments';
import { badBoy50SeriesCurrentUsMigration } from '@/lib/migrations/20260831_462_bad_boy_50_series_current_us';
import { badBoy50SeriesAttachmentsMigration } from '@/lib/migrations/20260831_463_bad_boy_50_series_attachments';

export const badBoyMigrations: DbMigration[] = [
  badBoy103040CurrentUsMigration,
  badBoy103040AttachmentsMigration,
  badBoy50SeriesCurrentUsMigration,
  badBoy50SeriesAttachmentsMigration,
];
