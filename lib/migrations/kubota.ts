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
];
