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
  machineSlugs: string[];
  compatibilityNote: string;
};

const SA_SOURCE_URL = 'https://www.yanmartractor.com/webres/File/YT22-234-YMR%20SA-Series_brochure_No%20Remote-111422%20web.pdf';
const YM2_SOURCE_URL = 'https://www.yanmartractor.com/webres/File/tractors/YM/2025%20YAN_YM2%20Sale%20Sheet%20update.pdf';

const loaders: LoaderSeed[] = [
  {
    slug: 'yl110',
    model: 'YL110',
    sourceUrl: SA_SOURCE_URL,
    liftCapacityText: '825 lb lift capacity',
    liftHeightText: '71 in maximum lift height',
    configurationText: 'Yanmar SA Series front loader; 1,342 lb breakout force; 48 in bucket; 3.9 in digging depth; 358 lb loader with bucket',
    machineSlugs: ['sa223'],
    compatibilityNote: 'Official Yanmar SA specification brochure pairs YL110 with the SA223 platform. SA223 KURO is intentionally not linked because the current special-edition page does not independently confirm the loader fitment.',
  },
  {
    slug: 'yl210',
    model: 'YL210',
    sourceUrl: SA_SOURCE_URL,
    liftCapacityText: '1,200 lb lift capacity',
    liftHeightText: '79 in maximum lift height',
    configurationText: 'Yanmar SA Series front loader; 2,090 lb breakout force; 53 in bucket; 3.9 in digging depth; 423 lb loader with bucket',
    machineSlugs: ['sa325', 'sa425', 'sa425dhx'],
    compatibilityNote: 'Official Yanmar SA specification brochure pairs YL210 with the SA325 and SA425/SA425DHX platforms.',
  },
  {
    slug: 'yl405-ym2p',
    model: 'YL405-YM2P',
    sourceUrl: YM2_SOURCE_URL,
    liftCapacityText: '1,500 lb lift capacity',
    liftHeightText: 'Lift height not published reliably in current source',
    configurationText: 'Yanmar YM2 Series front loader; 2,500 lb breakout force; 72 in bucket. Current first-party YM2 sheet has an internally inconsistent lift-height row, so no lift-height number is stored.',
    machineSlugs: ['ym225', 'ym232', 'ym238'],
    compatibilityNote: 'Official Yanmar America YM2 specification sheet lists the YL405 loader for YM225, YM232 and YM238.',
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Yanmar loader migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  c: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  raw: unknown,
) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(raw)],
  );
  return Number(inserted.insertId);
}

export const yanmarSaYm2LoadersMigration: DbMigration = {
  id: '20260830_351_yanmar_sa_ym2_loaders',
  description: 'Add verified current US Yanmar YL110, YL210 and YL405-YM2P loaders with conservative SA and YM2 fitment',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='yanmar' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Yanmar' AND domain='yanmartractor.com' LIMIT 1`);

    const sourceRecordIds = new Map<string, number>();
    sourceRecordIds.set(
      SA_SOURCE_URL,
      await ensureSourceRecord(c, sourceId, 'yanmar-sa-loaders-current-us-2026-08', SA_SOURCE_URL, 'Yanmar America SA Series loader specifications', {
        market: 'United States',
        captured: '2026-08-30',
        loaders: loaders.filter((loader) => loader.sourceUrl === SA_SOURCE_URL).map((loader) => ({ model: loader.model, fit: loader.machineSlugs })),
        sourcePolicy: 'Only fitment supported by the current-linked Yanmar America SA brochure is stored. SA223 KURO is excluded until its special-edition current source independently confirms loader compatibility.',
      }),
    );
    sourceRecordIds.set(
      YM2_SOURCE_URL,
      await ensureSourceRecord(c, sourceId, 'yanmar-ym2-loader-current-us-2026-08', YM2_SOURCE_URL, 'Yanmar America YM2 YL405 loader specifications', {
        market: 'United States',
        captured: '2026-08-30',
        loader: 'YL405-YM2P',
        fit: ['YM225', 'YM232', 'YM238'],
        sourcePolicy: 'Lift capacity, breakout force and bucket width are retained from the current first-party YM2 sheet. Its lift-height row is internally inconsistent, so no numeric lift height is stored.',
      }),
    );

    for (const loader of loaders) {
      const sourceRecordId = sourceRecordIds.get(loader.sourceUrl);
      if (!sourceRecordId) throw new Error(`Missing Yanmar loader source record for ${loader.model}`);

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
