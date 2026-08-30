import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type LoaderSeed = {
  slug: string;
  model: string;
  liftCapacityLb: number;
  liftHeightIn: number;
  breakoutLb: number;
  bucketSizeIn: number;
  ratedFlowGpm: number;
  weightLb: number;
  compatibility: string;
};

const SOURCE_URL = 'https://www.kioti.com/products/attachments/front-end-loaders';
const machineSlugs = [
  'ck2620', 'ck2620h', 'ck2620seh-cab',
  'ck3520', 'ck3520h', 'ck3520se', 'ck3520seh', 'ck3520seh-cab',
  'ck4020', 'ck4020h', 'ck4020se', 'ck4020seh', 'ck4020seh-cab',
];

const loaders: LoaderSeed[] = [
  {
    slug: 'kl4030', model: 'KL4030', liftCapacityLb: 1835, liftHeightIn: 98.4,
    breakoutLb: 3464, bucketSizeIn: 60, ratedFlowGpm: 6.9, weightLb: 959,
    compatibility: 'KIOTI CK20 and CK20SE tractors',
  },
  {
    slug: 'kl4030c', model: 'KL4030C', liftCapacityLb: 1969, liftHeightIn: 98.4,
    breakoutLb: 2989, bucketSizeIn: 66, ratedFlowGpm: 6.9, weightLb: 928,
    compatibility: 'KIOTI CK20 and CK20SE tractors',
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('KIOTI loader migration dependency missing');
  return Number(rows[0].id);
}

export const kiotiCk20LoadersMigration: DbMigration = {
  id: '20260830_331_kioti_ck20_loaders',
  description: 'Add verified KIOTI KL4030 and KL4030C loaders with official CK20/CK20SE fitment',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='kioti' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='KIOTI' AND domain='kioti.com' LIMIT 1`);
    const externalId = 'kioti-kl4030-kl4030c-current-us-2026-08';
    const [existing] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
    let sourceRecordId = existing[0]?.id ? Number(existing[0].id) : 0;
    if (!sourceRecordId) {
      const [inserted] = await c.query<ResultSetHeader>(
        `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
        [sourceId, SOURCE_URL, externalId, 'KIOTI US KL4030 and KL4030C front-end loader specifications and compatibility', JSON.stringify({
          market: 'United States', captured: '2026-08-30', loaders,
          note: 'The official KIOTI US loader page states KL4030 compatibility with CK20 and CK20SE tractors and KL4030C compatibility with CK20 and CK20SE tractors. Current CK20-family records are linked accordingly.',
        })],
      );
      sourceRecordId = Number(inserted.insertId);
    }

    for (const loader of loaders) {
      await c.query(
        `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES(?,'front-loader',?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [
          manufacturerId,
          loader.model,
          loader.slug,
          `${loader.liftCapacityLb.toLocaleString('en-US')} lb to full height`,
          `${loader.liftHeightIn} in maximum pivot-pin height`,
          `${loader.compatibility}; ${loader.breakoutLb.toLocaleString('en-US')} lb breakout force at pivot pin; ${loader.bucketSizeIn} in bucket; ${loader.ratedFlowGpm} gpm rated flow; ${loader.weightLb.toLocaleString('en-US')} lb loader weight`,
        ],
      );
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, loader.slug]);

      for (const machineSlug of machineSlugs) {
        const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
        await c.query(
          `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES(?,?,?,?, 'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId, attachmentId, `Official KIOTI compatibility: ${loader.model} fits CK20 and CK20SE tractors.`, sourceRecordId],
        );
      }
    }
  },
};
