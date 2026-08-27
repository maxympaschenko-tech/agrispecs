import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://www.kubotausa.com/equipment-series/standard-l-series';
const SOURCE_EXTERNAL_ID = 'kubota-standard-l-current-la526-l2502-l3302-l3902-2026-08';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota L3302/L3902 LA526 migration dependency.');
  return Number(rows[0].id);
}

export const kubotaL3302L3902LA526LoaderMigration: DbMigration = {
  id: '20260827_156_kubota_l3302_l3902_la526_loader',
  description: 'Add current official L3302/L3902 LA526 compatibility and consolidate current tractor-specific loader capacities',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level)
         VALUES ('Kubota','kubotausa.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [existingSource] = await connection.query<IdRow[]>(
      `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
      [SOURCE_EXTERNAL_ID],
    );
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,raw_reference)
         VALUES (?,?,?,?,?)`,
        [
          sourceId,
          SOURCE_URL,
          SOURCE_EXTERNAL_ID,
          'Kubota USA Standard L Series current product page - LA526 front loader',
          JSON.stringify({
            L2502: { maxHeightPinLb: 1096, pinAt1_5mLb: 1446 },
            L3302_L3902: { maxHeightPinLb: 1144, pinAt1_5mLb: 1506 },
            maximumLiftHeightPinIn: 94.2,
          }),
        ],
      );
      sourceRecordId = Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO attachments
        (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES (?,'front-loader','LA526','la526',?,?,?,'verified')
       ON DUPLICATE KEY UPDATE
         model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),
         lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [
        manufacturerId,
        'L2502: 1096 lb at pivot pin/max height, 1446 lb at pivot pin @ 1.5 m; L3302/L3902: 1144 lb at pivot pin/max height, 1506 lb at pivot pin @ 1.5 m',
        'Current Kubota product page: maximum lift height at pivot pin 94.2 in',
        'Kubota-built LA526; current Standard L page identifies L2502, L3302 and L3902 as matching tractors. Two loader packages are available, including a 2-lever quick-coupler option.',
      ],
    );
    const attachmentId = await selectId(
      connection,
      `SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug='la526' LIMIT 1`,
      [manufacturerId],
    );

    for (const modelSlug of ['l3302','l3902']) {
      const machineId = await selectId(connection, `
        SELECT m.id FROM machines m
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug=? LIMIT 1
      `, [modelSlug]);

      await connection.query(
        `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES (?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE
           compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [
          machineId,
          attachmentId,
          'Kubota USA current Standard L Series page identifies LA526 as the performance-matched Kubota-built front loader for L3302/L3902; current listed capacity is 1144 lb at the pivot pin/max height and 1506 lb at the pivot pin at 1.5 m.',
          sourceRecordId,
        ],
      );
    }

    // Refresh the pre-existing L2502 compatibility provenance to the same current product-page source.
    const l2502Id = await selectId(connection, `
      SELECT m.id FROM machines m
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='kubota' AND m.slug='l2502' LIMIT 1
    `);
    await connection.query(
      `UPDATE machine_attachments
       SET source_record_id=?, confidence='official',
           compatibility_note='Kubota USA current Standard L Series page identifies LA526 as the performance-matched Kubota-built front loader for L2502; current listed capacity is 1096 lb at the pivot pin/max height and 1446 lb at the pivot pin at 1.5 m.'
       WHERE machine_id=? AND attachment_id=?`,
      [sourceRecordId,l2502Id,attachmentId],
    );
  },
};
