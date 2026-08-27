import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type CountRow = RowDataPacket & { count: number };

async function ensureColumn(connection: Parameters<DbMigration['apply']>[0], name: string, definition: string) {
  const [rows] = await connection.query<CountRow[]>(`
    SELECT COUNT(*) AS count FROM information_schema.columns
    WHERE table_schema=DATABASE() AND table_name='machine_parts' AND column_name=?
  `, [name]);
  if (Number(rows[0]?.count || 0) === 0) {
    await connection.query(`ALTER TABLE machine_parts ADD COLUMN ${name} ${definition}`);
  }
}

export const structuredSerialFitmentMigration: DbMigration = {
  id: '20260827_107_structured_serial_fitment',
  description: 'Add structured serial-number and configuration constraints to machine part fitment',
  async apply(connection) {
    await ensureColumn(connection, 'serial_prefix', 'VARCHAR(32) NULL');
    await ensureColumn(connection, 'serial_from', 'VARCHAR(64) NULL');
    await ensureColumn(connection, 'serial_to', 'VARCHAR(64) NULL');
    await ensureColumn(connection, 'configuration_note', 'VARCHAR(255) NULL');

    await connection.query(`
      UPDATE machine_parts mp
      JOIN machines m ON m.id=mp.machine_id
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      JOIN parts p ON p.id=mp.part_id
      SET mp.serial_from='117914'
      WHERE mf.slug='john-deere' AND m.slug='1023e' AND p.normalized_part_number='TA25769'
    `);
    await connection.query(`
      UPDATE machine_parts mp
      JOIN machines m ON m.id=mp.machine_id
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      JOIN parts p ON p.id=mp.part_id
      SET mp.serial_from='153037'
      WHERE mf.slug='john-deere' AND m.slug='1025r' AND p.normalized_part_number='TA25769'
    `);
    await connection.query(`
      UPDATE machine_parts mp
      JOIN machines m ON m.id=mp.machine_id
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      JOIN parts p ON p.id=mp.part_id
      SET mp.serial_from='103921'
      WHERE mf.slug='john-deere' AND m.slug='2025r' AND p.normalized_part_number='TA25769'
    `);
    await connection.query(`
      UPDATE machine_parts mp
      JOIN machines m ON m.id=mp.machine_id
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      JOIN parts p ON p.id=mp.part_id
      SET mp.serial_prefix='JJ', mp.serial_from='153037'
      WHERE mf.slug='john-deere' AND m.slug='1025r' AND p.normalized_part_number IN ('LVU34503','LVU34504')
    `);
    await connection.query(`
      UPDATE machine_parts mp
      JOIN machines m ON m.id=mp.machine_id
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      JOIN parts p ON p.id=mp.part_id
      SET mp.serial_to='034279'
      WHERE mf.slug='john-deere' AND m.slug='5075m' AND p.normalized_part_number='RE519626'
    `);
    await connection.query(`
      UPDATE machine_parts mp
      JOIN machines m ON m.id=mp.machine_id
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      JOIN parts p ON p.id=mp.part_id
      SET mp.serial_from='034280'
      WHERE mf.slug='john-deere' AND m.slug='5075m' AND p.normalized_part_number='DZ114256'
    `);
  },
};
