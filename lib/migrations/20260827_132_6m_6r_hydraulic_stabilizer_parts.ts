import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type PartSeed = {
  number: string;
  name: string;
  category: string;
  categoryName: string;
  externalId: string;
  url: string;
  configuration: string;
  models: readonly string[];
  note: string;
};

const allCurrentTargets = [
  '6m-95','6m-105','6m-115','6m-125','6m-130','6m-140','6m-150',
  '6r-110','6r-120','6r-130','6r-140','6r-150','6r-175','6r-195',
] as const;

const parts: PartSeed[] = [
  {
    number: 'AL231796',
    name: 'Hydraulic Actuated Control Valve',
    category: 'hydraulic-control-valves',
    categoryName: 'Hydraulic Control Valves',
    externalId: 'jd-shop-al231796-6m-6r-fitment-2026-08',
    url: 'https://shop.deere.com/us/product/AL231796%3A-Hydraulic-Actuated-Control-Valve/p/AL231796',
    configuration: 'Hydraulic control system',
    models: allCurrentTargets,
    note: 'John Deere Shop lists AL231796 Hydraulic Actuated Control Valve as general compatible-equipment fitment for this tractor.',
  },
  {
    number: 'AL201127',
    name: 'Automatic Stabilizer Bar Brace',
    category: 'hitch-stabilizer-parts',
    categoryName: 'Hitch Stabilizer Parts',
    externalId: 'jd-shop-al201127-6r-fitment-2026-08',
    url: 'https://shop.deere.com/uk/product/AL201127%3A-Automatic-Stabilizer-Bar-Brace/p/AL201127',
    configuration: 'Rear hitch stabilizer',
    models: ['6r-175','6r-195'],
    note: 'John Deere Shop lists AL201127 Automatic Stabilizer Bar Brace as general compatible-equipment fitment for this tractor.',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing 6M/6R hydraulic/stabilizer migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  part: PartSeed,
) {
  const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [part.externalId]);
  if (existing[0]) return Number(existing[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId,part.url,part.externalId,`John Deere ${part.number} ${part.name} - compatible equipment`],
  );
  return Number(result.insertId);
}

export const johnDeere6M6RHydraulicStabilizerPartsMigration: DbMigration = {
  id: '20260827_132_6m_6r_hydraulic_stabilizer_parts',
  description: 'Add official Shop.Deere AL231796 hydraulic-control fitment for selected 6M/6R tractors and AL201127 stabilizer-brace fitment for 6R 175/195',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    for (const part of parts) {
      await connection.query(
        `INSERT INTO part_categories (name,slug) VALUES (?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [part.categoryName,part.category],
      );
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [part.category]);
      const sourceRecordId = await ensureSourceRecord(connection,sourceId,part);

      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,part.number,part.number,part.name],
      );
      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId,part.number],
      );

      for (const modelSlug of part.models) {
        const machineId = await selectId(connection, `
          SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
          WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1
        `, [modelSlug]);
        const note = `${modelSlug.toUpperCase()}: ${part.note} Confirm machine configuration before installation.`;
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
          [machineId,partId,note],
        );
        if (!existing[0]) {
          await connection.query(
            `INSERT INTO machine_parts (machine_id,part_id,fitment_note,configuration_note,source_record_id)
             VALUES (?,?,?,?,?)`,
            [machineId,partId,note,part.configuration,sourceRecordId],
          );
        }
      }
    }
  },
};
