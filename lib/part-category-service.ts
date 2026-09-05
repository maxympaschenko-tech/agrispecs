import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export type PartCategorySummary = {
  id: number;
  name: string;
  slug: string;
  parentName: string | null;
  parentSlug: string | null;
  partCount: number;
};

type CategoryRow = RowDataPacket & {
  id: number;
  name: string;
  slug: string;
  parent_name: string | null;
  parent_slug: string | null;
  part_count: number;
};

const indexablePartExists = `
  p.data_status IN ('partial','verified')
  AND (
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

function rowToCategory(row: CategoryRow): PartCategorySummary {
  return {
    id: Number(row.id),
    name: row.name,
    slug: row.slug,
    parentName: row.parent_name,
    parentSlug: row.parent_slug,
    partCount: Number(row.part_count || 0),
  };
}

export async function getPartCategories(): Promise<PartCategorySummary[]> {
  try {
    const db = await getDbReady();
    const [rows] = await db.query<CategoryRow[]>(`
      SELECT
        pc.id,
        pc.name,
        pc.slug,
        parent.name AS parent_name,
        parent.slug AS parent_slug,
        (
          SELECT COUNT(*)
          FROM parts p
          WHERE p.category_id=pc.id
            AND ${indexablePartExists}
        ) AS part_count
      FROM part_categories pc
      LEFT JOIN part_categories parent ON parent.id=pc.parent_id
      HAVING part_count > 0
      ORDER BY
        CASE WHEN parent.name IS NULL THEN 0 ELSE 1 END,
        COALESCE(parent.name,pc.name) ASC,
        pc.name ASC
    `);

    return rows.map(rowToCategory);
  } catch (error) {
    console.error('Unable to load part categories:', error);
    return [];
  }
}

export async function getPartCategory(slug: string): Promise<PartCategorySummary | undefined> {
  const normalized = decodeURIComponent(slug).trim().toLowerCase();
  if (!normalized) return undefined;

  try {
    const db = await getDbReady();
    const [rows] = await db.query<CategoryRow[]>(`
      SELECT
        pc.id,
        pc.name,
        pc.slug,
        parent.name AS parent_name,
        parent.slug AS parent_slug,
        (
          SELECT COUNT(*)
          FROM parts p
          WHERE p.category_id=pc.id
            AND ${indexablePartExists}
        ) AS part_count
      FROM part_categories pc
      LEFT JOIN part_categories parent ON parent.id=pc.parent_id
      WHERE pc.slug=?
      HAVING part_count > 0
      LIMIT 1
    `, [normalized]);

    return rows[0] ? rowToCategory(rows[0]) : undefined;
  } catch (error) {
    console.error('Unable to load part category:', error);
    return undefined;
  }
}
