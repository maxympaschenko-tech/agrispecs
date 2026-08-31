import type { DbMigration } from '@/lib/db-migration-types';
import { claasArion600CurrentUsMigration } from '@/lib/migrations/20260830_426_claas_arion_600_current_us';
import { claasAxion800CurrentUsMigration } from '@/lib/migrations/20260830_427_claas_axion_800_current_us';
import { claasAxion900CurrentUsMigration } from '@/lib/migrations/20260830_428_claas_axion_900_current_us';
import { claasXerion50004500CurrentUsMigration } from '@/lib/migrations/20260830_429_claas_xerion_5000_4500_current_us';
import { claasXerion12CurrentUsMigration } from '@/lib/migrations/20260830_430_claas_xerion_12_current_us';
import { claasArion600Fl150LoaderMigration } from '@/lib/migrations/20260830_431_claas_arion_600_fl150_loader';
import { claasCombinesCurrentUsMigration } from '@/lib/migrations/20260831_485_claas_combines_current_us';
import { claasJaguarForageHarvestersCurrentUsMigration } from '@/lib/migrations/20260831_497_claas_jaguar_forage_harvesters_current_us';
import { claasLinerRotaryRakesCurrentUsMigration } from '@/lib/migrations/20260831_507_claas_liner_rotary_rakes_current_us';
import { claasVoltoRotaryTeddersCurrentUsMigration } from '@/lib/migrations/20260831_509_claas_volto_rotary_tedders_current_us';

export const claasMigrations: DbMigration[] = [
  claasArion600CurrentUsMigration,
  claasAxion800CurrentUsMigration,
  claasAxion900CurrentUsMigration,
  claasXerion50004500CurrentUsMigration,
  claasXerion12CurrentUsMigration,
  claasArion600Fl150LoaderMigration,
  claasCombinesCurrentUsMigration,
  claasJaguarForageHarvestersCurrentUsMigration,
  claasLinerRotaryRakesCurrentUsMigration,
  claasVoltoRotaryTeddersCurrentUsMigration,
];
