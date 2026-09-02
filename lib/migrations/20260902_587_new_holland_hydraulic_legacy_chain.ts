import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const LEGACY_PART = 'MT40438413';
const INTERMEDIATE_PART = 'MT40007638';
const SOURCE_URL = 'https://www.messicks.com/parts/new-holland/MT40007638';
const SOURCE_EXTERNAL_ID = 'messicks-new-holland-mt40007638-replaces-mt40438413-2026-09';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing New Holland hydraulic legacy-chain migration dependency.');
  return Number(rows[0].id);
}

export const newHollandHydraulicLegacyChainMigration: DbMigration = {
  id: '20260902_587_new_holland_hydraulic_legacy_chain',
  description: 'Extend New Holland hydraulic filter replacement history with MT40438413 to MT40007638',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='hydraulic-filters' LIMIT 1`);

    let [supplierRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name=? AND domain='messicks.com' ORDER BY id LIMIT 1`,
      ["Messick's"],
    );
    let supplierSourceId = supplierRows[0]?.id ? Number(supplierRows[0].id) : 0;
    if (!supplierSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?, 'messicks.com', 'supplier', 'secondary')`,
        ["Messick's"],
      );
      supplierSourceId = Number(result.insertId);
    }

    const [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
      [SOURCE_EXTERNAL_ID],
    );
    let sourceRecordId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
        [
          supplierSourceId,
          SOURCE_URL,
          SOURCE_EXTERNAL_ID,
          'Messick’s New Holland MT40007638 hydraulic filter replacement history',
          JSON.stringify({
            legacyPartNumber: LEGACY_PART,
            replacementPartNumber: INTERMEDIATE_PART,
            nextReplacementPartNumber: 'MT40347273',
            statement: 'MT40007638 is shown as replacing MT40438413 and as itself replaced by MT40347273.',
            scope: 'Replacement-chain evidence only; no historical MT40438413 machine fitment is asserted by this migration.',
          }),
        ],
      );
      sourceRecordId = Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
       VALUES (?,?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),description=VALUES(description),data_status='verified'`,
      [
        manufacturerId,
        categoryId,
        LEGACY_PART,
        LEGACY_PART,
        'Hydraulic Oil Filter',
        'Legacy New Holland hydraulic filter number documented in the replacement history leading to MT40007638 and then MT40347273. Historical machine fitment is not asserted without a generation-specific source.',
      ],
    );

    const legacyPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, LEGACY_PART],
    );
    const intermediatePartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, INTERMEDIATE_PART],
    );

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [legacyPartId, intermediatePartId, sourceRecordId],
    );
  },
};
