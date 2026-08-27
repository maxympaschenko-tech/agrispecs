import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const replacements = [
  { oldNumber:'AM101378', newNumber:'M806418', oldName:'Engine Oil Filter', url:'https://shop.deere.com/us/product/AM101378%3A-Engine-Oil-Filter/p/AM101378', externalId:'jd-shop-am101378-replaced-by-m806418-2026-08' },
  { oldNumber:'RE518977', newNumber:'RE519626', oldName:'Engine Oil Filter', url:'https://shop.deere.com/us/product/RE518977%3A-Engine-Oil-Filter/p/RE518977', externalId:'jd-shop-re518977-replaced-by-re519626-2026-08' },
  { oldNumber:'RE507522', newNumber:'RE504836', oldName:'Engine Oil Filter', url:'https://shop.deere.com/us/product/RE507522%3A-Oil-Filter/p/RE507522', externalId:'jd-shop-re507522-replaced-by-re504836-2026-08' },
  { oldNumber:'RE541420', newNumber:'RE504836', oldName:'Engine Oil Filter', url:'https://shop.deere.com/us/us/product/RE541420%3A-Engine-Oil-Filter/p/RE541420', externalId:'jd-shop-re541420-replaced-by-re504836-2026-08' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected row was not found during part supersession migration.');
  return Number(rows[0].id);
}

export const partSupersessionsMigration: DbMigration = {
  id: '20260827_105_part_supersessions',
  description: 'Add official John Deere obsolete-to-current part substitutions from Shop.Deere.com',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='engine-oil-filters' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    for (const item of replacements) {
      const newPartId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,item.newNumber]);

      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),description=VALUES(description),data_status='verified'`,
        [manufacturerId,categoryId,item.oldNumber,item.oldNumber,item.oldName,`Legacy John Deere part number. Shop.Deere.com lists ${item.newNumber} as the substitute replacement.`],
      );
      const oldPartId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,item.oldNumber]);

      const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [item.externalId]);
      let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
      if (!sourceRecordId) {
        const [result] = await connection.query<ResultSetHeader>(
          `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
          [sourceId,item.url,item.externalId,`John Deere ${item.oldNumber} - substitute part ${item.newNumber}`],
        );
        sourceRecordId = Number(result.insertId);
      }

      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'replaces',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [oldPartId,newPartId,sourceRecordId],
      );
    }
  },
};
