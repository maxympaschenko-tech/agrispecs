import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const LEGACY_PART = '48010983';
const CURRENT_PART = 'MT40195621';
const SOURCE_URL = 'https://www.newhollandrochester.com/shop/mt40195621/';
const SOURCE_EXTERNAL_ID = 'new-holland-rochester-mt40195621-replaces-48010983-2026-09';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing WORKMASTER 25S suction-filter legacy migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  rawReference: unknown,
) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [externalId]);
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

export const newHollandWorkmaster25SSuctionLegacyMigration: DbMigration = {
  id: '20260902_590_new_holland_workmaster25s_suction_legacy',
  description: 'Add legacy 48010983 and link it to current New Holland hydraulic suction filter MT40195621',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const hydraulicCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='hydraulic-filters' LIMIT 1`);
    const currentPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, CURRENT_PART],
    );

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, hydraulicCategoryId, LEGACY_PART, LEGACY_PART, 'Hydraulic Suction Filter'],
    );
    const legacyPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, LEGACY_PART],
    );

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='New Holland Rochester' AND domain='newhollandrochester.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('New Holland Rochester','newhollandrochester.com','supplier','secondary')`,
      );
      sourceId = Number(result.insertId);
    }

    const sourceRecordId = await ensureSourceRecord(
      connection,
      sourceId,
      SOURCE_EXTERNAL_ID,
      SOURCE_URL,
      'New Holland Rochester MT40195621 replacement history',
      {
        legacyPartNumber: LEGACY_PART,
        replacementPartNumber: CURRENT_PART,
        statement: 'MT40195621 replaces 48010983.',
        scope: 'Replacement-chain evidence only. No direct machine fitment is asserted for legacy 48010983.',
        currentPartModelEvidence: 'The same dealer page lists WORKMASTER 25S (12/17 onward) for MT40195621; that current fitment is stored separately by migration 589.',
      },
    );

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [legacyPartId, currentPartId, sourceRecordId],
    );
  },
};
