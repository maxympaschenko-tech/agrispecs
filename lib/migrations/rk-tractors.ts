import type { DbMigration } from '@/lib/db-migration-types';
import { rkTractorsSubcompactCurrentUsMigration } from '@/lib/migrations/20260831_468_rk_tractors_subcompact_current_us';
import { rkTractorsCompactUtilityCurrentUsMigration } from '@/lib/migrations/20260831_469_rk_tractors_compact_utility_current_us';
import { rkTractorsAttachmentsMigration } from '@/lib/migrations/20260831_470_rk_tractors_attachments';

export const rkTractorsMigrations: DbMigration[] = [
  rkTractorsSubcompactCurrentUsMigration,
  rkTractorsCompactUtilityCurrentUsMigration,
  rkTractorsAttachmentsMigration,
];
