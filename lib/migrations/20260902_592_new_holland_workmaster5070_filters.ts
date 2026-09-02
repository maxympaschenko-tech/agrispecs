import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type FilterSeed = {
  number: string;
  name: string;
  category: 'engine-oil-filters' | 'fuel-filters' | 'air-filters' | 'hydraulic-filters';
  dealerUrl: string;
  externalId: string;
  fitmentNote: string;
  officialUrl?: string;
  officialSource: 'new-holland' | 'cnh';
};

const CURRENT_VERSION = 'united-states-current-2026-08';
const MACHINE_SLUGS = ['workmaster-50', 'workmaster-60', 'workmaster-70'] as const;
const CONFIGURATION_NOTE = 'Current US WORKMASTER 50/60/70 Tier 4 utility tractor; catalog family from 06/15 onward';

const filters: FilterSeed[] = [
  {
    number: '51575943',
    name: 'Engine Oil Filter',
    category: 'engine-oil-filters',
    dealerUrl: 'https://www.newhollandrochester.com/shop/51575943/',
    externalId: 'new-holland-rochester-51575943-workmaster5070-fitment-2026-09',
    fitmentNote: 'Engine oil filter listed by New Holland Rochester for WORKMASTER 50, 60 and 70 from 06/15 to present. The same source records 51575943 as replacing 73379051 and 47811302. Verify serial/build date before ordering.',
    officialSource: 'new-holland',
  },
  {
    number: '47811305',
    name: 'Fuel Filter',
    category: 'fuel-filters',
    dealerUrl: 'https://www.newhollandrochester.com/shop/47811305/',
    externalId: 'new-holland-rochester-47811305-workmaster5070-fitment-2026-09',
    officialUrl: 'https://www.mycnhstore.com/us/en/caseih/category/filters/fuel-filters/fuel-filter/p/47811305',
    fitmentNote: 'Fuel filter listed by New Holland Rochester for WORKMASTER 50, 60 and 70 from 06/15 to present. The same source records 47811305 as replacing 73379174. Verify serial/build date before ordering.',
    officialSource: 'cnh',
  },
  {
    number: '47619812',
    name: 'Pre-Fuel Filter',
    category: 'fuel-filters',
    dealerUrl: 'https://www.newhollandrochester.com/shop/47619812/',
    externalId: 'new-holland-rochester-47619812-workmaster5070-fitment-2026-09',
    officialUrl: 'https://www.mycnhstore.com/us/en/newhollandag/category/filters/oil-filters/fuel-filter/p/47619812',
    fitmentNote: 'Fuel pre-filter/service filter listed by New Holland Rochester for WORKMASTER 50, 60 and 70 from 06/15 to present. Verify serial/build date and fuel-system configuration before ordering.',
    officialSource: 'new-holland',
  },
  {
    number: '86982522',
    name: 'Primary Engine Air Filter',
    category: 'air-filters',
    dealerUrl: 'https://www.newhollandrochester.com/shop/86982522/',
    externalId: 'new-holland-rochester-86982522-workmaster5070-fitment-2026-09',
    officialUrl: 'https://www.mycnhstore.com/eu/en/caseih/cn/air-filter/p/86982522',
    fitmentNote: 'Primary/outer engine air filter listed by New Holland Rochester for WORKMASTER 50, 60 and 70 from 06/15 to present. MyCNH separately identifies 86982522 as a primary engine air filter. Verify air-cleaner configuration before ordering.',
    officialSource: 'cnh',
  },
  {
    number: '86982523',
    name: 'Secondary Engine Air Filter',
    category: 'air-filters',
    dealerUrl: 'https://www.newhollandrochester.com/shop/86982523/',
    externalId: 'new-holland-rochester-86982523-workmaster5070-fitment-2026-09',
    officialUrl: 'https://www.mycnhstore.com/amea/en/newhollandag/cn/service-kit/p/73331796',
    fitmentNote: 'Secondary/inner engine air filter listed by New Holland Rochester for WORKMASTER 50, 60 and 70 Tier 4 tractors. MyCNH separately lists 86982523 as a secondary engine air filter in an OEM service kit. Verify air-cleaner configuration before ordering.',
    officialSource: 'new-holland',
  },
  {
    number: '87391716',
    name: 'Hydraulic Oil Filter',
    category: 'hydraulic-filters',
    dealerUrl: 'https://www.newhollandrochester.com/shop/87391716/',
    externalId: 'new-holland-rochester-87391716-workmaster5070-fitment-2026-09',
    officialUrl: 'https://www.mycnhstore.com/us/en/newhollandag/category/filters/hydraulic-filters/filter/p/87391716',
    fitmentNote: 'Hydraulic oil filter listed by New Holland Rochester for WORKMASTER 50, 60 and 70 from 06/15 to present. MyCNH separately identifies 87391716 as a hydraulic oil filter. Verify hydraulic configuration before ordering.',
    officialSource: 'new-holland',
  },
  {
    number: '1909143',
    name: 'Power Steering Hydraulic Oil Filter',
    category: 'hydraulic-filters',
    dealerUrl: 'https://www.newhollandrochester.com/shop/1909143/',
    externalId: 'new-holland-rochester-1909143-workmaster5070-fitment-2026-09',
    officialUrl: 'https://www.mycnhstore.com/us/en/newhollandag/category/filters/hydraulic-filters/filter/p/1909143',
    fitmentNote: 'Hydraulic filter listed by New Holland Rochester for WORKMASTER 50, 60 and 70 from 06/15 to present. MyCNH identifies 1909143 as a power-steering-system hydraulic oil filter. Verify drive/steering configuration before ordering.',
    officialSource: 'new-holland',
  },
];

const legacyRelations = [
  { legacy: '73379051', current: '51575943', name: 'Engine Oil Filter', category: 'engine-oil-filters' as const },
  { legacy: '47811302', current: '51575943', name: 'Engine Oil Filter', category: 'engine-oil-filters' as const },
  { legacy: '73379174', current: '47811305', name: 'Fuel Filter', category: 'fuel-filters' as const },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing WORKMASTER 50/60/70 filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  rawReference: unknown,
) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [externalId]);
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

export const newHollandWorkmaster5070FiltersMigration: DbMigration = {
  id: '20260902_592_new_holland_workmaster5070_filters',
  description: 'Add current WORKMASTER 50/60/70 maintenance filters and source-backed legacy filter replacements',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);

    let [dealerRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='New Holland Rochester' AND domain='newhollandrochester.com' ORDER BY id LIMIT 1`,
    );
    let dealerSourceId = dealerRows[0]?.id ? Number(dealerRows[0].id) : 0;
    if (!dealerSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('New Holland Rochester','newhollandrochester.com','supplier','secondary')`,
      );
      dealerSourceId = Number(result.insertId);
    }

    const newHollandOfficialSourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='New Holland Parts' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`,
    );
    let [cnhRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='CNH MyCNH' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`,
    );
    let cnhOfficialSourceId = cnhRows[0]?.id ? Number(cnhRows[0].id) : 0;
    if (!cnhOfficialSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('CNH MyCNH','mycnhstore.com','manufacturer','official')`,
      );
      cnhOfficialSourceId = Number(result.insertId);
    }

    const categoryIds = new Map<string, number>();
    for (const slug of ['engine-oil-filters', 'fuel-filters', 'air-filters', 'hydraulic-filters']) {
      categoryIds.set(slug, await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [slug]));
    }

    const fitmentSourceByPart = new Map<string, number>();
    for (const filter of filters) {
      const categoryId = categoryIds.get(filter.category);
      if (!categoryId) throw new Error(`Missing part category ${filter.category}.`);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, filter.number, filter.number, filter.name],
      );

      const dealerRecordId = await ensureSourceRecord(
        connection,
        dealerSourceId,
        filter.externalId,
        filter.dealerUrl,
        `New Holland Rochester ${filter.number} WORKMASTER 50/60/70 fitment`,
        {
          role: 'Exact WORKMASTER 50/60/70 model fitment evidence',
          models: ['WORKMASTER 50', 'WORKMASTER 60', 'WORKMASTER 70'],
          catalogRange: '06/15 onward',
          partNumber: filter.number,
          confidence: 'secondary/high',
        },
      );
      fitmentSourceByPart.set(filter.number, dealerRecordId);

      if (filter.officialUrl) {
        const sourceId = filter.officialSource === 'cnh' ? cnhOfficialSourceId : newHollandOfficialSourceId;
        await ensureSourceRecord(
          connection,
          sourceId,
          `cnh-mycnh-${filter.number.toLowerCase()}-identity-2026-09`,
          filter.officialUrl,
          `CNH MyCNH ${filter.number} ${filter.name}`,
          { role: 'Official OEM identity corroboration', partNumber: filter.number, name: filter.name },
        );
      }
    }

    for (const machineSlug of MACHINE_SLUGS) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [machineSlug],
      );
      const machineVersionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, CURRENT_VERSION],
      );

      for (const filter of filters) {
        const partId = await selectId(
          connection,
          `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
          [manufacturerId, filter.number],
        );
        const sourceRecordId = fitmentSourceByPart.get(filter.number);
        if (!sourceRecordId) throw new Error(`Missing fitment source for ${filter.number}.`);
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, partId, machineVersionId, CONFIGURATION_NOTE],
        );
        if (!existing[0]) {
          await connection.query(
            `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
             VALUES (?,?,?,?,?,'high',?)`,
            [machineId, partId, machineVersionId, CONFIGURATION_NOTE, filter.fitmentNote, sourceRecordId],
          );
        }
      }
    }

    for (const relation of legacyRelations) {
      const categoryId = categoryIds.get(relation.category);
      if (!categoryId) throw new Error(`Missing part category ${relation.category}.`);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, relation.legacy, relation.legacy, relation.name],
      );
      const legacyPartId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, relation.legacy],
      );
      const currentPartId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, relation.current],
      );
      const replacementSourceRecordId = fitmentSourceByPart.get(relation.current);
      if (!replacementSourceRecordId) throw new Error(`Missing replacement source for ${relation.current}.`);
      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'replaces',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [legacyPartId, currentPartId, replacementSourceRecordId],
      );
    }
  },
};
