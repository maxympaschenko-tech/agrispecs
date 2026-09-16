import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type ColumnRow = RowDataPacket & { count: number | string };

export const machineImageKindMigration: DbMigration = {
  id: '20260916_012_machine_image_kind',
  description: 'Track exact, family and representative semantics for database-backed machine images',
  async apply(connection) {
    const [rows] = await connection.query<ColumnRow[]>(`
      SELECT COUNT(*) AS count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'machine_images'
        AND COLUMN_NAME = 'image_kind'
    `);

    if (Number(rows[0]?.count || 0) === 0) {
      await connection.query(`
        ALTER TABLE machine_images
        ADD COLUMN image_kind VARCHAR(32) NOT NULL DEFAULT 'exact' AFTER alt_text
      `);
    }

    await connection.query(`
      UPDATE machine_images
      SET image_kind='exact'
      WHERE image_kind IS NULL OR image_kind NOT IN ('exact','family','representative')
    `);
  },
};
