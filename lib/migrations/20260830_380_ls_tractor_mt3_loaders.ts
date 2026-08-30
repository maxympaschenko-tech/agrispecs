import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type LoaderSeed = {
  slug: string;
  model: string;
  liftCapacityText: string;
  liftHeightText: string;
  configurationText: string;
};

const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_MT3_Update_v5.pdf';
const LOADER_URL = 'https://lstractorusa.com/front-end-loaders/';

const machineSlugs = [
  'mt342', 'mt342c', 'mt342h', 'mt342hc',
  'mt347', 'mt347c', 'mt347h', 'mt347hc',
  'mt352pct', 'mt352pctc', 'mt352h', 'mt352hc',
  'mt357pct', 'mt357pctc', 'mt357h', 'mt357hc',
];

const loaders: LoaderSeed[] = [
  {
    slug: 'll4106',
    model: 'LL4106',
    liftCapacityText: '2,680 lb at pivot pin (current MT3 brochure); 2,878 lb at pivot pin / 1.5 m height (current central loader catalog)',
    liftHeightText: '94.4 in maximum lift height',
    configurationText: 'Current LS Tractor USA MT3 front loader; 72 in bucket; 64.4 in clearance with attachment dumped; 16.7 in reach at maximum height; 52° maximum dump angle; 41° maximum rollback angle; 4.3 in digging depth; 51.4 in carry height; breakout force published as 4,063 lb in the current MT3 brochure and 4,048 lb in the current central loader catalog; approximately 780 lb without bucket. Official source differences are retained rather than silently averaged.',
  },
  {
    slug: 'll4001',
    model: 'LL4001',
    liftCapacityText: '2,998 lb at pivot pin (current MT3 brochure); current central loader catalog also publishes 2,998 lb labeled pivot pin / 1.5 m height',
    liftHeightText: '104.3 in maximum lift height',
    configurationText: 'Current LS Tractor USA MT3 front loader; 72 in bucket; 77.3 in clearance with attachment dumped; 14.2 in reach at maximum height; 46° maximum dump angle; 42.5° maximum rollback angle; 4.8 in digging depth; 52.2 in carry height; 4,295 lb breakout force at pivot pin in the current MT3 brochure; approximately 780 lb without bucket.',
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor MT3 loader migration dependency missing');
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

export const lsTractorMt3LoadersMigration: DbMigration = {
  id: '20260830_380_ls_tractor_mt3_loaders',
  description: 'Add verified current US LL4106 and LL4001 loaders across the 42-57 hp LS MT3 configurations',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);

    const sourceRecordId = await ensureSource(c, sourceId, 'ls-tractor-mt3-loaders-current-us-2026-08', LOADER_URL, 'LS Tractor USA current MT3 front-loader specifications and fitment', {
      market: 'United States',
      captured: '2026-08-30',
      brochure: BROCHURE_URL,
      currentModelGroups: ['MT342/H/HC/C', 'MT347/H/HC/C', 'MT352PCT/PCTC', 'MT352H/HC', 'MT357PCT/PCTC', 'MT357H/HC'],
      fitmentPolicy: 'The current central loader catalog lists LL4106 for MT342/MT347/MT352/MT357 and LL4001 for the MT3 Series. Current grouped model pages explicitly list both LL4106 and LL4001 in their attachment sections, so fitment is expanded to the sixteen current ROPS/Cab and gear/HST/Powerclutch configuration records represented by those pages.',
      measurementPolicy: 'Where brochure and central loader catalog use different lift-capacity labels or slightly different breakout-force values, both official descriptions are retained in attachment text instead of being merged into a single synthetic number.',
      excluded: ['MT335H and MT340HC loader fitment is intentionally not added here because current model pages and the current central loader catalog disagree between LL3116 and LL3106.'],
    });

    await ensureSource(c, sourceId, 'ls-tractor-mt3-loader-brochure-current-2026-08', BROCHURE_URL, 'LS Tractor current MT3 brochure loader matrix', {
      market: 'United States',
      captured: '2026-08-30',
      LL4106: { liftCapacityAtPivotPinLb: 2680, breakoutAtPivotPinLb: 4063, approxWeightWithoutBucketLb: 780 },
      LL4001: { liftCapacityAtPivotPinLb: 2998, breakoutAtPivotPinLb: 4295, approxWeightWithoutBucketLb: 780 },
    });

    for (const loader of loaders) {
      await c.query(
        `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES(?,'front-loader',?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId, loader.model, loader.slug, loader.liftCapacityText, loader.liftHeightText, loader.configurationText],
      );
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, loader.slug]);

      for (const machineSlug of machineSlugs) {
        const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
        await c.query(
          `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES(?,?,?,?, 'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId, attachmentId, `${loader.model} is confirmed for the current 42-57 hp MT3 model groups by the LS Tractor USA central loader catalog and current grouped MT3 attachment sections.`, sourceRecordId],
        );
      }
    }
  },
};
