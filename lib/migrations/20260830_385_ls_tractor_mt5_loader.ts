import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_MT5_Update_v4.pdf';
const LOADER_URL = 'https://lstractorusa.com/front-end-loaders/';
const machines = ['mt573c', 'mt573cps'];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor MT5 loader migration dependency missing');
  return Number(rows[0].id);
}
async function ensureSource(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId, url, externalId, title, JSON.stringify(raw)]);
  return Number(inserted.insertId);
}

export const lsTractorMt5LoaderMigration: DbMigration = {
  id: '20260830_385_ls_tractor_mt5_loader',
  description: 'Add current LL6100 fitment for MT573C/MT573CPS while preserving current and legacy lift-capacity labels',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);
    const sourceRecordId = await ensureSource(c, sourceId, 'ls-tractor-ll6100-mt5-current-us-2026-08', LOADER_URL, 'LS Tractor LL6100 current MT5 loader specifications and fitment', {
      market: 'United States', captured: '2026-08-30', model: 'LL6100', compatible: 'MT5 Series',
      currentBrochure: { url: BROCHURE_URL, bucketIn: 78, maxLiftHeightIn: 126.5, clearanceDumpedIn: 95.3, reachAtMaxHeightIn: 5.7, maxDumpDeg: 64, maxRollbackDeg: 38, diggingDepthIn: 7.0, carryHeightIn: 64.2, liftCapacityAtPivotPinLb: 3626, breakoutAtPivotPinLb: 6644, approxWeightWithoutBucketLb: 1232 },
      currentCentralCatalog: { liftCapacityPivotPinAt1_5mLb: 4880, breakoutAtPivotPinLb: 6644, maxLiftHeightIn: 126.5, approxWeightWithoutBucketLb: 1232 },
      currentModelPageLegacyDisplay: { liftCapacityLb: 3364, note: 'The current MT5 series/model-page summary still displays 3,364 lb, matching older MT5 brochure material. The 2025/10 brochure has updated the at-pivot-pin figure to 3,626 lb.' },
      measurementPolicy: '3,626 lb is the current 2025/10 brochure value at pivot pin; 4,880 lb is the current central-catalog value at pivot pin / 1.5 m height. 3,364 lb is retained only as a documented legacy/current-page display discrepancy, not normalized into either current measurement.'
    });

    await c.query(
      `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES(?,'front-loader','LL6100','ll6100',?,?,?,'verified')
       ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId,
       '3,626 lb at pivot pin (current 2025/10 MT5 brochure); 4,880 lb at pivot pin / 1.5 m height (current central loader catalog); MT5 series/model-page summary still displays legacy 3,364 lb',
       '126.5 in maximum lift height',
       'Current LS Tractor USA MT5 LL6100 front loader. 78 in bucket; 126.5 in maximum lift height; 95.3 in clearance with attachment dumped; 5.7 in reach at maximum height; 64° maximum dump; 38° maximum rollback; 7.0 in digging depth; 64.2 in carry height; 6,644 lb breakout force at pivot pin; approximately 1,232 lb loader without bucket. Current official sources publish different lift-capacity figures because of both measurement conditions and an updated brochure revision; all are explicitly labeled.'],
    );
    const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug='ll6100' LIMIT 1`, [manufacturerId]);
    for (const machineSlug of machines) {
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
      await c.query(
        `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES(?,?,?,?, 'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId, attachmentId, 'LL6100 is the official MT5 Series front loader and is listed on both current MT573C and MT573CPS model pages.', sourceRecordId],
      );
    }
  },
};
