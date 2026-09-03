import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const LEGACY_PART = '84348882';
const CURRENT_PART = '90412128';
const REPLACEMENT_URL = 'https://www.newhollandrochester.com/shop/84348882/';
const REPLACEMENT_EXTERNAL_ID = 'new-holland-rochester-84348882-replaced-by-90412128-2026-09';
const OEM_IDENTITY_URL = 'https://www.mycnhstore.com/ca/en/newhollandag/category/filters/fuel-filters/fuel-filter/p/90412128';
const OEM_IDENTITY_EXTERNAL_ID = 'new-holland-mycnh-90412128-fuel-pre-filter-2026-09';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing WORKMASTER 55-75 fuel-filter replacement migration dependency.');
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

export const newHollandWorkmaster5575FuelReplacementMigration: DbMigration = {
  id: '20260903_594_new_holland_workmaster5575_fuel_replacement',
  description: 'Add current 90412128 fuel pre-filter identity and 84348882 replacement relation',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const fuelCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='fuel-filters' LIMIT 1`);
    const legacyPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, LEGACY_PART],
    );

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, fuelCategoryId, CURRENT_PART, CURRENT_PART, 'Fuel Pre-Filter'],
    );
    const currentPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, CURRENT_PART],
    );

    let [dealerRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='New Holland Rochester' AND domain='newhollandrochester.com' ORDER BY id LIMIT 1`,
    );
    let dealerSourceId = dealerRows[0]?.id ? Number(dealerRows[0].id) : 0;
    if (!dealerSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('New Holland Rochester','newhollandrochester.com','supplier','secondary')`,
      );
      dealerSourceId = Number(result.insertId);
    }

    const replacementSourceRecordId = await ensureSourceRecord(
      connection,
      dealerSourceId,
      REPLACEMENT_EXTERNAL_ID,
      REPLACEMENT_URL,
      'New Holland Rochester 84348882 fuel-filter replacement listing',
      {
        legacyPartNumber: LEGACY_PART,
        replacementPartNumber: CURRENT_PART,
        statement: '84348882 is no longer available and is replaced by 90412128.',
        scope: 'Replacement-chain evidence only. Migration 593 retains exact WORKMASTER 55/65/75 fitment on 84348882; that fitment is not copied to 90412128 without a separate exact-model listing for the replacement number.',
      },
    );

    const officialSourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='New Holland Parts' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`,
    );
    await ensureSourceRecord(
      connection,
      officialSourceId,
      OEM_IDENTITY_EXTERNAL_ID,
      OEM_IDENTITY_URL,
      'New Holland MyCNH 90412128 fuel pre-filter identity',
      {
        role: 'Official OEM identity corroboration for the replacement part',
        partNumber: CURRENT_PART,
        name: 'Fuel Pre-Filter',
        evidence: 'MyCNH New Holland product page identifies 90412128 as a Fuel Pre-Filter, 96 mm OD x 184 mm L, M16 x 1.5-6H.',
      },
    );

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [legacyPartId, currentPartId, replacementSourceRecordId],
    );
  },
};
