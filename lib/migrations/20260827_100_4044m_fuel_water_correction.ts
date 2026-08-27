import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during 4044M correction migration.');
  return Number(rows[0].id);
}

export const johnDeere4044MFuelWaterCorrectionMigration: DbMigration = {
  id: '20260827_100_4044m_fuel_water_correction',
  description: 'Correct the MY24 John Deere 4044M fuel/water separator element to MIU803127 per the official North America guide',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const machineId = await selectId(
      connection,
      `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug='4044m' LIMIT 1`,
    );
    const sourceRecordId = await selectId(
      connection,
      `SELECT id FROM source_records WHERE external_id='jd-rpg-4044m-my24-na-2024-04' ORDER BY id LIMIT 1`,
    );
    const wrongPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='MIU802421' LIMIT 1`,
      [manufacturerId],
    );
    const correctPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='MIU803127' LIMIT 1`,
      [manufacturerId],
    );

    await connection.query(
      `DELETE FROM machine_parts
       WHERE machine_id=? AND part_id=? AND source_record_id=?
         AND fitment_note LIKE '4044M MY24 fuel/water separator element%'`,
      [machineId, wrongPartId, sourceRecordId],
    );

    const correctedNote = '4044M MY24 fuel/water separator element; 400 hours or annually';
    const [existing] = await connection.query<IdRow[]>(
      `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
      [machineId, correctPartId, correctedNote],
    );
    if (!existing[0]) {
      await connection.query(
        `INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`,
        [machineId, correctPartId, correctedNote, sourceRecordId],
      );
    }

    await connection.query(
      `UPDATE maintenance_tasks
       SET notes='MIU803127 is listed as the fuel/water separator filter element.'
       WHERE machine_id=? AND source_record_id=? AND task_key='fuel-water-separator'`,
      [machineId, sourceRecordId],
    );
  },
};
