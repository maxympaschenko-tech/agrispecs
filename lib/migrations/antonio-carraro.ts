import type { DbMigration } from '@/lib/db-migration-types';
import { antonioCarraroNaFeaturedCurrentMigration } from '@/lib/migrations/20260831_471_antonio_carraro_na_featured_current';
import { antonioCarraroTtr4800AttachmentsMigration } from '@/lib/migrations/20260831_472_antonio_carraro_ttr_4800_attachments';
import { antonioCarraroToraNaCurrentMigration } from '@/lib/migrations/20260831_473_antonio_carraro_tora_na_current';
import { antonioCarraroErgitRNaCurrentMigration } from '@/lib/migrations/20260831_474_antonio_carraro_ergit_r_na_current';
import { antonioCarraroInfinityNaCurrentMigration } from '@/lib/migrations/20260831_475_antonio_carraro_infinity_na_current';
import { antonioCarraroErgitSTgfNaCurrentMigration } from '@/lib/migrations/20260831_476_antonio_carraro_ergit_s_tgf_na_current';

export const antonioCarraroMigrations: DbMigration[] = [
  antonioCarraroNaFeaturedCurrentMigration,
  antonioCarraroTtr4800AttachmentsMigration,
  antonioCarraroToraNaCurrentMigration,
  antonioCarraroErgitRNaCurrentMigration,
  antonioCarraroInfinityNaCurrentMigration,
  antonioCarraroErgitSTgfNaCurrentMigration,
];
