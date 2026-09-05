import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type Configuration = {
  key: 'AutoCommand' | 'Dynamic Command';
  note: string;
};

const CURRENT_VERSION = 'united-states-current-2026-08';
const CURRENT_PART = '5802064392';
const LEGACY_PART = '47602665';
const FITMENT_URL = 'https://www.messicks.com/parts/new-holland/5802064392';
const FITMENT_EXTERNAL_ID = 'messicks-t5-130-140-my23-5802064392-fuel-filter-2026-09';
const OFFICIAL_URL = 'https://www.mycnhstore.com/eu/es/newhollandag/cn/fuel-filter/p/5802064392';
const OFFICIAL_EXTERNAL_ID = 'mycnh-new-holland-ag-5802064392-fuel-filter-identity-2026-09';
const SUPERSESSION_URL = 'https://www.messicks.com/parts/new-holland/47602665';
const SUPERSESSION_EXTERNAL_ID = 'messicks-47602665-replaced-by-5802064392-2026-09';

const models = [
  { slug: 't5-130', model: 'T5.130' },
  { slug: 't5-140', model: 'T5.140' },
] as const;

const configurations: Configuration[] = [
  { key: 'AutoCommand', note: 'AutoCommand, Stage V, NAFTA, MY23 (02/23) catalog family' },
  { key: 'Dynamic Command', note: 'Dynamic Command, Stage V, NAFTA, MY23 (02/23) catalog family' },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5.130/T5.140 MY23 fuel-filter migration dependency.');
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

export const newHollandT5130140My23FuelFilterMigration: DbMigration = {
  id: '20260905_624_new_holland_t5_130_140_my23_fuel_filter',
  description: 'Add exact T5.130/T5.140 AutoCommand and Dynamic Command Stage V MY23 fuel filter 5802064392 plus direct 47602665 supersession',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='fuel-filters' LIMIT 1`);

    for (const [partNumber, name] of [
      [CURRENT_PART, 'Fuel Filter'],
      [LEGACY_PART, 'Fuel Filter Assembly'],
    ] as const) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, partNumber, partNumber, name],
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
      `Messick's ${CURRENT_PART} T5.130/T5.140 MY23 fuel-filter catalog`,
      {
        role: 'Exact current-part model/transmission/model-year fitment evidence',
        partNumber: CURRENT_PART,
        supportedModels: models.map((model) => model.model),
        supportedConfigurations: configurations.map((configuration) => configuration.note),
        evidence: 'Messick\'s lists 5802064392 in 10.206.010 FUEL FILTER for T5.130 and T5.140 AutoCommand Tractor Stage V NAFTA MY23 02/23 and Dynamic Command Tractor Stage V NAFTA MY23 02/23.',
        confidence: 'secondary/high',
        guardrail: 'This is an MY23 fuel-filter position. It is not treated as a replacement for 92129321 or 84328562, and no T5.110/T5.120 or non-MY23 fitment is inferred.',
      },
    );

    const supersessionSourceRecordId = await ensureSourceRecord(
      connection,
      messicksSourceId,
      SUPERSESSION_EXTERNAL_ID,
      SUPERSESSION_URL,
      `Messick's ${LEGACY_PART} replaced by ${CURRENT_PART}`,
      {
        role: 'Verified direct supersession evidence',
        legacyPartNumber: LEGACY_PART,
        currentPartNumber: CURRENT_PART,
        replacementStatement: `${LEGACY_PART} has been replaced by ${CURRENT_PART}.`,
        guardrail: 'Only this direct predecessor is added here. Earlier historical numbers visible on the dealer page are left for separate verification.',
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
      'MyCNH New Holland Agriculture 5802064392 Fuel Filter',
      {
        role: 'Official CNH current-part identity and package specifications',
        partNumber: CURRENT_PART,
        name: 'Fuel Filter',
        packageWeightKg: 3.41,
        packageDimensionsMm: { length: 343, width: 288, height: 152 },
        fitmentScope: 'Official identity/specification only; exact T5.130/T5.140 MY23 fitment is sourced separately.',
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

      for (const configuration of configurations) {
        const fitmentNote = `${CURRENT_PART} Fuel Filter is listed in the exact ${model.model} ${configuration.key} Stage V NAFTA MY23 02/23 fuel-filter catalog. Treat this as an MY23/configuration-specific fuel-filter position; confirm build and service position before ordering.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, currentPartId, machineVersionId, configuration.note],
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
            [machineId, currentPartId, machineVersionId, configuration.note, fitmentNote, fitmentSourceRecordId],
          );
        }
      }
    }
  },
};
