import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_XJ_Update_V5.pdf';
const LOADERS_URL = 'https://lstractorusa.com/front-end-loaders/';
const BACKHOES_URL = 'https://lstractorusa.com/backhoes/';

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor XJ attachment migration dependency missing');
  return Number(rows[0].id);
}
async function ensureSource(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId, url, externalId, title, JSON.stringify(raw)]);
  return Number(inserted.insertId);
}

export const lsTractorXjAttachmentsMigration: DbMigration = {
  id: '20260830_391_ls_tractor_xj_attachments',
  description: 'Add current XJ LL2102 loader and LB1104 backhoe with separately labeled current official source differences',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);
    const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug='xj2025h' LIMIT 1`, [manufacturerId]);

    const loaderSourceId = await ensureSource(c, sourceId, 'ls-tractor-xj-ll2102-current-us-2026-08', LOADERS_URL, 'LS Tractor XJ LL2102 current loader specifications and fitment', {
      market: 'United States', captured: '2026-08-30', brochure: BROCHURE_URL,
      currentBrochure: { bucketIn: 50, maxLiftHeightIn: 85.7, clearanceDumpedIn: 63.3, reachAtMaxHeightIn: 25.1, maxDumpDeg: 50, maxRollbackDeg: 38, diggingDepthIn: 3.7, carryHeightIn: 43.2, liftAtPivotPin1_5mLb: 1111, liftAtPivotPinMaxHeightLb: 1091, breakoutLb: 1426, weightWithoutBucketLb: 580 },
      currentCentralCatalog: { maxLiftHeightIn: 85.7, clearanceDumpedIn: 63.3, reachAtMaxHeightIn: 25.1, maxDumpDeg: 50, maxRollbackDeg: 38, diggingDepthIn: 3.7, carryHeightIn: 43.2, liftAtPivotPin1_5mLb: 1111, breakoutLb: 1426, weightWithoutBucketLb: 560 },
      currentModelSummary: { liftCapacityLb: 1091 },
      measurementPolicy: 'Current brochure explains the apparent 1,111/1,091 difference as two measurement points: 1.5 m height vs maximum height. Current live model card uses the 1,091 lb maximum-height figure. Loader weight differs between current brochure (580 lb) and central catalog (560 lb), so both are retained.'
    });
    const backhoeSourceId = await ensureSource(c, sourceId, 'ls-tractor-xj-lb1104-current-us-2026-08', BACKHOES_URL, 'LS Tractor XJ LB1104 current backhoe specifications and fitment', {
      market: 'United States', captured: '2026-08-30', brochure: BROCHURE_URL,
      specs: { diggingDepthIn: 79.3, reachFromSwingPivotIn: 113.3, loadingHeightIn: 56.9, swingArcDeg: 150, transportHeightIn: 75.3, bucketRotationDeg: 163, stabilizerDownIn: 87.8, stabilizerUpIn: 55.7, bucketDiggingForceLb: 2097 },
      fitmentPolicy: 'Current XJ model page, current 2025/10 XJ brochure and current central backhoe catalog all identify LB1104 for XJ.'
    });

    await c.query(`INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES(?,'front-loader','LL2102','ll2102',?,?,?,'verified') ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`, [manufacturerId,
      '1,111 lb at pivot pin / 1.5 m height; 1,091 lb at pivot pin / maximum height (current XJ brochure)',
      '85.7 in maximum lift height',
      'Current LS Tractor USA XJ LL2102 front loader. 50 in bucket; 85.7 in max lift height; 63.3 in clearance with attachment dumped; 25.1 in reach at maximum height; 50° max dump; 38° max rollback; 3.7 in digging depth; 43.2 in carry height; 1,426 lb breakout force at pivot pin. Current brochure publishes approximately 580 lb without bucket while current central loader catalog publishes 560 lb; both official values are preserved in provenance.'
    ]);
    const loaderId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug='ll2102' LIMIT 1`, [manufacturerId]);
    await c.query(`INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES(?,?,?,?, 'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, loaderId, 'LL2102 is confirmed for XJ by the current XJ model page, current XJ brochure and current central front-loader catalog.', loaderSourceId]);

    await c.query(`INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES(?,'backhoe','LB1104','lb1104',NULL,NULL,?,'verified') ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),configuration_text=VALUES(configuration_text),data_status='verified'`, [manufacturerId,
      'Current LS Tractor USA XJ LB1104 backhoe. 79.3 in digging depth; 113.3 in reach from centerline of swing pivot; 56.9 in loading height; 150° swing arc; 75.3 in transport height; 163° bucket rotation; 87.8 in stabilizer spread down; 55.7 in stabilizer spread up; 2,097 lb bucket digging force.'
    ]);
    const backhoeId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug='lb1104' LIMIT 1`, [manufacturerId]);
    await c.query(`INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES(?,?,?,?, 'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, backhoeId, 'LB1104 is confirmed for XJ by the current XJ model page, current XJ brochure and current central backhoe catalog.', backhoeSourceId]);
  },
};
