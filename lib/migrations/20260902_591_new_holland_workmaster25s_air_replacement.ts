import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const LEGACY_PART = 'MT40049450';
const CURRENT_PART = '48145946';
const REPLACEMENT_URL = 'https://www.messicks.com/parts/new-holland/48145946';
const REPLACEMENT_EXTERNAL_ID = 'messicks-new-holland-48145946-replaces-mt40049450-2026-09';
const OEM_IDENTITY_URL = 'https://www.mycnhstore.com/sa/en/newhollandag/cn/service-kit/p/73334215';
const OEM_IDENTITY_EXTERNAL_ID = 'new-holland-mycnh-48145946-primary-engine-air-filter-2026-09';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing WORKMASTER 25S air-filter replacement migration dependency.');
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

export const newHollandWorkmaster25SAirReplacementMigration: DbMigration = {
  id: '20260902_591_new_holland_workmaster25s_air_replacement',
  description: 'Add current 48145946 primary engine air filter and MT40049450 replacement relation',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const airCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='air-filters' LIMIT 1`);
    const legacyPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, LEGACY_PART],
    );

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, airCategoryId, CURRENT_PART, CURRENT_PART, 'Primary Engine Air Filter'],
    );
    const currentPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, CURRENT_PART],
    );

    let [messicksRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name="Messick's" AND domain='messicks.com' ORDER BY id LIMIT 1`,
    );
    let messicksSourceId = messicksRows[0]?.id ? Number(messicksRows[0].id) : 0;
    if (!messicksSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ("Messick's",'messicks.com','supplier','secondary')`,
      );
      messicksSourceId = Number(result.insertId);
    }

    const replacementSourceRecordId = await ensureSourceRecord(
      connection,
      messicksSourceId,
      REPLACEMENT_EXTERNAL_ID,
      REPLACEMENT_URL,
      'Messick’s New Holland 48145946 air-filter replacement listing',
      {
        legacyPartNumber: LEGACY_PART,
        replacementPartNumber: CURRENT_PART,
        statement: '48145946 replaces MT40049450.',
        scope: 'Replacement-chain evidence only. Direct WORKMASTER 25S fitment for 48145946 is not asserted without a separate exact-model listing for the replacement number.',
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
      'New Holland MyCNH 48145946 primary engine air filter identity',
      {
        role: 'Official OEM identity corroboration for the replacement part',
        partNumber: CURRENT_PART,
        name: 'Primary Engine Air Filter',
        evidence: 'MyCNH New Holland service-kit component list identifies 48145946 as a Primary Engine Air Filter.',
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
