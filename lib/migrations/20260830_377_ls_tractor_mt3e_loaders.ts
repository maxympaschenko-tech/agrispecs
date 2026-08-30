import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type LoaderSeed = {
  slug: string;
  model: string;
  sourceUrl: string;
  liftCapacityText: string;
  liftHeightText: string;
  configurationText: string;
};

const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_MT3E_Update_v7.pdf';
const MT345_URL = 'https://lstractorusa.com/tractor/mt345e-he/';
const MT355_URL = 'https://lstractorusa.com/tractor/mt355e-he/';

const loaders: LoaderSeed[] = [
  {
    slug: 'll4105',
    model: 'LL4105',
    sourceUrl: 'https://lstractorusa.com/attachment/ll4105/',
    liftCapacityText: '2,229 lb at pivot pin (current MT3E brochure); 2,550 lb at pivot pin / 1.5 m height (current LL4105 page)',
    liftHeightText: '96.3 in maximum lift height',
    configurationText: 'Current LS Tractor USA MT3E front loader; 72 in bucket; 2,821 lb bucket-cylinder force; 4,047 lb boom-cylinder force; 77.3 in clearance with attachment dumped; 25.9 in reach at maximum height; 53° maximum dump angle; 32° maximum rollback angle; 359 lb bucket; approximately 847 lb loader weight. Official sources publish two lift-capacity figures using different measurement descriptions; both are retained without conflation.',
  },
  {
    slug: 'll4002',
    model: 'LL4002',
    sourceUrl: 'https://lstractorusa.com/attachment/ll4002/',
    liftCapacityText: '2,784 lb at pivot pin (current MT3E brochure); 3,093 lb at pivot pin / 1.5 m height (current LL4002 page)',
    liftHeightText: '101.3 in maximum lift height',
    configurationText: 'Current LS Tractor USA MT3E front loader; 72 in bucket; 3,898 lb bucket-cylinder force; 4,431 lb boom-cylinder force; 76.8 in clearance with attachment dumped; 30.3 in reach at maximum height; 55° maximum dump angle; 48° maximum rollback angle; 359 lb bucket; approximately 1,000 lb loader weight. Official sources publish two lift-capacity figures using different measurement descriptions; both are retained without conflation.',
  },
];

const machines = ['mt345e', 'mt345he', 'mt355e', 'mt355he'];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor MT3E loader migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  c: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  rawReference: unknown,
) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(inserted.insertId);
}

export const lsTractorMt3eLoadersMigration: DbMigration = {
  id: '20260830_377_ls_tractor_mt3e_loaders',
  description: 'Add verified current US LL4105 and LL4002 loaders and MT3E fitment',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);

    const brochureSourceRecordId = await ensureSourceRecord(
      c,
      sourceId,
      'ls-tractor-mt3e-loader-brochure-fitment-2026-08',
      BROCHURE_URL,
      'LS Tractor MT3E current brochure loader fitment and pivot-pin capacities',
      {
        market: 'United States',
        captured: '2026-08-30',
        loaderFitment: ['LL4105', 'LL4002'],
        pivotPinCapacityLb: { LL4105: 2229, LL4002: 2784 },
        fitmentPages: [MT345_URL, MT355_URL],
        fitmentPolicy: 'The current MT345E/HE and MT355E/HE pages each list LL4105 and LL4002 in the grouped model attachment section. Because those pages explicitly represent E and HE configurations together, fitment is expanded to all four configuration records.',
        measurementPolicy: 'The brochure labels its loader capacity at pivot pin. Current individual loader pages publish a different value labeled pivot pin @ 1.5 m. These are retained as separate official measurements rather than treated as a source conflict.',
      },
    );

    for (const loader of loaders) {
      const loaderSourceRecordId = await ensureSourceRecord(
        c,
        sourceId,
        `ls-tractor-${loader.slug}-current-us-2026-08`,
        loader.sourceUrl,
        `LS Tractor ${loader.model} current US loader specifications`,
        {
          market: 'United States',
          captured: '2026-08-30',
          model: loader.model,
          measurement: 'Loader page lift-capacity value is labeled pivot pin @ 1.5 m.',
          relatedBrochure: BROCHURE_URL,
        },
      );

      await c.query(
        `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES(?,'front-loader',?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId, loader.model, loader.slug, loader.liftCapacityText, loader.liftHeightText, loader.configurationText],
      );
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, loader.slug]);

      for (const machineSlug of machines) {
        const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
        await c.query(
          `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES(?,?,?,?, 'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [
            machineId,
            attachmentId,
            `${loader.model} is listed in the current grouped MT345E/HE and MT355E/HE attachment sections; fitment therefore covers MT345E, MT345HE, MT355E and MT355HE. Loader specifications are cross-checked against the current individual ${loader.model} page.`,
            brochureSourceRecordId,
          ],
        );
      }

      void loaderSourceRecordId;
    }
  },
};
