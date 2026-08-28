import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

async function id(
  c: Parameters<DbMigration['apply']>[0],
  sql: string,
  p: unknown[] = [],
) {
  const [rows] = await c.query<IdRow[]>(sql, p);
  if (!rows[0]) throw new Error('Farmall Medium Utility A loader correction dependency missing');
  return Number(rows[0].id);
}

export const caseIHFarmallMediumUtilityALoaderCorrectionsMigration: DbMigration = {
  id: '20260828_260_case_ih_farmall_medium_utility_a_loader_corrections',
  description: 'Correct L625 fitments and add official L575 fitments for current Farmall Medium Utility A tractors',
  async apply(c) {
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const l625 = await id(
      c,
      `SELECT id FROM attachments WHERE manufacturer_id=? AND slug='l625-farmall-medium-utility-a' LIMIT 1`,
      [mf],
    );

    await c.query(
      `UPDATE attachments
       SET lift_capacity_text=NULL,
           lift_height_text=NULL,
           configuration_text='Designed for Farmall Medium Utility A 90A, 100A, 110A and 120A',
           data_status='verified'
       WHERE id=?`,
      [l625],
    );

    await c.query(
      `DELETE ma
       FROM machine_attachments ma
       JOIN machines m ON m.id=ma.machine_id
       WHERE ma.attachment_id=?
         AND m.slug IN ('farmall-95a','farmall-105a','farmall-115a')`,
      [l625],
    );

    const [sourceRows] = await c.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' LIMIT 1`,
    );
    const sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) throw new Error('Case IH source missing');

    const externalId = 'case-ih-farmall-medium-utility-a-l575-current';
    const url = 'https://www.caseih.com/en-us/unitedstates/products/tractors/farmall-medium-utility-a-series/farmall-medium-utility-95a';
    const [recordRows] = await c.query<IdRow[]>(
      `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
      [externalId],
    );

    let sourceRecordId = recordRows[0]?.id ? Number(recordRows[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await c.query<ResultSetHeader>(
        `INSERT INTO source_records(source_id,url,external_id,title,raw_reference)
         VALUES(?,?,?,?,?)`,
        [
          sourceId,
          url,
          externalId,
          'Case IH L575 official loader compatibility for Farmall Medium Utility A',
          JSON.stringify({
            loader: 'L575',
            models: ['Farmall Utility 95A', 'Farmall Utility 105A', 'Farmall Utility 115A'],
            maxLiftCapacityLb: 3174,
            maxHeightIn: 134.5,
            boomBreakoutForceLb: 3372,
          }),
        ],
      );
      sourceRecordId = Number(result.insertId);
    }

    await c.query(
      `INSERT INTO attachments(
         manufacturer_id,attachment_type,model_name,slug,
         lift_capacity_text,lift_height_text,configuration_text,data_status
       ) VALUES(
         ?,'front-loader','L575','l575-farmall-medium-utility-a',
         'up to 3,174 lb','up to 134.5 in',
         'Designed for Farmall Medium Utility A 95A, 105A and 115A; boom breakout up to 3,372 lb',
         'verified'
       )
       ON DUPLICATE KEY UPDATE
         model_name='L575',
         lift_capacity_text='up to 3,174 lb',
         lift_height_text='up to 134.5 in',
         configuration_text='Designed for Farmall Medium Utility A 95A, 105A and 115A; boom breakout up to 3,372 lb',
         data_status='verified'`,
      [mf],
    );

    const l575 = await id(
      c,
      `SELECT id FROM attachments WHERE manufacturer_id=? AND slug='l575-farmall-medium-utility-a' LIMIT 1`,
      [mf],
    );

    for (const slug of ['farmall-95a', 'farmall-105a', 'farmall-115a']) {
      const machineId = await id(
        c,
        `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,
        [mf, slug],
      );
      await c.query(
        `INSERT INTO machine_attachments(
           machine_id,attachment_id,compatibility_note,source_record_id,confidence
         ) VALUES(?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE
           compatibility_note=VALUES(compatibility_note),
           source_record_id=VALUES(source_record_id),
           confidence='official'`,
        [machineId, l575, `Official Case IH L575 compatibility for ${slug}.`, sourceRecordId],
      );
    }
  },
};
