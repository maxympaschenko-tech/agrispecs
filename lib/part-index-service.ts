import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
import { withServerTtlCache } from '@/lib/server-ttl-cache';

const PART_INDEX_TTL_MS = 5 * 60 * 1000;

type IndexablePartRouteRow = RowDataPacket & {
  normalized_part_number: string;
  manufacturer_slug: string | null;
  published_count: number;
};

type IndexablePartRouteRecord = {
  normalizedPartNumber: string;
  manufacturerSlug: string | null;
  publishedCount: number;
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

async function getIndexablePartRouteRecords(): Promise<IndexablePartRouteRecord[]> {
  return withServerTtlCache(
    'parts:indexable-route-records',
    PART_INDEX_TTL_MS,
    async () => {
      try {
        const db = await getDbReady();
        const [rows] = await db.query<IndexablePartRouteRow[]>(`
          SELECT
            p.normalized_part_number,
            mf.slug AS manufacturer_slug,
            published_counts.published_count
          FROM parts p
          LEFT JOIN manufacturers mf ON mf.id=p.manufacturer_id
          INNER JOIN (
            SELECT normalized_part_number, COUNT(*) AS published_count
            FROM parts
            WHERE data_status IN ('partial','verified')
            GROUP BY normalized_part_number
          ) published_counts
            ON published_counts.normalized_part_number=p.normalized_part_number
          WHERE p.data_status IN ('partial','verified')
            AND ${indexableRelationshipSql}
          ORDER BY p.normalized_part_number ASC, mf.slug ASC
        `);

        return rows.map((row) => ({
          normalizedPartNumber: row.normalized_part_number,
          manufacturerSlug: row.manufacturer_slug,
          publishedCount: Number(row.published_count || 0),
        }));
      } catch (error) {
        console.error('Unable to load indexable part routes:', error);
        return [];
      }
    },
    (records) => records.length > 0,
  );
}

export async function getIndexablePartNumbers(): Promise<string[]> {
  const records = await getIndexablePartRouteRecords();
  return Array.from(
    new Set(
      records
        .filter((record) => record.publishedCount === 1)
        .map((record) => record.normalizedPartNumber),
    ),
  );
}

export async function getIndexableManufacturerPartRoutes(): Promise<IndexableManufacturerPartRoute[]> {
  const records = await getIndexablePartRouteRecords();
  return records
    .filter((record): record is IndexablePartRouteRecord & { manufacturerSlug: string } => (
      record.publishedCount > 1 && Boolean(record.manufacturerSlug)
    ))
    .map((record) => ({
      normalizedPartNumber: record.normalizedPartNumber,
      manufacturerSlug: record.manufacturerSlug,
    }));
}
