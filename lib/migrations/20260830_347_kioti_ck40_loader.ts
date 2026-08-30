import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const SOURCE_URL = 'https://www.kioti.com/us/es/products/attachments/front-end-loaders';
const machineSlugs = [
  'ck2640','ck2640h','ck3540','ck3540h','ck4040','ck4040h',
  'ck2640seh','ck2640sehc','ck3540se','ck3540seh','ck3540sehc','ck4040se','ck4040seh','ck4040sehc',
];

async function id(c: Parameters<DbMigration['apply']>[0], q: string, p: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(q, p);
  if (!rows[0]) throw new Error('KIOTI CK40 loader migration dependency missing');
  return Number(rows[0].id);
}

export const kiotiCk40LoaderMigration: DbMigration = {
  id: '20260830_347_kioti_ck40_loader',
  description: 'Add verified KIOTI KL4040 front-end loader with official current US CK40 Series fitment',
  async apply(c) {
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='kioti' LIMIT 1`);
    const sid = await id(c, `SELECT id FROM sources WHERE name='KIOTI' AND domain='kioti.com' LIMIT 1`);
    const externalId = 'kioti-kl4040-ck40-current-us-2026-08';
    const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
    let sr = rows[0]?.id ? Number(rows[0].id) : 0;
    if (!sr) {
      const [inserted] = await c.query<ResultSetHeader>(
        `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
        [sid, SOURCE_URL, externalId, 'KIOTI US KL4040 front-end loader specifications and CK40 compatibility', JSON.stringify({
          market: 'United States', captured: '2026-08-30', compatibility: 'KL4040 loaders fit the CK40 Series tractors',
          fullHeightLiftLb: 1657, breakoutLb: 3384, pivotHeightIn: 98.5, loaderWeightLb: 939.2,
          heapedBucketCapacityFt3: 10.2, reachAtMaxHeightIn: 17.4, diggingDepthIn: 5.08, reachAtGroundIn: 65,
          note: 'The current US page directly publishes 1,657 lb full-height lift, 98.50 in pivot-pin height and 939.20 lb weight. Some paired metric conversions on the same table are inconsistent (notably pivot height and full-height lift); the direct US customary values are retained for this US-market record and the discrepancy is preserved here rather than silently recomputed.',
        })],
      );
      sr = Number(inserted.insertId);
    }

    await c.query(
      `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES(?,'front-loader','KL4040','kl4040','1,657 lb to full height','98.5 in maximum pivot-pin height',?,'verified')
       ON DUPLICATE KEY UPDATE model_name='KL4040',lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [mf, 'Fits current KIOTI CK40 Series tractors; 3,384 lb breakout force at pivot pin; 939.2 lb loader weight; 10.2 ft³ heaped bucket capacity; 17.4 in reach at maximum height; 5.08 in digging depth'],
    );
    const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug='kl4040' LIMIT 1`, [mf]);

    for (const machineSlug of machineSlugs) {
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [mf, machineSlug]);
      await c.query(
        `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES(?,?,?,?, 'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId, attachmentId, 'Official KIOTI current US compatibility: KL4040 fits CK40 Series tractors.', sr],
      );
    }
  },
};
