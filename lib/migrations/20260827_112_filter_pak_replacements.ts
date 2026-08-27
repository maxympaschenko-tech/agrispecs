import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type Replacement = {
  oldNumber: string;
  newNumber: string;
  models: string[];
  oldUrl: string;
  newUrl: string;
  oldExternalId: string;
  newExternalId: string;
};

const replacements: Replacement[] = [
  {
    oldNumber: 'LVA23615',
    newNumber: 'TA25767',
    models: ['2032r', '2038r'],
    oldUrl: 'https://shop.deere.com/us/product/LVA23615%3A-Filter-Pak/p/LVA23615',
    newUrl: 'https://shop.deere.com/us/uk/product/TA25767%3A-Filter-Pak/p/TA25767/?equiptype=2038R',
    oldExternalId: 'jd-shop-lva23615-substitute-ta25767-2026-08',
    newExternalId: 'jd-shop-ta25767-compatible-equipment-2026-08',
  },
  {
    oldNumber: 'LVA21038',
    newNumber: 'TA25768',
    models: ['3033r', '3039r', '3046r'],
    oldUrl: 'https://shop.deere.com/us/product/LVA21038%3A-Filter-Pak/p/LVA21038',
    newUrl: 'https://shop.deere.com/us/product/TA25768%3A-Filter-Pak/p/TA25768/?equiptype=3046R',
    oldExternalId: 'jd-shop-lva21038-substitute-ta25768-2026-08',
    newExternalId: 'jd-shop-ta25768-compatible-equipment-2026-08',
  },
];

const normalize = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected row was not found during Filter Pak replacement migration.');
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

export const filterPakReplacementsMigration: DbMigration = {
  id: '20260827_112_filter_pak_replacements',
  description: 'Add official John Deere Filter Pak substitutions LVA23615 to TA25767 and LVA21038 to TA25768 with verified model fitments',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

    await connection.query(
      `INSERT INTO part_categories (name,slug) VALUES ('Maintenance Kits','maintenance-kits')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
    );
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='maintenance-kits' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    for (const item of replacements) {
      for (const number of [item.oldNumber,item.newNumber]) {
        await connection.query(
          `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
           VALUES (?,?,?,?,?,'verified')
           ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
          [manufacturerId,categoryId,number,normalize(number),'Filter Pak'],
        );
      }

      const oldPartId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,normalize(item.oldNumber)]);
      const newPartId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,normalize(item.newNumber)]);

      const oldSourceId = await sourceRecord(
        connection,
        sourceId,
        item.oldExternalId,
        item.oldUrl,
        `John Deere ${item.oldNumber} Filter Pak - substitute ${item.newNumber}`,
      );
      const newSourceId = await sourceRecord(
        connection,
        sourceId,
        item.newExternalId,
        item.newUrl,
        `John Deere ${item.newNumber} Filter Pak - compatible equipment`,
      );

      await connection.query(
        `UPDATE parts SET description=? WHERE id=?`,
        [`Legacy John Deere Filter Pak. Shop.Deere.com lists ${item.newNumber} as the substitute replacement.`,oldPartId],
      );
      await connection.query(
        `UPDATE parts SET description=? WHERE id=?`,
        [`Current John Deere Filter Pak listed as the substitute for ${item.oldNumber}.`,newPartId],
      );

      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'replaces',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [oldPartId,newPartId,oldSourceId],
      );

      for (const model of item.models) {
        const [machineRows] = await connection.query<IdRow[]>(
          `SELECT m.id FROM machines m
           JOIN manufacturers mf ON mf.id=m.manufacturer_id
           WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`,
          [model],
        );
        if (!machineRows[0]) continue;
        const machineId = Number(machineRows[0].id);

        for (const [partId,partNumber,recordId,status] of [
          [oldPartId,item.oldNumber,oldSourceId,'legacy'],
          [newPartId,item.newNumber,newSourceId,'current substitute'],
        ] as const) {
          const note = `${model.toUpperCase()} verified ${status} Filter Pak ${partNumber} from Shop.Deere.com.`;
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
    }
  },
};
