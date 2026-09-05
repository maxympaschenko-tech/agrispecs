import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const LEGACY_FITMENT_PART = '84363730';
const LEGACY_RELATION_ONLY_PART = '47661360';
const CURRENT_PART = '47657024';

const LEGACY_URL = 'https://www.newhollandrochester.com/shop/84363730/';
const LEGACY_EXTERNAL_ID = 'new-holland-rochester-84363730-t5-110-120-dual-stagev-na-2026-09';
const CURRENT_URL = 'https://www.newhollandrochester.com/shop/47657024/';
const CURRENT_EXTERNAL_ID = 'new-holland-rochester-47657024-replaces-84363730-47661360-2026-09';
const OFFICIAL_URL = 'https://www.mycnhstore.com/us/en/newhollandag/na/tractors/agricultural/naba01agr735t7xxxautocommandstagev/auto-command-plm-intelligence-stage-v-my22-bas1/service-maintenance/maintenance-parts-filters/cn/ABC4086699/ABC3305974';
const OFFICIAL_EXTERNAL_ID = 'mycnh-84363730-def-100-micron-identity-2026-09';

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
  if (!rows[0]) throw new Error('Missing T5 Dual Command DEF legacy-chain migration dependency.');
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

export const newHollandT5DualDefLegacyMigration: DbMigration = {
  id: '20260905_642_new_holland_t5_dual_def_legacy',
  description: 'Add source-backed T5.110/T5.120 Dual Command legacy DEF filter 84363730 and predecessor relations into 47657024',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='def-scr-filters' LIMIT 1`);
    const currentPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, CURRENT_PART],
    );

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, categoryId, LEGACY_FITMENT_PART, LEGACY_FITMENT_PART, 'DEF Tank Filler Filter / Strainer - 100 Micron'],
    );
    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, categoryId, LEGACY_RELATION_ONLY_PART, LEGACY_RELATION_ONLY_PART, 'DEF Tank Filter - Legacy Number'],
    );

    const legacyFitmentPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, LEGACY_FITMENT_PART],
    );
    const legacyRelationOnlyPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, LEGACY_RELATION_ONLY_PART],
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

    const legacySourceRecordId = await ensureSourceRecord(
      connection,
      rochesterSourceId,
      LEGACY_EXTERNAL_ID,
      LEGACY_URL,
      'New Holland Rochester 84363730 T5.110/T5.120 Dual Command Stage V North America fitment and replacement',
      {
        role: 'Exact legacy-part model/transmission/cab/region fitment plus replacement evidence',
        partNumber: LEGACY_FITMENT_PART,
        replacementPartNumber: CURRENT_PART,
        supportedModels: models.map((item) => item.model),
        supportedConfigurations: configurations.map((item) => item.catalogLabel),
        evidence: 'The 84363730 page states Replaced By: 47657024 and directly lists T5.110/T5.120 for both Dual Command Tractor - Cab - Stage V (NA) and Dual Command Tractor - L/Cab - Stage V (NA), beginning 06/21.',
        confidence: 'secondary/high',
        guardrail: '84363730 receives machine fitment only because its own part page directly lists the T5 configurations. Its replacement status is retained in the fitment note so it is not presented as the preferred current order number.',
      },
    );

    const replacementSourceRecordId = await ensureSourceRecord(
      connection,
      rochesterSourceId,
      CURRENT_EXTERNAL_ID,
      CURRENT_URL,
      'New Holland Rochester 47657024 DEF-filter predecessor listing',
      {
        role: 'Replacement-chain evidence',
        currentPartNumber: CURRENT_PART,
        predecessorPartNumbers: [LEGACY_FITMENT_PART, LEGACY_RELATION_ONLY_PART],
        statement: '47657024 directly states that it replaces 84363730 and 47661360.',
        guardrail: '47661360 receives no T5 machine fitment because the available evidence establishes the replacement relation but not a direct T5.110/T5.120 model application for that legacy number.',
      },
    );

    await ensureSourceRecord(
      connection,
      officialSourceId,
      OFFICIAL_EXTERNAL_ID,
      OFFICIAL_URL,
      'MyCNH 84363730 DEF Filter - 100 Micron identity',
      {
        role: 'Official CNH part identity/service-role evidence',
        partNumber: LEGACY_FITMENT_PART,
        name: 'DEF Filter',
        filtrationMicrons: 100,
        servicePosition: 'DEF/AdBlue tank filler filter',
        fitmentScope: 'Identity/service-position only; exact T5 Dual Command North America fitment is sourced from the separate New Holland Rochester application page.',
      },
    );

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [legacyFitmentPartId, currentPartId, replacementSourceRecordId],
    );
    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [legacyRelationOnlyPartId, currentPartId, replacementSourceRecordId],
    );

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [model.slug],
      );
      const currentVersionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=TRUE LIMIT 1`,
        [machineId, CURRENT_VERSION],
      );

      for (const configuration of configurations) {
        const fitmentNote = `${LEGACY_FITMENT_PART} is directly listed for ${model.model} ${configuration.catalogLabel}, beginning 06/21, but the same source marks this number as replaced by ${CURRENT_PART}. Use the replacement chain before ordering; this row preserves source-backed historical/legacy fitment rather than asserting ${LEGACY_FITMENT_PART} as the preferred current service number.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, legacyFitmentPartId, currentVersionId, configuration.note],
        );
        if (existing[0]) {
          await connection.query(
            `UPDATE machine_parts SET fitment_note=?,fitment_confidence='high',source_record_id=? WHERE id=?`,
            [fitmentNote, legacySourceRecordId, Number(existing[0].id)],
          );
        } else {
          await connection.query(
            `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
             VALUES (?,?,?,?,?,'high',?)`,
            [machineId, legacyFitmentPartId, currentVersionId, configuration.note, fitmentNote, legacySourceRecordId],
          );
        }
      }
    }
  },
};
