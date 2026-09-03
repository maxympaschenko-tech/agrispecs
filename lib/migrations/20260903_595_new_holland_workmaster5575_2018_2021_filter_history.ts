import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type HistoricalFilter = {
  number: string;
  name: string;
  category: 'fuel-filters' | 'air-filters';
  fitmentUrl: string;
  fitmentExternalId: string;
  fitmentNote: string;
  officialUrl: string;
  officialExternalId: string;
};

const VERSION_SLUG = 'north-america-tier4b-2018-2021-filter-configuration';
const MACHINE_SLUGS = ['workmaster-55', 'workmaster-65', 'workmaster-75'] as const;
const HISTORICAL_CONFIGURATION = 'WORKMASTER Utility 55-75 Tier 4B; historical 09/18-04/21 filter configuration';

const filters: HistoricalFilter[] = [
  {
    number: '84534796',
    name: 'Fuel Filter',
    category: 'fuel-filters',
    fitmentUrl: 'https://www.newhollandrochester.com/shop/84534796/',
    fitmentExternalId: 'new-holland-rochester-84534796-workmaster5575-2018-2021-2026-09',
    fitmentNote: 'Fuel filter listed for New Holland WORKMASTER 55, 65 and 75 Tier 4B utility tractors from 09/18 through 04/21. This is historical fitment and is intentionally not attached to the current 2026 machine version.',
    officialUrl: 'https://www.mycnhstore.com/amea/en/newhollandag/cn/fuel-filter/p/84534796',
    officialExternalId: 'new-holland-mycnh-84534796-fuel-filter-identity-2026-09',
  },
  {
    number: '87037985',
    name: 'Secondary Engine Air Filter',
    category: 'air-filters',
    fitmentUrl: 'https://www.newhollandrochester.com/shop/87037985/',
    fitmentExternalId: 'new-holland-rochester-87037985-workmaster5575-2018-2021-2026-09',
    fitmentNote: 'Secondary/safety engine air filter listed for New Holland WORKMASTER 55, 65 and 75 Tier 4B utility tractors from 09/18 through 04/21. This is historical fitment and is intentionally not attached to the current 2026 machine version.',
    officialUrl: 'https://www.mycnhstore.com/us/en/newhollandag/category/filters/air-filters/air-filter/p/87037985',
    officialExternalId: 'new-holland-mycnh-87037985-secondary-air-filter-identity-2026-09',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing WORKMASTER 55-75 historical-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSource(
  connection: Parameters<DbMigration['apply']>[0],
  name: string,
  domain: string,
  sourceType: 'manufacturer' | 'supplier',
  authorityLevel: 'official' | 'secondary',
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM sources WHERE name=? AND domain=? ORDER BY id LIMIT 1`,
    [name, domain],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?,?,?,?)`,
    [name, domain, sourceType, authorityLevel],
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
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
    [externalId],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

export const newHollandWorkmaster5575HistoricalFilterMigration: DbMigration = {
  id: '20260903_595_new_holland_workmaster5575_2018_2021_filter_history',
  description: 'Add a non-current 2018-2021 WORKMASTER 55/65/75 filter version with historical fuel and air fitment',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const dealerSourceId = await ensureSource(
      connection,
      'New Holland Rochester',
      'newhollandrochester.com',
      'supplier',
      'secondary',
    );
    const officialSourceId = await ensureSource(
      connection,
      'New Holland Parts',
      'mycnhstore.com',
      'manufacturer',
      'official',
    );

    const versionSourceRecordId = await ensureSourceRecord(
      connection,
      dealerSourceId,
      'new-holland-rochester-workmaster5575-2018-2021-filter-window-2026-09',
      'https://www.newhollandrochester.com/shop/84534796/',
      'New Holland Rochester WORKMASTER 55/65/75 historical 09/18-04/21 filter application window',
      {
        role: 'Historical machine-version boundary for filter fitment',
        models: ['WORKMASTER 55', 'WORKMASTER 65', 'WORKMASTER 75'],
        applicationWindow: '09/18-04/21',
        corroboratingUrls: [
          'https://www.newhollandrochester.com/shop/84534796/',
          'https://www.newhollandrochester.com/shop/87037985/',
        ],
        caution: 'This version exists to keep ended 04/21 filter applications separate from the current 2026 machine version.',
      },
    );

    const categoryIds = new Map<string, number>();
    for (const slug of ['fuel-filters', 'air-filters']) {
      categoryIds.set(slug, await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [slug]));
    }

    const fitmentSourceIds = new Map<string, number>();
    for (const filter of filters) {
      const categoryId = categoryIds.get(filter.category);
      if (!categoryId) throw new Error(`Missing part category ${filter.category}.`);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, filter.number, filter.number, filter.name],
      );

      const fitmentSourceRecordId = await ensureSourceRecord(
        connection,
        dealerSourceId,
        filter.fitmentExternalId,
        filter.fitmentUrl,
        `New Holland Rochester ${filter.number} historical WORKMASTER 55/65/75 fitment`,
        {
          role: 'Exact historical model/date fitment evidence',
          models: ['WORKMASTER 55', 'WORKMASTER 65', 'WORKMASTER 75'],
          applicationWindow: '09/18-04/21',
          partNumber: filter.number,
          confidence: 'secondary/high',
        },
      );
      fitmentSourceIds.set(filter.number, fitmentSourceRecordId);

      await ensureSourceRecord(
        connection,
        officialSourceId,
        filter.officialExternalId,
        filter.officialUrl,
        `New Holland MyCNH ${filter.number} ${filter.name}`,
        {
          role: 'Official OEM part identity corroboration',
          partNumber: filter.number,
          name: filter.name,
        },
      );
    }

    for (const machineSlug of MACHINE_SLUGS) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id
         WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [machineSlug],
      );

      await connection.query(
        `INSERT INTO machine_versions (
          machine_id,slug,market_code,market_name,model_year_start,model_year_end,configuration,is_current,source_record_id,notes
        ) VALUES (?,?,'NA','North America',2018,2021,?,FALSE,?,?)
        ON DUPLICATE KEY UPDATE
          market_code=VALUES(market_code),market_name=VALUES(market_name),
          model_year_start=VALUES(model_year_start),model_year_end=VALUES(model_year_end),
          configuration=VALUES(configuration),is_current=FALSE,
          source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [
          machineId,
          VERSION_SLUG,
          HISTORICAL_CONFIGURATION,
          versionSourceRecordId,
          'Historical service-fitment version based on catalog applications explicitly ending 04/21. Model-year fields are broad navigation labels; exact source window is September 2018 through April 2021.',
        ],
      );
      const machineVersionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, VERSION_SLUG],
      );

      for (const filter of filters) {
        const partId = await selectId(
          connection,
          `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
          [manufacturerId, filter.number],
        );
        const sourceRecordId = fitmentSourceIds.get(filter.number);
        if (!sourceRecordId) throw new Error(`Missing historical fitment source for ${filter.number}.`);
        const configurationNote = `${HISTORICAL_CONFIGURATION}; exact catalog application 09/18-04/21`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts
           WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, partId, machineVersionId, configurationNote],
        );
        if (!existing[0]) {
          await connection.query(
            `INSERT INTO machine_parts (
              machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id
            ) VALUES (?,?,?,?,?,'high',?)`,
            [machineId, partId, machineVersionId, configurationNote, filter.fitmentNote, sourceRecordId],
          );
        }
      }
    }

    const replacementSeeds = [
      {
        legacy: '5801477167',
        current: '84534796',
        category: 'fuel-filters',
        legacyName: 'Fuel Filter Cartridge',
        url: 'https://www.newhollandrochester.com/shop/5801477167/',
        externalId: 'new-holland-rochester-5801477167-replaced-by-84534796-2026-09',
        statement: '5801477167 is replaced by 84534796.',
      },
      {
        legacy: '87356353',
        current: '87037985',
        category: 'air-filters',
        legacyName: 'Secondary Engine Air Filter',
        url: 'https://www.newhollandrochester.com/shop/87356353/',
        externalId: 'new-holland-rochester-87356353-replaced-by-87037985-2026-09',
        statement: '87356353 is no longer available and is replaced by 87037985.',
      },
    ] as const;

    for (const replacement of replacementSeeds) {
      const categoryId = categoryIds.get(replacement.category);
      if (!categoryId) throw new Error(`Missing replacement category ${replacement.category}.`);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, replacement.legacy, replacement.legacy, replacement.legacyName],
      );

      const legacyPartId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, replacement.legacy],
      );
      const currentPartId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, replacement.current],
      );
      const replacementSourceRecordId = await ensureSourceRecord(
        connection,
        dealerSourceId,
        replacement.externalId,
        replacement.url,
        `New Holland Rochester ${replacement.legacy} replacement history`,
        {
          legacyPartNumber: replacement.legacy,
          replacementPartNumber: replacement.current,
          statement: replacement.statement,
          scope: 'Replacement history only. No direct WORKMASTER fitment is asserted for the legacy number.',
        },
      );
      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'replaces',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [legacyPartId, currentPartId, replacementSourceRecordId],
      );
    }
  },
};
