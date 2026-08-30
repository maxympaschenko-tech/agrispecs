import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const CATALOG_URL = 'https://www.kioti.com/us/es/products/attachments/front-end-loaders';

async function id(c: Parameters<DbMigration['apply']>[0], q: string, p: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(q, p);
  if (!rows[0]) throw new Error('KIOTI HX loader migration dependency missing');
  return Number(rows[0].id);
}
async function source(c: Parameters<DbMigration['apply']>[0], sid: number, externalId: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sid, CATALOG_URL, externalId, title, JSON.stringify(raw)],
  );
  return Number(inserted.insertId);
}

export const kiotiHxLoadersMigration: DbMigration = {
  id: '20260830_345_kioti_hx_loaders',
  description: 'Add verified KIOTI KL1155 and KL1402 front-end loaders with current US HX fitment',
  async apply(c) {
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='kioti' LIMIT 1`);
    const sid = await id(c, `SELECT id FROM sources WHERE name='KIOTI' AND domain='kioti.com' LIMIT 1`);

    const loaders = [
      {
        slug: 'kl1155', model: 'KL1155', liftLb: 4216, heightIn: 150.6,
        config: 'Fits HX9010 and HX1151; 8,554 lb breakout force at pivot pin; 90 in bucket; 10 gpm rated flow; 617 lb loader weight; 26.20 ft³ heaped bucket capacity',
        machines: ['hx9010','hx1151'],
        externalId: 'kioti-kl1155-hx-current-us-2026-08',
        raw: {
          market: 'United States', captured: '2026-08-30', compatibility: 'HX9010 and HX1151',
          fullHeightLiftLb: 4216, pivotHeightIn: 150.6, breakoutLb: 8554, bucketSizeIn: 90,
          ratedFlowGpm: 10, loaderWeightLb: 617, heapedBucketCapacityFt3: 26.2,
          buildPages: ['https://www.kioti.com/products/tractors/hx/hx9010/build','https://www.kioti.com/products/tractors/hx/hx1151/build'],
        },
      },
      {
        slug: 'kl1402', model: 'KL1402', liftLb: 5533, heightIn: 159.9,
        config: 'Fits HX1302 and HX1402; 7,936 lb breakout force at pivot pin; 26.50 ft³ rated bucket capacity; 640 lb bucket weight',
        machines: ['hx1302','hx1402'],
        externalId: 'kioti-kl1402-hx-current-us-2026-08',
        raw: {
          market: 'United States', captured: '2026-08-30', compatibility: 'HX1302 and HX1402',
          fullHeightLiftLb: 5533, pivotHeightIn: 159.9, breakoutLb: 7936,
          ratedBucketCapacityFt3: 26.5, bucketWeightLb: 640,
          note: 'The current US attachment table does not publish a loader weight, bucket width or rated hydraulic flow for KL1402. The 640 lb value is explicitly bucket weight and is not treated as loader weight.',
          buildPages: ['https://www.kioti.com/products/tractors/hx/hx1302/build','https://www.kioti.com/products/tractors/hx/hx1402/build'],
        },
      },
    ] as const;

    for (const loader of loaders) {
      const sr = await source(c, sid, loader.externalId, `KIOTI US ${loader.model} HX loader specifications and fitment`, loader.raw);
      await c.query(
        `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES(?,'front-loader',?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [mf, loader.model, loader.slug, `${loader.liftLb.toLocaleString('en-US')} lb to full height`, `${loader.heightIn} in maximum pivot-pin height`, loader.config],
      );
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [mf, loader.slug]);
      for (const machineSlug of loader.machines) {
        const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [mf, machineSlug]);
        await c.query(
          `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES(?,?,?,?, 'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId, attachmentId, `Official current US KIOTI fitment: ${loader.model} is offered for ${machineSlug.toUpperCase()}.`, sr],
        );
      }
    }
  },
};
