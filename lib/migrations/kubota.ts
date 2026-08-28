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
import { kubotaFuelFilterFullSupersessionChainMigration } from '@/lib/migrations/20260827_158_kubota_fuel_filter_full_supersession_chain';
import { kubotaL4802CurrentSpecsMigration } from '@/lib/migrations/20260827_159_kubota_l4802_current_specs';
import { kubotaL4802LA766LoaderMigration } from '@/lib/migrations/20260827_160_kubota_l4802_la766_loader';
import { kubotaL4802ServiceFiltersMigration } from '@/lib/migrations/20260827_161_kubota_l4802_service_filters';
import { kubotaL4802HydraulicFilterSupersessionMigration } from '@/lib/migrations/20260827_162_kubota_l4802_hydraulic_filter_supersession';
import { kubotaL4802BH92BackhoeMigration } from '@/lib/migrations/20260827_163_kubota_l4802_bh92_backhoe';
import { kubotaMXCurrentSpecsMigration } from '@/lib/migrations/20260827_164_kubota_mx_current_specs';
import { kubotaMXAttachmentsMigration } from '@/lib/migrations/20260827_165_kubota_mx_attachments';
import { kubotaMXServiceFiltersMigration } from '@/lib/migrations/20260827_166_kubota_mx_service_filters';
import { kubotaMXHSTFilterSupersessionsMigration } from '@/lib/migrations/20260827_167_kubota_mx_hst_filter_supersessions';
import { kubotaMX5400FFilterProvenanceMigration } from '@/lib/migrations/20260827_168_kubota_mx5400f_filter_provenance';
import { kubotaMXOilSeparatorFilterMigration } from '@/lib/migrations/20260827_169_kubota_mx_oil_separator_filter';
import { kubotaBXCurrentSpecsMigration } from '@/lib/migrations/20260827_170_kubota_bx_current_specs';
import { kubotaBXAttachmentsMigration } from '@/lib/migrations/20260827_171_kubota_bx_attachments';
import { kubotaBXServiceFiltersMigration } from '@/lib/migrations/20260827_172_kubota_bx_service_filters';
import { kubotaBXFilterSupersessionsMigration } from '@/lib/migrations/20260827_173_kubota_bx_filter_supersessions';
import { kubotaBXMowersMigration } from '@/lib/migrations/20260827_174_kubota_bx_mowers';
import { kubotaB01CurrentSpecsMigration } from '@/lib/migrations/20260827_175_kubota_b01_current_specs';
import { kubotaB01AttachmentsMigration } from '@/lib/migrations/20260827_176_kubota_b01_attachments';
import { kubotaB01ServiceFiltersMigration } from '@/lib/migrations/20260827_177_kubota_b01_service_filters';
import { kubotaB01MowersMigration } from '@/lib/migrations/20260827_178_kubota_b01_mowers';
import { kubotaB01SnowBlowersMigration } from '@/lib/migrations/20260827_179_kubota_b01_snow_blowers';
import { kubotaB2401DTNPtoConflictMigration } from '@/lib/migrations/20260827_180_kubota_b2401dtn_pto_conflict';
import { kubotaLX20CurrentSpecsMigration } from '@/lib/migrations/20260828_181_kubota_lx20_current_specs';
import { kubotaLX20AttachmentsMigration } from '@/lib/migrations/20260828_182_kubota_lx20_attachments';
import { kubotaLX20ServiceFiltersMigration } from '@/lib/migrations/20260828_183_kubota_lx20_service_filters';
import { kubotaLX20FilterSupersessionsMigration } from '@/lib/migrations/20260828_184_kubota_lx20_filter_supersessions';
import { kubotaLX20SnowBlowersMigration } from '@/lib/migrations/20260828_185_kubota_lx20_snow_blowers';
import { kubotaLX20MowersMigration } from '@/lib/migrations/20260828_186_kubota_lx20_mowers';
import { machineAttachmentPerformanceOverridesMigration } from '@/lib/migrations/20260828_187_machine_attachment_performance_overrides';
import { kubotaM4CurrentSpecsMigration } from '@/lib/migrations/20260828_188_kubota_m4_current_specs';
import { kubotaM4LA1154LoaderMigration } from '@/lib/migrations/20260828_189_kubota_m4_la1154_loader';
import { kubotaM4ServiceFiltersMigration } from '@/lib/migrations/20260828_190_kubota_m4_service_filters';
import { kubotaM4OilFilterSupersessionsMigration } from '@/lib/migrations/20260828_191_kubota_m4_oil_filter_supersessions';
import { kubotaM5CurrentSpecsMigration } from '@/lib/migrations/20260828_192_kubota_m5_current_specs';
import { kubotaM5LA1854LoaderMigration } from '@/lib/migrations/20260828_193_kubota_m5_la1854_loader';
import { kubotaM5ServiceFiltersMigration } from '@/lib/migrations/20260828_194_kubota_m5_service_filters';
import { kubotaM5HDCServicePackMigration } from '@/lib/migrations/20260828_195_kubota_m5_hdc_service_pack';
import { kubotaM5OilSeparatorSupersessionMigration } from '@/lib/migrations/20260828_196_kubota_m5_oil_separator_supersession';
import { kubotaM6CurrentSpecsMigration } from '@/lib/migrations/20260828_197_kubota_m6_current_specs';
import { kubotaM6LoadersMigration } from '@/lib/migrations/20260828_198_kubota_m6_loaders';

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
  kubotaFuelFilterFullSupersessionChainMigration,
  kubotaL4802CurrentSpecsMigration,
  kubotaL4802LA766LoaderMigration,
  kubotaL4802ServiceFiltersMigration,
  kubotaL4802HydraulicFilterSupersessionMigration,
  kubotaL4802BH92BackhoeMigration,
  kubotaMXCurrentSpecsMigration,
  kubotaMXAttachmentsMigration,
  kubotaMXServiceFiltersMigration,
  kubotaMXHSTFilterSupersessionsMigration,
  kubotaMX5400FFilterProvenanceMigration,
  kubotaMXOilSeparatorFilterMigration,
  kubotaBXCurrentSpecsMigration,
  kubotaBXAttachmentsMigration,
  kubotaBXServiceFiltersMigration,
  kubotaBXFilterSupersessionsMigration,
  kubotaBXMowersMigration,
  kubotaB01CurrentSpecsMigration,
  kubotaB01AttachmentsMigration,
  kubotaB01ServiceFiltersMigration,
  kubotaB01MowersMigration,
  kubotaB01SnowBlowersMigration,
  kubotaB2401DTNPtoConflictMigration,
  kubotaLX20CurrentSpecsMigration,
  kubotaLX20AttachmentsMigration,
  kubotaLX20ServiceFiltersMigration,
  kubotaLX20FilterSupersessionsMigration,
  kubotaLX20SnowBlowersMigration,
  kubotaLX20MowersMigration,
  machineAttachmentPerformanceOverridesMigration,
  kubotaM4CurrentSpecsMigration,
  kubotaM4LA1154LoaderMigration,
  kubotaM4ServiceFiltersMigration,
  kubotaM4OilFilterSupersessionsMigration,
  kubotaM5CurrentSpecsMigration,
  kubotaM5LA1854LoaderMigration,
  kubotaM5ServiceFiltersMigration,
  kubotaM5HDCServicePackMigration,
  kubotaM5OilSeparatorSupersessionMigration,
  kubotaM6CurrentSpecsMigration,
  kubotaM6LoadersMigration,
];
