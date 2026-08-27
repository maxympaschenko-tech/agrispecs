import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const OLD_NUMBER = 'LVA21039';
const NEW_NUMBER = 'TA25765';
const MODELS = ['4044m','4044r','4052m','4052r','4066m','4066r'] as const;
const OLD_URL = 'https://shop.deere.com/us/product/LVA21039%3A-Filter-Pak/p/LVA21039';
const NEW_URL = 'https://shop.deere.com/us/product/TA25765%3A-Filter-Pak/p/TA25765';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected row was not found during 4 Series Filter Pak replacement migration.');
  return Number(rows[0].id);
}

async function sourceRecord(
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

export const johnDeere4SeriesFilterPakReplacementMigration: DbMigration = {
  id: '20260827_113_4_series_filter_pak_replacement',
  description: 'Add official LVA21039 to TA25765 John Deere Filter Pak substitution and verified 4 Series fitments',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='maintenance-kits' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    for (const number of [OLD_NUMBER,NEW_NUMBER]) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,number,number,'Filter Pak'],
      );
    }

    const oldPartId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,OLD_NUMBER]);
    const newPartId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,NEW_NUMBER]);

    const oldSourceId = await sourceRecord(
      connection,
      sourceId,
      'jd-shop-lva21039-substitute-ta25765-2026-08',
      OLD_URL,
      'John Deere LVA21039 Filter Pak - substitute TA25765',
    );
    const newSourceId = await sourceRecord(
      connection,
      sourceId,
      'jd-shop-ta25765-compatible-equipment-2026-08',
      NEW_URL,
      'John Deere TA25765 Filter Pak - compatible equipment',
    );

    await connection.query(`UPDATE parts SET description=? WHERE id=?`, [
      'Legacy John Deere Filter Pak. Shop.Deere.com lists TA25765 as the substitute replacement.',
      oldPartId,
    ]);
    await connection.query(`UPDATE parts SET description=? WHERE id=?`, [
      'Current John Deere Filter Pak listed as the substitute for LVA21039.',
      newPartId,
    ]);

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [oldPartId,newPartId,oldSourceId],
    );

    for (const model of MODELS) {
      const [machineRows] = await connection.query<IdRow[]>(
        `SELECT m.id FROM machines m
         JOIN manufacturers mf ON mf.id=m.manufacturer_id
         WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`,
        [model],
      );
      if (!machineRows[0]) continue;
      const machineId = Number(machineRows[0].id);

      for (const [partId,number,recordId,status] of [
        [oldPartId,OLD_NUMBER,oldSourceId,'legacy'],
        [newPartId,NEW_NUMBER,newSourceId,'current substitute'],
      ] as const) {
        const note = `${model.toUpperCase()} verified ${status} Filter Pak ${number} from Shop.Deere.com.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
          [machineId,partId,note],
        );
        if (!existing[0]) {
          await connection.query(
            `INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`,
            [machineId,partId,note,recordId],
          );
        }
      }
    }
  },
};
