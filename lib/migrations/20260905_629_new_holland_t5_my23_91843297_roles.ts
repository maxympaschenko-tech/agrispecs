import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const PART_NUMBER = '91843297';
const SOURCE_URL = 'https://www.messicks.com/parts/new-holland/91843297';
const SOURCE_EXTERNAL_ID = 'messicks-t5-130-140-my23-91843297-transmission-hydraulic-roles-2026-09';

const fitments = [
  {
    slug: 't5-130',
    model: 'T5.130',
    transmission: 'AutoCommand',
    configurationNote: 'AutoCommand, Stage V, NAFTA, MY23 (02/23); transmission/hydraulic oil-filter position',
    evidencePaths: [
      '21.504.AK[005] - SERVICE KIT, TRANSMISSION, HYDRAULIC CONTROL, VALVE, OIL FILTER, ACCUMULATOR',
      '21.506.BC[010] - TRANSMISSION, HYDRAULIC CONTROL, VALVE, OIL FILTER, ACCUMULATOR',
      '35.100.AL[010] - HYDRAULIC PUMP, OIL FILTER',
    ],
  },
  {
    slug: 't5-130',
    model: 'T5.130',
    transmission: 'Dynamic Command',
    configurationNote: 'Dynamic Command, Stage V, NAFTA, MY23 (02/23); transmission/hydraulic oil-filter position',
    evidencePaths: [
      '21.103.AJ[010] - TRANSMISSION, OIL FILTER',
      '35.100.AL[020] - HYDRAULIC PUMP, OIL FILTER',
    ],
  },
  {
    slug: 't5-140',
    model: 'T5.140',
    transmission: 'AutoCommand',
    configurationNote: 'AutoCommand, Stage V, NAFTA, MY23 (02/23); transmission/hydraulic oil-filter position',
    evidencePaths: [
      '21.504.AK[005] - SERVICE KIT, TRANSMISSION, HYDRAULIC CONTROL, VALVE, OIL FILTER, ACCUMULATOR',
      '21.506.BC[010] - TRANSMISSION, HYDRAULIC CONTROL, VALVE, OIL FILTER, ACCUMULATOR',
      '35.100.AL[010] - HYDRAULIC PUMP, OIL FILTER',
    ],
  },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5 MY23 91843297 role-fitment migration dependency.');
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

export const newHollandT5My2391843297RolesMigration: DbMigration = {
  id: '20260905_629_new_holland_t5_my23_91843297_roles',
  description: 'Add role-specific MY23 transmission/hydraulic fitment rows for New Holland filter 91843297 where exact catalog paths are visible',
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
      `Messick's ${PART_NUMBER} T5.130/T5.140 MY23 transmission and hydraulic role listing`,
      {
        role: 'Exact model/transmission/model-year service-position evidence',
        partNumber: PART_NUMBER,
        fitments: fitments.map((fitment) => ({
          model: fitment.model,
          transmission: fitment.transmission,
          configurationNote: fitment.configurationNote,
          evidencePaths: [...fitment.evidencePaths],
        })),
        evidence: 'Messick\'s lists 91843297 in both transmission-related oil-filter paths and hydraulic-pump oil-filter paths for T5.130 AutoCommand MY23, T5.130 Dynamic Command MY23, and T5.140 AutoCommand MY23.',
        confidence: 'secondary/high',
        guardrail: 'T5.140 Dynamic Command MY23 is deliberately not inserted because the visible indexed 91843297 evidence currently reaches only the T5.140 Dynamic Command MY21 family. Existing generic Stage V hydraulic fitment remains unchanged.',
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
      const fitmentNote = `${PART_NUMBER} is listed in both transmission-related oil-filter and hydraulic-pump oil-filter paths for the exact ${fitment.model} ${fitment.transmission} Stage V NAFTA MY23 02/23 catalog. Treat this as a role-specific service position and confirm the service location before ordering.`;

      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
        [machineId, partId, machineVersionId, fitment.configurationNote],
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
          [machineId, partId, machineVersionId, fitment.configurationNote, fitmentNote, sourceRecordId],
        );
      }
    }
  },
};
