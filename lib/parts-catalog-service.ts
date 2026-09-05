import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
import { withServerTtlCache } from '@/lib/server-ttl-cache';

export const PARTS_PAGE_SIZE = 36;
const PARTS_COUNT_TTL_MS = 5 * 60 * 1000;

export type PartCatalogItem = {
  id: number;
  partNumber: string;
  normalizedPartNumber: string;
  name: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  manufacturerName: string | null;
  manufacturerSlug: string | null;
  fitmentCount: number;
  relationCount: number;
  componentCount: number;
  kitMembershipCount: number;
};

export type PartCatalogPage = {
  items: PartCatalogItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type PartCatalogStats = {
  total: number;
  replacementLinked: number;
  kitLinked: number;
  aftermarket: number;
};

type CatalogRow = RowDataPacket & {
  id: number;
  part_number: string;
  normalized_part_number: string;
  name: string | null;
  category_name: string | null;
  category_slug: string | null;
  manufacturer_name: string | null;
  manufacturer_slug: string | null;
  fitment_count: number;
  relation_count: number;
  component_count: number;
  kit_membership_count: number;
};

type CountRow = RowDataPacket & { total: number };
type StatsRow = RowDataPacket & {
  total: number;
  replacement_linked: number | null;
  kit_linked: number | null;
  aftermarket: number | null;
};

const indexablePartCondition = `
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

function rowToItem(row: CatalogRow): PartCatalogItem {
  return {
    id: Number(row.id),
    partNumber: row.part_number,
    normalizedPartNumber: row.normalized_part_number,
    name: row.name,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    manufacturerName: row.manufacturer_name,
    manufacturerSlug: row.manufacturer_slug,
    fitmentCount: Number(row.fitment_count || 0),
    relationCount: Number(row.relation_count || 0),
    componentCount: Number(row.component_count || 0),
    kitMembershipCount: Number(row.kit_membership_count || 0),
  };
}

function normalizePage(value: number | undefined) {
  if (!Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value as number));
}

function normalizePageSize(value: number | undefined) {
  if (!Number.isFinite(value)) return PARTS_PAGE_SIZE;
  return Math.max(1, Math.min(100, Math.floor(value as number)));
}

export async function getPartCatalogPage(options: {
  categorySlug?: string;
  page?: number;
  pageSize?: number;
} = {}): Promise<PartCatalogPage> {
  const requestedPage = normalizePage(options.page);
  const pageSize = normalizePageSize(options.pageSize);

  try {
    const db = await getDbReady();
    const params: unknown[] = [];
    const categoryFilter = options.categorySlug ? 'AND pc.slug = ?' : '';
    if (options.categorySlug) params.push(options.categorySlug);
    const countCacheKey = `parts:catalog-count:${options.categorySlug?.trim().toLowerCase() || 'all'}`;

    const total = await withServerTtlCache(
      countCacheKey,
      PARTS_COUNT_TTL_MS,
      async () => {
        const [countRows] = await db.query<CountRow[]>(`
          SELECT COUNT(*) AS total
          FROM parts p
          LEFT JOIN part_categories pc ON pc.id=p.category_id
          WHERE ${indexablePartCondition}
            ${categoryFilter}
        `, params);
        return Number(countRows[0]?.total || 0);
      },
      (value) => value > 0,
    );

    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    const offset = (requestedPage - 1) * pageSize;

    if (total === 0 || requestedPage > totalPages) {
      return { items: [], total, page: requestedPage, pageSize, totalPages };
    }

    const itemParams = [...params, pageSize, offset];
    const [rows] = await db.query<CatalogRow[]>(`
      SELECT
        p.id,
        p.part_number,
        p.normalized_part_number,
        p.name,
        pc.name AS category_name,
        pc.slug AS category_slug,
        mf.name AS manufacturer_name,
        mf.slug AS manufacturer_slug,
        (
          SELECT COUNT(DISTINCT mp.machine_id)
          FROM machine_parts mp
          JOIN machines m_fitment ON m_fitment.id=mp.machine_id
            AND m_fitment.data_status IN ('partial','verified')
          JOIN source_records fitment_source ON fitment_source.id=mp.source_record_id
          WHERE mp.part_id=p.id
        ) AS fitment_count,
        (
          (SELECT COUNT(*)
           FROM part_cross_references pcr1
           JOIN parts related1 ON related1.id=pcr1.cross_part_id
             AND related1.data_status IN ('partial','verified')
           JOIN source_records source1 ON source1.id=pcr1.source_record_id
           WHERE pcr1.part_id=p.id) +
          (SELECT COUNT(*)
           FROM part_cross_references pcr2
           JOIN parts related2 ON related2.id=pcr2.part_id
             AND related2.data_status IN ('partial','verified')
           JOIN source_records source2 ON source2.id=pcr2.source_record_id
           WHERE pcr2.cross_part_id=p.id)
        ) AS relation_count,
        (
          SELECT COUNT(*)
          FROM part_components pco
          JOIN parts component_part ON component_part.id=pco.component_part_id
            AND component_part.data_status IN ('partial','verified')
          JOIN source_records component_source ON component_source.id=pco.source_record_id
          WHERE pco.parent_part_id=p.id
        ) AS component_count,
        (
          SELECT COUNT(*)
          FROM part_components pci
          JOIN parts parent_part ON parent_part.id=pci.parent_part_id
            AND parent_part.data_status IN ('partial','verified')
          JOIN source_records kit_source ON kit_source.id=pci.source_record_id
          WHERE pci.component_part_id=p.id
        ) AS kit_membership_count
      FROM parts p
      LEFT JOIN part_categories pc ON pc.id=p.category_id
      LEFT JOIN manufacturers mf ON mf.id=p.manufacturer_id
      WHERE ${indexablePartCondition}
        ${categoryFilter}
      ORDER BY
        CASE WHEN mf.slug='john-deere' THEN 0 ELSE 1 END,
        mf.name ASC,
        pc.name ASC,
        p.part_number ASC
      LIMIT ? OFFSET ?
    `, itemParams);

    return {
      items: rows.map(rowToItem),
      total,
      page: requestedPage,
      pageSize,
      totalPages,
    };
  } catch (error) {
    console.error('Unable to load paginated parts catalog:', error);
    return { items: [], total: 0, page: requestedPage, pageSize, totalPages: 0 };
  }
}

export async function getPartCatalogStats(categorySlug?: string): Promise<PartCatalogStats> {
  try {
    const db = await getDbReady();
    const params: unknown[] = [];
    const categoryFilter = categorySlug ? 'AND pc.slug = ?' : '';
    if (categorySlug) params.push(categorySlug);

    const [rows] = await db.query<StatsRow[]>(`
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN
          EXISTS (
            SELECT 1
            FROM part_cross_references pcr_out
            JOIN parts related_out ON related_out.id=pcr_out.cross_part_id
              AND related_out.data_status IN ('partial','verified')
            JOIN source_records source_out ON source_out.id=pcr_out.source_record_id
            WHERE pcr_out.part_id=p.id
          )
          OR EXISTS (
            SELECT 1
            FROM part_cross_references pcr_in
            JOIN parts related_in ON related_in.id=pcr_in.part_id
              AND related_in.data_status IN ('partial','verified')
            JOIN source_records source_in ON source_in.id=pcr_in.source_record_id
            WHERE pcr_in.cross_part_id=p.id
          )
        THEN 1 ELSE 0 END) AS replacement_linked,
        SUM(CASE WHEN
          EXISTS (
            SELECT 1
            FROM part_components pco
            JOIN parts component_part ON component_part.id=pco.component_part_id
              AND component_part.data_status IN ('partial','verified')
            JOIN source_records component_source ON component_source.id=pco.source_record_id
            WHERE pco.parent_part_id=p.id
          )
          OR EXISTS (
            SELECT 1
            FROM part_components pci
            JOIN parts parent_part ON parent_part.id=pci.parent_part_id
              AND parent_part.data_status IN ('partial','verified')
            JOIN source_records kit_source ON kit_source.id=pci.source_record_id
            WHERE pci.component_part_id=p.id
          )
        THEN 1 ELSE 0 END) AS kit_linked,
        SUM(CASE WHEN mf.slug IS NOT NULL AND mf.slug <> 'john-deere' THEN 1 ELSE 0 END) AS aftermarket
      FROM parts p
      LEFT JOIN part_categories pc ON pc.id=p.category_id
      LEFT JOIN manufacturers mf ON mf.id=p.manufacturer_id
      WHERE ${indexablePartCondition}
        ${categoryFilter}
    `, params);

    return {
      total: Number(rows[0]?.total || 0),
      replacementLinked: Number(rows[0]?.replacement_linked || 0),
      kitLinked: Number(rows[0]?.kit_linked || 0),
      aftermarket: Number(rows[0]?.aftermarket || 0),
    };
  } catch (error) {
    console.error('Unable to load parts catalog stats:', error);
    return { total: 0, replacementLinked: 0, kitLinked: 0, aftermarket: 0 };
  }
}

// Backward-compatible helper for older callers. New catalog pages should use getPartCatalogPage().
export async function getPartCatalogItems(categorySlug?: string): Promise<PartCatalogItem[]> {
  const result = await getPartCatalogPage({ categorySlug, page: 1, pageSize: 100 });
  return result.items;
}
