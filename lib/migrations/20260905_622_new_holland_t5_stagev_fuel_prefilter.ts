import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const CURRENT_PART = '84328562';
const LEGACY_PART = '87592298';
const ROCHESTER_URL = 'https://www.newhollandrochester.com/shop/84328562/';
const ROCHESTER_EXTERNAL_ID = 'new-holland-rochester-t5-stagev-84328562-replaces-87592298-2026-09';
const OFFICIAL_URL = 'https://www.mycnhstore.com/es/es/newhollandag/categora/filtros/filtro-de-combustible/filtro-de-combustible/p/84328562';
const OFFICIAL_EXTERNAL_ID = 'mycnh-84328562-fuel-prefilter-identity-2026-09';

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
  if (!rows[0]) throw new Error('Missing T5 Stage V fuel-prefilter migration dependency.');
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

export const newHollandT5StageVFuelPrefilterMigration: DbMigration = {
  id: '20260905_622_new_holland_t5_stagev_fuel_prefilter',
  description: 'Add current T5.110-T5.140 AutoCommand/Dynamic Command Stage V fuel pre-filter 84328562 and verified 87592298 supersession',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='fuel-filters' LIMIT 1`);

    for (const [partNumber, name] of [
      [CURRENT_PART, 'Fuel Pre-Filter'],
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
      ROCHESTER_EXTERNAL_ID,
      ROCHESTER_URL,
      'New Holland Rochester 84328562 T5 Stage V fitment and 87592298 supersession',
      {
        role: 'Exact model/transmission fitment plus verified supersession evidence',
        currentPartNumber: CURRENT_PART,
        legacyPartNumber: LEGACY_PART,
        replacementStatement: '84328562 replaces 87592298.',
        supportedModels: models.map((model) => model.model),
        supportedConfigurations: configurations.map((configuration) => configuration.note),
        evidence: 'New Holland Rochester lists 84328562 for T5.110, T5.120, T5.130 and T5.140 Dynamic Command Stage V NAFTA and AutoCommand Stage V North America, including MY21 entries that corroborate continuity. The same dealer page explicitly states that 84328562 replaces 87592298.',
        confidence: 'secondary/high',
        guardrail: 'Only current part 84328562 receives machine fitment. Legacy 87592298 remains a superseded part and is not shown as the preferred current fitment. ElectroCommand and other T5 transmission families are not inferred by this migration.',
      },
    );

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [legacyPartId, currentPartId, fitmentSourceRecordId],
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
      'MyCNH 84328562 Fuel Pre-Filter',
      {
        role: 'Official CNH part identity and function corroboration',
        partNumber: CURRENT_PART,
        name: 'Fuel Pre-Filter',
        description: 'MyCNH identifies 84328562 as a fuel pre-filter that traps contaminants and water before they can reach the engine.',
        nominalDimensionsMm: { length: 50, height: 111, width: 46 },
        packageDimensionsMm: { length: 44, width: 44, height: 114 },
        fitmentScope: 'Official identity/function only; exact New Holland T5 AutoCommand/Dynamic Command Stage V fitment is sourced separately.',
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
        const fitmentNote = `${CURRENT_PART} Fuel Pre-Filter is listed for the exact ${model.model} ${configuration.key} Stage V North American tractor family. It supersedes legacy filter assembly ${LEGACY_PART}; confirm transmission/build configuration before ordering.`;
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
