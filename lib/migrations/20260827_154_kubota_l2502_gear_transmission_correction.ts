import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://www.kubotausa.com/equipment-series/standard-l-series';
const SOURCE_EXTERNAL_ID = 'kubota-standard-l-l2502-gear-8f4r-current-copy-2026-08';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota L2502 transmission-correction dependency.');
  return Number(rows[0].id);
}

export const kubotaL2502GearTransmissionCorrectionMigration: DbMigration = {
  id: '20260827_154_kubota_l2502_gear_transmission_correction',
  description: 'Resolve Kubota L2502 current-source transmission conflict in favor of explicit 8F/4R product copy while retaining high-confidence status',
  async apply(connection) {
    const machineId = await selectId(connection, `
      SELECT m.id FROM machines m
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='kubota' AND m.slug='l2502' LIMIT 1
    `);
    const definitionId = await selectId(connection, `SELECT id FROM spec_definitions WHERE spec_key='transmission.standard' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level)
         VALUES ('Kubota','kubotausa.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [existingSource] = await connection.query<IdRow[]>(
      `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
      [SOURCE_EXTERNAL_ID],
    );
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,raw_reference)
         VALUES (?,?,?,?,?)`,
        [
          sourceId,
          SOURCE_URL,
          SOURCE_EXTERNAL_ID,
          'Kubota USA Standard L Series product page - L2502 gear-drive 8 forward / 4 reverse',
          JSON.stringify({
            sourceConflict: true,
            explicitProductCopy: 'The L2502 gear-drive transmission has 8 forward and 4 reverse (8x4) speeds, with 2 ranges in forward (low-high).',
            conflictingSummary: 'The same current product page summary card renders DT (8F/8R).',
            resolution: 'Use explicit model-specific product copy as high-confidence, not official-confidence, until Kubota harmonizes the summary/spec materials.',
          }),
        ],
      );
      sourceRecordId = Number(result.insertId);
    }

    for (const versionSlug of ['us-current-gear-2wd','us-current-gear-4wd']) {
      const versionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, versionSlug],
      );

      await connection.query(
        `UPDATE machine_specs
         SET value_text='Gear-drive transmission, 8 forward / 4 reverse; 2 forward ranges (low/high)',
             value_number=NULL, unit=NULL, source_record_id=?, confidence='high'
         WHERE machine_id=? AND machine_version_id=? AND spec_definition_id=?`,
        [sourceRecordId, machineId, versionId, definitionId],
      );

      await connection.query(
        `UPDATE machine_versions
         SET notes=CONCAT(
           COALESCE(notes,''),
           CASE WHEN COALESCE(notes,'')='' THEN '' ELSE ' ' END,
           'Transmission source note: current Kubota product copy explicitly states L2502 gear drive is 8F/4R; a summary spec card/table still renders 8F/8R.'
         )
         WHERE id=?`,
        [versionId],
      );
    }
  },
};
