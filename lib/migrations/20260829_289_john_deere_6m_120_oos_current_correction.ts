import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const VERSION = 'united-states-current-2026-08';

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere 6M 120 OOS correction dependency missing');
  return Number(rows[0].id);
}

export const johnDeere6M120OOSCurrentCorrectionMigration: DbMigration = {
  id: '20260829_289_john_deere_6m_120_oos_current_corrections',
  description: 'Correct current US John Deere 6M 120 Open Operator Station power, hydraulics and transmission values and remove unsupported PTO power',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug='6m-120-oos' LIMIT 1`, [manufacturerId]);
    const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

    const sourceRecordId = await id(
      c,
      `SELECT id FROM source_records WHERE external_id='john-deere-6m-120-oos-current-us-2026-08' LIMIT 1`,
    );

    const corrections: Array<[string, number | null, string | null, string | null]> = [
      ['engine.rated_power', 118, 'hp', null],
      ['engine.maximum_power', 130, 'hp', null],
      ['hydraulics.pump_rated_output', 97, 'L/min', null],
      [
        'transmission.options',
        null,
        null,
        'Standard PowrReverser 16F/16R; optional PowrQuad PLUS 16F/16R or Powr8 32F/16R configurations depending on build',
      ],
    ];

    for (const [key, valueNumber, unit, valueText] of corrections) {
      const defId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
      await c.query(
        `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
         VALUES(?,?,?,?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId, versionId, defId, valueText, valueNumber, unit, sourceRecordId],
      );
    }

    const ptoDefId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key='pto.rated_power' LIMIT 1`);
    await c.query(
      `DELETE FROM machine_specs WHERE machine_id=? AND machine_version_id=? AND spec_definition_id=?`,
      [machineId, versionId, ptoDefId],
    );

    await c.query(
      `UPDATE machine_versions SET notes='Current US John Deere 6M 120 Open Operator Station: 118 hp rated, 130 hp maximum, 97 L/min hydraulic pump. Current individual product data does not explicitly publish a PTO horsepower value, so PTO power is intentionally omitted.' WHERE id=?`,
      [versionId],
    );
  },
};
