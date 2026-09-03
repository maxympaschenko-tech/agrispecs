import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const PART_NUMBER = '51447239';
const FITMENT_URL = 'https://www.messicks.com/parts/new-holland/51447239';
const FITMENT_EXTERNAL_ID = 'messicks-t5-130-140-stagev-51447239-primary-air-2026-09';
const OFFICIAL_URL = 'https://www.mycnhstore.com/it/it/newhollandag/categoria/filtri/filtro-aria-motore/filtro-aria/p/51447239';
const OFFICIAL_EXTERNAL_ID = 'new-holland-mycnh-51447239-primary-engine-air-identity-2026-09';

const models = [
  { slug: 't5-130', model: 'T5.130' },
  { slug: 't5-140', model: 'T5.140' },
] as const;

const configurations = [
  { key: 'AutoCommand', note: 'AutoCommand, Stage V, North America, 06/19-present catalog family' },
  { key: 'Dynamic Command', note: 'Dynamic Command, Stage V, NAFTA, 04/20-present catalog family' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5.130/T5.140 primary-air migration dependency.');
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

export const newHollandT5130140PrimaryAirMigration: DbMigration = {
  id: '20260903_613_new_holland_t5_130_140_primary_air',
  description: 'Add exact T5.130/T5.140 Stage V primary engine-air filter 51447239 fitment with official OEM identity provenance',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='air-filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, categoryId, PART_NUMBER, PART_NUMBER, 'Primary Engine Air Filter'],
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
      `Messick's New Holland ${PART_NUMBER} T5.130/T5.140 Stage V primary-air catalog`,
      {
        role: 'Exact model/configuration fitment evidence',
        partNumber: PART_NUMBER,
        supportedModels: models.map((model) => model.model),
        supportedConfigurations: configurations.map((configuration) => configuration.note),
        evidence: "Messick's lists 51447239 in maintenance-parts/filter and air-cleaner component paths for T5.130 and T5.140 AutoCommand and Dynamic Command Stage V North American catalogs, with MY21/MY23 catalog variants also visible for these model families.",
        confidence: 'secondary/high',
        guardrail: 'This migration intentionally adds only the verified T5.130/T5.140 AutoCommand and Dynamic Command Stage V families. It does not infer other T5 models, transmissions, regions, or emissions generations.',
      },
    );

    const officialSourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='New Holland Parts' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`,
    );
    await ensureSourceRecord(
      connection,
      officialSourceId,
      OFFICIAL_EXTERNAL_ID,
      OFFICIAL_URL,
      'New Holland MyCNH 51447239 Primary Engine Air Filter',
      {
        role: 'Official OEM part identity and function corroboration',
        partNumber: PART_NUMBER,
        name: 'Primary Engine Air Filter',
        nominalElementDimensionsMm: { length: 348, height: 213, width: 140 },
        function: 'Protects the engine air intake from dust, dirt and other particles.',
        fitmentScope: 'Official identity/function only; exact T5.130/T5.140 configuration fitment is sourced separately.',
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
        const configurationNote = configuration.note;
        const fitmentNote = `${PART_NUMBER} Primary Engine Air Filter is listed in the exact ${model.model} ${configuration.key} Stage V North American maintenance and air-cleaner catalogs. Confirm the air-cleaner configuration before ordering.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, partId, machineVersionId, configurationNote],
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
            [machineId, partId, machineVersionId, configurationNote, fitmentNote, fitmentSourceRecordId],
          );
        }
      }
    }
  },
};
