import type { DbMigration } from '@/lib/db-migration-types';
import { newHollandT5110120SecondaryAirMigration } from '@/lib/migrations/20260903_615_new_holland_t5_110_120_secondary_air';
import { newHollandT5110120BrakeReservoirFilterMigration } from '@/lib/migrations/20260903_616_new_holland_t5_110_120_brake_reservoir_filter';
import { newHollandT5110120LowRoofCabFilterMigration } from '@/lib/migrations/20260903_617_new_holland_t5_110_120_low_roof_cab_filter';
import { newHollandT5110120CabFilterMigration } from '@/lib/migrations/20260903_618_new_holland_t5_110_120_cab_filter';
import { newHollandT5110120HydraulicMigration } from '@/lib/migrations/20260903_619_new_holland_t5_110_120_hydraulic';
import { newHollandT5StageVEngineOilFilterMigration } from '@/lib/migrations/20260903_620_new_holland_t5_stagev_engine_oil_filter';
import { newHollandT5My23AutoCommandHydraulicMigration } from '@/lib/migrations/20260903_621_new_holland_t5_my23_autocommand_hydraulic';
import { newHollandT5StageVFuelPrefilterMigration } from '@/lib/migrations/20260905_622_new_holland_t5_stagev_fuel_prefilter';

export const newHollandT5ContinuationMigrations: DbMigration[] = [
  newHollandT5110120SecondaryAirMigration,
  newHollandT5110120BrakeReservoirFilterMigration,
  newHollandT5110120LowRoofCabFilterMigration,
  newHollandT5110120CabFilterMigration,
  newHollandT5110120HydraulicMigration,
  newHollandT5StageVEngineOilFilterMigration,
  newHollandT5My23AutoCommandHydraulicMigration,
  newHollandT5StageVFuelPrefilterMigration,
];
