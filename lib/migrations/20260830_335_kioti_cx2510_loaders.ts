import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const machineSlugs = ['cx2510', 'cx2510h', 'cx2510h-cab'];
const US_LOADER_URL = 'https://www.kioti.com/products/attachments/front-end-loaders';
const US_BUILD_URL = 'https://www.kioti.com/products/tractors/cx/cx2510/build';

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('KIOTI CX loader migration dependency missing');
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

export const kiotiCx2510LoadersMigration: DbMigration = {
  id: '20260830_335_kioti_cx2510_loaders',
  description: 'Add KIOTI KL2510 full US loader specs and source-safe KL2510C US build fitment for the current CX2510 family',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='kioti' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='KIOTI' AND domain='kioti.com' LIMIT 1`);

    const kl2510Source = await ensureSource(
      c,
      sourceId,
      'kioti-kl2510-current-us-2026-08',
      US_LOADER_URL,
      'KIOTI US KL2510 front-end loader specifications',
      {
        market: 'United States',
        captured: '2026-08-30',
        model: 'KL2510',
        compatibility: 'CX Series',
        liftHeightIn: 87.8,
        liftCapacityLb: 1092,
        breakoutLb: 1843,
        bucketSizeIn: 50,
        ratedFlowGpm: 6.86,
        weightLb: 605,
        bucketCapacityFt3: 7.8,
      },
    );

    const kl2510cSource = await ensureSource(
      c,
      sourceId,
      'kioti-kl2510c-current-us-build-fitment-2026-08',
      US_BUILD_URL,
      'KIOTI US CX2510 build configurator KL2510C fitment',
      {
        market: 'United States',
        captured: '2026-08-30',
        model: 'KL2510C',
        compatibility: 'Current US CX2510-family build configurators offer KL2510C',
        additionalBuildPages: [
          'https://www.kioti.com/products/tractors/cx/cx2510h/build',
          'https://www.kioti.com/products/tractors/cx/cx2510hcb/build',
        ],
        sourcePolicy: 'The US attachment table labels the KL2510C performance row as CX Series in Canada, so those performance values are intentionally not imported into the US record.',
      },
    );

    await c.query(
      `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES(?,'front-loader','KL2510','kl2510','1,092 lb to full height','87.8 in maximum pivot-pin height','CX Series; 1,843 lb breakout force at pivot pin; 50 in bucket; 6.86 gpm rated flow; 605 lb loader weight; 7.8 ft³ heaped bucket capacity','verified')
       ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId],
    );
    const kl2510Id = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug='kl2510' LIMIT 1`, [manufacturerId]);

    await c.query(
      `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES(?,'front-loader','KL2510C','kl2510c',NULL,NULL,'Current US CX2510-family build option; performance values intentionally omitted because the current attachment table labels that performance row for Canada','verified')
       ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=NULL,lift_height_text=NULL,configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId],
    );
    const kl2510cId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug='kl2510c' LIMIT 1`, [manufacturerId]);

    for (const machineSlug of machineSlugs) {
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
      await c.query(
        `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES(?,?,?,?, 'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId, kl2510Id, 'Official KIOTI compatibility: KL2510 fits the CX Series; current US CX2510-family build pages offer this loader.', kl2510Source],
      );
      await c.query(
        `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES(?,?,?,?, 'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId, kl2510cId, 'Official KIOTI US build fitment: KL2510C is offered for the current CX2510 family. US performance values are not inferred from the Canada-labeled attachment table row.', kl2510cSource],
      );
    }
  },
};
