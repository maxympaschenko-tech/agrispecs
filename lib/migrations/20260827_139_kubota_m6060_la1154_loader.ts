import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/2026-full-product-line-brochure.pdf?sfvrsn=efd39503_10';
const SOURCE_EXTERNAL_ID = 'kubota-2026-full-line-m6060-la1154';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql,params);
  if (!rows[0]) throw new Error('Missing Kubota M6060 LA1154 migration dependency.');
  return Number(rows[0].id);
}

export const kubotaM6060LA1154LoaderMigration: DbMigration = {
  id: '20260827_139_kubota_m6060_la1154_loader',
  description: 'Add current source-backed Kubota M6060 to LA1154 front-loader compatibility',
  async apply(connection) {
    const machineId = await selectId(connection,`
      SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='kubota' AND m.slug='m6060' LIMIT 1
    `);
    const attachmentId = await selectId(connection,`
      SELECT a.id FROM attachments a JOIN manufacturers mf ON mf.id=a.manufacturer_id
      WHERE mf.slug='kubota' AND a.attachment_type='front-loader' AND a.slug='la1154' LIMIT 1
    `);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[SOURCE_EXTERNAL_ID]);
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota 2026 Full Product Line Brochure - M60 Series and LA1154 compatibility'],
      );
      sourceRecordId = Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
       VALUES (?,?,?,?,'official')
       ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
      [machineId,attachmentId,'Kubota 2026 Full Product Line brochure lists LA1154 as the compatible front loader for M6060.',sourceRecordId],
    );
  },
};
