import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export type PartCatalogItem = {
  id: number;
  partNumber: string;
  normalizedPartNumber: string;
  name: string | null;
  categoryName: string | null;
  manufacturerName: string | null;
  manufacturerSlug: string | null;
  fitmentCount: number;
  relationCount: number;
  componentCount: number;
  kitMembershipCount: number;
};

type CatalogRow = RowDataPacket & {
  id: number;
  part_number: string;
  normalized_part_number: string;
  name: string | null;
  category_name: string | null;
  manufacturer_name: string | null;
  manufacturer_slug: string | null;
  fitment_count: number;
  relation_count: number;
  component_count: number;
  kit_membership_count: number;
};

export async function getPartCatalogItems(): Promise<PartCatalogItem[]> {
  try {
    const db = await getDbReady();
    const [rows] = await db.query<CatalogRow[]>(`
      SELECT
        p.id,
        p.part_number,
        p.normalized_part_number,
        p.name,
        pc.name AS category_name,
        mf.name AS manufacturer_name,
        mf.slug AS manufacturer_slug,
        (SELECT COUNT(DISTINCT mp.machine_id) FROM machine_parts mp WHERE mp.part_id=p.id) AS fitment_count,
        (
          (SELECT COUNT(*) FROM part_cross_references pcr1 WHERE pcr1.part_id=p.id) +
          (SELECT COUNT(*) FROM part_cross_references pcr2 WHERE pcr2.cross_part_id=p.id)
        ) AS relation_count,
        (SELECT COUNT(*) FROM part_components pco WHERE pco.parent_part_id=p.id) AS component_count,
        (SELECT COUNT(*) FROM part_components pci WHERE pci.component_part_id=p.id) AS kit_membership_count
      FROM parts p
      LEFT JOIN part_categories pc ON pc.id=p.category_id
      LEFT JOIN manufacturers mf ON mf.id=p.manufacturer_id
      WHERE p.data_status IN ('partial','verified')
        AND (
          EXISTS (SELECT 1 FROM machine_parts mp WHERE mp.part_id=p.id)
          OR EXISTS (SELECT 1 FROM part_cross_references pcr WHERE pcr.part_id=p.id OR pcr.cross_part_id=p.id)
          OR EXISTS (SELECT 1 FROM part_components pcomp WHERE pcomp.parent_part_id=p.id OR pcomp.component_part_id=p.id)
        )
      ORDER BY
        CASE WHEN mf.slug='john-deere' THEN 0 ELSE 1 END,
        mf.name ASC,
        pc.name ASC,
        p.part_number ASC
    `);

    return rows.map((row) => ({
      id: Number(row.id),
      partNumber: row.part_number,
      normalizedPartNumber: row.normalized_part_number,
      name: row.name,
      categoryName: row.category_name,
      manufacturerName: row.manufacturer_name,
      manufacturerSlug: row.manufacturer_slug,
      fitmentCount: Number(row.fitment_count || 0),
      relationCount: Number(row.relation_count || 0),
      componentCount: Number(row.component_count || 0),
      kitMembershipCount: Number(row.kit_membership_count || 0),
    }));
  } catch (error) {
    console.error('Unable to load parts catalog items:', error);
    return [];
  }
}
