import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/ktc_l02_brochure_final.pdf?sfvrsn=2f4798a3_1';
const SOURCE_EXTERNAL_ID = 'kubota-l02-la526-loader-l2502-2026-08';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota L2502 LA526 migration dependency.');
  return Number(rows[0].id);
}

export const kubotaL2502LA526LoaderMigration: DbMigration = {
  id: '20260827_150_kubota_l2502_la526_loader',
  description: 'Add official Kubota L2502 to LA526 front-loader compatibility and loader performance data',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const machineId = await selectId(connection, `
      SELECT m.id FROM machines m
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='kubota' AND m.slug='l2502' LIMIT 1
    `);

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
        `INSERT INTO source_records (source_id,url,external_id,title)
         VALUES (?,?,?,?)`,
        [sourceId, SOURCE_URL, SOURCE_EXTERNAL_ID, 'Kubota USA L02 Series brochure - LA526 loader for L2502'],
      );
      sourceRecordId = Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO attachments
        (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES (?,'front-loader','LA526','la526',?,?,?,'verified')
       ON DUPLICATE KEY UPDATE
         model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),
         lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [
        manufacturerId,
        'L2502: 1096 lb (497 kg) at pivot pin / max height; 1446 lb (656 kg) at pivot pin @ 1.5 m',
        'Maximum lift height at pivot pin: 94.8 in (2409 mm)',
        'Kubota-built LA526 with 60 in rigid bucket reference; designed for L2502, L3302 and L3902.',
      ],
    );
    const attachmentId = await selectId(
      connection,
      `SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug='la526' LIMIT 1`,
      [manufacturerId],
    );

    await connection.query(
      `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
       VALUES (?,?,?,?,'official')
       ON DUPLICATE KEY UPDATE
         compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
      [
        machineId,
        attachmentId,
        'Kubota USA L02 brochure identifies the LA526 as the matching Kubota-built front loader for the L2502.',
        sourceRecordId,
      ],
    );
  },
};
