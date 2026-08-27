import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/m60-brochure---final-%281%29-compressed.pdf?sfvrsn=a3740294_4';
const SOURCE_EXTERNAL_ID = 'kubota-m60-la1154-loader-current-2026-08';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota LA1154 loader migration dependency.');
  return Number(rows[0].id);
}

export const kubotaM7060LA1154LoaderMigration: DbMigration = {
  id: '20260827_134_kubota_m7060_la1154_loader',
  description: 'Add current official Kubota M7060 compatibility with LA1154 front loader and loader specifications',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const machineId = await selectId(connection, `
      SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='kubota' AND m.slug='m7060' LIMIT 1
    `);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [SOURCE_EXTERNAL_ID]);
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA M60 Series current brochure - LA1154 loader specifications'],
      );
      sourceRecordId = Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO attachments (
        manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status
      ) VALUES (?,'front-loader','LA1154','la1154',?,?,?,'verified')
      ON DUPLICATE KEY UPDATE model_name='LA1154',lift_capacity_text=VALUES(lift_capacity_text),
        lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [
        manufacturerId,
        'At maximum lift height: 2,469 lb (1,120 kg) height-position; 2,928 lb (1,328 kg) power-position',
        'Pivot pin: 132.7 in (3370 mm) height-position; 117.2 in (2977 mm) power-position',
        'LA1154 boom cylinder fulcrum: height-position or power-position',
      ],
    );
    const attachmentId = await selectId(
      connection,
      `SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug='la1154' LIMIT 1`,
      [manufacturerId],
    );

    await connection.query(
      `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
       VALUES (?,?,?,?,'official')
       ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
      [machineId,attachmentId,'Kubota USA M60 Series brochure explicitly lists LA1154 as a compatible front loader for the M7060.',sourceRecordId],
    );
  },
};
