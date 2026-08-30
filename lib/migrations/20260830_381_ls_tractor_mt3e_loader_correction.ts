import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type LoaderCorrection = {
  slug: string;
  model: string;
  liftCapacityText: string;
  liftHeightText: string;
  configurationText: string;
  raw: Record<string, unknown>;
};

const LOADER_URL = 'https://lstractorusa.com/front-end-loaders/';
const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_MT3E_Update_v7.pdf';
const machineSlugs = ['mt345e', 'mt345he', 'mt355e', 'mt355he'];

const corrections: LoaderCorrection[] = [
  {
    slug: 'll4105',
    model: 'LL4105',
    liftCapacityText: '2,229 lb at pivot pin (current MT3E brochure); 2,550 lb at pivot pin / 1.5 m height (current central loader catalog)',
    liftHeightText: '92.9 in maximum lift height',
    configurationText: 'Current LS Tractor USA MT3E front loader; 72 in bucket; 62.1 in clearance with attachment dumped; 21.8 in reach at maximum height; 52° maximum dump angle; 47° maximum rollback angle; 5.7 in digging depth; 51.5 in carry height; 3,419 lb breakout force at pivot pin; approximately 670 lb without bucket. Two official lift-capacity values use different measurement labels and are retained separately.',
    raw: {
      brochurePivotPinLiftLb: 2229,
      centralCatalogPivotPinAt1_5mLiftLb: 2550,
      maxLiftHeightIn: 92.9,
      clearanceDumpedIn: 62.1,
      reachAtMaxHeightIn: 21.8,
      maxDumpDeg: 52,
      maxRollbackDeg: 47,
      diggingDepthIn: 5.7,
      carryHeightIn: 51.5,
      breakoutAtPivotPinLb: 3419,
      approxWeightWithoutBucketLb: 670,
      bucketIn: 72,
    },
  },
  {
    slug: 'll4002',
    model: 'LL4002',
    liftCapacityText: '2,784 lb at pivot pin (current MT3E brochure); 3,093 lb at pivot pin / 1.5 m height (current central loader catalog)',
    liftHeightText: '103.8 in maximum lift height',
    configurationText: 'Current LS Tractor USA MT3E front loader; 72 in bucket; 76.8 in clearance with attachment dumped; 18.3 in reach at maximum height; 46° maximum dump angle; 43.5° maximum rollback angle; 5.7 in digging depth; 51.7 in carry height; 4,418 lb breakout force at pivot pin in the current MT3E brochure; approximately 800 lb without bucket. Two official lift-capacity values use different measurement labels and are retained separately.',
    raw: {
      brochurePivotPinLiftLb: 2784,
      centralCatalogPivotPinAt1_5mLiftLb: 3093,
      maxLiftHeightIn: 103.8,
      clearanceDumpedIn: 76.8,
      reachAtMaxHeightIn: 18.3,
      maxDumpDeg: 46,
      maxRollbackDeg: 43.5,
      diggingDepthIn: 5.7,
      carryHeightIn: 51.7,
      brochureBreakoutAtPivotPinLb: 4418,
      approxWeightWithoutBucketLb: 800,
      bucketIn: 72,
    },
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor MT3E loader correction dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(c: Parameters<DbMigration['apply']>[0], sourceId: number) {
  const externalId = 'ls-tractor-mt3e-loaders-corrected-current-us-2026-08';
  const raw = {
    market: 'United States',
    captured: '2026-08-30',
    primary: LOADER_URL,
    brochure: BROCHURE_URL,
    reason: 'Correction after final cross-check: current MT3E brochure and current central front-loader catalog agree on loader geometry but supersede values previously taken from separate attachment-page material.',
    loaders: Object.fromEntries(corrections.map((x) => [x.model, x.raw])),
    measurementPolicy: 'Brochure pivot-pin capacities and central-catalog pivot-pin / 1.5 m capacities are preserved as separately labeled official figures.',
  };
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) {
    await c.query(`UPDATE source_records SET url=?,title=?,raw_reference=? WHERE id=?`, [LOADER_URL, 'LS Tractor MT3E corrected current loader specifications', JSON.stringify(raw), rows[0].id]);
    return Number(rows[0].id);
  }
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, LOADER_URL, externalId, 'LS Tractor MT3E corrected current loader specifications', JSON.stringify(raw)],
  );
  return Number(inserted.insertId);
}

export const lsTractorMt3eLoaderCorrectionMigration: DbMigration = {
  id: '20260830_381_ls_tractor_mt3e_loader_correction',
  description: 'Correct MT3E LL4105 and LL4002 dimensions/weights against the current brochure and central loader catalog',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);
    const sourceRecordId = await ensureSource(c, sourceId);

    for (const correction of corrections) {
      await c.query(
        `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES(?,'front-loader',?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId, correction.model, correction.slug, correction.liftCapacityText, correction.liftHeightText, correction.configurationText],
      );
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, correction.slug]);

      await c.query(
        `UPDATE source_records SET url=?,title=?,raw_reference=? WHERE external_id=?`,
        [LOADER_URL, `LS Tractor ${correction.model} corrected current US loader specifications`, JSON.stringify({ market: 'United States', captured: '2026-08-30', centralLoaderCatalog: LOADER_URL, brochure: BROCHURE_URL, corrected: correction.raw }), `ls-tractor-${correction.slug}-current-us-2026-08`],
      );

      for (const machineSlug of machineSlugs) {
        const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
        await c.query(
          `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES(?,?,?,?, 'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId, attachmentId, `${correction.model} is listed for the current grouped MT345E/HE and MT355E/HE model pages. Loader specifications are normalized from the current MT3E brochure plus the current central LS Tractor front-loader catalog.`, sourceRecordId],
        );
      }
    }
  },
};
