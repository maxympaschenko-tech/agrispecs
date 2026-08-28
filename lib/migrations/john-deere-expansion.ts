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
];
