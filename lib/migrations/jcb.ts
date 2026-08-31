import type { DbMigration } from '@/lib/db-migration-types';
import { jcbFastrac4000CurrentUsMigration } from '@/lib/migrations/20260831_458_jcb_fastrac_4000_current_us';
import { jcbFastrac8000CurrentUsMigration } from '@/lib/migrations/20260831_459_jcb_fastrac_8000_current_us';

export const jcbMigrations: DbMigration[] = [
  jcbFastrac4000CurrentUsMigration,
  jcbFastrac8000CurrentUsMigration,
];
