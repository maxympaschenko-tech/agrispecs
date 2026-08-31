import type { DbMigration } from '@/lib/db-migration-types';
import { johnDeere7RCurrentSpecsMigration } from '@/lib/migrations/20260828_211_john_deere_7r_current_specs';
import { johnDeere7RServiceFiltersMigration } from '@/lib/migrations/20260828_212_john_deere_7r_service_filters';
import { johnDeere8RCurrentSpecsMigration } from '@/lib/migrations/20260828_213_john_deere_8r_current_specs';
import { johnDeere8RServiceFiltersMigration } from '@/lib/migrations/20260828_214_john_deere_8r_service_filters';
import { johnDeere8RTCurrentSpecsMigration } from '@/lib/migrations/20260828_215_john_deere_8rt_current_specs';
import { johnDeere8RTServiceFiltersMigration } from '@/lib/migrations/20260828_216_john_deere_8rt_service_filters';
import { johnDeere8RXCurrentSpecsMigration } from '@/lib/migrations/20260828_217_john_deere_8rx_current_specs';
import { johnDeere8RXServiceFiltersMigration } from '@/lib/migrations/20260828_218_john_deere_8rx_service_filters';
import { johnDeere9RXHHPCurrentSpecsMigration } from '@/lib/migrations/20260828_219_john_deere_9rx_hhp_current_specs';
import { johnDeere9RXHHPServiceFiltersMigration } from '@/lib/migrations/20260828_220_john_deere_9rx_hhp_service_filters';
import { johnDeere9RTCurrentSpecsMigration } from '@/lib/migrations/20260828_221_john_deere_9rt_current_specs';
import { johnDeere9RTServiceFiltersMigration } from '@/lib/migrations/20260828_222_john_deere_9rt_service_filters';
import { johnDeere9RCurrentSpecsMigration } from '@/lib/migrations/20260828_223_john_deere_9r_current_specs';
import { johnDeere9RServiceFiltersMigration } from '@/lib/migrations/20260828_224_john_deere_9r_service_filters';
import { johnDeere9RX490640CurrentSpecsMigration } from '@/lib/migrations/20260828_225_john_deere_9rx_490_640_current_specs';
import { johnDeere9RX490640ServiceFiltersMigration } from '@/lib/migrations/20260828_226_john_deere_9rx_490_640_service_filters';
import { johnDeere6M165250CurrentSpecsMigration } from '@/lib/migrations/20260828_263_john_deere_6m_165_250_current_specs';
import { johnDeere6M180240CurrentSpecsMigration } from '@/lib/migrations/20260828_264_john_deere_6m_180_240_current_specs';
import { johnDeere6MOOSCurrentSpecsMigration } from '@/lib/migrations/20260828_265_john_deere_6m_oos_current_specs';
import { johnDeere6R215250CurrentSpecsMigration } from '@/lib/migrations/20260828_266_john_deere_6r_215_250_current_specs';
import { johnDeere6R145185CurrentSpecsMigration } from '@/lib/migrations/20260828_267_john_deere_6r_145_185_current_specs';
import { johnDeere5M50855100CurrentSpecsMigration } from '@/lib/migrations/20260828_268_john_deere_5m_5085_5100_current_specs';
import { johnDeere5MH5MLCurrentSpecsMigration } from '@/lib/migrations/20260828_269_john_deere_5mh_5ml_current_specs';
import { johnDeere5ENCurrentSpecsMigration } from '@/lib/migrations/20260828_270_john_deere_5en_current_specs';
import { johnDeereSpecialty5090EL6120EH6MH155CurrentSpecsMigration } from '@/lib/migrations/20260828_271_john_deere_specialty_5090el_6120eh_6mh155_current_specs';
import { johnDeereUnitNormalizationCorrectionsMigration } from '@/lib/migrations/20260829_284_john_deere_unit_normalization_corrections';
import { johnDeere6M120OOSCurrentCorrectionMigration } from '@/lib/migrations/20260829_289_john_deere_6m_120_oos_current_correction';
import { johnDeereCombinesCurrentMigration } from '@/lib/migrations/20260831_480_john_deere_combines_current';
import { johnDeereS7800RotorSpeedCorrectionMigration } from '@/lib/migrations/20260831_481_john_deere_s7_800_rotor_speed_correction';
import { johnDeereSprayersCurrentMigration } from '@/lib/migrations/20260831_486_john_deere_sprayers_current';
import { johnDeerePlantersCurrentMigration } from '@/lib/migrations/20260831_489_john_deere_planters_current';
import { johnDeereF8F9ForageHarvestersCurrentMigration } from '@/lib/migrations/20260831_496_john_deere_f8_f9_forage_harvesters_current';
import { johnDeereCottonHarvestersMy2026Migration } from '@/lib/migrations/20260831_498_john_deere_cotton_harvesters_my2026';
import { johnDeereCSeriesAirCartsCurrentMigration } from '@/lib/migrations/20260831_514_john_deere_c_series_air_carts_current';
import { johnDeere2230fhFieldCultivatorsCurrentMigration } from '@/lib/migrations/20260831_516_john_deere_2230fh_field_cultivators_current';
import { johnDeere2660vtVerticalTillageCurrentMigration } from '@/lib/migrations/20260831_518_john_deere_2660vt_vertical_tillage_current';

export const johnDeereExpansionMigrations: DbMigration[] = [
  johnDeere7RCurrentSpecsMigration,
  johnDeere7RServiceFiltersMigration,
  johnDeere8RCurrentSpecsMigration,
  johnDeere8RServiceFiltersMigration,
  johnDeere8RTCurrentSpecsMigration,
  johnDeere8RTServiceFiltersMigration,
  johnDeere8RXCurrentSpecsMigration,
  johnDeere8RXServiceFiltersMigration,
  johnDeere9RXHHPCurrentSpecsMigration,
  johnDeere9RXHHPServiceFiltersMigration,
  johnDeere9RTCurrentSpecsMigration,
  johnDeere9RTServiceFiltersMigration,
  johnDeere9RCurrentSpecsMigration,
  johnDeere9RServiceFiltersMigration,
  johnDeere9RX490640CurrentSpecsMigration,
  johnDeere9RX490640ServiceFiltersMigration,
  johnDeere6M165250CurrentSpecsMigration,
  johnDeere6M180240CurrentSpecsMigration,
  johnDeere6MOOSCurrentSpecsMigration,
  johnDeere6R215250CurrentSpecsMigration,
  johnDeere6R145185CurrentSpecsMigration,
  johnDeere5M50855100CurrentSpecsMigration,
  johnDeere5MH5MLCurrentSpecsMigration,
  johnDeere5ENCurrentSpecsMigration,
  johnDeereSpecialty5090EL6120EH6MH155CurrentSpecsMigration,
  johnDeereUnitNormalizationCorrectionsMigration,
  johnDeere6M120OOSCurrentCorrectionMigration,
  johnDeereCombinesCurrentMigration,
  johnDeereS7800RotorSpeedCorrectionMigration,
  johnDeereSprayersCurrentMigration,
  johnDeerePlantersCurrentMigration,
  johnDeereF8F9ForageHarvestersCurrentMigration,
  johnDeereCottonHarvestersMy2026Migration,
  johnDeereCSeriesAirCartsCurrentMigration,
  johnDeere2230fhFieldCultivatorsCurrentMigration,
  johnDeere2660vtVerticalTillageCurrentMigration,
];
