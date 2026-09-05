import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const CURRENT_PART = '84412164';
const LEGACY_PART = '5802064399';
const FITMENT_URL = 'https://www.newhollandrochester.com/shop/84412164/';
const FITMENT_EXTERNAL_ID = 'new-holland-rochester-t5-stagev-84412164-secondary-fuel-filter-2026-09';
const SUPERSESSION_URL = 'https://messicks.com/parts/new-holland/5802064399';
const SUPERSESSION_EXTERNAL_ID = 'messicks-5802064399-replaced-by-84412164-2026-09';
const OFFICIAL_URL = 'https://www.mycnhstore.com/us/en/newhollandag/category/filters/fuel-filters/fuel-filter/p/84412164';
const OFFICIAL_EXTERNAL_ID = 'mycnh-new-holland-ag-84412164-fuel-filter-identity-2026-09';

const models = [
  { slug: 't5-110', model: 'T5.110' },
  { slug: 't5-120', model: 'T5.120' },
  { slug: 't5-130', model: 'T5.130' },
  { slug: 't5-140', model: 'T5.140' },
] as const;

const configurations = [
  { key: 'AutoCommand', note: 'AutoCommand, Stage V, North America, 06/19-present catalog family' },
  { key: 'Dynamic Command', note: 'Dynamic Command, Stage V, NAFTA, 04/20-present catalog family' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5 Stage V 84412164 secondary-fuel-filter migration dependency.');
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

export const newHollandT5StageV84412164SecondaryFuelFilterMigration: DbMigration = {
  id: '20260905_626_new_holland_t5_stagev_84412164_secondary_fuel_filter',
  description: 'Add exact T5.110-T5.140 AutoCommand/Dynamic Command Stage V secondary fuel filter 84412164 plus direct 5802064399 supersession',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='fuel-filters' LIMIT 1`);

    for (const [partNumber, name] of [
      [CURRENT_PART, 'Secondary Fuel Filter'],
      [LEGACY_PART, 'Fuel Filter'],
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

    let [rochesterRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='New Holland Rochester' AND domain='newhollandrochester.com' ORDER BY id LIMIT 1`,
    );
    let rochesterSourceId = rochesterRows[0]?.id ? Number(rochesterRows[0].id) : 0;
    if (!rochesterSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('New Holland Rochester','newhollandrochester.com','supplier','secondary')`,
      );
      rochesterSourceId = Number(result.insertId);
    }

    const fitmentSourceRecordId = await ensureSourceRecord(
      connection,
      rochesterSourceId,
      FITMENT_EXTERNAL_ID,
      FITMENT_URL,
      'New Holland Rochester 84412164 secondary fuel filter exact T5 Stage V NA/NAFTA fitment',
      {
        role: 'Exact current-part model/transmission/region fitment evidence',
        partNumber: CURRENT_PART,
        name: 'Secondary Fuel Filter',
        specifications: { outsideDiameterMm: 94, lengthMm: 192, thread: 'M20 x 1.5', filtrationMicrons: 10, type: 'spin-on' },
        supportedModels: models.map((model) => model.model),
        supportedConfigurations: configurations.map((configuration) => configuration.note),
        evidence: 'The New Holland Rochester page for 84412164 explicitly lists T5.110, T5.120, T5.130 and T5.140 AutoCommand Tractor Stage V (NA), AutoCommand MY21, Dynamic Command Tractor Stage V (NAFTA), and Dynamic Command MY21 families.',
        confidence: 'secondary/high',
        guardrail: 'Only the exact AutoCommand and Dynamic Command Stage V North American families are inserted. Other models and transmissions shown elsewhere on the dealer page are not inferred by this migration.',
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
        role: 'Verified direct supersession evidence',
        legacyPartNumber: LEGACY_PART,
        currentPartNumber: CURRENT_PART,
        replacementStatement: `${LEGACY_PART} has been replaced by ${CURRENT_PART}.`,
        guardrail: 'Only the T5 MY23-relevant direct predecessor 5802064399 is added here. The broader historical predecessor list for 84412164 remains available for separate staged enrichment.',
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
      'MyCNH New Holland Agriculture 84412164 Fuel Filter',
      {
        role: 'Official CNH current-part identity and specifications',
        partNumber: CURRENT_PART,
        name: 'Fuel Filter',
        nominalDimensionsMm: { outsideDiameter: 94, length: 192 },
        thread: 'M20 x 1.5',
        packageWeightKg: 0.789,
        function: 'Protects the injection system from water, soot and other fuel contaminants.',
        fitmentScope: 'Official identity/specification only; exact T5 AutoCommand/Dynamic Command Stage V North American fitment is sourced separately.',
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
        const fitmentNote = `${CURRENT_PART} Secondary Fuel Filter is listed for the exact ${model.model} ${configuration.key} Stage V North American family. Confirm transmission/build and fuel-filter position before ordering.`;
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
