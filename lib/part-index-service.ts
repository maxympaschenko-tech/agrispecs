import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

type IndexablePartRow = RowDataPacket & { normalized_part_number: string };
type IndexableManufacturerPartRow = RowDataPacket & {
  normalized_part_number: string;
  manufacturer_slug: string;
};

export type IndexableManufacturerPartRoute = {
  normalizedPartNumber: string;
  manufacturerSlug: string;
};

const indexableRelationshipSql = `
  (
    EXISTS (
      SELECT 1
      FROM machine_parts mp
      JOIN machines m ON m.id=mp.machine_id
        AND m.data_status IN ('partial','verified')
      WHERE mp.part_id=p.id
    )
    OR EXISTS (SELECT 1 FROM part_cross_references pcr WHERE pcr.part_id=p.id OR pcr.cross_part_id=p.id)
    OR EXISTS (SELECT 1 FROM part_components pc WHERE pc.parent_part_id=p.id OR pc.component_part_id=p.id)
  )
`;

export async function getIndexablePartNumbers(): Promise<string[]> {
  try {
    const db = await getDbReady();
    const [rows] = await db.query<IndexablePartRow[]>(`
      SELECT DISTINCT p.normalized_part_number
      FROM parts p
      WHERE p.data_status IN ('partial','verified')
        AND (
          SELECT COUNT(*)
          FROM parts same_number
          WHERE same_number.normalized_part_number=p.normalized_part_number
            AND same_number.data_status IN ('partial','verified')
        ) = 1
        AND ${indexableRelationshipSql}
      ORDER BY p.normalized_part_number ASC
    `);
    return rows.map((row) => row.normalized_part_number);
  } catch (error) {
    console.error('Unable to load indexable part numbers:', error);
    return [];
  }
}

export async function getIndexableManufacturerPartRoutes(): Promise<IndexableManufacturerPartRoute[]> {
  try {
    const db = await getDbReady();
    const [rows] = await db.query<IndexableManufacturerPartRow[]>(`
      SELECT p.normalized_part_number, mf.slug AS manufacturer_slug
      FROM parts p
      INNER JOIN manufacturers mf ON mf.id=p.manufacturer_id
      WHERE p.data_status IN ('partial','verified')
        AND (
          SELECT COUNT(*)
          FROM parts same_number
          WHERE same_number.normalized_part_number=p.normalized_part_number
            AND same_number.data_status IN ('partial','verified')
        ) > 1
        AND ${indexableRelationshipSql}
      ORDER BY p.normalized_part_number ASC, mf.slug ASC
    `);

    return rows.map((row) => ({
      normalizedPartNumber: row.normalized_part_number,
      manufacturerSlug: row.manufacturer_slug,
    }));
  } catch (error) {
    console.error('Unable to load indexable manufacturer-qualified part routes:', error);
    return [];
  }
}
