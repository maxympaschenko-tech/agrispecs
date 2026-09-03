import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const PART_NUMBER = '92264209';
const FITMENT_URL = 'https://www.messicks.com/parts/new-holland/92264209';
const FITMENT_EXTERNAL_ID = 'messicks-t5-110-120-stagev-92264209-low-roof-cab-filter-2026-09';

const models = [
  { slug: 't5-110', model: 'T5.110' },
  { slug: 't5-120', model: 'T5.120' },
] as const;

const configurations = [
  { key: 'AutoCommand', catalog: 'Stage V, North America, 06/19-present catalog family' },
  { key: 'Dynamic Command', catalog: 'Stage V, NAFTA, 04/20-present catalog family' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5.110/T5.120 low-roof cab-filter migration dependency.');
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

export const newHollandT5110120LowRoofCabFilterMigration: DbMigration = {
  id: '20260903_617_new_holland_t5_110_120_low_roof_cab_filter',
  description: 'Add exact T5.110/T5.120 AutoCommand and Dynamic Command Stage V low-profile-roof cab-filter 92264209 fitment',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const partId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, PART_NUMBER],
    );

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name="Messick's" AND domain='messicks.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ("Messick's",'messicks.com','supplier','secondary')`,
      );
      sourceId = Number(result.insertId);
    }

    const sourceRecordId = await ensureSourceRecord(
      connection,
      sourceId,
      FITMENT_EXTERNAL_ID,
      FITMENT_URL,
      `Messick's New Holland ${PART_NUMBER} T5.110/T5.120 Stage V low-profile-roof cab-filter catalog`,
      {
        role: 'Exact model/transmission/cab-roof fitment evidence',
        partNumber: PART_NUMBER,
        supportedModels: models.map((model) => model.model),
        supportedConfigurations: configurations.map((configuration) => `${configuration.key}, ${configuration.catalog}; cab, low-profile roof`),
        roofScope: 'cab; low-profile roof only',
        evidence: "Messick's lists 92264209 in the exact T5.110 and T5.120 AutoCommand and Dynamic Command Stage V North American maintenance-parts/filter and AIR FILTER, LOW PROFILE ROOF catalog paths. MY21 AutoCommand entries further corroborate the applications.",
        confidence: 'secondary/high',
        guardrail: 'Low-profile-roof cab application only. Do not infer high-profile-roof, ROPS, ElectroCommand, other-region or other-emissions-generation fitment.',
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
        const configurationNote = `${configuration.key}, ${configuration.catalog}; cab, low-profile roof`;
        const fitmentNote = `${PART_NUMBER} Cab Air Filter is listed in the exact ${model.model} ${configuration.key} Stage V North American cab catalog for the low-profile roof. Confirm cab roof/HVAC configuration before ordering.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, partId, machineVersionId, configurationNote],
        );
        if (existing[0]) {
          await connection.query(
            `UPDATE machine_parts SET fitment_note=?,fitment_confidence='high',source_record_id=? WHERE id=?`,
            [fitmentNote, sourceRecordId, Number(existing[0].id)],
          );
        } else {
          await connection.query(
            `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
             VALUES (?,?,?,?,?,'high',?)`,
            [machineId, partId, machineVersionId, configurationNote, fitmentNote, sourceRecordId],
          );
        }
      }
    }
  },
};
