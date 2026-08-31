import type { DbMigration } from '@/lib/db-migration-types';
import { newHollandPowerStarCurrentSpecsMigration } from '@/lib/migrations/20260828_272_new_holland_powerstar_current_specs';
import { newHollandWorkmaster5070CurrentSpecsMigration } from '@/lib/migrations/20260828_273_new_holland_workmaster_50_70_current_specs';
import { newHollandWorkmasterCompactCurrentSpecsMigration } from '@/lib/migrations/20260828_274_new_holland_workmaster_compact_current_specs';
import { newHollandBoomer3555CurrentSpecsMigration } from '@/lib/migrations/20260828_275_new_holland_boomer_35_55_current_specs';
import { newHollandWorkmaster25SCurrentSpecsMigration } from '@/lib/migrations/20260828_276_new_holland_workmaster_25s_current_specs';
import { newHollandWorkmaster35C40CCurrentSpecsMigration } from '@/lib/migrations/20260829_277_new_holland_workmaster_35c_40c_current_specs';
import { newHollandT4FSCurrentSpecsMigration } from '@/lib/migrations/20260829_278_new_holland_t4fs_current_specs';
import { newHollandT4FCurrentSpecsMigration } from '@/lib/migrations/20260829_279_new_holland_t4f_current_specs';
import { newHollandT5CurrentSpecsMigration } from '@/lib/migrations/20260829_280_new_holland_t5_current_specs';
import { newHollandT6CurrentSpecsMigration } from '@/lib/migrations/20260829_281_new_holland_t6_current_specs';
import { newHollandT6180MethaneCurrentSpecsMigration } from '@/lib/migrations/20260829_282_new_holland_t6_180_methane_current_specs';
import { newHollandT7CurrentVisibleModelsMigration } from '@/lib/migrations/20260829_283_new_holland_t7_current_visible_models';
import { newHollandGenesisT8CurrentSpecsMigration } from '@/lib/migrations/20260829_285_new_holland_genesis_t8_current_specs';
import { newHollandT9CurrentSpecsMigration } from '@/lib/migrations/20260829_286_new_holland_t9_current_specs';
import { newHollandTS6SeriesIICurrentSpecsMigration } from '@/lib/migrations/20260829_287_new_holland_ts6_series_ii_current_specs';
import { newHollandWorkmasterPlusCurrentSpecsMigration } from '@/lib/migrations/20260829_288_new_holland_workmaster_plus_current_specs';
import { newHollandWorkmaster5575CurrentSpecsMigration } from '@/lib/migrations/20260829_291_new_holland_workmaster_55_75_current_specs';
import { newHollandWorkmaster5575LoadersMigration } from '@/lib/migrations/20260829_292_new_holland_workmaster_55_75_loaders';
import { newHollandWorkmaster25SCurrentEnrichmentMigration } from '@/lib/migrations/20260829_293_new_holland_workmaster_25s_current_enrichment';
import { newHollandT3FCurrentSpecsMigration } from '@/lib/migrations/20260829_294_new_holland_t3f_current_specs';
import { newHollandTK4CurrentSpecsMigration } from '@/lib/migrations/20260829_295_new_holland_tk4_current_specs';
import { newHollandT4VCurrentSpecsMigration } from '@/lib/migrations/20260829_296_new_holland_t4v_current_specs';
import { newHollandCRCombinesCurrentMigration } from '@/lib/migrations/20260831_483_new_holland_cr_combines_current';

export const newHollandMigrations: DbMigration[] = [
  newHollandPowerStarCurrentSpecsMigration,
  newHollandWorkmaster5070CurrentSpecsMigration,
  newHollandWorkmasterCompactCurrentSpecsMigration,
  newHollandBoomer3555CurrentSpecsMigration,
  newHollandWorkmaster25SCurrentSpecsMigration,
  newHollandWorkmaster35C40CCurrentSpecsMigration,
  newHollandT4FSCurrentSpecsMigration,
  newHollandT4FCurrentSpecsMigration,
  newHollandT5CurrentSpecsMigration,
  newHollandT6CurrentSpecsMigration,
  newHollandT6180MethaneCurrentSpecsMigration,
  newHollandT7CurrentVisibleModelsMigration,
  newHollandGenesisT8CurrentSpecsMigration,
  newHollandT9CurrentSpecsMigration,
  newHollandTS6SeriesIICurrentSpecsMigration,
  newHollandWorkmasterPlusCurrentSpecsMigration,
  newHollandWorkmaster5575CurrentSpecsMigration,
  newHollandWorkmaster5575LoadersMigration,
  newHollandWorkmaster25SCurrentEnrichmentMigration,
  newHollandT3FCurrentSpecsMigration,
  newHollandTK4CurrentSpecsMigration,
  newHollandT4VCurrentSpecsMigration,
  newHollandCRCombinesCurrentMigration,
];
