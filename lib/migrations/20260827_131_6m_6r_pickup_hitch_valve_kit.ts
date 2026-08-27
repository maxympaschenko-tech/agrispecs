import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const models = [
  '6m-95','6m-105','6m-115','6m-125','6m-130','6m-140','6m-150',
  '6r-110','6r-120','6r-130','6r-140','6r-150','6r-175','6r-195',
] as const;

const PART_NUMBER = 'BL16683';
const SOURCE_EXTERNAL_ID = 'jd-shop-bl16683-6m-6r-fitment-2026-08';
const SOURCE_URL = 'https://shop.deere.com/us/product/BL16683%3A%2BHydraulic%2BActivated%2BControl%2BValve%2BKit%2Bfor%2BPick-Up%2BHitch/p/BL16683';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing 6M/6R pick-up hitch valve-kit migration dependency.');
  return Number(rows[0].id);
}

export const johnDeere6M6RPickupHitchValveKitMigration: DbMigration = {
  id: '20260827_131_6m_6r_pickup_hitch_valve_kit',
  description: 'Add official Shop.Deere BL16683 hydraulic pick-up hitch control-valve kit fitment for selected current 6M and 6R tractors',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

    await connection.query(
      `INSERT INTO part_categories (name,slug) VALUES ('Pick-Up Hitch Hydraulic Kits','pickup-hitch-hydraulic-kits') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
    );
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='pickup-hitch-hydraulic-kits' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [SOURCE_EXTERNAL_ID]);
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'John Deere BL16683 Hydraulic Activated Control Valve Kit for Pick-Up Hitch - compatible equipment'],
      );
      sourceRecordId = Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId,categoryId,PART_NUMBER,PART_NUMBER,'Hydraulic Activated Control Valve Kit for Pick-Up Hitch'],
    );
    const partId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId,PART_NUMBER],
    );

    for (const modelSlug of models) {
      const machineId = await selectId(connection, `
        SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1
      `, [modelSlug]);
      const note = `${modelSlug.toUpperCase()}: John Deere Shop lists BL16683 as general compatible-equipment fitment for this tractor. Confirm machine configuration before installation.`;
      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
        [machineId,partId,note],
      );
      if (!existing[0]) {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,fitment_note,configuration_note,source_record_id)
           VALUES (?,?,?,'Pick-up hitch hydraulic control',?)`,
          [machineId,partId,note,sourceRecordId],
        );
      }
    }
  },
};
