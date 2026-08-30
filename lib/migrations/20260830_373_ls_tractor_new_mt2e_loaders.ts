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

const SOURCE_URL = 'https://lstractorusa.com/front-end-loaders/';

const loaders: LoaderSeed[] = [
  {
    slug: 'll3001',
    model: 'LL3001',
    liftCapacityText: '1,965 lb lift capacity at pivot pin / 1.5 m height',
    liftHeightText: '94.3 in maximum lift height',
    configurationText: 'Current LS Tractor USA front loader; 66 in bucket; 2,962 lb breakout force at pivot pin; 67 in clearance with attachment dumped; 14.4 in reach at maximum height; 48° maximum dump angle; 42.5° maximum rollback angle; 4.8 in digging depth; 51.2 in carry height; approximately 741 lb without bucket.',
    machineSlugs: ['mt226e', 'mt226hec'],
    compatibilityNote: 'Current LS Tractor USA central front-loader catalog explicitly lists LL3001/LL3002 with MT226E and MT226HEC. LL3001 is not extended to MT226HE because the central catalog does not list that configuration for LL3001.',
  },
  {
    slug: 'll3002',
    model: 'LL3002',
    liftCapacityText: '1,965 lb lift capacity at pivot pin / 1.5 m height',
    liftHeightText: '94.3 in maximum lift height',
    configurationText: 'Current LS Tractor USA front loader; 66 in bucket; 2,962 lb breakout force at pivot pin; 67 in clearance with attachment dumped; 14.4 in reach at maximum height; 48° maximum dump angle; 42.5° maximum rollback angle; 4.8 in digging depth; 51.2 in carry height; approximately 741 lb without bucket.',
    machineSlugs: ['mt226e', 'mt226he', 'mt226hec'],
    compatibilityNote: 'Current LS Tractor USA central loader catalog covers MT226E and MT226HEC, and the current MT226E/MT226HE/MT226HEC model attachment sections each explicitly list LL3002.',
  },
  {
    slug: 'll3003',
    model: 'LL3003',
    liftCapacityText: '2,506 lb lift capacity at pivot pin / 1.5 m height',
    liftHeightText: '94.3 in maximum lift height',
    configurationText: 'Current LS Tractor USA front loader; 66 in bucket; 3,723 lb breakout force at pivot pin; 67 in clearance with attachment dumped; 14.4 in reach at maximum height; 48° maximum dump angle; 42.5° maximum rollback angle; 4.8 in digging depth; 51.2 in carry height; approximately 741 lb without bucket.',
    machineSlugs: ['mt232e', 'mt232he', 'mt232hec', 'mt242e', 'mt242he', 'mt242hec'],
    compatibilityNote: 'Current LS Tractor USA central loader catalog and the individual current New MT2E model attachment sections confirm LL3003 across MT232E/HE/HEC and MT242E/HE/HEC.',
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor New MT2E loader migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(c: Parameters<DbMigration['apply']>[0], sourceId: number) {
  const externalId = 'ls-tractor-new-mt2e-loaders-current-us-2026-08';
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [
      sourceId,
      SOURCE_URL,
      externalId,
      'LS Tractor USA current New MT2E front-loader specifications and fitment',
      JSON.stringify({
        market: 'United States',
        captured: '2026-08-30',
        loaders: loaders.map((loader) => ({ model: loader.model, machineSlugs: loader.machineSlugs })),
        sourcePolicy: 'Loader performance values come from the current LS Tractor USA central front-loader catalog. Variant-level fitment is kept conservative and is expanded beyond the central list only where a current individual LS model page explicitly lists that loader in its Attachments section.',
        deferred: ['LL3301 is shown on some MT226 individual model pages but is not added because the current central loader catalog does not publish a clean LL3301 specification row.'],
      }),
    ],
  );
  return Number(inserted.insertId);
}

export const lsTractorNewMt2eLoadersMigration: DbMigration = {
  id: '20260830_373_ls_tractor_new_mt2e_loaders',
  description: 'Add verified current US LS Tractor LL3001, LL3002 and LL3003 loaders for New MT2E',
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
