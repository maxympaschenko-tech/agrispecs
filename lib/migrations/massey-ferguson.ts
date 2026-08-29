import type { DbMigration } from '@/lib/db-migration-types';
import { masseyFergusonCurrentUsCoreMigration } from '@/lib/migrations/20260829_300_massey_ferguson_current_us_core';
import { masseyFergusonUsExpansionMigration } from '@/lib/migrations/20260829_301_massey_ferguson_us_expansion';

export const masseyFergusonMigrations: DbMigration[] = [
  masseyFergusonCurrentUsCoreMigration,
  masseyFergusonUsExpansionMigration,
];
