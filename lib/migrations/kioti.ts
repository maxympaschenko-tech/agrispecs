import type { DbMigration } from '@/lib/db-migration-types';
import { kiotiCk20CurrentUsMigration } from '@/lib/migrations/20260830_330_kioti_ck20_current_us';
import { kiotiCk20LoadersMigration } from '@/lib/migrations/20260830_331_kioti_ck20_loaders';
import { kiotiCsCurrentUsMigration } from '@/lib/migrations/20260830_332_kioti_cs_current_us';
import { kiotiCsLoadersMigration } from '@/lib/migrations/20260830_333_kioti_cs_loaders';
import { kiotiCx2510CurrentUsMigration } from '@/lib/migrations/20260830_334_kioti_cx2510_current_us';

export const kiotiMigrations: DbMigration[] = [
  kiotiCk20CurrentUsMigration,
  kiotiCk20LoadersMigration,
  kiotiCsCurrentUsMigration,
  kiotiCsLoadersMigration,
  kiotiCx2510CurrentUsMigration,
];
