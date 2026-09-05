import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const PART_NUMBER = '5802776000';
const VERSION_SLUG = 'stage-v-2020-market-unspecified';
const models = [
  { slug: 't6-145', model: 'T6.145' },
  { slug: 't6-155', model: 'T6.155' },
  { slug: 't6-160', model: 'T6.160' },
  { slug: 't6-175', model: 'T6.175' },
  { slug: 't6-180', model: 'T6.180' },
] as const;
const configurations = ['AutoCommand', 'Dynamic Command', 'Electro Command'] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T6 Stage V DEF-module-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSource(
  connection: Parameters<DbMigration['apply']>[0],
  name: string,
  domain: string,
  sourceType: 'manufacturer' | 'supplier',
  authorityLevel: 'official' | 'secondary',
) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name=? AND domain=? ORDER BY id LIMIT 1`, [name, domain]);
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?,?,?,?)`,
    [name, domain, sourceType, authorityLevel],
  );
  return Number(result.insertId);
}

async function ensureRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  rawReference: unknown,
) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [externalId]);
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

export const newHollandT6StageVDefModuleFilterMigration: DbMigration = {
  id: '20260905_651_new_holland_t6_stagev_def_module_filter',
  description: 'Add T6 Stage V DEF module filter 5802776000 with corrected official role and market-unspecified fitment',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='def-scr-filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, categoryId, PART_NUMBER, PART_NUMBER, 'DEF Module Filter'],
    );
    const partId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, PART_NUMBER]);

    const officialSourceId = await ensureSource(connection, 'MyCNH Store', 'mycnhstore.com', 'manufacturer', 'official');
    await ensureRecord(
      connection,
      officialSourceId,
      'mycnh-5802776000-def-module-filter-identity-2026-09',
      'https://www.mycnhstore.com/us/en/caseih/na/crop-production-equipment/sprayers/naab80spr031patriot/sprayer-tier-4b/service-maintenance/filters/cn/ABC3651099/F13351E1-D156-446F-91DA-0BD5288E3B18',
      'MyCNH 5802776000 DEF Module filter identity',
      {
        role: 'Official CNH service-position identity',
        partNumber: PART_NUMBER,
        identity: 'FILTER; DEF Module',
        correction: 'Some dealer service lists place this number under a hydraulics heading. Official MyCNH identifies the part as a DEF module filter, so it must not be categorized as a hydraulic filter.',
        guardrail: 'This official record establishes role only; T6 Stage V fitment is sourced separately.',
      },
    );

    const fitmentSourceId = await ensureSource(connection, 'Okonomi-deler', 'okonomi-deler.no', 'supplier', 'secondary');
    const fitmentRecordId = await ensureRecord(
      connection,
      fitmentSourceId,
      'okonomi-deler-5802776000-t6-stagev-fitment-2026-09',
      'https://www.okonomi-deler.no/reservedeler/traktordeler/deutz/agrotron-6165/adblue-filter-fg-5802776000',
      'Okonomi-deler 5802776000 T6 Stage V AdBlue filter application list',
      {
        role: 'Exact Stage V model/transmission fitment evidence',
        partNumber: PART_NUMBER,
        models: models.map((model) => model.model),
        configurations: [...configurations],
        evidence: 'The application list explicitly includes T6.145, T6.155, T6.160, T6.175 and T6.180 Stage V Auto Command, Dynamic Command and Electro Command families.',
        guardrail: 'Market is not stated. Fitment is therefore stored in the existing non-current Stage V market-unspecified version. No relation to the manual’s 100-micron suction filter or 10-micron main DEF filter is asserted.',
      },
    );

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [model.slug],
      );
      const versionId = await selectId(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION_SLUG]);

      for (const configuration of configurations) {
        const configurationNote = `${configuration}, Stage V, catalog family from 07/20, market not specified`;
        const fitmentNote = `${PART_NUMBER} DEF Module Filter is directly listed for ${model.model} ${configuration} Stage V in the cited application list. Official CNH identifies the part as a DEF-module filter. It is not treated as a hydraulic filter and is not linked to a maintenance interval without a direct service-role bridge.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, partId, versionId, configurationNote],
        );
        if (existing[0]) {
          await connection.query(
            `UPDATE machine_parts SET fitment_note=?,fitment_confidence='high',source_record_id=? WHERE id=?`,
            [fitmentNote, fitmentRecordId, Number(existing[0].id)],
          );
        } else {
          await connection.query(
            `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
             VALUES (?,?,?,?,?,'high',?)`,
            [machineId, partId, versionId, configurationNote, fitmentNote, fitmentRecordId],
          );
        }
      }
    }
  },
};
