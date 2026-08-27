import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type FrameSeed = {
  number: string;
  url: string;
  models: readonly string[];
  externalId: string;
  note: string;
};

const frames: FrameSeed[] = [
  {
    number: 'AXX10595',
    url: 'https://shop.deere.com/us/product/AXX10595%3A-Front-Loader-Mounting-Frame/p/AXX10595',
    models: ['6r-110','6r-120','6r-130','6r-140','6r-150'],
    externalId: 'jd-shop-axx10595-6r-fitment-2026-08',
    note: 'John Deere Shop lists AXX10595 as compatible with the 6R 110, 6R 120, 6R 130, 6R 140 and 6R 150 front-loader mounting system.',
  },
  {
    number: 'AXX10596',
    url: 'https://shop.deere.com/us/product/AXX10596%3A-Front-Loader-Mounting-Frame/p/AXX10596',
    models: ['6r-110','6r-120','6r-130','6r-140','6r-150'],
    externalId: 'jd-shop-axx10596-6r-fitment-2026-08',
    note: 'John Deere Shop lists AXX10596 as compatible with the 6R 110, 6R 120, 6R 130, 6R 140 and 6R 150 front-loader mounting system.',
  },
  {
    number: 'AXX10321',
    url: 'https://shop.deere.com/us/product/AXX10321%3A-Front-Loader-Mounting-Frame/p/AXX10321',
    models: ['6r-175','6r-195'],
    externalId: 'jd-shop-axx10321-6r-fitment-2026-08',
    note: 'John Deere Shop lists AXX10321 as compatible with the 6R 175 and 6R 195 front-loader mounting system.',
  },
  {
    number: 'AXX10322',
    url: 'https://shop.deere.com/uk/product/AXX10322%3A-Front-Loader-Mounting-Frame/p/AXX10322',
    models: ['6r-175','6r-195'],
    externalId: 'jd-shop-axx10322-6r-fitment-2026-08',
    note: 'John Deere Shop lists AXX10322 as compatible with the 6R 175 and 6R 195 front-loader mounting system.',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing 6R loader mounting-frame migration dependency.');
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

export const johnDeere6RLoaderMountingFramesMigration: DbMigration = {
  id: '20260827_129_6r_loader_mounting_frames',
  description: 'Add official John Deere Shop mounting-frame fitment for current 6R 110-150 and 6R 175/195 tractors',
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
        [manufacturerId,categoryId,frame.number,frame.number,'Front Loader Mounting Frame'],
      );
      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId,frame.number],
      );

      for (const modelSlug of frame.models) {
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
