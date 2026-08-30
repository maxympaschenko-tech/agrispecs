import type { DbMigration } from '@/lib/db-migration-types';
import { kiotiCk20CurrentUsMigration } from '@/lib/migrations/20260830_330_kioti_ck20_current_us';
import { kiotiCk20LoadersMigration } from '@/lib/migrations/20260830_331_kioti_ck20_loaders';
import { kiotiCsCurrentUsMigration } from '@/lib/migrations/20260830_332_kioti_cs_current_us';
import { kiotiCsLoadersMigration } from '@/lib/migrations/20260830_333_kioti_cs_loaders';
import { kiotiCx2510CurrentUsMigration } from '@/lib/migrations/20260830_334_kioti_cx2510_current_us';
import { kiotiCx2510LoadersMigration } from '@/lib/migrations/20260830_335_kioti_cx2510_loaders';
import { kiotiDkCurrentUsMigration } from '@/lib/migrations/20260830_336_kioti_dk_current_us';
import { kiotiDkLoadersMigration } from '@/lib/migrations/20260830_337_kioti_dk_loaders';
import { kiotiNsCurrentUsMigration } from '@/lib/migrations/20260830_338_kioti_ns_current_us';
import { kiotiNsLoaderMigration } from '@/lib/migrations/20260830_339_kioti_ns_loader';
import { kiotiNxCurrentUsMigration } from '@/lib/migrations/20260830_340_kioti_nx_current_us';
import { kiotiNxLoaderMigration } from '@/lib/migrations/20260830_341_kioti_nx_loader';
import { kiotiRxCurrentUsMigration } from '@/lib/migrations/20260830_342_kioti_rx_current_us';
import { kiotiRxLoadersMigration } from '@/lib/migrations/20260830_343_kioti_rx_loaders';
import { kiotiHxCurrentUsMigration } from '@/lib/migrations/20260830_344_kioti_hx_current_us';
import { kiotiHxLoadersMigration } from '@/lib/migrations/20260830_345_kioti_hx_loaders';
import { kiotiCk40CurrentUsMigration } from '@/lib/migrations/20260830_346_kioti_ck40_current_us';
import { kiotiCk40LoaderMigration } from '@/lib/migrations/20260830_347_kioti_ck40_loader';

export const kiotiMigrations: DbMigration[] = [
  kiotiCk20CurrentUsMigration,
  kiotiCk20LoadersMigration,
  kiotiCsCurrentUsMigration,
  kiotiCsLoadersMigration,
  kiotiCx2510CurrentUsMigration,
  kiotiCx2510LoadersMigration,
  kiotiDkCurrentUsMigration,
  kiotiDkLoadersMigration,
  kiotiNsCurrentUsMigration,
  kiotiNsLoaderMigration,
  kiotiNxCurrentUsMigration,
  kiotiNxLoaderMigration,
  kiotiRxCurrentUsMigration,
  kiotiRxLoadersMigration,
  kiotiHxCurrentUsMigration,
  kiotiHxLoadersMigration,
  kiotiCk40CurrentUsMigration,
  kiotiCk40LoaderMigration,
];
