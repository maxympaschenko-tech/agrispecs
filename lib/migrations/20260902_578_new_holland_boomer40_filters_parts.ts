import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type SourceKey = 'list-a' | 'list-b';
type PartSeed = { number: string; name: string; category: string; source: SourceKey; fitmentNote: string };

const LIST_A_URL = 'https://www.mycnhstore.com/us/en/newhollandag/na/tractors/compact/naba17com227boomer/compact-tractor-wcab-tier-4b-na/service-maintenance/initial-stocking-list-list-a/cn/DDA1CD92-148D-487F-A9E2-58C76CDDF168';
const LIST_B_URL = 'https://www.mycnhstore.com/ca/fr/newhollandag/na/tracteurs/compact/naba17com227boomer/tracteur-compact-wrops-tier-4b-na/entretien-maintenance/liste-de-stock-initial-liste-b/cn/25602CAB-9B0F-41DC-AC55-B05F01AC6A4F/FA9AF5F9-6631-4164-8057-0C92829F48D5';
const LIST_A_EXTERNAL_ID = 'new-holland-boomer-40-tier4b-initial-stocking-list-a-2026-09';
const LIST_B_EXTERNAL_ID = 'new-holland-boomer-40-tier4b-initial-stocking-list-b-2026-09';

const parts: PartSeed[] = [
  {
    number: 'MT40318591',
    name: 'Engine Oil Filter',
    category: 'engine-oil-filters',
    source: 'list-a',
    fitmentNote: 'Engine oil filter from the official MyCNH North America Tier 4B Boomer initial stocking list used for the current Boomer 40 family. Verify serial/build date before ordering because CNH may supersede service part numbers.',
  },
  {
    number: 'MT40271228',
    name: 'Fuel Filter',
    category: 'fuel-filters',
    source: 'list-a',
    fitmentNote: 'Fuel filter from the official MyCNH North America Tier 4B Boomer initial stocking list used for the current Boomer 40 family. Verify serial/build date before ordering because CNH may supersede service part numbers.',
  },
  {
    number: 'MT40007576',
    name: 'Primary Engine Air Filter',
    category: 'air-filters',
    source: 'list-b',
    fitmentNote: 'Primary/outer engine air filter listed in the official MyCNH North America Tier 4B Boomer Initial Stocking List B. Verify serial/build date and air-cleaner configuration before ordering.',
  },
  {
    number: 'MT40049446',
    name: 'Safety Engine Air Filter',
    category: 'air-filters',
    source: 'list-a',
    fitmentNote: 'Inner/safety engine air filter listed in the official MyCNH North America Tier 4B Boomer Initial Stocking List A. Verify serial/build date and air-cleaner configuration before ordering.',
  },
  {
    number: 'MT40007563',
    name: 'HST Hydraulic Oil Filter',
    category: 'hydraulic-filters',
    source: 'list-a',
    fitmentNote: 'Hydraulic oil filter listed in the official MyCNH Tier 4B Boomer Initial Stocking List A for HST transmission service. Verify transmission, serial number, and build date before ordering.',
  },
  {
    number: 'MT40007638',
    name: 'Hydraulic Suction / Transmission Filter',
    category: 'hydraulic-filters',
    source: 'list-a',
    fitmentNote: 'Hydraulic suction filter listed by MyCNH with an explicit Boomer 40 / Boomer 50 model note; the catalog also identifies replacement filter MT40347273 in the suction-line note. Verify serial/build date and supersession before ordering.',
  },
  {
    number: 'MT40032863',
    name: 'Cab Air Filter',
    category: 'cab-filters',
    source: 'list-a',
    fitmentNote: 'Cab air filter listed in the official MyCNH North America Tier 4B Boomer Initial Stocking List A; applies to cab-equipped Boomer 40 configurations. Verify cab configuration and serial/build date.',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing New Holland Boomer 40 parts migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  source: SourceKey,
) {
  const externalId = source === 'list-a' ? LIST_A_EXTERNAL_ID : LIST_B_EXTERNAL_ID;
  const url = source === 'list-a' ? LIST_A_URL : LIST_B_URL;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [externalId]);
  if (rows[0]?.id) return Number(rows[0].id);

  const sourceParts = parts.filter((part) => part.source === source);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [
      sourceId,
      url,
      externalId,
      source === 'list-a'
        ? 'New Holland MyCNH North America Tier 4B Boomer Initial Stocking List A for Boomer 40 fitment'
        : 'New Holland MyCNH North America Tier 4B Boomer Initial Stocking List B for Boomer 40 fitment',
      JSON.stringify({
        modelScope: 'North America Tier 4B Boomer compact tractors; Boomer 40 fitment retained with configuration/serial cautions',
        catalogPage: source === 'list-a' ? '05.100.10 - INITIAL STOCKING LIST (LIST A)' : 'INITIAL STOCKING LIST (LIST B)',
        explicitCatalogNote: source === 'list-a'
          ? 'MT40007638 suction-line note names BOOMER 40 and BOOMER 50 and references replacement filter MT40347273.'
          : 'MT40007576 is listed as AIR FILTER; Primary.',
        filters: sourceParts.map((part) => ({ partNumber: part.number, name: part.name })),
      }),
    ],
  );
  return Number(result.insertId);
}

export const newHollandBoomer40FiltersPartsMigration: DbMigration = {
  id: '20260902_578_new_holland_boomer40_filters_parts',
  description: 'Add manufacturer-verified New Holland Boomer 40 Tier 4B filters, fitment, and documented hydraulic filter replacement from MyCNH parts data',
  async apply(connection) {
    await connection.query(`INSERT INTO manufacturers (name,slug) VALUES ('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);

    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Filters','filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const filtersId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='filters' LIMIT 1`);
    const childCategories = [
      ['Engine Oil Filters','engine-oil-filters'],
      ['Fuel Filters','fuel-filters'],
      ['Air Filters','air-filters'],
      ['Hydraulic Filters','hydraulic-filters'],
      ['Cab Filters','cab-filters'],
    ] as const;
    for (const [name, slug] of childCategories) {
      await connection.query(
        `INSERT INTO part_categories (parent_id,name,slug) VALUES (?,?,?) ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`,
        [filtersId, name, slug],
      );
    }

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland Parts' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('New Holland Parts','mycnhstore.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const sourceRecordIds: Record<SourceKey, number> = {
      'list-a': await ensureSourceRecord(connection, sourceId, 'list-a'),
      'list-b': await ensureSourceRecord(connection, sourceId, 'list-b'),
    };

    const categoryIds = new Map<string, number>();
    for (const [, slug] of childCategories) {
      categoryIds.set(slug, await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [slug]));
    }

    for (const part of parts) {
      const categoryId = categoryIds.get(part.category);
      if (!categoryId) throw new Error(`Missing New Holland part category ${part.category}`);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, part.number, part.number.toUpperCase(), part.name],
      );
    }

    const hydraulicCategoryId = categoryIds.get('hydraulic-filters');
    if (!hydraulicCategoryId) throw new Error('Missing New Holland hydraulic filters category.');
    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
       VALUES (?,?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),description=VALUES(description),data_status='verified'`,
      [
        manufacturerId,
        hydraulicCategoryId,
        'MT40347273',
        'MT40347273',
        'Hydraulic Oil Filter',
        'New Holland hydraulic oil filter referenced by the official MyCNH Tier 4B Boomer catalog as the replacement filter in the MT40007638 suction-line application.',
      ],
    );
    const oldHydraulicFilterId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='MT40007638' LIMIT 1`,
      [manufacturerId],
    );
    const replacementHydraulicFilterId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='MT40347273' LIMIT 1`,
      [manufacturerId],
    );
    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [oldHydraulicFilterId, replacementHydraulicFilterId, sourceRecordIds['list-a']],
    );

    const machineId = await selectId(
      connection,
      `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug='boomer-40' LIMIT 1`,
    );

    for (const part of parts) {
      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, part.number.toUpperCase()],
      );
      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
        [machineId, partId, part.fitmentNote],
      );
      if (!existing[0]) {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`,
          [machineId, partId, part.fitmentNote, sourceRecordIds[part.source]],
        );
      }
    }
  },
};
