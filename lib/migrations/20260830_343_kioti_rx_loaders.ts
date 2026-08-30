import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type LoaderSeed = {
  slug: string;
  model: string;
  liftCapacityLb: number;
  liftHeightIn: number;
  configuration: string;
  fit: string[];
  fitmentEvidence: string;
  buildUrls?: string[];
};

const SOURCE_URL = 'https://www.kioti.com/products/attachments/front-end-loaders';

const loaders: LoaderSeed[] = [
  {
    slug: 'kl7320',
    model: 'KL7320',
    liftCapacityLb: 3384,
    liftHeightIn: 133.9,
    configuration: 'Fits the RX6620/7320 models; 5,359 lb breakout force at pivot pin; 82 in bucket; 428 lb bucket weight; 1,896 lb loader weight; 2,631 psi relief valve setting; 10.57 gpm rated flow; 10.10 ft³ heaped bucket capacity',
    fit: ['rx6620','rx6620-cab','rx6620p','rx6620p-cab','rx7320','rx7320-cab','rx7320p','rx7320pc-cab','rx7320pcc-cab'],
    fitmentEvidence: 'Official KIOTI US attachment catalog explicitly states KL7320 fits RX6620/7320 model tractors.',
  },
  {
    slug: 'kl7340',
    model: 'KL7340',
    liftCapacityLb: 3384,
    liftHeightIn: 127.1,
    configuration: 'Current KIOTI loader; 93.58 in dumped clearance; 55° maximum dump angle; 83.62 in reach at ground; 51° maximum rollback; 6.22 in digging depth; 69.37 in maximum carry height; 24.09 in bucket depth; 17.40 in reach at maximum height. Breakout force, bucket size, loader weight and rated flow are not published in the current US attachment table and are intentionally omitted.',
    fit: ['rx6640p','rx6640p-cab','rx7340p','rx7340p-cab','rx7340pcc-cab'],
    fitmentEvidence: 'The current KIOTI US attachment table leaves KL7340 compatibility blank, so fitment is limited to current US Build & Price pages that explicitly list Front End Loader KL7340.',
    buildUrls: [
      'https://www.kioti.com/products/tractors/rx/rx6640p/build',
      'https://www.kioti.com/products/tractors/rx/rx6640pc/build',
      'https://www.kioti.com/products/tractors/rx/rx7340p/build',
      'https://www.kioti.com/products/tractors/rx/rx7340pc/build',
      'https://www.kioti.com/products/tractors/rx/rx7340pcc/build',
    ],
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], q: string, p: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(q, p);
  if (!rows[0]) throw new Error('KIOTI RX loader migration dependency missing');
  return Number(rows[0].id);
}

export const kiotiRxLoadersMigration: DbMigration = {
  id: '20260830_343_kioti_rx_loaders',
  description: 'Add verified KIOTI KL7320 and KL7340 front-end loaders with source-specific current US RX fitment',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='kioti' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='KIOTI' AND domain='kioti.com' LIMIT 1`);

    for (const loader of loaders) {
      const externalId = `kioti-${loader.slug}-rx-current-us-2026-08`;
      const [existing] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
      let sourceRecordId = existing[0]?.id ? Number(existing[0].id) : 0;
      if (!sourceRecordId) {
        const [inserted] = await c.query<ResultSetHeader>(
          `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
          [
            sourceId,
            SOURCE_URL,
            externalId,
            `KIOTI US ${loader.model} front-end loader specifications and RX fitment`,
            JSON.stringify({
              market: 'United States',
              captured: '2026-08-30',
              loader,
              fitmentEvidence: loader.fitmentEvidence,
              sourcePolicy: loader.slug === 'kl7340'
                ? 'KL7340 performance stores only values explicitly published in the current US attachment table. Compatibility is not inferred from the blank catalog field; exact current US Build & Price pages are used instead.'
                : 'KL7320 performance and RX6620/7320 compatibility come directly from the current official KIOTI US attachment catalog.',
            }),
          ],
        );
        sourceRecordId = Number(inserted.insertId);
      }

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
          loader.configuration,
        ],
      );
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, loader.slug]);

      for (const machineSlug of loader.fit) {
        const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
        await c.query(
          `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES(?,?,?,?, 'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId, attachmentId, loader.slug === 'kl7320'
            ? `Official KIOTI compatibility: KL7320 fits RX6620/7320 model tractors (${machineSlug}).`
            : `Current KIOTI US Build & Price explicitly lists KL7340 for ${machineSlug}.`, sourceRecordId],
        );
      }
    }
  },
};
