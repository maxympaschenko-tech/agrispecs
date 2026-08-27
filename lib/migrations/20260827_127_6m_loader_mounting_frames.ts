import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const models = ['6m-95','6m-105','6m-115','6m-125','6m-130','6m-140','6m-150'] as const;

const frames = [
  {
    number: 'AXX10595',
    name: 'Front Loader Mounting Frame',
    externalId: 'jd-shop-axx10595-6m-fitment-2026-08',
    url: 'https://shop.deere.com/us/product/AXX10595%3A-Front-Loader-Mounting-Frame/p/AXX10595',
    note: 'John Deere Shop lists this front loader mounting frame as compatible equipment for the 6M model.',
  },
  {
    number: 'AXX10596',
    name: 'Front Loader Mounting Frame',
    externalId: 'jd-shop-axx10596-6m-fitment-2026-08',
    url: 'https://shop.deere.com/us/product/AXX10596%3A%2BFront%2BLoader%2BMounting%2BFrame/p/AXX10596',
    note: 'John Deere Shop lists this front loader mounting frame as compatible equipment for the 6M model.',
  },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing 6M loader mounting-frame migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
) {
  const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (existing[0]) return Number(existing[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId,url,externalId,title],
  );
  return Number(result.insertId);
}

export const johnDeere6MLoaderMountingFramesMigration: DbMigration = {
  id: '20260827_127_6m_loader_mounting_frames',
  description: 'Add source-backed AXX10595 and AXX10596 front-loader mounting-frame fitment for selected current John Deere 6M tractors',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

    await connection.query(
      `INSERT INTO part_categories (name,slug) VALUES ('Loader Mounting Parts','loader-mounting-parts') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
    );
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='loader-mounting-parts' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    for (const frame of frames) {
      const sourceRecordId = await ensureSourceRecord(
        connection,
        sourceId,
        frame.externalId,
        frame.url,
        `John Deere ${frame.number} Front Loader Mounting Frame - compatible equipment`,
      );

      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,frame.number,frame.number,frame.name],
      );
      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId,frame.number],
      );

      for (const modelSlug of models) {
        const machineId = await selectId(connection, `
          SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
          WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1
        `, [modelSlug]);
        const note = `${modelSlug.toUpperCase()}: ${frame.note}`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
          [machineId,partId,note],
        );
        if (!existing[0]) {
          await connection.query(
            `INSERT INTO machine_parts (machine_id,part_id,fitment_note,configuration_note,source_record_id)
             VALUES (?,?,?,'Front-loader mounting system',?)`,
            [machineId,partId,note,sourceRecordId],
          );
        }
      }
    }
  },
};
