import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const PART_NUMBER = '51586597';
const CURRENT_VERSION = 'united-states-current-2026-08';
const MACHINE_SLUGS = ['workmaster-55', 'workmaster-65', 'workmaster-75'] as const;
const FITMENT_URL = 'https://www.messicks.com/parts/new-holland/51586597';
const FITMENT_EXTERNAL_ID = 'messicks-new-holland-51586597-workmaster5575-cab-after-2019-06-14-2026-09';
const OEM_URL = 'https://www.mycnhstore.com/us/en/newhollandag/category/filters/air-filters/air-filter/p/51586597';
const OEM_EXTERNAL_ID = 'new-holland-mycnh-51586597-inner-cab-air-filter-2026-09';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing WORKMASTER 55-75 cab-filter migration dependency.');
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

export const newHollandWorkmaster5575CabFilterMigration: DbMigration = {
  id: '20260903_596_new_holland_workmaster5575_cab_filter',
  description: 'Add post-14-Jun-2019 inner cab air filter fitment for cab-equipped WORKMASTER 55/65/75',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='cab-filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, categoryId, PART_NUMBER, PART_NUMBER, 'Inner Cab Air Filter'],
    );
    const partId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, PART_NUMBER],
    );

    let [messicksRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name="Messick's" AND domain='messicks.com' ORDER BY id LIMIT 1`,
    );
    let messicksSourceId = messicksRows[0]?.id ? Number(messicksRows[0].id) : 0;
    if (!messicksSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ("Messick's",'messicks.com','supplier','secondary')`,
      );
      messicksSourceId = Number(result.insertId);
    }

    const fitmentSourceRecordId = await ensureSourceRecord(
      connection,
      messicksSourceId,
      FITMENT_EXTERNAL_ID,
      FITMENT_URL,
      `Messick's New Holland 51586597 WORKMASTER 55/65/75 cab fitment`,
      {
        role: 'Exact model/configuration/production-date fitment evidence',
        partNumber: PART_NUMBER,
        models: ['WORKMASTER 55', 'WORKMASTER 65', 'WORKMASTER 75'],
        technology: 'Tier 4B North America',
        configuration: 'Cab roof / air ducts / air filter; cab-equipped machines only',
        productionDateRule: 'After 14-Jun-2019',
        catalogDiagram: '50.104.010[01A]',
        confidence: 'secondary/high',
      },
    );

    const officialSourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='New Holland Parts' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`,
    );
    await ensureSourceRecord(
      connection,
      officialSourceId,
      OEM_EXTERNAL_ID,
      OEM_URL,
      'New Holland MyCNH 51586597 inner cab air filter identity',
      {
        role: 'Official OEM part identity corroboration',
        partNumber: PART_NUMBER,
        name: 'Inner Cab Air Filter',
        evidence: 'MyCNH maintenance parts data identifies 51586597 as AIR FILTER; Inner, Cab Air.',
      },
    );

    const configurationNote = 'Cab-equipped Tier 4B North America; production date after 14-Jun-2019';
    const fitmentNote = 'Inner cab air filter for cab-equipped WORKMASTER 55, 65 and 75 Tier 4B tractors. Messick’s lists 51586597 in cab-roof diagram 50.104.010[01A] for production after 14-Jun-2019; MyCNH identifies the part as Inner, Cab Air. Do not apply this cab filter to ROPS-only configurations.';

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
      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
        [machineId, partId, machineVersionId, configurationNote],
      );
      if (!existing[0]) {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
           VALUES (?,?,?,?,?,'high',?)`,
          [machineId, partId, machineVersionId, configurationNote, fitmentNote, fitmentSourceRecordId],
        );
      }
    }
  },
};
