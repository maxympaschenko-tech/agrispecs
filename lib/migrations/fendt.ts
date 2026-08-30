import type { DbMigration } from '@/lib/db-migration-types';
import { fendtCurrentUsCoreMigration } from '@/lib/migrations/20260829_310_fendt_current_us_core';
import { fendt600VarioCurrentUsMigration } from '@/lib/migrations/20260829_311_fendt_600_vario_current_us';
import { fendt1000VarioGen4CurrentUsMigration } from '@/lib/migrations/20260829_312_fendt_1000_vario_gen4_current_us';
import { fendt300VarioGen4CurrentUsMigration } from '@/lib/migrations/20260829_313_fendt_300_vario_gen4_current_us';
import { fendt800VarioGen5CurrentUsMigration } from '@/lib/migrations/20260829_314_fendt_800_vario_gen5_current_us';
import { fendt1100VarioMtCurrentUsMigration } from '@/lib/migrations/20260830_315_fendt_1100_vario_mt_current_us';
import { fendt900VarioGen7CurrentUsMigration } from '@/lib/migrations/20260830_316_fendt_900_vario_gen7_current_us';

export const fendtMigrations: DbMigration[] = [
  fendtCurrentUsCoreMigration,
  fendt600VarioCurrentUsMigration,
  fendt1000VarioGen4CurrentUsMigration,
  fendt300VarioGen4CurrentUsMigration,
  fendt800VarioGen5CurrentUsMigration,
  fendt1100VarioMtCurrentUsMigration,
  fendt900VarioGen7CurrentUsMigration,
];
