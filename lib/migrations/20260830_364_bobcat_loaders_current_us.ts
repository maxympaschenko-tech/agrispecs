import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type LoaderSeed = {
  slug: string;
  model: string;
  liftCapacityText: string;
  liftHeightText: string;
  configurationText: string;
  machineSlugs: string[];
  compatibilityNote: string;
};

const SOURCE_URL = 'https://www.bobcat.com/na/en/attachments/compact-tractor-buckets';

const loaders: LoaderSeed[] = [
  {
    slug: 'fl6',
    model: 'FL6',
    liftCapacityText: '608 lb front-end loader lift capacity at max height',
    liftHeightText: '72 in maximum lift height to bucket pivot pin',
    configurationText: 'Bobcat compact tractor front-end loader; current bucket family uses a 48 in bucket. Current CT1021/CT1025 tractor pages publish 608 lb loader lift capacity at max height and 72 in lift height.',
    machineSlugs: ['ct1021-hst', 'ct1025-hst'],
    compatibilityNote: 'Current Bobcat US tractor bucket/loader guidance maps the FL6 loader family to CT1021 and CT1025. Current model pages independently publish the same loader performance figures.',
  },
  {
    slug: 'fl9',
    model: 'FL9',
    liftCapacityText: '1,795 lb front-end loader lift capacity at max height',
    liftHeightText: '103 in maximum lift height to bucket pivot pin on current 4000 Platform tractor pages',
    configurationText: 'Bobcat 4000 Platform front-end loader; current bucket family uses a 66 in bucket. Current 4000 Platform tractor pages publish 1,795 lb loader lift capacity at max height and 103 in lift height.',
    machineSlugs: ['ct4045-hst', 'ct4045-sst', 'ct4050-hst', 'ct4050-sst', 'ct4058-hst', 'ct4545-hst-cab', 'ct4558-hst-cab'],
    compatibilityNote: 'Current Bobcat US tractor bucket/loader guidance maps FL9 to the 4000 Platform tractor family. CT4055 is intentionally excluded because Bobcat separately marks it non-current; all current 4000 Platform configurations in this catalog are linked.',
  },
  {
    slug: 'fl9-5',
    model: 'FL9-5',
    liftCapacityText: '2,346 lb front-end loader lift capacity at max height',
    liftHeightText: '109 in maximum lift height to bucket pivot pin',
    configurationText: 'Bobcat 5000 Platform front-end loader; current bucket family uses a 72 in bucket. Current 5000 Platform tractor pages publish 2,346 lb loader lift capacity at max height and 109 in lift height.',
    machineSlugs: ['ct5545-hst-cab', 'ct5550-hst-cab', 'ct5555-hst-cab', 'ct5558-hst-cab'],
    compatibilityNote: 'Current Bobcat US tractor bucket/loader guidance maps FL9-5 to CT5545, CT5550, CT5555 and CT5558. Current model pages independently publish the same loader performance figures.',
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Bobcat loader migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(c: Parameters<DbMigration['apply']>[0], sourceId: number) {
  const externalId = 'bobcat-current-us-tractor-loader-fitment-2026-08';
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [
      sourceId,
      SOURCE_URL,
      externalId,
      'Bobcat current US compact tractor loader and bucket compatibility',
      JSON.stringify({
        market: 'United States',
        captured: '2026-08-30',
        loaders: loaders.map((loader) => ({ model: loader.model, fit: loader.machineSlugs })),
        sourcePolicy: 'Only loader families with unambiguous current Bobcat US tractor-family mapping are stored in this migration. FL7 and FL8 are intentionally deferred because the current public bucket page groups them together for the 2000 Platform rather than giving a sufficiently clean model-by-model split.',
      }),
    ],
  );
  return Number(inserted.insertId);
}

export const bobcatLoadersCurrentUsMigration: DbMigration = {
  id: '20260830_364_bobcat_loaders_current_us',
  description: 'Add verified current US Bobcat FL6, FL9 and FL9-5 loaders with conservative current fitment',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='bobcat' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Bobcat' AND domain='bobcat.com' LIMIT 1`);
    const sourceRecordId = await ensureSourceRecord(c, sourceId);

    for (const loader of loaders) {
      await c.query(
        `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES(?,'front-loader',?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId, loader.model, loader.slug, loader.liftCapacityText, loader.liftHeightText, loader.configurationText],
      );
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, loader.slug]);

      for (const machineSlug of loader.machineSlugs) {
        const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
        await c.query(
          `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES(?,?,?,?, 'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId, attachmentId, loader.compatibilityNote, sourceRecordId],
        );
      }
    }
  },
};
