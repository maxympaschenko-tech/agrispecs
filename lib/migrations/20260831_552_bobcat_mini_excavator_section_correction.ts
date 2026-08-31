import type { DbMigration } from '@/lib/db-migration-types';

export const bobcatMiniExcavatorSectionCorrectionMigration: DbMigration = {
  id: '20260831_552_bobcat_mini_excavator_section_correction',
  description: 'Move mini excavator dig depth into the Excavator Performance section',
  async apply(connection) {
    await connection.query(
      `UPDATE spec_definitions SET section='Excavator Performance', display_order=10 WHERE spec_key='mini_excavator.maximum_dig_depth'`,
    );
  },
};
