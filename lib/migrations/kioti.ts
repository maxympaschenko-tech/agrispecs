import type { DbMigration } from '@/lib/db-migration-types';
import { kiotiCk20CurrentUsMigration } from '@/lib/migrations/20260830_330_kioti_ck20_current_us';
import { kiotiCk20LoadersMigration } from '@/lib/migrations/20260830_331_kioti_ck20_loaders';

export const kiotiMigrations: DbMigration[] = [
  kiotiCk20CurrentUsMigration,
  kiotiCk20LoadersMigration,
];
