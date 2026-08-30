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
  fit: string[];
  buildUrls: string[];
};

const SOURCE_URL = 'https://www.kioti.com/us/es/products/attachments/front-end-loaders';

const loaders: LoaderSeed[] = [
  {
    slug:'kl5520', model:'KL5520', liftCapacityLb:2474, liftHeightIn:107.7,
    breakoutLb:3895, bucketSizeIn:66, ratedFlowGpm:9.62, weightLb:1361,
    compatibility:'KIOTI DK20 Series',
    fit:['dk4520','dk5020','dk5520'],
    buildUrls:[
      'https://www.kioti.com/products/tractors/dk/dk4520/build',
      'https://www.kioti.com/products/tractors/dk/dk5020/build',
      'https://www.kioti.com/products/tractors/dk/dk5520/build',
    ],
  },
  {
    slug:'kl5521', model:'KL5521', liftCapacityLb:2474, liftHeightIn:107.7,
    breakoutLb:3895, bucketSizeIn:72, ratedFlowGpm:4.2, weightLb:946,
    compatibility:'KIOTI DK20SE models confirmed by current US Build & Price pages',
    fit:['dk4220seh','dk4220seh-cab','dk4720seh-cab','dk5320seh','dk5320seh-cab','dk6020seh','dk6020seh-cab'],
    buildUrls:[
      'https://www.kioti.com/products/tractors/dk/dk4220seh/build',
      'https://www.kioti.com/products/tractors/dk/dk4220seh-cab/build',
      'https://www.kioti.com/products/tractors/dk/dk4720seh-cab/build',
      'https://www.kioti.com/products/tractors/dk/dk5320hse/build',
      'https://www.kioti.com/products/tractors/dk/dk5320hse-cab/build',
      'https://www.kioti.com/products/tractors/dk/dk6020hse/build',
      'https://www.kioti.com/products/tractors/dk/dk6020hse-cab/build',
    ],
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], q: string, p: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(q, p);
  if (!rows[0]) throw new Error('KIOTI DK loader migration dependency missing');
  return Number(rows[0].id);
}

export const kiotiDkLoadersMigration: DbMigration = {
  id:'20260830_337_kioti_dk_loaders',
  description:'Add verified KIOTI KL5520 and KL5521 front-end loaders with current US DK fitment',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='kioti' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='KIOTI' AND domain='kioti.com' LIMIT 1`);

    for (const loader of loaders) {
      const externalId = `kioti-${loader.slug}-dk-current-us-2026-08`;
      const [existing] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
      let sourceRecordId = existing[0]?.id ? Number(existing[0].id) : 0;
      if (!sourceRecordId) {
        const [inserted] = await c.query<ResultSetHeader>(
          `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
          [sourceId,SOURCE_URL,externalId,`KIOTI US ${loader.model} loader specifications and DK fitment`,JSON.stringify({
            market:'United States',captured:'2026-08-30',loader,sourcePolicy:'Performance values come from the official KIOTI US attachment catalog. Model fitment is limited to current US Build & Price pages that explicitly list the loader.',
            exclusion:'DK4720SEH ROPS is intentionally not linked because its current US Build & Price page does not list a front-end loader option.',
          })],
        );
        sourceRecordId = Number(inserted.insertId);
      }

      await c.query(
        `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES(?,'front-loader',?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId,loader.model,loader.slug,`${loader.liftCapacityLb.toLocaleString('en-US')} lb to full height`,`${loader.liftHeightIn} in maximum pivot-pin height`,`${loader.compatibility}; ${loader.breakoutLb.toLocaleString('en-US')} lb breakout force at pivot pin; ${loader.bucketSizeIn} in bucket; ${loader.ratedFlowGpm} gpm rated flow; ${loader.weightLb.toLocaleString('en-US')} lb loader weight`],
      );
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId,loader.slug]);

      for (const machineSlug of loader.fit) {
        const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId,machineSlug]);
        await c.query(
          `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES(?,?,?,?, 'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId,attachmentId,`Current KIOTI US Build & Price lists ${loader.model} for ${machineSlug}.`,sourceRecordId],
        );
      }
    }
  },
};
