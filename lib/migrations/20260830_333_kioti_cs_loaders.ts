import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type LoaderSeed = {
  slug: string;
  model: string;
  compatibility: string;
  machineSlugs: string[];
  liftCapacityLb: number;
  liftHeightIn: number;
  breakoutLb: number;
  bucketSizeIn?: number;
  ratedFlowGpm?: number;
  weightLb?: number;
  bucketCapacityFt3?: number;
};

const SOURCE_URL = 'https://www.kioti.com/products/attachments/front-end-loaders';
const loaders: LoaderSeed[] = [
  {
    slug: 'sl2410',
    model: 'SL2410',
    compatibility: 'KIOTI CS10 Series sub-compact tractors',
    machineSlugs: ['cs2210h', 'cs2510h'],
    liftCapacityLb: 675.3,
    liftHeightIn: 71.3,
    breakoutLb: 1332,
    bucketSizeIn: 48,
    ratedFlowGpm: 3.5,
    weightLb: 498,
    bucketCapacityFt3: 6.7,
  },
  {
    slug: 'sl2420',
    model: 'SL2420',
    compatibility: 'KIOTI CS20 Series sub-compact tractors',
    machineSlugs: ['cs2220h', 'cs2520h'],
    liftCapacityLb: 1062.3,
    liftHeightIn: 73.7,
    breakoutLb: 1329,
  },
  {
    slug: 'sl2530',
    model: 'SL2530',
    compatibility: 'KIOTI CS30 Series sub-compact tractors',
    machineSlugs: ['cs2230h', 'cs2530h', 'cs2530h-cab'],
    liftCapacityLb: 871,
    liftHeightIn: 70.9,
    breakoutLb: 1299,
    bucketSizeIn: 48,
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('KIOTI CS loader migration dependency missing');
  return Number(rows[0].id);
}

export const kiotiCsLoadersMigration: DbMigration = {
  id: '20260830_333_kioti_cs_loaders',
  description: 'Add verified KIOTI SL2410, SL2420 and SL2530 loaders with official CS10/CS20/CS30 fitment',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='kioti' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='KIOTI' AND domain='kioti.com' LIMIT 1`);
    const externalId = 'kioti-cs-loaders-current-us-2026-08';
    const [existing] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
    let sourceRecordId = existing[0]?.id ? Number(existing[0].id) : 0;
    if (!sourceRecordId) {
      const [inserted] = await c.query<ResultSetHeader>(
        `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
        [sourceId, SOURCE_URL, externalId, 'KIOTI US CS Series front-end loader specifications and compatibility', JSON.stringify({
          market: 'United States',
          captured: '2026-08-30',
          loaders,
          sourcePolicy: 'Only performance fields explicitly published in the current KIOTI US loader catalog are stored. Missing SL2420/SL2530 fields are not backfilled from another market.',
        })],
      );
      sourceRecordId = Number(inserted.insertId);
    }

    for (const loader of loaders) {
      const details = [
        loader.compatibility,
        `${loader.breakoutLb.toLocaleString('en-US')} lb breakout force at pivot pin`,
        loader.bucketSizeIn !== undefined ? `${loader.bucketSizeIn} in bucket` : null,
        loader.ratedFlowGpm !== undefined ? `${loader.ratedFlowGpm} gpm rated flow` : null,
        loader.weightLb !== undefined ? `${loader.weightLb.toLocaleString('en-US')} lb loader weight` : null,
        loader.bucketCapacityFt3 !== undefined ? `${loader.bucketCapacityFt3} ft³ heaped bucket capacity` : null,
      ].filter((value): value is string => Boolean(value)).join('; ');

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
          details,
        ],
      );
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, loader.slug]);

      for (const machineSlug of loader.machineSlugs) {
        const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
        await c.query(
          `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES(?,?,?,?, 'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId, attachmentId, `Official KIOTI compatibility: ${loader.model} fits ${loader.compatibility}.`, sourceRecordId],
        );
      }
    }
  },
};
