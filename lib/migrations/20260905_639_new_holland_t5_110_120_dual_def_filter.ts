import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const FITMENT_PART = '47657024';
const REPLACEMENT_PART = '91724844';

const FITMENT_URL = 'https://www.newhollandrochester.com/shop/47657024/';
const FITMENT_EXTERNAL_ID = 'new-holland-rochester-47657024-t5-110-120-dual-stagev-na-2026-09';
const OFFICIAL_URL = 'https://www.mycnhstore.com/nz/en/newhollandag/cn/filter-def/p/47657024';
const OFFICIAL_EXTERNAL_ID = 'mycnh-new-holland-47657024-def-100-micron-identity-2026-09';
const REPLACEMENT_URL = 'https://www.messicks.com/parts/new-holland/91724844';
const REPLACEMENT_EXTERNAL_ID = 'messicks-91724844-replaces-47657024-2026-09';
const REPLACEMENT_OFFICIAL_URL = 'https://www.mycnhstore.com/fr/fr/caseih/catgorie/filtres/filtre-carburant/filtre-def/p/91724844';
const REPLACEMENT_OFFICIAL_EXTERNAL_ID = 'mycnh-91724844-def-filter-identity-2026-09';

const models = [
  { slug: 't5-110', model: 'T5.110' },
  { slug: 't5-120', model: 'T5.120' },
] as const;

const configurations = [
  {
    note: 'Dual Command, Cab, Stage V, North America, 06/21-open catalog range',
    catalogLabel: 'DUAL COMMAND TRACTOR - CAB - STAGE V (NA)',
  },
  {
    note: 'Dual Command, L/Cab, Stage V, North America, 06/21-open catalog range',
    catalogLabel: 'DUAL COMMAND TRACTOR - L/CAB - STAGE V (NA)',
  },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5.110/T5.120 Dual Command DEF-filter migration dependency.');
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

export const newHollandT5110120DualDefFilterMigration: DbMigration = {
  id: '20260905_639_new_holland_t5_110_120_dual_def_filter',
  description: 'Add exact T5.110/T5.120 Dual Command Stage V NA DEF filter 47657024 and its documented replacement relation to 91724844',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='def-scr-filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, categoryId, FITMENT_PART, FITMENT_PART, 'DEF Filter - 100 Micron'],
    );
    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, categoryId, REPLACEMENT_PART, REPLACEMENT_PART, 'DEF Tank Line Filter'],
    );

    const fitmentPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, FITMENT_PART],
    );
    const replacementPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, REPLACEMENT_PART],
    );

    const rochesterSourceId = await ensureSource(
      connection,
      'New Holland Rochester',
      'newhollandrochester.com',
      'supplier',
      'secondary',
    );
    const officialSourceId = await ensureSource(
      connection,
      'MyCNH Store',
      'mycnhstore.com',
      'manufacturer',
      'official',
    );
    const messicksSourceId = await ensureSource(
      connection,
      "Messick's",
      'messicks.com',
      'supplier',
      'secondary',
    );

    const fitmentSourceRecordId = await ensureSourceRecord(
      connection,
      rochesterSourceId,
      FITMENT_EXTERNAL_ID,
      FITMENT_URL,
      'New Holland Rochester 47657024 exact T5.110/T5.120 Dual Command Stage V North America fitment',
      {
        role: 'Exact model/transmission/cab/region fitment evidence',
        partNumber: FITMENT_PART,
        supportedModels: models.map((item) => item.model),
        supportedConfigurations: configurations.map((item) => item.catalogLabel),
        evidence: 'The 47657024 application page directly lists T5.110 and T5.120 in both DUAL COMMAND TRACTOR - CAB - STAGE V (NA) and DUAL COMMAND TRACTOR - L/CAB - STAGE V (NA), each beginning 06/21 with an open-ended catalog range.',
        confidence: 'secondary/high',
        guardrail: 'No Electro Command, AutoCommand or Dynamic Command fitment is inferred from this listing. 47657024 is a 100-micron DEF filter and is not equated with the separate 70-micron in-line DEF service filter.',
      },
    );

    await ensureSourceRecord(
      connection,
      officialSourceId,
      OFFICIAL_EXTERNAL_ID,
      OFFICIAL_URL,
      'MyCNH New Holland Agriculture 47657024 DEF Filter - 100 Micron',
      {
        role: 'Official CNH current-part identity and filtration specification',
        partNumber: FITMENT_PART,
        name: 'Diesel Exhaust Fluid Filter',
        filtrationMicrons: 100,
        lengthMm: 214,
        diameterMm: 75,
        function: 'Removes contaminants to support proper SCR-system operation.',
        fitmentScope: 'Official identity/specification only; exact T5.110/T5.120 Dual Command Stage V North American fitment is sourced separately.',
      },
    );

    const replacementSourceRecordId = await ensureSourceRecord(
      connection,
      messicksSourceId,
      REPLACEMENT_EXTERNAL_ID,
      REPLACEMENT_URL,
      'Messick’s 91724844 replacement listing for 47657024',
      {
        role: 'Direct replacement-chain evidence',
        oldPartNumber: FITMENT_PART,
        replacementPartNumber: REPLACEMENT_PART,
        statement: 'Messick’s lists 91724844 as replacing 47657024.',
        guardrail: 'The replacement relation is stored without assigning T5 machine fitment to 91724844. Direct T5 fitment remains attached only to 47657024 until a source explicitly lists 91724844 on the T5.110/T5.120 configuration.',
      },
    );

    await ensureSourceRecord(
      connection,
      officialSourceId,
      REPLACEMENT_OFFICIAL_EXTERNAL_ID,
      REPLACEMENT_OFFICIAL_URL,
      'MyCNH 91724844 DEF filter identity',
      {
        role: 'Official CNH replacement-part identity',
        partNumber: REPLACEMENT_PART,
        name: 'DEF Filter',
        servicePosition: 'DEF tank line',
        fitmentScope: 'Identity/service-position evidence only; no T5 fitment is inferred from this source.',
      },
    );

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [fitmentPartId, replacementPartId, replacementSourceRecordId],
    );

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [model.slug],
      );
      const machineVersionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=TRUE LIMIT 1`,
        [machineId, CURRENT_VERSION],
      );

      for (const configuration of configurations) {
        const fitmentNote = `${FITMENT_PART} DEF Filter - 100 Micron is directly listed for ${model.model} ${configuration.catalogLabel}, beginning 06/21 in the cited North American parts catalog. This is not the 70-micron in-line DEF service filter. 91724844 is recorded separately as a documented replacement number but does not receive inferred machine fitment.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, fitmentPartId, machineVersionId, configuration.note],
        );
        if (existing[0]) {
          await connection.query(
            `UPDATE machine_parts SET fitment_note=?,fitment_confidence='high',source_record_id=? WHERE id=?`,
            [fitmentNote, fitmentSourceRecordId, Number(existing[0].id)],
          );
        } else {
          await connection.query(
            `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
             VALUES (?,?,?,?,?,'high',?)`,
            [machineId, fitmentPartId, machineVersionId, configuration.note, fitmentNote, fitmentSourceRecordId],
          );
        }
      }
    }
  },
};
