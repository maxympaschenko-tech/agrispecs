import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-09-next-generation';
const PART_NUMBER = '47565055';
const SOURCE_URL = 'https://messicks.com/parts/new-holland/47565055';
const SOURCE_EXTERNAL_ID = 'messicks-powerstar-stagev-47565055-cab-2026-09';
const OFFICIAL_URL = 'https://www.mycnhstore.com/gb/en/newhollandag/category/filters/engine-air-filters/cab-filter/p/47565055';
const OFFICIAL_EXTERNAL_ID = 'new-holland-mycnh-47565055-cab-filter-identity-2026-09';

const fitments = [
  { slug: 'powerstar-90', model: 'PowerStar 90', configuration: 'Dual Command 1.5, Stage V, cab, MY24 catalog (02/25)' },
  { slug: 'powerstar-100', model: 'PowerStar 100', configuration: 'Dual Command 1.5, Stage V, cab, MY24 catalog (02/25)' },
  { slug: 'powerstar-110', model: 'PowerStar 110', configuration: 'Dual Command 1.5, Stage V, cab, MY24 catalog (02/25)' },
  { slug: 'powerstar-120', model: 'PowerStar 120', configuration: 'Dual Command 1.5, Stage V, cab, MY24 catalog (07/24)' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing PowerStar Stage V cab-filter migration dependency.');
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

export const newHollandPowerStarStageVCabFilterMigration: DbMigration = {
  id: '20260903_600_new_holland_powerstar_stagev_cab_filter',
  description: 'Add exact cab-only Stage V PowerStar 90/100/110/120 fitment for New Holland cab air filter 47565055',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const cabCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='cab-filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
       VALUES (?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
      [manufacturerId, cabCategoryId, PART_NUMBER, PART_NUMBER, 'Cab Air Filter Panel'],
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
      SOURCE_EXTERNAL_ID,
      SOURCE_URL,
      `Messick's New Holland ${PART_NUMBER} Stage V PowerStar cab-filter catalog`,
      {
        role: 'Exact model and cab-configuration fitment evidence',
        partNumber: PART_NUMBER,
        models: fitments.map((fitment) => ({ model: fitment.model, configuration: fitment.configuration })),
        catalogEvidence: 'Messick\'s lists 47565055 in Stage V PowerStar 90/100/110/120 Dual Command MY24 cab maintenance and HVAC/air-duct paths. PowerStar 100/110/120 also expose Power Shuttle MY25 cab paths.',
        confidence: 'secondary/high',
        guardrail: 'Cab-only fitment. ROPS configurations and PowerStar 75 are not inferred.',
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
      `New Holland MyCNH ${PART_NUMBER} Cab Air Filter Panel`,
      {
        role: 'Official OEM part identity corroboration',
        partNumber: PART_NUMBER,
        name: 'Cab Air Filter Panel',
        fitmentScope: 'Identity only; exact PowerStar cab fitment is sourced separately.',
      },
    );

    for (const fitment of fitments) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [fitment.slug],
      );
      const machineVersionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=TRUE LIMIT 1`,
        [machineId, CURRENT_VERSION],
      );
      const configurationNote = `Next-generation US PowerStar; ${fitment.configuration}`;
      const fitmentNote = `Cab air filter ${PART_NUMBER} is listed in the exact ${fitment.model} ${fitment.configuration} Stage V cab catalog. Applies only to cab-equipped configurations; confirm HVAC/cab build configuration before ordering.`;

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
  },
};
