import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

type IndexablePartRow = RowDataPacket & { normalized_part_number: string };

export async function getIndexablePartNumbers(): Promise<string[]> {
  try {
    const db = await getDbReady();
    const [rows] = await db.query<IndexablePartRow[]>(`
      SELECT DISTINCT p.normalized_part_number
      FROM parts p
      WHERE p.data_status IN ('partial','verified')
        AND (
          EXISTS (SELECT 1 FROM machine_parts mp WHERE mp.part_id=p.id)
          OR EXISTS (SELECT 1 FROM part_cross_references pcr WHERE pcr.part_id=p.id OR pcr.cross_part_id=p.id)
          OR EXISTS (SELECT 1 FROM part_components pc WHERE pc.parent_part_id=p.id OR pc.component_part_id=p.id)
        )
      ORDER BY p.normalized_part_number ASC
    `);
    return rows.map((row) => row.normalized_part_number);
  } catch (error) {
    console.error('Unable to load indexable part numbers:', error);
    return [];
  }
}
