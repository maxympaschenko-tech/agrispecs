import type { DbMigration } from '@/lib/db-migration-types';
import type { RowDataPacket } from 'mysql2';

type IdRow = RowDataPacket & { id: number };

type ComponentSeed = {
  number: string;
  name: string;
  category: string;
};

type KitSeed = {
  parent: string;
  sourceExternalId: string;
  components: string[];
};

const componentSeeds: ComponentSeed[] = [
  { number:'LVA14703', name:'Transmission Oil Filter', category:'hydraulic-filters' },
  { number:'LVA16054', name:'Hydraulic Oil Filter', category:'hydraulic-filters' },
  { number:'M131802', name:'Primary Air Cleaner Element', category:'air-filters' },
  { number:'M806419', name:'Engine Oil Filter', category:'engine-oil-filters' },
  { number:'M811032', name:'Fuel Filter Element', category:'fuel-filters' },
  { number:'MIU800645', name:'Fuel Filter', category:'fuel-filters' },
  { number:'MIU803127', name:'Fuel Filter', category:'fuel-filters' },
  { number:'LVA13065', name:'Transmission Oil Filter', category:'hydraulic-filters' },
  { number:'MIU802421', name:'Fuel Filter Element', category:'fuel-filters' },
  { number:'RE68048', name:'Primary Air Filter', category:'air-filters' },
  { number:'LVA10419', name:'Hydrostatic Transmission Oil Filter', category:'hydraulic-filters' },
  { number:'RE45864', name:'Transmission Oil Filter', category:'hydraulic-filters' },
];

const kits: KitSeed[] = [
  {
    parent:'LVA23615',
    sourceExternalId:'jd-shop-lva23615-substitute-ta25767-2026-08',
    components:['LVA14703','LVA16054','M131802','M806419','MIU800645','MIU803127'],
  },
  {
    parent:'TA25767',
    sourceExternalId:'jd-shop-ta25767-compatible-equipment-2026-08',
    components:['LVA14703','LVA16054','M131802','M806419','M811032','MIU800645','MIU803127'],
  },
  {
    parent:'LVA21038',
    sourceExternalId:'jd-shop-lva21038-substitute-ta25768-2026-08',
    components:['LVA13065','M806419','MIU802421','MIU803127','RE68048'],
  },
  {
    parent:'TA25768',
    sourceExternalId:'jd-shop-ta25768-compatible-equipment-2026-08',
    components:['LVA13065','M806419','MIU802421','MIU803127','RE68048'],
  },
  {
    parent:'LVA21039',
    sourceExternalId:'jd-shop-lva21039-substitute-ta25765-2026-08',
    components:['LVA10419','M806419','MIU802421','MIU803127','RE45864','RE68048'],
  },
  {
    parent:'TA25765',
    sourceExternalId:'jd-shop-ta25765-compatible-equipment-2026-08',
    components:['LVA10419','M806419','MIU802421','MIU803127','RE45864','RE68048'],
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected row was not found during part components migration.');
  return Number(rows[0].id);
}

export const partComponentsMigration: DbMigration = {
  id: '20260827_115_part_components',
  description: 'Add source-backed Filter Pak component relationships for selected John Deere legacy and current kits',
  async apply(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS part_components (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        parent_part_id BIGINT UNSIGNED NOT NULL,
        component_part_id BIGINT UNSIGNED NOT NULL,
        quantity DECIMAL(10,2) NULL,
        notes VARCHAR(500) NULL,
        source_record_id BIGINT UNSIGNED NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_part_component (parent_part_id, component_part_id),
        KEY idx_part_components_component (component_part_id),
        KEY idx_part_components_source (source_record_id),
        CONSTRAINT fk_part_components_parent FOREIGN KEY (parent_part_id) REFERENCES parts(id),
        CONSTRAINT fk_part_components_component FOREIGN KEY (component_part_id) REFERENCES parts(id),
        CONSTRAINT fk_part_components_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

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
      const sourceRecordId = await selectId(
        connection,
        `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
        [kit.sourceExternalId],
      );

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
