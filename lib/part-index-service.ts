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
      JOIN source_records fitment_source ON fitment_source.id=mp.source_record_id
      WHERE mp.part_id=p.id
    )
    OR EXISTS (
      SELECT 1
      FROM part_cross_references pcr_out
      JOIN parts related_out ON related_out.id=pcr_out.cross_part_id
        AND related_out.data_status IN ('partial','verified')
      JOIN source_records relation_source_out ON relation_source_out.id=pcr_out.source_record_id
      WHERE pcr_out.part_id=p.id
    )
    OR EXISTS (
      SELECT 1
      FROM part_cross_references pcr_in
      JOIN parts related_in ON related_in.id=pcr_in.part_id
        AND related_in.data_status IN ('partial','verified')
      JOIN source_records relation_source_in ON relation_source_in.id=pcr_in.source_record_id
      WHERE pcr_in.cross_part_id=p.id
    )
    OR EXISTS (
      SELECT 1
      FROM part_components component_out
      JOIN parts related_component ON related_component.id=component_out.component_part_id
        AND related_component.data_status IN ('partial','verified')
      JOIN source_records component_source_out ON component_source_out.id=component_out.source_record_id
      WHERE component_out.parent_part_id=p.id
    )
    OR EXISTS (
      SELECT 1
      FROM part_components component_in
      JOIN parts related_kit ON related_kit.id=component_in.parent_part_id
        AND related_kit.data_status IN ('partial','verified')
      JOIN source_records component_source_in ON component_source_in.id=component_in.source_record_id
      WHERE component_in.component_part_id=p.id
    )
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
