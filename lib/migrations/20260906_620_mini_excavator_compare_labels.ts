import type { DbMigration } from '@/lib/db-migration-types';

export const miniExcavatorCompareLabelsMigration: DbMigration = {
  id: '20260906_620_mini_excavator_compare_labels',
  description: 'Normalize explicitly equivalent mini excavator spec labels for cross-brand comparison',
  async apply(connection) {
    await connection.query(`
      UPDATE spec_definitions
      SET section='Engine', label='Published engine power'
      WHERE spec_key IN ('mini_excavator.engine_power','kubota.excavator.published_power')
    `);

    await connection.query(`
      UPDATE spec_definitions
      SET section='Dimensions & Weight', label='Operating weight'
      WHERE spec_key IN ('mini_excavator.operating_weight','kubota.excavator.operating_weight')
    `);

    await connection.query(`
      UPDATE spec_definitions
      SET section='Excavator Performance', label='Maximum digging depth'
      WHERE spec_key IN ('mini_excavator.maximum_dig_depth','kubota.excavator.max_dig_depth')
    `);
  },
};
