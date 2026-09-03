import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_PART = '5949768013';
const LEGACY_PARTS = [
  { number: '504075145', name: 'Oil Separator / Engine Breather' },
  { number: '5801686484', name: 'Engine Breather Filter' },
] as const;

const SOURCE_URL = 'https://www.messicks.com/parts/new-holland/5949768013';
const SOURCE_EXTERNAL_ID = 'messicks-new-holland-5949768013-replaces-breather-legacy-2026-09';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing New Holland engine-breather replacement migration dependency.');
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
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
    [externalId],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

export const newHollandEngineBreatherReplacementsMigration: DbMigration = {
  id: '20260903_603_new_holland_engine_breather_replacements',
  description: 'Add verified New Holland engine-breather filter category and fan-in replacement history for 5949768013',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const filtersId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO part_categories (parent_id,name,slug)
       VALUES (?,'Engine Breather Filters','engine-breather-filters')
       ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`,
      [filtersId],
    );
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='engine-breather-filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, categoryId, CURRENT_PART, CURRENT_PART, 'Engine Blow-By / Breather Filter'],
    );
    const currentPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, CURRENT_PART],
    );

    const legacyIds = new Map<string, number>();
    for (const legacy of LEGACY_PARTS) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, legacy.number, legacy.number, legacy.name],
      );
      legacyIds.set(
        legacy.number,
        await selectId(
          connection,
          `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
          [manufacturerId, legacy.number],
        ),
      );
    }

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name="Messick's" AND domain='messicks.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ("Messick's",'messicks.com','supplier','secondary')`,
      );
      sourceId = Number(result.insertId);
    }

    const sourceRecordId = await ensureSourceRecord(
      connection,
      sourceId,
      SOURCE_EXTERNAL_ID,
      SOURCE_URL,
      "Messick's New Holland 5949768013 engine-blow-by replacement listing",
      {
        currentPartNumber: CURRENT_PART,
        replacementStatement: '5949768013 product page states that the part replaces both 504075145 and 5801686484.',
        legacyPartNumbers: LEGACY_PARTS.map((part) => part.number),
        officialIdentityCorroboration: {
          '5949768013': 'MyCNH identifies 5949768013 as FILTER, ENGINE BLOW BY.',
          '5801686484': 'MyCNH identifies 5801686484 as Engine Breather Filter / Engine Breather Assembly.',
          '504075145': 'MyCNH identifies 504075145 as Oil Separator / Engine Breather.',
        },
        guardrail: 'This is a fan-in supersession. No ordering between 504075145 and 5801686484 is asserted, and no machine fitment is copied from the replacement statement.',
      },
    );

    for (const legacy of LEGACY_PARTS) {
      const legacyPartId = legacyIds.get(legacy.number);
      if (!legacyPartId) throw new Error(`Missing legacy breather part ${legacy.number}.`);
      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'replaces',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [legacyPartId, currentPartId, sourceRecordId],
      );
    }
  },
};
