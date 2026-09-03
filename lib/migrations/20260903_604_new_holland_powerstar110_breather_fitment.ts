import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-09-next-generation';
const PART_NUMBER = '5949768013';
const SOURCE_URL = 'https://www.messicks.com/catalogs/new-holland/powerstar-110-dual-command-tractor-1-5-wide-s/35-hydraulic-systems/35-204-be-100-35-204-be-100-2-remote-control-valves-float-valve-components-80-lpm-var-351282001-351282002-351282003-351284001-351284002-351284003-351286001-351286002-351286003-351288001-351288002-3512';
const SOURCE_EXTERNAL_ID = 'messicks-powerstar110-stagev-my24-5949768013-2026-09';
const OFFICIAL_URL = 'https://www.mycnhstore.com/sa/en/newhollandce/cn/filter-engine-blow-by/p/5949768013';
const OFFICIAL_EXTERNAL_ID = 'cnh-mycnh-5949768013-engine-blow-by-identity-2026-09';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing PowerStar 110 breather-filter migration dependency.');
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

export const newHollandPowerStar110BreatherFitmentMigration: DbMigration = {
  id: '20260903_604_new_holland_powerstar110_breather_fitment',
  description: 'Add exact Stage V PowerStar 110 ROPS MY24 fitment for engine blow-by filter 5949768013',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
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
      "Messick's PowerStar 110 Dual Command Stage V ROPS MY24 catalog",
      {
        role: 'Exact model/configuration fitment evidence',
        partNumber: PART_NUMBER,
        model: 'PowerStar 110',
        configuration: 'Dual Command 1.5, wide, Stage V, ROPS, MY24 catalog (09/25)',
        evidence: 'The exact PowerStar 110 Stage V ROPS MY24 catalog lists 5949768013 FILTER ENGINE BLOWBY among the machine-specific frequently purchased/service parts.',
        confidence: 'secondary/high',
        guardrail: 'No PowerStar 75/90/100/120 fitment is inferred from generic or aftermarket model lists. Only this exact catalog configuration is inserted.',
      },
    );

    let [officialRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='CNH MyCNH' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`,
    );
    let officialSourceId = officialRows[0]?.id ? Number(officialRows[0].id) : 0;
    if (!officialSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('CNH MyCNH','mycnhstore.com','manufacturer','official')`,
      );
      officialSourceId = Number(result.insertId);
    }
    await ensureSourceRecord(
      connection,
      officialSourceId,
      OFFICIAL_EXTERNAL_ID,
      OFFICIAL_URL,
      'CNH MyCNH 5949768013 FILTER, ENGINE BLOW BY',
      {
        role: 'Official OEM part identity corroboration',
        partNumber: PART_NUMBER,
        name: 'FILTER, ENGINE BLOW BY',
        fitmentScope: 'Identity only; exact PowerStar fitment is sourced separately.',
      },
    );

    const machineId = await selectId(
      connection,
      `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug='powerstar-110' LIMIT 1`,
    );
    const machineVersionId = await selectId(
      connection,
      `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=TRUE LIMIT 1`,
      [machineId, CURRENT_VERSION],
    );

    const configurationNote = 'Next-generation US PowerStar; Dual Command 1.5, wide, Stage V, ROPS, MY24 catalog (09/25)';
    const fitmentNote = 'Engine blow-by / crankcase breather filter 5949768013 is listed in the exact PowerStar 110 Dual Command Stage V ROPS MY24 catalog. Confirm engine and build configuration before ordering.';
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
  },
};
