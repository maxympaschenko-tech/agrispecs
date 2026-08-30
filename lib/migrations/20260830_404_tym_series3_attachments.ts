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
  note?: string;
};

const CATALOG_URL = 'https://tym.world/en-us/products/attachments';

const attachments: AttachmentSeed[] = [
  {
    slug: 'tym-bl150', model: 'BL150', type: 'front-loader', url: 'https://tym.world/en-us/products/attachments/front-end-loader/bl150',
    machineSlugs: ['2515r','2515h','3015r','3015h','3515r','3515h','4215r','4215h','4815r','4815h','t3025r','t3025h'],
    liftCapacityText: '2,200 lb at pivot point at maximum height', liftHeightText: '104.9 in maximum lift height',
    configurationText: 'Current TYM BL150 front-end loader; 8.1 cu ft bucket. Current US catalog lists compatibility with 2515, 3015, 3515, 4215, 4815 and 3025 base tractor groups; fitment is expanded to each separately published R/H configuration for those base groups.',
  },
  {
    slug: 'tym-bl150c', model: 'BL150C', type: 'front-loader', url: 'https://tym.world/en-us/products/attachments/front-end-loader/bl150c',
    machineSlugs: ['3515c','4215c','4815c'],
    liftCapacityText: '2,200 lb at pivot point at maximum height', liftHeightText: '104.9 in maximum lift height',
    configurationText: 'Current TYM BL150C front-end loader; 8.1 cu ft bucket; current US catalog explicitly lists 3515C, 4215C and 4815C.',
  },
  {
    slug: 'tym-l3035', model: 'L3035', type: 'front-loader', url: 'https://tym.world/en-us/products/attachments/front-end-loader/l3035',
    machineSlugs: ['t3025c','t3035r','t3035h','t3035c'],
    liftCapacityText: '2,200 lb at pivot point at maximum height', liftHeightText: '104.9 in maximum lift height',
    configurationText: 'Current TYM L3035 front-end loader; 8.1 cu ft bucket. Current US catalog explicitly lists T3025C, T3035 and T3035C; T3035 base-group fitment is expanded to the separately published T3035R and T3035H configurations.',
  },
  {
    slug: 'tym-bh150', model: 'BH150', type: 'backhoe', url: 'https://tym.world/en-us/products/attachments/backhoe/bh150',
    machineSlugs: ['2515r','2515h','3015r','3015h','t3025c','t3035r','t3035h','t3035c','3515r','3515h','4215r','4215h','4815r','4815h'],
    configurationText: 'Current TYM BH150 backhoe fitment for 2515, 3015, T3025C, T3035, T3035C, 3515, 4215 and 4815. Current product page publishes 92.2 in digging depth, 89.3 in loading height and 117.7 in reach, but internally labels the table/model as BH70 in places; marketed BH150 identity and central-catalog fitment are retained.',
    note: 'Live BH150 page contains BH70 internal labels; do not treat that label anomaly as a separate fitment identity.',
  },
  {
    slug: 'tym-bh70', model: 'BH70', type: 'backhoe', url: 'https://tym.world/en-us/products/attachments/backhoe/bh70',
    machineSlugs: ['t3025c'],
    configurationText: 'Current TYM BH70 backhoe for T3025C; 92.2 in digging depth; 89.3 in loading height; 117.7 in backhoe reach.',
  },
  {
    slug: 'tym-tx39h', model: 'TX39H', type: 'front-loader', url: 'https://tym.world/en-us/products/attachments/front-end-loader/tx39h',
    machineSlugs: ['t394','t394c'],
    liftCapacityText: '2,116 lb at pivot point at maximum height', liftHeightText: '101.5 in maximum lift height',
    configurationText: 'Current TYM US catalog identifies TX39H for T394/T394C. Current TX39H product page internally labels the attachment L3039 while retaining TX39H URL/image identity; 9.9 cu ft bucket capacity.',
    note: 'Current product-page naming is mixed TX39H/L3039; catalog marketed identity TX39H is retained.',
  },
  {
    slug: 'tym-by75', model: 'BY75', type: 'backhoe', url: 'https://tym.world/en-us/products/attachments/backhoe/by75',
    machineSlugs: ['t394','t394c','t474','t474c'],
    configurationText: 'Current TYM US catalog explicitly lists BY75 for T394, T394C, T474 and T474C; 91.2 in digging depth; 90 in loading height; 123.6 in backhoe reach.',
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('TYM Series 3 attachment migration dependency missing');
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

export const tymSeries3AttachmentsMigration: DbMigration = {
  id: '20260830_404_tym_series3_attachments',
  description: 'Add conservative verified current US TYM Series 3 loader and backhoe fitment',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='tym' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='TYM' AND domain='tym.world' LIMIT 1`);
    const catalogSourceRecordId = await ensureSource(c, sourceId, 'tym-series3-attachments-current-us-2026-08', CATALOG_URL, 'TYM USA current Series 3 attachment fitment catalog', {
      market: 'United States', captured: '2026-08-30',
      fitment: attachments.map((a) => ({ attachment: a.model, machines: a.machineSlugs })),
      policy: 'US attachment catalog is primary. Base-model fitment is expanded to R/H machine records only where the current tractor technical table explicitly treats those R/H records as configurations of the same base model.',
      deferred: ['TX47/L3047 loader fitment for T474/T474C is not added to US records: the current US central catalog leaves TX47 compatibility blank even though the global/non-US catalog maps L3047 to T474/T474C.'],
      anomalies: ['TX39H product page internally labels the loader L3039.', 'BH150 product page contains BH70 labels in its current technical table.'],
    });

    for (const a of attachments) {
      const sourceRecordId = await ensureSource(c, sourceId, `tym-series3-${a.model.toLowerCase()}-current-us-2026-08`, a.url, `TYM ${a.model} current US attachment specifications`, {
        market: 'United States', captured: '2026-08-30', attachment: a.model, type: a.type,
        compatibleMachineSlugs: a.machineSlugs, catalog: CATALOG_URL, note: a.note ?? null,
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
          [machineId, attachmentId, `${a.model} Series 3 fitment is confirmed by the current TYM US attachment catalog; configuration expansion follows the current TYM base-model variant table.`, sourceRecordId || catalogSourceRecordId],
        );
      }
    }
  },
};
