import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const VERSION = 'united-states-current-2026-08';
const SOURCE_URL = 'https://www.deere.com/en-us/products-solutions/tractors/utility-tractors/6m-120-tractor-njaznkw';
const EXTERNAL_ID = 'john-deere-6m-120-oos-current-us-2026-08';

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere 6M 120 OOS correction dependency missing');
  return Number(rows[0].id);
}

export const johnDeere6M120OOSCurrentCorrectionsMigration: DbMigration = {
  id: '20260829_289_john_deere_6m_120_oos_current_corrections',
  description: 'Correct current official US John Deere 6M 120 Open Operator Station power, transmission and hydraulic specifications',
  async apply(c) {
    const machineId = await id(c, `SELECT id FROM machines WHERE slug='6m-120-oos' LIMIT 1`);
    const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
    const sourceRecordId = await id(c, `SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [EXTERNAL_ID]);

    await c.query(
      `UPDATE source_records SET url=?, title=? WHERE id=?`,
      [SOURCE_URL, 'John Deere US 6M 120 official current specifications', sourceRecordId],
    );

    const values: Array<[string, number | string, string | null]> = [
      ['engine.rated_power', 118, 'hp'],
      ['engine.maximum_power', 130, 'hp'],
      ['hydraulics.pump_rated_output', 97, 'L/min'],
      ['transmission.options', 'PowrReverser 16F/16R; optional PowrReverser Hi-Lo 32F/16R, PowrQuad PLUS 16F/16R, Powr8 32F/16R, or Powr8 32F/16R with creeper', null],
    ];

    for (const [specKey, value, unit] of values) {
      const definitionId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [specKey]);
      await c.query(
        `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
         VALUES(?,?,?,?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
      );
    }

    const ptoDefinitionId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key='pto.rated_power' LIMIT 1`);
    await c.query(
      `DELETE FROM machine_specs WHERE machine_id=? AND machine_version_id=? AND spec_definition_id=?`,
      [machineId, versionId, ptoDefinitionId],
    );

    await c.query(
      `UPDATE machine_versions SET notes=? WHERE id=?`,
      ['Current Deere US page publishes 118 hp rated, 130 hp maximum, 97 L/min pump output and the listed transmission choices. A current PTO horsepower value is not stored because it is not exposed in the accessible current product-page specifications.', versionId],
    );
  },
};
