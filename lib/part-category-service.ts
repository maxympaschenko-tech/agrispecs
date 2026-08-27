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
    EXISTS (SELECT 1 FROM machine_parts mp WHERE mp.part_id=p.id)
    OR EXISTS (SELECT 1 FROM part_cross_references pcr WHERE pcr.part_id=p.id OR pcr.cross_part_id=p.id)
    OR EXISTS (SELECT 1 FROM part_components pcomp WHERE pcomp.parent_part_id=p.id OR pcomp.component_part_id=p.id)
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
