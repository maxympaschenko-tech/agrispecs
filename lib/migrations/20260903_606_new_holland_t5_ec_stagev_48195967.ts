import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const PART_NUMBER = '48195967';
const SOURCE_URL = 'https://www.messicks.com/parts/new-holland/48195967';
const SOURCE_EXTERNAL_ID = 'messicks-t5-110-120-ec-stagev-na-48195967-2026-09';

const fitments = [
  { slug: 't5-110', model: 'T5.110' },
  { slug: 't5-120', model: 'T5.120' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5 ElectroCommand Stage V 48195967 migration dependency.');
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

export const newHollandT5EcStageV48195967Migration: DbMigration = {
  id: '20260903_606_new_holland_t5_ec_stagev_48195967',
  description: 'Add exact T5.110/T5.120 ElectroCommand Stage V North America fitment for hydraulic filter 48195967',
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
      SOURCE_EXTERNAL_ID,
      SOURCE_URL,
      "Messick's 48195967 T5.110/T5.120 ElectroCommand Stage V North America catalog listing",
      {
        role: 'Exact model/configuration fitment evidence',
        partNumber: PART_NUMBER,
        models: fitments.map((fitment) => fitment.model),
        configuration: 'ElectroCommand tractor, Stage V, North America, 10/21 catalog',
        evidence: 'The 48195967 part catalog explicitly lists T5.110 and T5.120 ElectroCommand Tractor - Stage V (NA) 10/21 in maintenance-parts/filter and hydraulic-steering/filter/line paths.',
        confidence: 'secondary/high',
        guardrail: 'This migration is limited to the exact ElectroCommand Stage V North America configurations. Dual Command, Dynamic Command, Auto Command, T5.130 and T5.140 are not inferred.',
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
      const configurationNote = 'ElectroCommand, Stage V, North America, 10/21 catalog';
      const fitmentNote = `Hydraulic/steering filter ${PART_NUMBER} is listed in the exact ${fitment.model} ElectroCommand Stage V North America maintenance and hydraulic-filter catalog paths. Confirm transmission/build configuration before ordering.`;

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
  },
};
