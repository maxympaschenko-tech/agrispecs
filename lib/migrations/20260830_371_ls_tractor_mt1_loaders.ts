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

const SOURCE_URL = 'https://lstractorusa.com/front-end-loaders/';
const machineSlugs = ['mt122', 'mt125'];

const loaders: LoaderSeed[] = [
  {
    slug: 'll1101',
    model: 'LL1101',
    liftCapacityText: '966 lb lift capacity at pivot pin / 1.5 m height',
    liftHeightText: '72 in maximum lift height at pivot pin',
    configurationText: 'Current LS Tractor USA front loader; 25.2 in reach at maximum height; 48.8 in clearance with attachment dumped; 4.7 in digging depth; approximately 309 lb loader without bucket. The current source duplicates the label “Maximum Rollback Angle” for two different angle values, so those ambiguous angle rows are intentionally omitted.',
  },
  {
    slug: 'll1102',
    model: 'LL1102',
    liftCapacityText: '1,008 lb lift capacity at pivot pin / 1.5 m height',
    liftHeightText: '72 in maximum lift height',
    configurationText: 'Current LS Tractor USA front loader; 1,943 lb breakout force at pivot pin; 26.8 in reach at maximum height; 51.9 in clearance with attachment dumped; 39° maximum dump angle; 35° maximum rollback angle; 4.8 in digging depth; 40 in overall height in carry position.',
  },
  {
    slug: 'll1700',
    model: 'LL1700',
    liftCapacityText: '980 lb lift capacity at pivot pin / 1.5 m height',
    liftHeightText: '74 in maximum lift height',
    configurationText: 'Current LS Tractor USA front loader; 1,470 lb breakout force at pivot pin; 55 in clearance with attachment dumped; 41 in overall height in carry position.',
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor MT1 loader migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(c: Parameters<DbMigration['apply']>[0], sourceId: number) {
  const externalId = 'ls-tractor-current-us-front-loaders-mt1-2026-08';
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [
      sourceId,
      SOURCE_URL,
      externalId,
      'LS Tractor USA current front-end loader specifications and compatibility',
      JSON.stringify({
        market: 'United States',
        captured: '2026-08-30',
        loaders: loaders.map((loader) => ({ model: loader.model, compatibleTractors: ['MT122', 'MT125'] })),
        sourcePolicy: 'Only loaders explicitly shown on the current LS Tractor USA front-end-loader page as compatible with MT122 and MT125 are stored. LL1001 is not added because it appears on individual model attachment lists but is absent from the current central loader specification catalog.',
      }),
    ],
  );
  return Number(inserted.insertId);
}

export const lsTractorMt1LoadersMigration: DbMigration = {
  id: '20260830_371_ls_tractor_mt1_loaders',
  description: 'Add verified current US LS Tractor LL1101, LL1102 and LL1700 loaders for MT122 and MT125',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);
    const sourceRecordId = await ensureSourceRecord(c, sourceId);

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
          [
            machineId,
            attachmentId,
            `Official current LS Tractor USA loader catalog lists ${loader.model} as compatible with MT122 and MT125.`,
            sourceRecordId,
          ],
        );
      }
    }
  },
};
