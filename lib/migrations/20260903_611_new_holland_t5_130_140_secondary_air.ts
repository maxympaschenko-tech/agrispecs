import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const CURRENT_PART = '87720899';
const LEGACY_PARTS = ['51447248', '87687268'] as const;
const FITMENT_URL = 'https://www.messicks.com/parts/new-holland/87720899';
const FITMENT_EXTERNAL_ID = 'messicks-t5-130-140-stagev-87720899-secondary-air-2026-09';
const OFFICIAL_URL = 'https://www.mycnhstore.com/sa/es/newhollandce/cn/air-filter/p/87720899';
const OFFICIAL_EXTERNAL_ID = 'new-holland-mycnh-87720899-secondary-air-identity-2026-09';
const OFFICIAL_LEGACY_URL = 'https://www.mycnhstore.com/us/en/newhollandag/category/filters/filter-related-parts/air-filter/p/87687268';
const OFFICIAL_LEGACY_EXTERNAL_ID = 'new-holland-mycnh-87687268-air-filter-identity-2026-09';

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
  if (!rows[0]) throw new Error('Missing T5.130/T5.140 secondary-air migration dependency.');
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

export const newHollandT5130140SecondaryAirMigration: DbMigration = {
  id: '20260903_611_new_holland_t5_130_140_secondary_air',
  description: 'Add exact T5.130/T5.140 Stage V secondary engine-air filter 87720899 plus verified 51447248/87687268 replacement history',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const airCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='air-filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, airCategoryId, CURRENT_PART, CURRENT_PART, 'Secondary Engine Air Filter'],
    );
    for (const legacyPart of LEGACY_PARTS) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, airCategoryId, legacyPart, legacyPart, 'Air Filter'],
      );
    }

    const currentPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, CURRENT_PART],
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
      `Messick's New Holland ${CURRENT_PART} T5.130/T5.140 Stage V air-filter catalog`,
      {
        role: 'Exact model/configuration fitment and replacement evidence',
        partNumber: CURRENT_PART,
        supportedModels: models.map((model) => model.model),
        supportedConfigurations: configurations.map((configuration) => configuration.note),
        evidence: 'Messick\'s lists 87720899 in maintenance and air-cleaner component paths for T5.130 and T5.140 AutoCommand and Dynamic Command Stage V North American catalogs. The same part page states that 87720899 replaces 51447248 and 87687268.',
        replacementPredecessors: [...LEGACY_PARTS],
        confidence: 'secondary/high',
        guardrail: 'No fitment is copied to the legacy numbers. No T5.110/T5.120 application is inferred by this migration.',
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
      `New Holland MyCNH ${CURRENT_PART} Secondary Engine Air Filter`,
      {
        role: 'Official OEM part identity corroboration',
        partNumber: CURRENT_PART,
        name: 'Secondary Engine Air Filter',
        fitmentScope: 'Identity only; exact T5 fitment is sourced separately.',
      },
    );
    await ensureSourceRecord(
      connection,
      officialSourceId,
      OFFICIAL_LEGACY_EXTERNAL_ID,
      OFFICIAL_LEGACY_URL,
      'New Holland MyCNH 87687268 Air Filter',
      {
        role: 'Official OEM legacy-part identity corroboration',
        partNumber: '87687268',
        name: 'Air Filter',
        fitmentScope: 'Identity only; no machine fitment is asserted for this legacy number.',
      },
    );

    for (const legacyPart of LEGACY_PARTS) {
      const legacyPartId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, legacyPart],
      );
      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'replaces',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [legacyPartId, currentPartId, fitmentSourceRecordId],
      );
    }

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
        const fitmentNote = `${CURRENT_PART} Secondary Engine Air Filter is listed in the exact ${model.model} ${configuration.key} Stage V North American maintenance/air-cleaner catalog. Confirm engine air-cleaner configuration before ordering.`;
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
