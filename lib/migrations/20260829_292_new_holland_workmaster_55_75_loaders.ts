import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://agriculture.newholland.com/en-us/nar/products/tractors-telehandlers/workmaster-utility-55-75-series/workmaster-55';
const MACHINE_SLUGS = ['workmaster-55', 'workmaster-65', 'workmaster-75'];
const LOADERS = [
  { model: '550LU', slug: '550lu-workmaster-55-75' },
  { model: '555LU', slug: '555lu-workmaster-55-75' },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('New Holland WORKMASTER 55-75 loader dependency missing');
  return Number(rows[0].id);
}

export const newHollandWorkmaster5575LoadersMigration: DbMigration = {
  id: '20260829_292_new_holland_workmaster_55_75_loaders',
  description: 'Add official New Holland 550LU and 555LU loader fitments for WORKMASTER 55, 65 and 75',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' LIMIT 1`);

    const externalId = 'new-holland-workmaster-55-75-loaders-current-nar-2026-08';
    let [recordRows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
    let sourceRecordId = recordRows[0]?.id ? Number(recordRows[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await c.query<ResultSetHeader>(
        `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
        [sourceId, SOURCE_URL, externalId, 'New Holland North America WORKMASTER 55-75 factory-installed loader compatibility', JSON.stringify({ loaders: ['550LU', '555LU'], tractors: MACHINE_SLUGS })],
      );
      sourceRecordId = Number(result.insertId);
    }

    for (const loader of LOADERS) {
      await c.query(
        `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,configuration_text,data_status)
         VALUES(?,'front-loader',?,?,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId, loader.model, loader.slug, 'Factory-installed loader designed for New Holland WORKMASTER 55, 65 and 75 utility tractors.'],
      );
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, loader.slug]);

      for (const machineSlug of MACHINE_SLUGS) {
        const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
        await c.query(
          `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES(?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId, attachmentId, `Official New Holland factory-installed ${loader.model} loader compatibility for WORKMASTER 55-75 Series.`, sourceRecordId],
        );
      }
    }
  },
};
