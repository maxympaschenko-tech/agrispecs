import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type AttachmentSeed = {
  slug: string;
  model: string;
  type: string;
  url: string;
  machineSlugs: string[];
  liftCapacityText?: string;
  liftHeightText?: string;
  configurationText: string;
};

const CATALOG_URL = 'https://tym.world/en-us/products/attachments';

const attachments: AttachmentSeed[] = [
  {
    slug: 'tym-tb50', model: 'TB50', type: 'backhoe', url: 'https://tym.world/en-us/products/attachments/backhoe/tb50', machineSlugs: ['t224'],
    configurationText: 'Current TYM backhoe for T224; 66.5 in digging depth; 60.8 in loading height; 89.7 in backhoe reach.',
  },
  {
    slug: 'tym-mm54', model: 'MM54', type: 'mid-mount-mower', url: 'https://tym.world/en-us/products/attachments/mid-mount-mower/mm54', machineSlugs: ['t224'],
    configurationText: 'Current TYM mid-mount mower for T224; 54 in working width; 18.5 in blade length; 14,601 fpm blade velocity.',
  },
  {
    slug: 'tym-tx25p', model: 'TX25P', type: 'front-loader', url: 'https://tym.world/en-us/products/attachments/front-end-loader/tx25p', machineSlugs: ['t254'],
    liftCapacityText: '948 lb at pivot point at maximum height', liftHeightText: '75 in maximum lift height',
    configurationText: 'Current TYM front-end loader for T254; 6.0 cu ft bucket capacity.',
  },
  {
    slug: 'tym-tb60', model: 'TB60', type: 'backhoe', url: 'https://tym.world/en-us/products/attachments/backhoe/tb60', machineSlugs: ['t254'],
    configurationText: 'Current TYM backhoe for T254; 75.6 in digging depth; 62.7 in loading height; 107.9 in backhoe reach.',
  },
  {
    slug: 'tym-mm60r', model: 'MM60R', type: 'mid-mount-mower', url: 'https://tym.world/en-us/products/attachments/mid-mount-mower/mm60r', machineSlugs: ['t254'],
    configurationText: 'Current TYM mid-mount mower for T254; 60 in working width; 20.8 in blade length; 18,362 fpm blade velocity.',
  },
  {
    slug: 'tym-bl100s', model: 'BL100S', type: 'front-loader', url: 'https://tym.world/en-us/products/attachments/front-end-loader/bl100s', machineSlugs: ['2400r','2400h'],
    liftCapacityText: '1,314 lb at pivot point at maximum height', liftHeightText: '88.3 in maximum lift height',
    configurationText: 'Current TYM front-end loader for the 2400 platform; 5.3 cu ft bucket capacity. Fitment is expanded to both explicitly published 2400R and 2400H tractor configurations.',
  },
  {
    slug: 'tym-bh100', model: 'BH100', type: 'backhoe', url: 'https://tym.world/en-us/products/attachments/backhoe/bh100', machineSlugs: ['2400r','2400h'],
    configurationText: 'Current TYM backhoe for the 2400 platform; 75.6 in digging depth; 62.7 in loading height; 107.9 in backhoe reach. The current BH100 page internally displays BH60 in some headings/table labels; fitment identity follows the current attachment catalog entry BH100 for 2400.',
  },
  {
    slug: 'tym-bl110s', model: 'BL110S', type: 'front-loader', url: 'https://tym.world/en-us/products/attachments/front-end-loader/bl110s', machineSlugs: ['2610'],
    liftCapacityText: '1,373 lb at pivot point at maximum height', liftHeightText: '91.1 in maximum lift height',
    configurationText: 'Current TYM front-end loader for 2610; 5.3 cu ft bucket capacity.',
  },
  {
    slug: 'tym-bm60l', model: 'BM60L', type: 'mid-mount-mower', url: 'https://tym.world/en-us/products/attachments/mid-mount-mower/bm60l', machineSlugs: ['2610'],
    configurationText: 'Current TYM mid-mount mower for 2610; 60 in working width; 20.8 in blade length; 3,363 fpm published blade velocity.',
  },
  {
    slug: 'tym-tx2000', model: 'TX2000', type: 'front-loader', url: 'https://tym.world/en-us/products/attachments/front-end-loader/tx2000', machineSlugs: ['t264'],
    liftCapacityText: '1,380 lb at pivot point at maximum height', liftHeightText: '86.9 in maximum lift height',
    configurationText: 'Current TYM front-end loader for T264; 6.4 cu ft bucket capacity.',
  },
  {
    slug: 'tym-tb65', model: 'TB65', type: 'backhoe', url: 'https://tym.world/en-us/products/attachments/backhoe/tb65', machineSlugs: ['t264','t2025p','t25'],
    configurationText: 'Current TYM backhoe for T264, T2025P and T25; 80.4 in digging depth; 63 in loading height; 117.7 in backhoe reach.',
  },
  {
    slug: 'tym-l2025p', model: 'L2025P', type: 'front-loader', url: 'https://tym.world/en-us/products/attachments/front-end-loader/l2025p', machineSlugs: ['t2025p'],
    liftCapacityText: '1,380 lb at pivot point at maximum height', liftHeightText: '87.7 in maximum lift height',
    configurationText: 'Current TYM front-end loader whose live product page explicitly identifies T2025P compatibility; 5.7 cu ft bucket capacity.',
  },
  {
    slug: 'tym-tl25', model: 'TL25', type: 'front-loader', url: 'https://tym.world/en-us/products/attachments/front-end-loader/tl25', machineSlugs: ['t25'],
    liftCapacityText: '1,380 lb at pivot point at maximum height', liftHeightText: '87.2 in maximum lift height',
    configurationText: 'Current TYM front-end loader whose live product page explicitly identifies T25 compatibility; 6.7 cu ft bucket capacity. The current US page has legacy/internal L2025 labeling in its title/table, so the marketed attachment identity TL25 is retained and the inconsistency is recorded.',
  },
  {
    slug: 'tym-tm60', model: 'TM60', type: 'mid-mount-mower', url: 'https://tym.world/en-us/products/attachments/mid-mount-mower/tm60-mower', machineSlugs: ['t2025p','t25'],
    configurationText: 'Current TYM mid-mount mower for T2025P and T25; 60 in working width; 20.8 in blade length; 18,362 fpm blade velocity.',
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('TYM Series 1/2 attachment migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(raw)],
  );
  return Number(inserted.insertId);
}

export const tymSeries1Series2AttachmentsMigration: DbMigration = {
  id: '20260830_400_tym_series1_series2_attachments',
  description: 'Add verified current US TYM Series 1 and Series 2 loaders, backhoes and mid-mount mower fitment',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='tym' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='TYM' AND domain='tym.world' LIMIT 1`);
    const catalogSourceRecordId = await ensureSource(c, sourceId, 'tym-series1-series2-attachments-current-us-2026-08', CATALOG_URL, 'TYM USA current Series 1 and Series 2 attachment fitment catalog', {
      market: 'United States', captured: '2026-08-30',
      fitment: attachments.map((a) => ({ attachment: a.model, machines: a.machineSlugs })),
      policy: 'Central US attachment catalog is primary for fitment. L2025P and TL25 loader fitment is additionally supported by each live attachment page explicitly naming T2025P and T25 respectively. T224 receives no loader fitment because the current US catalog does not list a current loader for T224.',
      sourceAnomalies: ['BH100 live page currently contains BH60 labels in some headings/table cells.', 'TL25 live page currently contains L2025 labels in its title/table while the URL, image label and compatibility copy identify TL25.'],
    });

    for (const a of attachments) {
      const sourceRecordId = await ensureSource(c, sourceId, `tym-${a.model.toLowerCase()}-current-us-2026-08`, a.url, `TYM ${a.model} current US attachment specifications`, {
        market: 'United States', captured: '2026-08-30', attachment: a.model, type: a.type, compatibleMachineSlugs: a.machineSlugs,
        catalog: CATALOG_URL,
      });
      await c.query(
        `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES(?,?,?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),attachment_type=VALUES(attachment_type),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId, a.type, a.model, a.slug, a.liftCapacityText ?? null, a.liftHeightText ?? null, a.configurationText],
      );
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, a.slug]);
      for (const machineSlug of a.machineSlugs) {
        const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
        await c.query(
          `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES(?,?,?,?, 'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId, attachmentId, `${a.model} current US fitment is confirmed by TYM's live attachment catalog and/or the current attachment product page.`, sourceRecordId || catalogSourceRecordId],
        );
      }
    }
  },
};
