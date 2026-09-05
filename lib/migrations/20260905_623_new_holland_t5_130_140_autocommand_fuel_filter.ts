import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const CURRENT_PART = '92129321';
const LEGACY_PART = '5802726986';
const CONFIGURATION = 'AutoCommand, Stage V, North America, 06/19-present catalog family';
const FITMENT_URL = 'https://zemesukiodalys.lt/90399-case-ih-maxxum-125-cvxdrive-stage-v-92129321-kuro-filtras.html';
const FITMENT_EXTERNAL_ID = 'zemesukiodalys-t5-130-140-autocommand-stagev-92129321-2026-09';
const SUPERSESSION_URL = 'https://www.messicks.com/parts/new-holland/5802726986';
const SUPERSESSION_EXTERNAL_ID = 'messicks-5802726986-replaced-by-92129321-2026-09';
const OFFICIAL_URL = 'https://www.mycnhstore.com/ie/en/newhollandag/category/filters/fuel-filter/fuel-filter/p/92129321';
const OFFICIAL_EXTERNAL_ID = 'mycnh-new-holland-ag-92129321-fuel-filter-identity-2026-09';

const models = [
  { slug: 't5-130', model: 'T5.130' },
  { slug: 't5-140', model: 'T5.140' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5.130/T5.140 AutoCommand fuel-filter migration dependency.');
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

export const newHollandT5130140AutoCommandFuelFilterMigration: DbMigration = {
  id: '20260905_623_new_holland_t5_130_140_autocommand_fuel_filter',
  description: 'Add current T5.130/T5.140 AutoCommand Stage V fuel filter 92129321 plus verified 5802726986 supersession',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='fuel-filters' LIMIT 1`);

    for (const partNumber of [CURRENT_PART, LEGACY_PART] as const) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, partNumber, partNumber, 'Fuel Filter'],
      );
    }

    const currentPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, CURRENT_PART],
    );
    const legacyPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, LEGACY_PART],
    );

    let [fitmentRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Zemes Ukio Dalys' AND domain='zemesukiodalys.lt' ORDER BY id LIMIT 1`,
    );
    let fitmentSourceId = fitmentRows[0]?.id ? Number(fitmentRows[0].id) : 0;
    if (!fitmentSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Zemes Ukio Dalys','zemesukiodalys.lt','supplier','secondary')`,
      );
      fitmentSourceId = Number(result.insertId);
    }

    const fitmentSourceRecordId = await ensureSourceRecord(
      connection,
      fitmentSourceId,
      FITMENT_EXTERNAL_ID,
      FITMENT_URL,
      '92129321 T5.130/T5.140 AutoCommand Stage V fitment listing',
      {
        role: 'Exact current-part model/transmission fitment evidence',
        currentPartNumber: CURRENT_PART,
        supportedModels: models.map((model) => model.model),
        configuration: CONFIGURATION,
        evidence: 'The application listing explicitly names New Holland Series T5 Auto Command Stage V, T5.130 (6/19-) and T5.140 (6/19-) for fuel filter 92129321.',
        corroboration: 'Agro-Forestale independently lists CNH AF-92129321 / AF-5802726986 for New Holland T5 Auto Command Stage V T5.130 and T5.140.',
        confidence: 'secondary/high',
        guardrail: 'No T5.110/T5.120 or Dynamic Command fitment is inferred. Those configurations require their own exact current-part evidence.',
      },
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

    const supersessionSourceRecordId = await ensureSourceRecord(
      connection,
      messicksSourceId,
      SUPERSESSION_EXTERNAL_ID,
      SUPERSESSION_URL,
      `Messick's ${LEGACY_PART} replaced by ${CURRENT_PART}`,
      {
        role: 'Verified supersession evidence',
        legacyPartNumber: LEGACY_PART,
        currentPartNumber: CURRENT_PART,
        replacementStatement: `${LEGACY_PART} has been replaced by ${CURRENT_PART}.`,
        description: 'Messick\'s describes the legacy filter as a fuel filter with water drain designed to catch contaminants or water before the engine.',
        guardrail: 'Only the direct 5802726986 to 92129321 relationship is added here; other historical predecessors visible on the dealer page are left for separate verification.',
      },
    );

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [legacyPartId, currentPartId, supersessionSourceRecordId],
    );

    let [officialRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='MyCNH Store' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`,
    );
    let officialSourceId = officialRows[0]?.id ? Number(officialRows[0].id) : 0;
    if (!officialSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('MyCNH Store','mycnhstore.com','manufacturer','official')`,
      );
      officialSourceId = Number(result.insertId);
    }

    await ensureSourceRecord(
      connection,
      officialSourceId,
      OFFICIAL_EXTERNAL_ID,
      OFFICIAL_URL,
      'MyCNH New Holland Agriculture 92129321 Fuel Filter',
      {
        role: 'Official CNH current-part identity and package specifications',
        partNumber: CURRENT_PART,
        name: 'Fuel Filter',
        packageWeightKg: 0.893,
        packageDimensionsMm: { length: 200, width: 100, height: 100 },
        fitmentScope: 'Official identity/specification only; exact T5.130/T5.140 AutoCommand Stage V fitment is sourced separately.',
      },
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
      const fitmentNote = `${CURRENT_PART} Fuel Filter is listed for the exact ${model.model} AutoCommand Stage V North American family from 06/19. It supersedes ${LEGACY_PART}; confirm transmission/build and fuel-filter position before ordering.`;
      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
        [machineId, currentPartId, machineVersionId, CONFIGURATION],
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
          [machineId, currentPartId, machineVersionId, CONFIGURATION, fitmentNote, fitmentSourceRecordId],
        );
      }
    }
  },
};
