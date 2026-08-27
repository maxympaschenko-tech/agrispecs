import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type ComponentSeed = {
  number: string;
  name: string;
  category: string;
};

const components: ComponentSeed[] = [
  { number:'AM116304', name:'Inline Fuel Filter', category:'fuel-filters' },
  { number:'LVA16054', name:'Hydraulic Oil Filter', category:'hydraulic-filters' },
  { number:'M113621', name:'Primary Air Cleaner Filter Element', category:'air-filters' },
  { number:'M131802', name:'Primary Air Cleaner Element', category:'air-filters' },
  { number:'LVU34503', name:'Primary Air Cleaner Element', category:'air-filters' },
  { number:'M806418', name:'Engine Oil Filter', category:'engine-oil-filters' },
  { number:'MIU804763', name:'Fuel Filter Element', category:'fuel-filters' },
];

const kits = [
  {
    parent:'LVA21035',
    source:'jd-shop-lva21035-kit-contents-2026-08',
    components:['M806418','LVA16054','M113621','AM116304','MIU804763'],
  },
  {
    parent:'LVA21036',
    source:'jd-shop-lva21036-kit-contents-2026-08',
    components:['AM116304','LVA16054','M131802','M806418','MIU804763'],
  },
  {
    parent:'TA15270',
    source:'jd-shop-ta15270-substitute-2026-08',
    components:['AM116304','LVA16054','LVU34503','M806418','MIU804763'],
  },
  {
    parent:'TA25769',
    source:'jd-shop-ta25769-filter-pak-current-2026-08',
    components:['AM116304','LVA16054','LVU34503','M806418','MIU804763'],
  },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected row was not found during 1 Series Filter Pak components migration.');
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

export const oneSeriesFilterPakComponentsMigration: DbMigration = {
  id: '20260827_116_1_series_filter_pak_components',
  description: 'Add official 1 Series Filter Pak contents and TA15270 to TA25769 substitution',
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

    const lva21035SourceId = await ensureSourceRecord(
      connection,
      sourceId,
      'jd-shop-lva21035-kit-contents-2026-08',
      'https://shop.deere.com/us/product/LVA21035%3A-Filter-Pak%2C-1023E-And-1026R-Sub-Compact-Tractors/p/LVA21035/?equiptype=1023E',
      'John Deere LVA21035 Filter Pak - kit contents and compatible equipment',
    );
    const lva21036SourceId = await ensureSourceRecord(
      connection,
      sourceId,
      'jd-shop-lva21036-kit-contents-2026-08',
      'https://shop.deere.com/us/product/LVA21036%3A-Filter-Pak-For-Sub-Compact-And-Compact-Tractors/p/LVA21036',
      'John Deere LVA21036 Filter Pak - kit contents and compatible equipment',
    );

    for (const seed of components) {
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [seed.category]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,seed.number,seed.number,seed.name],
      );
    }

    const sourceByExternalId = new Map<string,number>([
      ['jd-shop-lva21035-kit-contents-2026-08',lva21035SourceId],
      ['jd-shop-lva21036-kit-contents-2026-08',lva21036SourceId],
    ]);
    for (const externalId of ['jd-shop-ta15270-substitute-2026-08','jd-shop-ta25769-filter-pak-current-2026-08']) {
      sourceByExternalId.set(externalId, await selectId(connection, `SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]));
    }

    for (const kit of kits) {
      const parentId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId,kit.parent],
      );
      const sourceRecordId = sourceByExternalId.get(kit.source);
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

    const ta15270Id = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='TA15270' LIMIT 1`, [manufacturerId]);
    const ta25769Id = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='TA25769' LIMIT 1`, [manufacturerId]);
    const replacementSourceId = await selectId(connection, `SELECT id FROM source_records WHERE external_id='jd-shop-ta15270-substitute-2026-08' LIMIT 1`);

    await connection.query(
      `UPDATE parts SET description='Legacy John Deere Filter Pak. Shop.Deere.com lists TA25769 as the substitute replacement.' WHERE id=?`,
      [ta15270Id],
    );
    await connection.query(
      `UPDATE parts SET description='Current John Deere Filter Pak listed as the substitute for TA15270.' WHERE id=?`,
      [ta25769Id],
    );
    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [ta15270Id,ta25769Id,replacementSourceId],
    );
  },
};
