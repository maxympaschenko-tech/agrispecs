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
};

const CURRENT_VERSION = 'united-states-current-2026-08';
const MACHINE_SLUG = 'workmaster-25s';

const filters: FilterSeed[] = [
  {
    number: 'MT40356015',
    name: 'Engine Oil Filter',
    category: 'engine-oil-filters',
    dealerUrl: 'https://www.newhollandrochester.com/shop/mt40356015/',
    externalId: 'new-holland-rochester-mt40356015-workmaster25s-fitment-2026-09',
    officialUrl: 'https://www.mycnhstore.com/us/en/newhollandag/category/filters/transmission-filters/filter/p/MT40356015',
    fitmentNote: 'Engine oil filter listed by New Holland Rochester for WORKMASTER 25S compact tractors from 12/17 onward. MyCNH separately confirms MT40356015 as a New Holland engine oil filter. Verify serial/build date before ordering.',
  },
  {
    number: 'MT40350134',
    name: 'Fuel Filter',
    category: 'fuel-filters',
    dealerUrl: 'https://www.newhollandrochester.com/shop/mt40350134/',
    externalId: 'new-holland-rochester-mt40350134-workmaster25s-fitment-2026-09',
    fitmentNote: 'Fuel filter listed by New Holland Rochester for WORKMASTER 25S compact tractors from 12/17 onward. Verify serial/build date and fuel-system configuration before ordering.',
  },
  {
    number: 'MT40049450',
    name: 'Engine Air Filter',
    category: 'air-filters',
    dealerUrl: 'https://www.newhollandrochester.com/shop/mt40049450/',
    externalId: 'new-holland-rochester-mt40049450-workmaster25s-fitment-2026-09',
    fitmentNote: 'Engine air filter listed by New Holland Rochester for WORKMASTER 25S compact tractors from 12/17 onward. Verify serial/build date and air-cleaner configuration before ordering.',
  },
  {
    number: 'MT40220109',
    name: 'Hydraulic Oil Filter',
    category: 'hydraulic-filters',
    dealerUrl: 'https://www.newhollandrochester.com/shop/mt40220109/',
    externalId: 'new-holland-rochester-mt40220109-workmaster25s-fitment-2026-09',
    officialUrl: 'https://www.mycnhstore.com/us/en/newhollandag/category/filters/hydraulic-filters/hydraulic-oil-filter/p/MT40220109',
    fitmentNote: 'Hydraulic oil filter listed by New Holland Rochester for WORKMASTER 25S compact tractors from 12/17 onward. MyCNH separately confirms MT40220109 as a New Holland hydraulic oil filter. Verify serial/build date before ordering.',
  },
  {
    number: 'MT40195621',
    name: 'Hydraulic Suction Filter',
    category: 'hydraulic-filters',
    dealerUrl: 'https://www.newhollandrochester.com/shop/mt40195621/',
    externalId: 'new-holland-rochester-mt40195621-workmaster25s-fitment-2026-09',
    officialUrl: 'https://www.mycnhstore.com/us/en/caseih/category/filters/oil-filters/filter/p/MT40195621',
    fitmentNote: 'Inline hydraulic suction filter listed by New Holland Rochester for WORKMASTER 25S compact tractors from 12/17 onward. CNH MyCNH separately confirms MT40195621 as a hydraulic oil filter. Verify serial/build date before ordering.',
  },
  {
    number: 'MT40358122',
    name: 'Fuel Filter',
    category: 'fuel-filters',
    dealerUrl: 'https://www.newhollandrochester.com/shop/mt40358122/',
    externalId: 'new-holland-rochester-mt40358122-workmaster25s-fitment-replacement-2026-09',
    fitmentNote: 'Fuel filter listed by New Holland Rochester for WORKMASTER 25S compact tractors from 12/17 onward. The same source marks MT40358122 as replaced by MT40420959; verify serial/build date before ordering.',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing New Holland WORKMASTER 25S filter migration dependency.');
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

export const newHollandWorkmaster25SFiltersMigration: DbMigration = {
  id: '20260902_589_new_holland_workmaster25s_filters',
  description: 'Add source-backed New Holland WORKMASTER 25S maintenance filters and documented fuel-filter replacement',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const machineId = await selectId(
      connection,
      `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
      [MACHINE_SLUG],
    );
    const machineVersionId = await selectId(
      connection,
      `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
      [machineId, CURRENT_VERSION],
    );

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

    for (const filter of filters) {
      const categoryId = categoryIds.get(filter.category);
      if (!categoryId) throw new Error(`Missing part category ${filter.category}.`);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, filter.number, filter.number, filter.name],
      );

      const dealerSourceRecordId = await ensureSourceRecord(
        connection,
        dealerSourceId,
        filter.externalId,
        filter.dealerUrl,
        `New Holland Rochester ${filter.number} WORKMASTER 25S fitment`,
        {
          role: 'Exact WORKMASTER 25S model fitment evidence',
          model: 'WORKMASTER 25S',
          catalogRange: '12/17 onward',
          partNumber: filter.number,
          confidence: 'secondary/high',
        },
      );

      if (filter.officialUrl) {
        const officialSourceId = filter.number === 'MT40195621' ? cnhOfficialSourceId : newHollandOfficialSourceId;
        await ensureSourceRecord(
          connection,
          officialSourceId,
          `cnh-mycnh-${filter.number.toLowerCase()}-filter-2026-09`,
          filter.officialUrl,
          `CNH MyCNH ${filter.number} ${filter.name}`,
          { role: 'Official OEM identity for filter part', partNumber: filter.number, name: filter.name },
        );
      }

      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, filter.number],
      );
      const configurationNote = 'Current US WORKMASTER 25S sub-compact; catalog family from 12/17 onward';
      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
        [machineId, partId, machineVersionId, configurationNote],
      );
      if (!existing[0]) {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
           VALUES (?,?,?,?,?,'high',?)`,
          [machineId, partId, machineVersionId, configurationNote, filter.fitmentNote, dealerSourceRecordId],
        );
      }
    }

    const fuelCategoryId = categoryIds.get('fuel-filters');
    if (!fuelCategoryId) throw new Error('Missing fuel-filter category.');
    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, fuelCategoryId, 'MT40420959', 'MT40420959', 'Fuel Filter'],
    );

    const oldFuelPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='MT40358122' LIMIT 1`,
      [manufacturerId],
    );
    const replacementFuelPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='MT40420959' LIMIT 1`,
      [manufacturerId],
    );
    const replacementSourceId = await ensureSourceRecord(
      connection,
      dealerSourceId,
      'new-holland-rochester-mt40420959-replaces-mt40358122-2026-09',
      'https://www.newhollandrochester.com/shop/mt40420959/',
      'New Holland Rochester MT40420959 fuel-filter replacement listing',
      {
        legacyPartNumber: 'MT40358122',
        replacementPartNumber: 'MT40420959',
        scope: 'Replacement-chain evidence only for MT40420959; direct WORKMASTER 25S fitment for the replacement number is not asserted without a model listing on the replacement page.',
      },
    );
    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [oldFuelPartId, replacementFuelPartId, replacementSourceId],
    );
  },
};
