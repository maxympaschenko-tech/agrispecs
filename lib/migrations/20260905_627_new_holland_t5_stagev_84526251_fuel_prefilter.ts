import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const PART_NUMBER = '84526251';
const FITMENT_URL = 'https://www.newhollandrochester.com/shop/84526251/';
const FITMENT_EXTERNAL_ID = 'new-holland-rochester-t5-stagev-84526251-fuel-prefilter-2026-09';
const OFFICIAL_URL = 'https://www.mycnhstore.com/eu/pl/newhollandag/cn/fuel-filter/p/84526251';
const OFFICIAL_EXTERNAL_ID = 'mycnh-new-holland-ag-84526251-fuel-prefilter-identity-2026-09';

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
  if (!rows[0]) throw new Error('Missing T5 Stage V 84526251 fuel-prefilter migration dependency.');
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

export const newHollandT5StageV84526251FuelPrefilterMigration: DbMigration = {
  id: '20260905_627_new_holland_t5_stagev_84526251_fuel_prefilter',
  description: 'Add exact T5.110-T5.140 AutoCommand/Dynamic Command Stage V fuel pre-filter 84526251 as a distinct service position',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='fuel-filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, categoryId, PART_NUMBER, PART_NUMBER, 'Fuel Pre-Filter'],
    );
    const partId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, PART_NUMBER],
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
      'New Holland Rochester 84526251 exact T5 Stage V NA/NAFTA fitment',
      {
        role: 'Exact current-part model/transmission/region fitment evidence',
        partNumber: PART_NUMBER,
        supportedModels: models.map((model) => model.model),
        supportedConfigurations: configurations.map((configuration) => configuration.note),
        evidence: 'The 84526251 dealer page directly lists T5.110, T5.120, T5.130 and T5.140 AutoCommand Tractor Stage V (NA), AutoCommand MY21, Dynamic Command Tractor Stage V (NAFTA), and Dynamic Command MY21 families.',
        confidence: 'secondary/high',
        guardrail: '84526251 is modeled as a distinct fuel pre-filter service position. It is not asserted to replace or interchange with 84328562. Dual Command, ElectroCommand and other emissions generations are not inferred.',
      },
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
      'MyCNH New Holland Agriculture 84526251 Fuel Pre-Filter',
      {
        role: 'Official CNH current-part identity and function',
        partNumber: PART_NUMBER,
        name: 'Fuel Pre-Filter',
        description: 'Official MyCNH states that 84526251 traps contaminants and water before they can reach the engine.',
        packageWeightKg: 0.679,
        fitmentScope: 'Official identity/function only; exact T5 AutoCommand/Dynamic Command Stage V North American fitment is sourced separately.',
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
        const fitmentNote = `${PART_NUMBER} Fuel Pre-Filter is listed for the exact ${model.model} ${configuration.key} Stage V North American family. This is a distinct fuel-system service position and is not modeled as an interchange with 84328562; confirm build and filter position before ordering.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, partId, machineVersionId, configuration.note],
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
            [machineId, partId, machineVersionId, configuration.note, fitmentNote, fitmentSourceRecordId],
          );
        }
      }
    }
  },
};
