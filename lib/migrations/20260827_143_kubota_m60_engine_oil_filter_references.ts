import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://www.kubotaengine.com/wp-content/uploads/2024/02/Kubota_Parts_Oil_OilFilter_EN_HR.pdf';
const SOURCE_EXTERNAL_ID = 'kubota-engine-oil-filter-selection-guide-2024';

const references = [
  {
    partNumber: 'HH1C0-32430',
    normalizedPartNumber: 'HH1C032430',
    engineModel: 'V3307',
    machines: ['m6060','m7060'],
  },
  {
    partNumber: 'HH164-32430',
    normalizedPartNumber: 'HH16432430',
    engineModel: 'V2403',
    machines: ['m5660su'],
  },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota engine oil filter migration dependency.');
  return Number(rows[0].id);
}

export const kubotaM60EngineOilFilterReferencesMigration: DbMigration = {
  id: '20260827_143_kubota_m60_engine_oil_filter_references',
  description: 'Add official Kubota Engine oil-filter references for M60 tractor engine families with explicit high-confidence, IPL-confirmation fitment status',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);

    await connection.query(
      `INSERT INTO part_categories (name,slug)
       VALUES ('Engine Oil Filters','engine-oil-filters')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
    );
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='engine-oil-filters' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Kubota Engine America' AND domain='kubotaengine.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level)
         VALUES ('Kubota Engine America','kubotaengine.com','manufacturer','official')`,
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
        `INSERT INTO source_records (source_id,url,external_id,title)
         VALUES (?,?,?,?)`,
        [
          sourceId,
          SOURCE_URL,
          SOURCE_EXTERNAL_ID,
          'Kubota Engine America Genuine Oil Filters - Oil Filter Selection Guide',
        ],
      );
      sourceRecordId = Number(result.insertId);
    }

    for (const reference of references) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?, 'partial')
         ON DUPLICATE KEY UPDATE
           category_id=VALUES(category_id),name=VALUES(name),description=VALUES(description),
           data_status=IF(data_status='verified','verified','partial')`,
        [
          manufacturerId,
          categoryId,
          reference.partNumber,
          reference.normalizedPartNumber,
          'Genuine Engine Oil Filter',
          `Kubota Engine oil-filter selection guide maps standard-spec ${reference.engineModel} engines to ${reference.partNumber}. Confirm the tractor Illustrated Parts List before ordering.`,
        ],
      );
      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId,reference.normalizedPartNumber],
      );

      for (const modelSlug of reference.machines) {
        const machineId = await selectId(connection, `
          SELECT m.id FROM machines m
          JOIN manufacturers mf ON mf.id=m.manufacturer_id
          WHERE mf.slug='kubota' AND m.slug=? LIMIT 1
        `,[modelSlug]);

        const fitmentNote = `Kubota Engine oil-filter selection guide maps standard-spec ${reference.engineModel} engines to ${reference.partNumber}. This tractor's current official specification identifies a ${reference.engineModel}-family engine. Confirm the exact tractor Illustrated Parts List and serial number before ordering.`;

        const [existingFitment] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts
           WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
          [machineId,partId,fitmentNote],
        );

        if (!existingFitment[0]) {
          await connection.query(
            `INSERT INTO machine_parts
              (machine_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence)
             VALUES (?,?,?,'Engine-model-derived reference; confirm tractor IPL',?,'high')`,
            [machineId,partId,fitmentNote,sourceRecordId],
          );
        } else {
          await connection.query(
            `UPDATE machine_parts
             SET configuration_note='Engine-model-derived reference; confirm tractor IPL',
                 source_record_id=?, fitment_confidence='high'
             WHERE id=?`,
            [sourceRecordId,Number(existingFitment[0].id)],
          );
        }
      }
    }
  },
};
