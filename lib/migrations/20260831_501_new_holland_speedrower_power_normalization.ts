import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

export const newHollandSpeedrowerPowerNormalizationMigration: DbMigration = {
  id: '20260831_501_new_holland_speedrower_power_normalization',
  description: 'Remove duplicate kW power rows from current New Holland Speedrower PLUS model pages',
  async apply(connection) {
    const [definitionRows] = await connection.query<IdRow[]>(
      `SELECT id FROM spec_definitions WHERE spec_key='windrower.engine_power_kw' LIMIT 1`,
    );
    if (!definitionRows[0]) return;

    await connection.query(
      `DELETE ms
       FROM machine_specs ms
       INNER JOIN machines m ON m.id = ms.machine_id
       INNER JOIN manufacturers mf ON mf.id = m.manufacturer_id
       INNER JOIN equipment_types et ON et.id = m.equipment_type_id
       INNER JOIN machine_versions mv ON mv.id = ms.machine_version_id
       WHERE ms.spec_definition_id = ?
         AND mf.slug = 'new-holland'
         AND et.slug = 'windrower'
         AND m.slug IN ('speedrower-160-plus','speedrower-220-plus','speedrower-260-plus')
         AND mv.slug = 'united-states-current-2026-08'`,
      [Number(definitionRows[0].id)],
    );
  },
};
