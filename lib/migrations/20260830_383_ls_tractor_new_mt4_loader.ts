import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_MT4_Update_v7.pdf';
const LOADER_URL = 'https://lstractorusa.com/front-end-loaders/';
const machines = ['mt463', 'mt463ps', 'mt463c', 'mt463cps', 'mt473', 'mt473ps', 'mt473c', 'mt473cps'];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor New MT4 loader migration dependency missing');
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

export const lsTractorNewMt4LoaderMigration: DbMigration = {
  id: '20260830_383_ls_tractor_new_mt4_loader',
  description: 'Add current US LL5001 loader with New MT4 fitment and separately labeled official measurement modes',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);

    const sourceRecordId = await ensureSource(c, sourceId, 'ls-tractor-ll5001-new-mt4-current-us-2026-08', LOADER_URL, 'LS Tractor LL5001 current New MT4 loader specifications and fitment', {
      market: 'United States',
      captured: '2026-08-30',
      model: 'LL5001',
      compatible: 'MT4 Series',
      centralCatalog: {
        maxLiftHeightIn: 113,
        clearanceDumpedIn: 100.9,
        reachAtMaxHeightIn: 16.2,
        maxDumpDeg: 44.4,
        maxRollbackDeg: 42.5,
        diggingDepthIn: 6,
        carryHeightIn: 68.7,
        liftCapacityPivotPinAt1_5mLb: 4213,
      },
      brochure: BROCHURE_URL,
      brochureModes: {
        heightPosition: { bucketIn: 78, maxLiftHeightIn: 132.9, liftCapacityPivotPinMaxHeightLb: 3426, maxDumpDeg: 44.4, bucketCapacityGal: 126.8, bucketRollbackForceGroundLb: 3524, diggingDepthIn: 6, loaderWeightWithoutBucketLb: 1190 },
        powerPosition: { bucketIn: 78, maxLiftHeightIn: 116.8, liftCapacityPivotPinMaxHeightLb: 3488, maxDumpDeg: 59.7, bucketCapacityGal: 126.8, bucketRollbackForceGroundLb: 3529, diggingDepthIn: 5.1, loaderWeightWithoutBucketLb: 1190 },
      },
      measurementPolicy: 'The central catalog 4,213 lb value is labeled at pivot pin / 1.5 m height, while the brochure 3,426/3,488 lb values are at pivot pin at maximum height in two loader-position modes. They are not interchangeable and are retained separately.',
      roundingNote: 'Current New MT4 model pages describe up to 3,487 lb in max power mode, one pound below the current brochure table value of 3,488 lb; the brochure table value is retained with the discrepancy documented.',
      fitmentPolicy: 'The central loader catalog explicitly lists LL5001 as compatible with MT4 Series, and each current New MT4 model page lists LL5001 in its attachment section.',
    });

    await c.query(
      `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES(?,'front-loader','LL5001','ll5001',?,?,?,'verified')
       ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [
        manufacturerId,
        '3,426 lb at pivot pin/max height in Height Position; 3,488 lb at pivot pin/max height in Power Position (current brochure); 4,213 lb at pivot pin/1.5 m height (current central loader catalog)',
        '132.9 in Height Position; 116.8 in Power Position (brochure); central catalog separately publishes 113 in maximum lift height',
        'Current LS Tractor USA New MT4 LL5001 self-leveling front loader. 78 in bucket. Height Position: 132.9 in max lift, 3,426 lb lift at pivot pin/max height, 44.4° dump, 3,524 lb bucket rollback force at ground, 6 in digging depth. Power Position: 116.8 in max lift, 3,488 lb lift at pivot pin/max height, 59.7° dump, 3,529 lb bucket rollback force at ground, 5.1 in digging depth. Bucket capacity 126.8 gal; approximately 1,190 lb loader without bucket. Central catalog additionally publishes 4,213 lb at pivot pin/1.5 m height under a different measurement condition.',
      ],
    );
    const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug='ll5001' LIMIT 1`, [manufacturerId]);

    for (const machineSlug of machines) {
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
      await c.query(
        `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES(?,?,?,?, 'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId, attachmentId, 'LL5001 is the current official New MT4 front loader; fitment is confirmed by the central MT4-Series loader listing and the individual New MT4 model attachment sections.', sourceRecordId],
      );
    }
  },
};
