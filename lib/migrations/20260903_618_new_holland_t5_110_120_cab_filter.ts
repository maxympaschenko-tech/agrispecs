import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const PART_NUMBER = '87726699';
const FITMENT_URL = 'https://www.messicks.com/parts/new-holland/87726699';
const FITMENT_EXTERNAL_ID = 'messicks-t5-110-120-stagev-87726699-cab-filter-2026-09';

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
  if (!rows[0]) throw new Error('Missing T5.110/T5.120 cab-filter migration dependency.');
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

export const newHollandT5110120CabFilterMigration: DbMigration = {
  id: '20260903_618_new_holland_t5_110_120_cab_filter',
  description: 'Add exact T5.110/T5.120 AutoCommand and Dynamic Command Stage V cab-filter 87726699 fitment with roof-profile caveat',
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
      `Messick's New Holland ${PART_NUMBER} T5.110/T5.120 Stage V cab-filter catalog`,
      {
        role: 'Exact model/transmission/cab-roof fitment evidence',
        partNumber: PART_NUMBER,
        supportedModels: models.map((model) => model.model),
        supportedConfigurations: configurations.map((configuration) => `${configuration.key}, ${configuration.catalog}; cab, high- or low-profile roof where cataloged`),
        roofScope: 'cab; high-profile or low-profile roof where listed by the exact catalog',
        evidence: "Messick's lists 87726699 in T5.110 and T5.120 Stage V AutoCommand and Dynamic Command maintenance-filter paths and in both AIR FILTER, HIGH PROFILE ROOF and AIR FILTER, LOW PROFILE ROOF paths where those roof configurations are cataloged. MY21 entries provide additional corroboration.",
        confidence: 'secondary/high',
        guardrail: 'Cab application only. Roof-profile availability must follow the exact machine configuration. Do not infer ROPS, ElectroCommand, other-region or other-emissions-generation fitment.',
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
        const configurationNote = `${configuration.key}, ${configuration.catalog}; cab, high- or low-profile roof where cataloged`;
        const fitmentNote = `${PART_NUMBER} Cab Air Filter is listed in the exact ${model.model} ${configuration.key} Stage V North American cab catalog for high- or low-profile roof configurations where cataloged. Confirm cab roof/HVAC configuration before ordering.`;
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
