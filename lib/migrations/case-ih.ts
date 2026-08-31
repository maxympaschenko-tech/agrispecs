import type { DbMigration } from '@/lib/db-migration-types';
import { caseIHAfsConnectPumaCurrentSpecsMigration } from '@/lib/migrations/20260828_227_case_ih_afs_connect_puma_current_specs';
import { caseIHAfsConnectPumaL117LoaderMigration } from '@/lib/migrations/20260828_228_case_ih_afs_connect_puma_l117_loader';
import { caseIHMagnumCurrentSpecsMigration } from '@/lib/migrations/20260828_229_case_ih_magnum_current_specs';
import { caseIHMagnumL118LoaderMigration } from '@/lib/migrations/20260828_230_case_ih_magnum_l118_loader';
import { caseIHSteigerCurrentSpecsMigration } from '@/lib/migrations/20260828_231_case_ih_steiger_current_specs';
import { caseIHOptumCurrentSpecsMigration } from '@/lib/migrations/20260828_232_case_ih_optum_current_specs';
import { caseIHMaxxumCurrentSpecsMigration } from '@/lib/migrations/20260828_233_case_ih_maxxum_current_specs';
import { caseIHMaxxumLoadersMigration } from '@/lib/migrations/20260828_234_case_ih_maxxum_loaders';
import { caseIHVestrumCurrentSpecsMigration } from '@/lib/migrations/20260828_235_case_ih_vestrum_current_specs';
import { caseIHVestrumL113LoaderMigration } from '@/lib/migrations/20260828_236_case_ih_vestrum_l113_loader';
import { caseIHFarmall100AProCurrentSpecsMigration } from '@/lib/migrations/20260828_237_case_ih_farmall_100a_pro_current_specs';
import { caseIHFarmall100AProLoadersMigration } from '@/lib/migrations/20260828_238_case_ih_farmall_100a_pro_loaders';
import { caseIHFarmallSmallUtilityACurrentSpecsMigration } from '@/lib/migrations/20260828_239_case_ih_farmall_small_utility_a_current_specs';
import { caseIHFarmallSmallUtilityALoadersMigration } from '@/lib/migrations/20260828_240_case_ih_farmall_small_utility_a_loaders';
import { caseIHFarmallMediumUtilityACurrentSpecsMigration } from '@/lib/migrations/20260828_241_case_ih_farmall_medium_utility_a_current_specs';
import { caseIHFarmallMediumUtilityALoadersMigration } from '@/lib/migrations/20260828_242_case_ih_farmall_medium_utility_a_loaders';
import { caseIHFarmallMediumUtilityCCurrentSpecsMigration } from '@/lib/migrations/20260828_243_case_ih_farmall_medium_utility_c_current_specs';
import { caseIHFarmallMediumUtilityCL635LoaderMigration } from '@/lib/migrations/20260828_244_case_ih_farmall_medium_utility_c_l635_loader';
import { caseIHFarmallMediumUtilityCL635LoaderUrlFixMigration } from '@/lib/migrations/20260828_245_case_ih_farmall_medium_utility_c_l635_loader';
import { caseIHFarmallCompactCCurrentSpecsMigration } from '@/lib/migrations/20260828_246_case_ih_farmall_compact_c_current_specs';
import { caseIHFarmallCompactCLoadersMigration } from '@/lib/migrations/20260828_247_case_ih_farmall_compact_c_loaders';
import { caseIHFarmall25SCCurrentMigration } from '@/lib/migrations/20260828_248_case_ih_farmall_25sc_current';
import { caseIHFarmallCompactACurrentSpecsMigration } from '@/lib/migrations/20260828_249_case_ih_farmall_compact_a_current_specs';
import { caseIHFarmallCompactAL340ALoaderMigration } from '@/lib/migrations/20260828_250_case_ih_farmall_compact_a_l340a_loader';
import { caseIHFarmallSmallUtilityCCurrentSpecsMigration } from '@/lib/migrations/20260828_251_case_ih_farmall_small_utility_c_current_specs';
import { caseIHFarmallSmallUtilityCL565LoaderMigration } from '@/lib/migrations/20260828_252_case_ih_farmall_small_utility_c_l565_loader';
import { caseIHFarmallLargeUtilityMCurrentMigration } from '@/lib/migrations/20260828_253_case_ih_farmall_large_utility_m_current';
import { caseIHFarmallNCurrentSpecsMigration } from '@/lib/migrations/20260828_254_case_ih_farmall_n_current_specs';
import { caseIHFarmallVCurrentRegistryMigration } from '@/lib/migrations/20260828_255_case_ih_farmall_v_current_registry';
import { caseIHFarmallCLCurrentSpecsMigration } from '@/lib/migrations/20260828_256_case_ih_farmall_cl_current_specs';
import { caseIHPuma150175CurrentMigration } from '@/lib/migrations/20260828_257_case_ih_puma_150_175_current';
import { caseIHFarmallMediumUtilityACorrectionsMigration } from '@/lib/migrations/20260828_258_case_ih_farmall_medium_utility_a_corrections';
import { caseIHFarmallMediumUtilityCCorrectionsMigration } from '@/lib/migrations/20260828_259_case_ih_farmall_medium_utility_c_corrections';
import { caseIHFarmallMediumUtilityALoaderCorrectionsMigration } from '@/lib/migrations/20260828_260_case_ih_farmall_medium_utility_a_loader_corrections';
import { caseIHPuma155NewCurrentMigration } from '@/lib/migrations/20260828_261_case_ih_puma_155_new_current';
import { caseIHPuma165185NewCurrentMigration } from '@/lib/migrations/20260828_262_case_ih_puma_165_185_new_current';
import { caseIHFarmall110MStrictCurrentCorrectionMigration } from '@/lib/migrations/20260829_290_case_ih_farmall_110m_strict_current_correction';
import { caseIHCombinesCurrentMigration } from '@/lib/migrations/20260831_482_case_ih_combines_current';
import { caseIHPatriotSprayersCurrentMigration } from '@/lib/migrations/20260831_487_case_ih_patriot_sprayers_current';
import { caseIHEarlyRiserPlantersCurrentMigration } from '@/lib/migrations/20260831_488_case_ih_early_riser_planters_current';
import { caseIHRoundBalersCurrentMigration } from '@/lib/migrations/20260831_490_case_ih_round_balers_current';
import { caseIHSmallSquareBalersCurrentMigration } from '@/lib/migrations/20260831_492_case_ih_small_square_balers_current';
import { caseIHLargeSquareBalersCurrentMigration } from '@/lib/migrations/20260831_494_case_ih_large_square_balers_current';
import { caseIHWd5WindrowersCurrentMigration } from '@/lib/migrations/20260831_499_case_ih_wd5_windrowers_current';
import { caseIHDcDiscMowerConditionersCurrentMigration } from '@/lib/migrations/20260831_503_case_ih_dc_disc_mower_conditioners_current';
import { caseIhWrWheelRakesCurrentMigration } from '@/lib/migrations/20260831_504_case_ih_wr_wheel_rakes_current';
import { caseIhMdMdxDiscMowersCurrentMigration } from '@/lib/migrations/20260831_511_case_ih_md_mdx_disc_mowers_current';
import { caseIhAirDrillsCurrentMigration } from '@/lib/migrations/20260831_512_case_ih_air_drills_current';
import { caseIhPrecisionAirCartsCurrentMigration } from '@/lib/migrations/20260831_513_case_ih_precision_air_carts_current';
import { caseIhFieldCultivatorsCurrentMigration } from '@/lib/migrations/20260831_515_case_ih_field_cultivators_current';
import { caseIhVerticalTillageCurrentMigration } from '@/lib/migrations/20260831_517_case_ih_vertical_tillage_current';
import { caseIhSpeedTillerHighSpeedDisksCurrentMigration } from '@/lib/migrations/20260831_519_case_ih_speed_tiller_high_speed_disks_current';
import { caseIhEcoloTiger875DiskRipperCurrentMigration } from '@/lib/migrations/20260831_521_case_ih_ecolo_tiger_875_disk_ripper_current';
import { caseIhTrueTandemDiskHarrowsCurrentMigration } from '@/lib/migrations/20260831_523_case_ih_true_tandem_disk_harrows_current';

export const caseIHMigrations: DbMigration[] = [
  caseIHAfsConnectPumaCurrentSpecsMigration, caseIHAfsConnectPumaL117LoaderMigration,
  caseIHMagnumCurrentSpecsMigration, caseIHMagnumL118LoaderMigration, caseIHSteigerCurrentSpecsMigration,
  caseIHOptumCurrentSpecsMigration, caseIHMaxxumCurrentSpecsMigration, caseIHMaxxumLoadersMigration,
  caseIHVestrumCurrentSpecsMigration, caseIHVestrumL113LoaderMigration,
  caseIHFarmall100AProCurrentSpecsMigration, caseIHFarmall100AProLoadersMigration,
  caseIHFarmallSmallUtilityACurrentSpecsMigration, caseIHFarmallSmallUtilityALoadersMigration,
  caseIHFarmallMediumUtilityACurrentSpecsMigration, caseIHFarmallMediumUtilityALoadersMigration,
  caseIHFarmallMediumUtilityCCurrentSpecsMigration, caseIHFarmallMediumUtilityCL635LoaderMigration,
  caseIHFarmallMediumUtilityCL635LoaderUrlFixMigration, caseIHFarmallCompactCCurrentSpecsMigration,
  caseIHFarmallCompactCLoadersMigration, caseIHFarmall25SCCurrentMigration,
  caseIHFarmallCompactACurrentSpecsMigration, caseIHFarmallCompactAL340ALoaderMigration,
  caseIHFarmallSmallUtilityCCurrentSpecsMigration, caseIHFarmallSmallUtilityCL565LoaderMigration,
  caseIHFarmallLargeUtilityMCurrentMigration, caseIHFarmallNCurrentSpecsMigration,
  caseIHFarmallVCurrentRegistryMigration, caseIHFarmallCLCurrentSpecsMigration, caseIHPuma150175CurrentMigration,
  caseIHFarmallMediumUtilityACorrectionsMigration, caseIHFarmallMediumUtilityCCorrectionsMigration,
  caseIHFarmallMediumUtilityALoaderCorrectionsMigration, caseIHPuma155NewCurrentMigration,
  caseIHPuma165185NewCurrentMigration, caseIHFarmall110MStrictCurrentCorrectionMigration,
  caseIHCombinesCurrentMigration,
  caseIHPatriotSprayersCurrentMigration,
  caseIHEarlyRiserPlantersCurrentMigration,
  caseIHRoundBalersCurrentMigration,
  caseIHSmallSquareBalersCurrentMigration,
  caseIHLargeSquareBalersCurrentMigration,
  caseIHWd5WindrowersCurrentMigration,
  caseIHDcDiscMowerConditionersCurrentMigration,
  caseIhWrWheelRakesCurrentMigration,
  caseIhMdMdxDiscMowersCurrentMigration,
  caseIhAirDrillsCurrentMigration,
  caseIhPrecisionAirCartsCurrentMigration,
  caseIhFieldCultivatorsCurrentMigration,
  caseIhVerticalTillageCurrentMigration,
  caseIhSpeedTillerHighSpeedDisksCurrentMigration,
  caseIhEcoloTiger875DiskRipperCurrentMigration,
  caseIhTrueTandemDiskHarrowsCurrentMigration,
];
