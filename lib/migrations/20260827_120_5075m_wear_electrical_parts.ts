import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type PartSeed = {
  number: string;
  name: string;
  category: string;
  categoryName: string;
  configuration?: string | null;
  note: string;
};

const parts: PartSeed[] = [
  { number:'SJ20988', name:'PTO Clutch Disk', category:'clutch-parts', categoryName:'Clutch Parts', configuration:'PTO', note:'5075M PTO clutch disk listed in the official North America Replacement Parts Guide.' },
  { number:'SJ27050', name:'Brake Disk', category:'brake-parts', categoryName:'Brake Parts', note:'5075M brake disk listed in the official North America Replacement Parts Guide.' },
  { number:'RE554568', name:'Alternator - 120 A', category:'alternators', categoryName:'Alternators', configuration:'120 A', note:'5075M 120 A alternator option listed in the official North America Replacement Parts Guide.' },
  { number:'DZ123153', name:'Alternator - 90 A', category:'alternators', categoryName:'Alternators', configuration:'90 A', note:'5075M 90 A alternator option listed in the official North America Replacement Parts Guide.' },
  { number:'AXE66451', name:'Battery', category:'batteries', categoryName:'Batteries', note:'5075M battery listed in the official North America Replacement Parts Guide.' },
  { number:'RE217616', name:'Tie Rod', category:'steering-parts', categoryName:'Steering Parts', configuration:'2WD front axle', note:'5075M tie rod for 2WD front axle.' },
  { number:'RE217817', name:'Tie Rod End', category:'steering-parts', categoryName:'Steering Parts', configuration:'2WD front axle', note:'5075M steering tie rod end listed with the 2WD steering components.' },
  { number:'RE217819', name:'Steering Ball Joint', category:'steering-parts', categoryName:'Steering Parts', configuration:'2WD front axle', note:'5075M steering ball joint listed with the 2WD steering components.' },
  { number:'RE271437', name:'Tie Rod', category:'steering-parts', categoryName:'Steering Parts', configuration:'MFWD front axle', note:'5075M tie rod for MFWD front axle.' },
  { number:'RE271440', name:'Steering Ball Joint', category:'steering-parts', categoryName:'Steering Parts', configuration:'MFWD front axle', note:'5075M steering ball joint for MFWD front axle.' },
  { number:'RE271441', name:'90 Degree Steering Joint', category:'steering-parts', categoryName:'Steering Parts', configuration:'MFWD front axle', note:'5075M 90 degree steering joint listed with the MFWD steering components.' },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing 5075M wear/electrical part dependency.');
  return Number(rows[0].id);
}

export const johnDeere5075MWearElectricalPartsMigration: DbMigration = {
  id: '20260827_120_5075m_wear_electrical_parts',
  description: 'Add official John Deere 5075M PTO clutch, brake, alternator, battery and steering replacement parts',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const machineId = await selectId(connection, `
      SELECT m.id FROM machines m
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='john-deere' AND m.slug='5075m'
      LIMIT 1
    `);
    const sourceRecordId = await selectId(connection, `SELECT id FROM source_records WHERE external_id='jd-rpg-5075m-na-2023-01' ORDER BY id LIMIT 1`);

    for (const part of parts) {
      await connection.query(
        `INSERT INTO part_categories (name,slug) VALUES (?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [part.categoryName,part.category],
      );
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [part.category]);

      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,part.number,part.number,part.name],
      );
      const partId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,part.number]);

      const [existing] = await connection.query<IdRow[]>(`
        SELECT id FROM machine_parts
        WHERE machine_id=? AND part_id=?
          AND COALESCE(configuration_note,'')=COALESCE(?,'')
          AND fitment_note=?
        LIMIT 1
      `, [machineId,partId,part.configuration ?? null,part.note]);

      if (existing[0]) {
        await connection.query(
          `UPDATE machine_parts SET source_record_id=? WHERE id=?`,
          [sourceRecordId,Number(existing[0].id)],
        );
      } else {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,fitment_note,configuration_note,source_record_id)
           VALUES (?,?,?,?,?)`,
          [machineId,partId,part.note,part.configuration ?? null,sourceRecordId],
        );
      }
    }
  },
};
