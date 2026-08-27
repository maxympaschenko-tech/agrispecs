import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type CountRow = RowDataPacket & { count: number };

export const machinePartFitmentConfidenceMigration: DbMigration = {
  id: '20260827_142_machine_part_fitment_confidence',
  description: 'Add explicit confidence level to machine-to-part fitment relationships',
  async apply(connection) {
    const [rows] = await connection.query<CountRow[]>(`
      SELECT COUNT(*) AS count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA=DATABASE()
        AND TABLE_NAME='machine_parts'
        AND COLUMN_NAME='fitment_confidence'
    `);

    if (Number(rows[0]?.count || 0) === 0) {
      await connection.query(`
        ALTER TABLE machine_parts
        ADD COLUMN fitment_confidence ENUM('official','high','medium','low') NOT NULL DEFAULT 'official'
        AFTER source_record_id
      `);
    }
  },
};
