import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const normalize = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing 5M steering cross-reference dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
) {
  const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (existing[0]) return Number(existing[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId,url,externalId,title],
  );
  return Number(result.insertId);
}

export const johnDeere5MSteeringCrossReferencesMigration: DbMigration = {
  id: '20260827_122_5m_steering_cross_references',
  description: 'Add Shop.Deere verified RE217820 to RE217616 substitution and A&I alternative for RE271437',
  async apply(connection) {
    const johnDeereId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    await connection.query(`INSERT INTO manufacturers (name,slug) VALUES ('A&I Products','a-i-products') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const aiId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='a-i-products' LIMIT 1`);
    const steeringCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='steering-parts' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const replacementSourceId = await ensureSourceRecord(
      connection,
      sourceId,
      'jd-shop-re217820-substitute-re217616-2026-08',
      'https://shop.deere.com/us/product/RE217820%3A-Tube/p/RE217820',
      'John Deere RE217820 - substitute RE217616',
    );
    const alternativeSourceId = await ensureSourceRecord(
      connection,
      sourceId,
      'jd-shop-re271437-ai-alternative-2026-08',
      'https://shop.deere.com/us/product/A-RE271437%3A-Tie-Rod-Assembly/p/A-RE271437',
      'John Deere RE271437 - A&I alternative buying option',
    );

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
       VALUES (?,?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),description=VALUES(description),data_status='verified'`,
      [
        johnDeereId,
        steeringCategoryId,
        'RE217820',
        'RE217820',
        'Legacy Steering Tie Rod Tube',
        'Legacy John Deere part number. Shop.Deere.com lists RE217616 as the substitute replacement.',
      ],
    );
    const legacyId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='RE217820' LIMIT 1`, [johnDeereId]);
    const replacementId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='RE217616' LIMIT 1`, [johnDeereId]);
    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [legacyId,replacementId,replacementSourceId],
    );

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
       VALUES (?,?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),description=VALUES(description),data_status='verified'`,
      [
        aiId,
        steeringCategoryId,
        'A-RE271437',
        normalize('A-RE271437'),
        'Tie Rod Assembly',
        'Shop.Deere.com lists this A&I Products part as an alternative buying option for John Deere RE271437.',
      ],
    );
    const originalId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='RE271437' LIMIT 1`, [johnDeereId]);
    const alternativeId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [aiId,normalize('A-RE271437')]);
    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'alternative',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [originalId,alternativeId,alternativeSourceId],
    );
  },
};
