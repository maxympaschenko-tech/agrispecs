import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const replacements = [
  { oldNumber:'RE551507', newNumber:'DZ115391', oldName:'Primary Fuel Filter', newName:'Primary Fuel Filter', category:'fuel-filters', url:'https://shop.deere.com/us/product/RE551507%3A-Primary-Fuel-Filter-Element/p/RE551507', externalId:'jd-shop-re551507-replaced-by-dz115391-2026-08' },
  { oldNumber:'RE551508', newNumber:'DZ115390', oldName:'Final Fuel Filter', newName:'Final Fuel Filter', category:'fuel-filters', url:'https://shop.deere.com/us/product/RE551508%3A-Final-Fuel-Filter-Element/p/RE551508', externalId:'jd-shop-re551508-replaced-by-dz115390-2026-08' },
  { oldNumber:'DZ115391', newNumber:'DZ128543', oldName:'Primary Fuel Filter', newName:'Primary Fuel Filter', category:'fuel-filters', url:'https://shop.deere.com/us/us/product/DZ115391%3A-Filter-Element-Primary-Filter/p/DZ115391', externalId:'jd-shop-dz115391-replaced-by-dz128543-2026-08' },
  { oldNumber:'AFH208545', newNumber:'RE45864', oldName:'Hydraulic Oil Filter', newName:'Hydraulic Oil Filter', category:'hydraulic-filters', url:'https://shop.deere.com/us/product/AFH208545%3A-Hydraulic-Oil-Filter/p/AFH208545', externalId:'jd-shop-afh208545-replaced-by-re45864-2026-08' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected row was not found during additional part supersession migration.');
  return Number(rows[0].id);
}

export const morePartSupersessionsMigration: DbMigration = {
  id: '20260827_106_more_part_supersessions',
  description: 'Add more official John Deere fuel and hydraulic filter substitutions',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    for (const item of replacements) {
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [item.category]);

      for (const [number,name,description] of [
        [item.oldNumber,item.oldName,`Legacy John Deere part number. Shop.Deere.com lists ${item.newNumber} as the substitute replacement.`],
        [item.newNumber,item.newName,null],
      ] as const) {
        await connection.query(
          `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
           VALUES (?,?,?,?,?,?,'verified')
           ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),description=COALESCE(VALUES(description),description),data_status='verified'`,
          [manufacturerId,categoryId,number,number,name,description],
        );
      }

      const oldPartId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,item.oldNumber]);
      const newPartId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,item.newNumber]);

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
