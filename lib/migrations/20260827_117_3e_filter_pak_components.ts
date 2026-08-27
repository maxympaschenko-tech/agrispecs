import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type ComponentSeed = {
  number: string;
  name: string;
  category: string;
};

const componentSeeds: ComponentSeed[] = [
  { number:'LVA14703', name:'Transmission Oil Filter', category:'hydraulic-filters' },
  { number:'LVA16054', name:'Hydraulic Oil Filter', category:'hydraulic-filters' },
  { number:'M131802', name:'Primary Air Cleaner Element', category:'air-filters' },
  { number:'M806419', name:'Engine Oil Filter', category:'engine-oil-filters' },
  { number:'MIU802421', name:'Fuel Filter Element', category:'fuel-filters' },
  { number:'MIU803127', name:'Fuel Filter', category:'fuel-filters' },
  { number:'MIU800645', name:'Fuel Filter', category:'fuel-filters' },
  { number:'UC28887', name:'Primary Air Filter Element', category:'air-filters' },
  { number:'UC28888', name:'Secondary Air Filter Element', category:'air-filters' },
];

const kits = [
  {
    parent:'LVA21037',
    source:'jd-shop-lva21037-kit-contents-2026-08',
    components:['LVA14703','LVA16054','M131802','M806419','MIU802421','MIU803127'],
  },
  {
    parent:'TA26997',
    source:'jd-shop-ta26997-kit-contents-2026-08',
    components:['LVA14703','LVA16054','M806419','MIU800645','MIU803127','UC28887','UC28888'],
  },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected row was not found during 3E Filter Pak components migration.');
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

export const threeEFilterPakComponentsMigration: DbMigration = {
  id: '20260827_117_3e_filter_pak_components',
  description: 'Add official John Deere LVA21037 and TA26997 Filter Pak component relationships without inferring a replacement relation',
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

    const sourceIds = new Map<string,number>();
    sourceIds.set('jd-shop-lva21037-kit-contents-2026-08', await sourceRecord(
      connection,
      sourceId,
      'jd-shop-lva21037-kit-contents-2026-08',
      'https://shop.deere.com/us/en/product/LVA21037%3A-Filter-Pak/p/LVA21037',
      'John Deere LVA21037 Filter Pak - kit contents and compatible equipment',
    ));
    sourceIds.set('jd-shop-ta26997-kit-contents-2026-08', await sourceRecord(
      connection,
      sourceId,
      'jd-shop-ta26997-kit-contents-2026-08',
      'https://shop.deere.com/us/product/TA26997%3A%2BFilter%2BPak/p/TA26997',
      'John Deere TA26997 Filter Pak - kit contents and compatible equipment',
    ));

    for (const seed of componentSeeds) {
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [seed.category]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,seed.number,seed.number,seed.name],
      );
    }

    for (const kit of kits) {
      const parentId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId,kit.parent],
      );
      const sourceRecordId = sourceIds.get(kit.source);
      if (!sourceRecordId) throw new Error(`Missing source record for ${kit.parent}.`);

      for (const component of kit.components) {
        const componentId = await selectId(
          connection,
          `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
          [manufacturerId,component],
        );
        await connection.query(
          `INSERT INTO part_components (parent_part_id,component_part_id,source_record_id)
           VALUES (?,?,?)
           ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
          [parentId,componentId,sourceRecordId],
        );
      }
    }
  },
};
