import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const CURRENT_PART = '91888390';
const LEGACY_PART = '47897410';
const FITMENT_URL = 'https://www.messicks.com/parts/new-holland/91888390';
const FITMENT_EXTERNAL_ID = 'messicks-t5-130-140-stagev-91888390-oil-cooler-filter-2026-09';
const OFFICIAL_URL = 'https://loja.newhollandag.com.br/category/filtros/filtros-hidrulicos/filtro-oleo-hidraul/p/91888390';
const OFFICIAL_EXTERNAL_ID = 'new-holland-official-91888390-hydraulic-oil-filter-identity-2026-09';

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
  if (!rows[0]) throw new Error('Missing T5.130/T5.140 oil-cooler filter migration dependency.');
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

export const newHollandT5130140OilCoolerFilterMigration: DbMigration = {
  id: '20260903_612_new_holland_t5_130_140_oil_cooler_filter',
  description: 'Add exact T5.130/T5.140 Stage V hydraulic oil-cooler filter 91888390 plus verified 47897410 replacement history',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const hydraulicCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='hydraulic-filters' LIMIT 1`);

    for (const [partNumber, name] of [
      [CURRENT_PART, 'Hydraulic Oil Filter'],
      [LEGACY_PART, 'Hydraulic Oil Filter'],
    ] as const) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, hydraulicCategoryId, partNumber, partNumber, name],
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
      `Messick's New Holland ${CURRENT_PART} T5.130/T5.140 Stage V oil-cooler filter catalog`,
      {
        role: 'Exact model/configuration fitment and replacement evidence',
        currentPartNumber: CURRENT_PART,
        legacyPartNumber: LEGACY_PART,
        replacementStatement: `${CURRENT_PART} replaces ${LEGACY_PART}.`,
        supportedModels: models.map((model) => model.model),
        supportedConfigurations: configurations.map((configuration) => configuration.note),
        evidence: 'Messick\'s lists 91888390 in oil-cooler filter and component paths for T5.130 and T5.140 AutoCommand and Dynamic Command Stage V North American catalogs and states that it replaces 47897410.',
        confidence: 'secondary/high',
        guardrail: 'This migration covers T5.130/T5.140 only. No machine fitment is copied to legacy part 47897410.',
      },
    );

    let [officialRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE domain='loja.newhollandag.com.br' ORDER BY id LIMIT 1`,
    );
    let officialSourceId = officialRows[0]?.id ? Number(officialRows[0].id) : 0;
    if (!officialSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('New Holland Agriculture Parts','loja.newhollandag.com.br','manufacturer','official')`,
      );
      officialSourceId = Number(result.insertId);
    }
    await ensureSourceRecord(
      connection,
      officialSourceId,
      OFFICIAL_EXTERNAL_ID,
      OFFICIAL_URL,
      `New Holland Agriculture ${CURRENT_PART} Hydraulic Oil Filter`,
      {
        role: 'Official OEM part identity corroboration',
        partNumber: CURRENT_PART,
        name: 'Hydraulic Oil Filter',
        fitmentScope: 'Identity only; exact T5 fitment is sourced separately.',
      },
    );

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [legacyPartId, currentPartId, fitmentSourceRecordId],
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
        const configurationNote = `${configuration.note}; oil-cooler circuit`;
        const fitmentNote = `${CURRENT_PART} Hydraulic Oil Filter is listed in the exact ${model.model} ${configuration.key} Stage V North American oil-cooler filter catalog. Confirm transmission/oil-cooler configuration before ordering.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, currentPartId, machineVersionId, configurationNote],
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
            [machineId, currentPartId, machineVersionId, configurationNote, fitmentNote, fitmentSourceRecordId],
          );
        }
      }
    }
  },
};
