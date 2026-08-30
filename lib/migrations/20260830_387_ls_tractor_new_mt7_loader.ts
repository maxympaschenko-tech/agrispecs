import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_MT7_Update_v7.pdf';
const LOADER_URL = 'https://lstractorusa.com/front-end-loaders/';
const machines = ['mt774cps', 'mt7101cps'];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor New MT7 loader migration dependency missing');
  return Number(rows[0].id);
}
async function ensureSource(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId, url, externalId, title, JSON.stringify(raw)]);
  return Number(inserted.insertId);
}

export const lsTractorNewMt7LoaderMigration: DbMigration = {
  id: '20260830_387_ls_tractor_new_mt7_loader',
  description: 'Add current LL8100 loader for New MT7 and preserve brochure vs central-catalog measurement differences',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);
    const sourceRecordId = await ensureSource(c, sourceId, 'ls-tractor-ll8100-new-mt7-current-us-2026-08', LOADER_URL, 'LS Tractor LL8100 current New MT7 loader specifications and fitment', {
      market: 'United States', captured: '2026-08-30', model: 'LL8100', compatible: 'MT7 Series',
      currentBrochure: { url: BROCHURE_URL, bucketIn: 83, maxLiftHeightIn: 139.9, clearanceDumpedIn: 103.3, reachAtMaxHeightIn: 23.4, maxDumpDeg: 57, maxRollbackDeg: 46, diggingDepthIn: 4.6, carryHeightIn: 68.8, liftCapacityAtPivotPinLb: 5139, breakoutAtPivotPinLb: 5313, approxWeightWithoutBucketLb: 1660 },
      currentCentralCatalog: { bucketIn: 83, maxLiftHeightIn: 140, clearanceDumpedIn: 103.4, reachAtMaxHeightIn: 23.4, maxDumpDeg: 57, maxRollbackDeg: 46, diggingDepthIn: 4.5, carryHeightIn: 68.9, liftCapacityPivotPinAt1_5mLb: 5124, breakoutAtPivotPinLb: 5313, approxWeightWithoutBucketLb: 1676 },
      measurementPolicy: 'The 2025/10 MT7 brochure publishes 5,139 lb at pivot pin and 1,660 lb loader weight. The current central front-loader catalog publishes 5,124 lb at pivot pin / 1.5 m height and 1,676 lb loader weight. These are separately labeled current official values, not averaged.',
      fitmentPolicy: 'The current central loader catalog lists LL8100 for MT7 Series and both New MT7 model pages list LL8100 in Attachments.'
    });

    await c.query(
      `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES(?,'front-loader','LL8100','ll8100',?,?,?,'verified')
       ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId,
       '5,139 lb at pivot pin (current 2025/10 MT7 brochure); 5,124 lb at pivot pin / 1.5 m height (current central loader catalog)',
       '139.9 in current brochure; 140 in current central loader catalog',
       'Current LS Tractor USA MT7 LL8100 front loader. 83 in bucket. Current brochure: 139.9 in max lift height, 103.3 in dumped clearance, 23.4 in reach at maximum height, 57° dump, 46° rollback, 4.6 in digging depth, 68.8 in carry height, 5,139 lb lift at pivot pin, 5,313 lb breakout at pivot pin, approximately 1,660 lb without bucket. Current central loader catalog separately publishes 140 in max lift height, 103.4 in clearance, 4.5 in digging depth, 68.9 in carry height, 5,124 lb at pivot pin / 1.5 m, and approximately 1,676 lb without bucket.'
      ],
    );
    const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug='ll8100' LIMIT 1`, [manufacturerId]);
    for (const machineSlug of machines) {
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
      await c.query(
        `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES(?,?,?,?, 'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId, attachmentId, 'LL8100 is the current official MT7 Series front loader and is listed on both current New MT7 model pages.', sourceRecordId],
      );
    }
  },
};
