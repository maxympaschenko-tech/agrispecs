import type { DbMigration } from '@/lib/db-migration-types';
import { newHollandT5110120SecondaryAirMigration } from '@/lib/migrations/20260903_615_new_holland_t5_110_120_secondary_air';
import { newHollandT5110120BrakeReservoirFilterMigration } from '@/lib/migrations/20260903_616_new_holland_t5_110_120_brake_reservoir_filter';
import { newHollandT5110120LowRoofCabFilterMigration } from '@/lib/migrations/20260903_617_new_holland_t5_110_120_low_roof_cab_filter';
import { newHollandT5110120CabFilterMigration } from '@/lib/migrations/20260903_618_new_holland_t5_110_120_cab_filter';
import { newHollandT5110120HydraulicMigration } from '@/lib/migrations/20260903_619_new_holland_t5_110_120_hydraulic';
import { newHollandT5StageVEngineOilFilterMigration } from '@/lib/migrations/20260903_620_new_holland_t5_stagev_engine_oil_filter';
import { newHollandT5My23AutoCommandHydraulicMigration } from '@/lib/migrations/20260903_621_new_holland_t5_my23_autocommand_hydraulic';
import { newHollandT5StageVFuelPrefilterMigration } from '@/lib/migrations/20260905_622_new_holland_t5_stagev_fuel_prefilter';
import { newHollandT5130140AutoCommandFuelFilterMigration } from '@/lib/migrations/20260905_623_new_holland_t5_130_140_autocommand_fuel_filter';
import { newHollandT5130140My23FuelFilterMigration } from '@/lib/migrations/20260905_624_new_holland_t5_130_140_my23_fuel_filter';
import { newHollandT5StageV84278636FuelFilterMigration } from '@/lib/migrations/20260905_625_new_holland_t5_stagev_84278636_fuel_filter';
import { newHollandT5StageV84412164SecondaryFuelFilterMigration } from '@/lib/migrations/20260905_626_new_holland_t5_stagev_84412164_secondary_fuel_filter';
import { newHollandT5StageV84526251FuelPrefilterMigration } from '@/lib/migrations/20260905_627_new_holland_t5_stagev_84526251_fuel_prefilter';
import { newHollandT5DynamicTransmissionFilterHeadMigration } from '@/lib/migrations/20260905_628_new_holland_t5_dynamic_transmission_filter_head';
import { newHollandT5My2391843297RolesMigration } from '@/lib/migrations/20260905_629_new_holland_t5_my23_91843297_roles';
import { newHollandT5AutoCommandMaintenanceMigration } from '@/lib/migrations/20260905_630_new_holland_t5_autocommand_maintenance';
import { newHollandT5StageVDefFiltersMigration } from '@/lib/migrations/20260905_633_new_holland_t5_stagev_def_filters';
import { newHollandT5AutoCommandMaintenanceCompletionMigration } from '@/lib/migrations/20260905_634_new_holland_t5_autocommand_maintenance_completion';
import { newHollandT5110120HistoricalFitmentContextMigration } from '@/lib/migrations/20260905_635_new_holland_t5_110_120_historical_fitment_context';

export const newHollandT5ContinuationMigrations: DbMigration[] = [
  newHollandT5110120SecondaryAirMigration,
  newHollandT5110120BrakeReservoirFilterMigration,
  newHollandT5110120LowRoofCabFilterMigration,
  newHollandT5110120CabFilterMigration,
  newHollandT5110120HydraulicMigration,
  newHollandT5StageVEngineOilFilterMigration,
  newHollandT5My23AutoCommandHydraulicMigration,
  newHollandT5StageVFuelPrefilterMigration,
  newHollandT5130140AutoCommandFuelFilterMigration,
  newHollandT5130140My23FuelFilterMigration,
  newHollandT5StageV84278636FuelFilterMigration,
  newHollandT5StageV84412164SecondaryFuelFilterMigration,
  newHollandT5StageV84526251FuelPrefilterMigration,
  newHollandT5DynamicTransmissionFilterHeadMigration,
  newHollandT5My2391843297RolesMigration,
  newHollandT5AutoCommandMaintenanceMigration,
  newHollandT5StageVDefFiltersMigration,
  newHollandT5AutoCommandMaintenanceCompletionMigration,
  newHollandT5110120HistoricalFitmentContextMigration,
];
