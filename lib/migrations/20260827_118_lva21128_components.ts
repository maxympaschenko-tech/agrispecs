import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const COMPONENTS = [
  ['LVA14703','Transmission Oil Filter','hydraulic-filters'],
  ['LVA16054','Hydraulic Oil Filter','hydraulic-filters'],
  ['M131802','Primary Air Cleaner Element','air-filters'],
  ['M806419','Engine Oil Filter','engine-oil-filters'],
  ['MIU800645','Fuel Filter','fuel-filters'],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected row was not found during LVA21128 component migration.');
  return Number(rows[0].id);
}

export const lva21128ComponentsMigration: DbMigration = {
  id: '20260827_118_lva21128_components',
  description: 'Add official John Deere LVA21128 Filter Pak component relationships',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const externalId = 'jd-shop-lva21128-kit-contents-2026-08';
    const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
        [
          sourceId,
          'https://shop.deere.com/us/product/LVA21128%3A-Filter-Pak%2C-3032E-And3038E-Sn--610%2C000-Compact-Tractors/p/LVA21128/?equiptype=3032E',
          externalId,
          'John Deere LVA21128 Filter Pak - kit contents and compatible equipment',
        ],
      );
      sourceRecordId = Number(result.insertId);
    }

    for (const [number,name,categorySlug] of COMPONENTS) {
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [categorySlug]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,number,number,name],
      );
    }

    const parentId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='LVA21128' LIMIT 1`,
      [manufacturerId],
    );

    for (const [number] of COMPONENTS) {
      const componentId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId,number],
      );
      await connection.query(
        `INSERT INTO part_components (parent_part_id,component_part_id,source_record_id)
         VALUES (?,?,?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [parentId,componentId,sourceRecordId],
      );
    }
  },
};
