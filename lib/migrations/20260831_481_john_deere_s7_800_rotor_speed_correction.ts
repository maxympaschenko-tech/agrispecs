import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

export const johnDeereS7800RotorSpeedCorrectionMigration: DbMigration = {
  id: '20260831_481_john_deere_s7_800_rotor_speed_correction',
  description: 'Correct S7 800 rotor speed range text so cleaning fan speed is not mislabeled as rotor speed',
  async apply(connection) {
    const [rows] = await connection.query<IdRow[]>(`
      SELECT ms.id
      FROM machine_specs ms
      INNER JOIN machines m ON m.id = ms.machine_id
      INNER JOIN manufacturers mf ON mf.id = m.manufacturer_id
      INNER JOIN equipment_types et ON et.id = m.equipment_type_id
      INNER JOIN spec_definitions sd ON sd.id = ms.spec_definition_id
      WHERE mf.slug='john-deere'
        AND et.slug='combine'
        AND m.slug='s7-800'
        AND sd.spec_key='threshing.rotor_speed_range'
      LIMIT 1
    `);

    if (!rows[0]) return;

    await connection.query(
      `UPDATE machine_specs
       SET value_text='210-530 rpm low range; 400-1000 rpm high range'
       WHERE id=?`,
      [rows[0].id],
    );
  },
};
