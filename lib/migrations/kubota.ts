import type { DbMigration } from '@/lib/db-migration-types';
import { kubotaM7060CurrentSpecsMigration } from '@/lib/migrations/20260827_133_kubota_m7060_current_specs';
import { kubotaM7060LA1154LoaderMigration } from '@/lib/migrations/20260827_134_kubota_m7060_la1154_loader';
import { kubotaM7060CurrentHydraulicsPtoCorrectionMigration } from '@/lib/migrations/20260827_135_kubota_m7060_current_hydraulics_pto_correction';
import { kubotaM7060ServiceCapacitiesMigration } from '@/lib/migrations/20260827_136_kubota_m7060_service_capacities';
import { kubotaM7060CapacityProvenanceCorrectionMigration } from '@/lib/migrations/20260827_137_kubota_m7060_capacity_provenance_correction';
import { kubotaM6060CurrentSpecsMigration } from '@/lib/migrations/20260827_138_kubota_m6060_current_specs';
import { kubotaM6060LA1154LoaderMigration } from '@/lib/migrations/20260827_139_kubota_m6060_la1154_loader';
import { kubotaM5660SUCurrentSpecsMigration } from '@/lib/migrations/20260827_140_kubota_m5660su_current_specs';
import { kubotaM5660SULA1154SULoaderMigration } from '@/lib/migrations/20260827_141_kubota_m5660su_la1154su_loader';
import { machinePartFitmentConfidenceMigration } from '@/lib/migrations/20260827_142_machine_part_fitment_confidence';
import { kubotaM60EngineOilFilterReferencesMigration } from '@/lib/migrations/20260827_143_kubota_m60_engine_oil_filter_references';
import { kubotaM6060M7060ServiceFiltersMigration } from '@/lib/migrations/20260827_144_kubota_m6060_m7060_service_filters';
import { kubotaFilterSupersessionsMigration } from '@/lib/migrations/20260827_145_kubota_filter_supersessions';
import { kubotaM5660SUServiceFiltersMigration } from '@/lib/migrations/20260827_146_kubota_m5660su_service_filters';
import { kubotaCurrentFuelFilterSupersessionMigration } from '@/lib/migrations/20260827_147_kubota_current_fuel_filter_supersession';
import { kubotaM5660SUAirFilterSupersessionsMigration } from '@/lib/migrations/20260827_148_kubota_m5660su_air_filter_supersessions';
import { kubotaL2502CurrentSpecsMigration } from '@/lib/migrations/20260827_149_kubota_l2502_current_specs';
import { kubotaL2502LA526LoaderMigration } from '@/lib/migrations/20260827_150_kubota_l2502_la526_loader';
import { kubotaM60FitmentDeduplicationMigration } from '@/lib/migrations/20260827_151_kubota_m60_fitment_deduplication';
import { kubotaL2502ServiceFiltersMigration } from '@/lib/migrations/20260827_152_kubota_l2502_service_filters';
import { kubotaL2502FilterSupersessionsMigration } from '@/lib/migrations/20260827_153_kubota_l2502_filter_supersessions';
import { kubotaL2502GearTransmissionCorrectionMigration } from '@/lib/migrations/20260827_154_kubota_l2502_gear_transmission_correction';
import { kubotaL3302L3902CurrentSpecsMigration } from '@/lib/migrations/20260827_155_kubota_l3302_l3902_current_specs';
import { kubotaL3302L3902LA526LoaderMigration } from '@/lib/migrations/20260827_156_kubota_l3302_l3902_la526_loader';
import { kubotaL3302L3902ServiceFiltersMigration } from '@/lib/migrations/20260827_157_kubota_l3302_l3902_service_filters';

export const kubotaMigrations: DbMigration[] = [
  kubotaM7060CurrentSpecsMigration,
  kubotaM7060LA1154LoaderMigration,
  kubotaM7060CurrentHydraulicsPtoCorrectionMigration,
  kubotaM7060ServiceCapacitiesMigration,
  kubotaM7060CapacityProvenanceCorrectionMigration,
  kubotaM6060CurrentSpecsMigration,
  kubotaM6060LA1154LoaderMigration,
  kubotaM5660SUCurrentSpecsMigration,
  kubotaM5660SULA1154SULoaderMigration,
  machinePartFitmentConfidenceMigration,
  kubotaM60EngineOilFilterReferencesMigration,
  kubotaM6060M7060ServiceFiltersMigration,
  kubotaFilterSupersessionsMigration,
  kubotaM5660SUServiceFiltersMigration,
  kubotaCurrentFuelFilterSupersessionMigration,
  kubotaM5660SUAirFilterSupersessionsMigration,
  kubotaL2502CurrentSpecsMigration,
  kubotaL2502LA526LoaderMigration,
  kubotaM60FitmentDeduplicationMigration,
  kubotaL2502ServiceFiltersMigration,
  kubotaL2502FilterSupersessionsMigration,
  kubotaL2502GearTransmissionCorrectionMigration,
  kubotaL3302L3902CurrentSpecsMigration,
  kubotaL3302L3902LA526LoaderMigration,
  kubotaL3302L3902ServiceFiltersMigration,
];
