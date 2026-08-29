import type { DbMigration } from '@/lib/db-migration-types';
import { masseyFergusonCurrentUsCoreMigration } from '@/lib/migrations/20260829_300_massey_ferguson_current_us_core';
import { masseyFergusonUsExpansionMigration } from '@/lib/migrations/20260829_301_massey_ferguson_us_expansion';
import { masseyFergusonUtilityLoadersMigration } from '@/lib/migrations/20260829_302_massey_ferguson_utility_loaders';
import { masseyFergusonProfessionalLoadersMigration } from '@/lib/migrations/20260829_303_massey_ferguson_professional_loaders';
import { masseyFergusonServiceIntervalsMigration } from '@/lib/migrations/20260829_304_massey_ferguson_service_intervals';
import { masseyFergusonGlobalEmissionsMigration } from '@/lib/migrations/20260829_305_massey_ferguson_global_emissions';

export const masseyFergusonMigrations: DbMigration[] = [
  masseyFergusonCurrentUsCoreMigration,
  masseyFergusonUsExpansionMigration,
  masseyFergusonUtilityLoadersMigration,
  masseyFergusonProfessionalLoadersMigration,
  masseyFergusonServiceIntervalsMigration,
  masseyFergusonGlobalEmissionsMigration,
];
