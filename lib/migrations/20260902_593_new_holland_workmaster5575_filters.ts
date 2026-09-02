import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type FilterSeed = {
  number: string;
  name: string;
  category: 'engine-oil-filters' | 'fuel-filters' | 'hydraulic-filters';
  sourceName: 'Messick\'s' | 'New Holland Rochester';
  sourceDomain: 'messicks.com' | 'newhollandrochester.com';
  sourceUrl: string;
  sourceExternalId: string;
  fitmentNote: string;
  officialUrl?: string;
};

const CURRENT_VERSION = 'united-states-current-2026-08';
const MACHINE_SLUGS = ['workmaster-55', 'workmaster-65', 'workmaster-75'] as const;
const BASE_CONFIGURATION = 'Current North America WORKMASTER 55/65/75 utility tractor; Tier 4B catalog family from 09/18 onward';

const filters: FilterSeed[] = [
  {
    number: '5096729',
    name: 'Engine Oil Filter',
    category: 'engine-oil-filters',
    sourceName: "Messick's",
    sourceDomain: 'messicks.com',
    sourceUrl: 'https://www.messicks.com/parts/case/5096729',
    sourceExternalId: 'messicks-5096729-workmaster5575-tier4b-maintenance-2026-09',
    fitmentNote: 'Engine oil filter listed in the Tier 4B maintenance-parts filter catalog for WORKMASTER 55, 65 and 75 from 09/18 onward. Verify engine build date and configuration before ordering.',
    officialUrl: 'https://www.mycnhstore.com/eu/en/newhollandag/cn/engine-oil-filter/p/5096729',
  },
  {
    number: '84328598',
    name: 'Fuel Precleaner Filter',
    category: 'fuel-filters',
    sourceName: 'New Holland Rochester',
    sourceDomain: 'newhollandrochester.com',
    sourceUrl: 'https://www.newhollandrochester.com/shop/84328598/',
    sourceExternalId: 'new-holland-rochester-84328598-workmaster5575-current-2026-09',
    fitmentNote: 'Fuel filter/precleaner listed in the current WORKMASTER 55, 65 and 75 utility model catalog (09/18-present). MyCNH identifies 84328598 as a cleanable 350-micron fuel precleaner. Verify fuel-system configuration before ordering.',
    officialUrl: 'https://www.mycnhstore.com/us/en/caseih/category/filters/fuel-filters/fuel-filter/p/84328598',
  },
  {
    number: '84348882',
    name: 'Fuel Filter',
    category: 'fuel-filters',
    sourceName: 'New Holland Rochester',
    sourceDomain: 'newhollandrochester.com',
    sourceUrl: 'https://www.newhollandrochester.com/shop/84348882/',
    sourceExternalId: 'new-holland-rochester-84348882-workmaster5575-current-2026-09',
    fitmentNote: '30-micron spin-on fuel filter listed for the current WORKMASTER 55, 65 and 75 utility model family (09/18-present). Depending on the fuel-system arrangement this filter may serve as a pre-engine or water-separator stage; verify configuration before ordering.',
    officialUrl: 'https://www.mycnhstore.com/amea/ru/caseih/cn/fuel-filter/p/84348882',
  },
  {
    number: '84170818',
    name: 'Fuel/Water Separator',
    category: 'fuel-filters',
    sourceName: 'New Holland Rochester',
    sourceDomain: 'newhollandrochester.com',
    sourceUrl: 'https://www.newhollandrochester.com/shop/84170818/',
    sourceExternalId: 'new-holland-rochester-84170818-workmaster5575-current-2026-09',
    fitmentNote: 'Fuel/water separator listed for WORKMASTER 55, 65 and 75 (09/18-present). MyCNH separately identifies 84170818 as a fuel/water separator. Verify engine and fuel-system configuration before ordering.',
    officialUrl: 'https://www.mycnhstore.com/eu/en/newhollandag/cn/fuel-filter/p/84170818',
  },
  {
    number: '84257511',
    name: 'Hydraulic Oil Filter',
    category: 'hydraulic-filters',
    sourceName: 'New Holland Rochester',
    sourceDomain: 'newhollandrochester.com',
    sourceUrl: 'https://www.newhollandrochester.com/shop/84257511/',
    sourceExternalId: 'new-holland-rochester-84257511-workmaster5575-current-2026-09',
    fitmentNote: 'Hydraulic oil filter listed for WORKMASTER 55, 65 and 75 (09/18-present). MyCNH separately identifies 84257511 as a hydraulic oil filter. Verify hydraulic/transmission configuration before ordering.',
    officialUrl: 'https://www.mycnhstore.com/amea/en/newhollandag/cn/hydraulic-oil-filter/p/84257511',
  },
  {
    number: '48195966',
    name: 'Hydraulic Oil Filter',
    category: 'hydraulic-filters',
    sourceName: "Messick's",
    sourceDomain: 'messicks.com',
    sourceUrl: 'https://www.messicks.com/parts/new-holland/48195966',
    sourceExternalId: 'messicks-48195966-workmaster5575-tier4b-hydraulic-2026-09',
    fitmentNote: 'Hydraulic/transmission filter present in the WORKMASTER 55, 65 and 75 Tier 4B catalog. It is a separate service filter from 48195967; confirm transmission variant and build date before ordering.',
    officialUrl: 'https://www.mycnhstore.com/amea/en/newhollandag/cn/hydraulic-oil-filter/p/48195966',
  },
  {
    number: '48195967',
    name: 'Transmission Hydraulic Oil Filter',
    category: 'hydraulic-filters',
    sourceName: 'New Holland Rochester',
    sourceDomain: 'newhollandrochester.com',
    sourceUrl: 'https://www.newhollandrochester.com/shop/48195967/',
    sourceExternalId: 'new-holland-rochester-48195967-workmaster5575-current-2026-09',
    fitmentNote: 'Hydraulic/transmission oil filter listed for WORKMASTER 55, 65 and 75 (09/18-present). Parts-catalog transmission diagrams show this filter in post-10-Jan-2020 configurations; verify transmission and production date before ordering.',
    officialUrl: 'https://www.mycnhstore.com/gb/en/newhollandag/category/filters/hydraulic-filter/hydraulic-oil-filter/p/48195967',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing WORKMASTER 55/65/75 filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSource(
  connection: Parameters<DbMigration['apply']>[0],
  name: string,
  domain: string,
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM sources WHERE name=? AND domain=? ORDER BY id LIMIT 1`,
    [name, domain],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?,?,'supplier','secondary')`,
    [name, domain],
  );
  return Number(result.insertId);
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

export const newHollandWorkmaster5575FiltersMigration: DbMigration = {
  id: '20260902_593_new_holland_workmaster5575_filters',
  description: 'Add current source-backed WORKMASTER 55/65/75 Tier 4B maintenance and hydraulic filters',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const officialSourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='New Holland Parts' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`,
    );
    const categoryIds = new Map<string, number>();
    for (const slug of ['engine-oil-filters', 'fuel-filters', 'hydraulic-filters']) {
      categoryIds.set(slug, await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [slug]));
    }

    const dealerSourceIds = new Map<string, number>();
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

      const sourceKey = `${filter.sourceName}|${filter.sourceDomain}`;
      let sourceId = dealerSourceIds.get(sourceKey);
      if (!sourceId) {
        sourceId = await ensureSource(connection, filter.sourceName, filter.sourceDomain);
        dealerSourceIds.set(sourceKey, sourceId);
      }
      const fitmentSourceRecordId = await ensureSourceRecord(
        connection,
        sourceId,
        filter.sourceExternalId,
        filter.sourceUrl,
        `${filter.sourceName} ${filter.number} WORKMASTER 55/65/75 fitment`,
        {
          role: 'Exact current-family model or Tier 4B catalog fitment evidence',
          models: ['WORKMASTER 55', 'WORKMASTER 65', 'WORKMASTER 75'],
          modelFamily: '09/18 onward',
          partNumber: filter.number,
          confidence: 'secondary/high',
          caution: 'Machine model association does not remove engine/transmission/build-date configuration requirements.',
        },
      );
      fitmentSourceByPart.set(filter.number, fitmentSourceRecordId);

      if (filter.officialUrl) {
        await ensureSourceRecord(
          connection,
          officialSourceId,
          `new-holland-mycnh-${filter.number.toLowerCase()}-identity-2026-09`,
          filter.officialUrl,
          `New Holland MyCNH ${filter.number} ${filter.name}`,
          { role: 'Official OEM part identity corroboration', partNumber: filter.number, name: filter.name },
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
        const configurationNote = filter.number === '48195967'
          ? `${BASE_CONFIGURATION}; transmission filter application includes post-10-Jan-2020 catalog configurations`
          : BASE_CONFIGURATION;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, partId, machineVersionId, configurationNote],
        );
        if (!existing[0]) {
          await connection.query(
            `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
             VALUES (?,?,?,?,?,'high',?)`,
            [machineId, partId, machineVersionId, configurationNote, filter.fitmentNote, sourceRecordId],
          );
        }
      }
    }

    const legacyPartNumber = '84256436';
    const currentPartNumber = '48195966';
    const hydraulicCategoryId = categoryIds.get('hydraulic-filters');
    if (!hydraulicCategoryId) throw new Error('Missing hydraulic filter category.');
    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, hydraulicCategoryId, legacyPartNumber, legacyPartNumber, 'Hydraulic Oil Filter'],
    );
    const legacyPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, legacyPartNumber],
    );
    const currentPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, currentPartNumber],
    );
    const rochesterSourceId = await ensureSource(connection, 'New Holland Rochester', 'newhollandrochester.com');
    const replacementSourceRecordId = await ensureSourceRecord(
      connection,
      rochesterSourceId,
      'new-holland-rochester-84256436-replaced-by-48195966-2026-09',
      'https://www.newhollandrochester.com/shop/84256436/',
      'New Holland Rochester 84256436 hydraulic filter replacement',
      {
        legacyPartNumber,
        replacementPartNumber: currentPartNumber,
        statement: '84256436 is no longer available and is replaced by 48195966.',
        currentUtilityModelsListed: ['WORKMASTER 55', 'WORKMASTER 65', 'WORKMASTER 75'],
        scope: 'Replacement relationship; the current-part direct catalog fitment remains separately sourced.',
      },
    );
    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [legacyPartId, currentPartId, replacementSourceRecordId],
    );
  },
};
