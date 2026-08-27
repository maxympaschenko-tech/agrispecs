import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const targetParts = [
  'R140142270',
  'R240142280',
  '1G31143380',
  'HH1J143172',
  'HH16432430',
  'HHTA037710',
] as const;

export const kubotaM60FitmentDeduplicationMigration: DbMigration = {
  id: '20260827_151_kubota_m60_fitment_deduplication',
  description: 'Remove duplicate generic Kubota M60 service-filter fitments created after machine_parts moved to version-aware row IDs',
  async apply(connection) {
    const [rows] = await connection.query<IdRow[]>(`
      SELECT mp.id
      FROM machine_parts mp
      JOIN machines m ON m.id=mp.machine_id
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      JOIN parts p ON p.id=mp.part_id
      WHERE mf.slug='kubota'
        AND m.slug IN ('m5660su','m6060','m7060')
        AND p.normalized_part_number IN (${targetParts.map(() => '?').join(',')})
        AND mp.machine_version_id IS NULL
      ORDER BY mp.machine_id, mp.part_id, mp.id DESC
    `, [...targetParts]);

    const seen = new Set<string>();
    const deleteIds: number[] = [];

    for (const row of rows) {
      const [keyRows] = await connection.query<(RowDataPacket & { machine_id:number; part_id:number })[]>(
        `SELECT machine_id,part_id FROM machine_parts WHERE id=? LIMIT 1`,
        [Number(row.id)],
      );
      const current = keyRows[0];
      if (!current) continue;
      const key = `${Number(current.machine_id)}:${Number(current.part_id)}`;
      if (seen.has(key)) deleteIds.push(Number(row.id));
      else seen.add(key);
    }

    if (deleteIds.length > 0) {
      await connection.query(
        `DELETE FROM machine_parts WHERE id IN (${deleteIds.map(() => '?').join(',')})`,
        deleteIds,
      );
    }
  },
};
