import { cache } from 'react';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
import { withServerTtlCache } from '@/lib/server-ttl-cache';

const REPLACEMENT_TTL_MS = 5 * 60 * 1000;

export type ReplacementSetItem = {
  partNumber: string;
  normalizedPartNumber: string;
  name: string | null;
  manufacturerSlug: string | null;
  quantity: number | null;
  role: string | null;
};

export type ReplacementSet = {
  id: number;
  title: string;
  notes: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  items: ReplacementSetItem[];
};

export type ReplacementSetMembership = {
  id: number;
  title: string;
  legacyPartNumber: string;
  legacyNormalizedPartNumber: string;
  legacyPartName: string | null;
  legacyManufacturerSlug: string | null;
  quantity: number | null;
  role: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
};

type SetRow = RowDataPacket & {
  id: number;
  title: string;
  notes: string | null;
  source_title: string | null;
  source_url: string | null;
};

type ItemRow = RowDataPacket & {
  replacement_set_id: number;
  part_number: string;
  normalized_part_number: string;
  name: string | null;
  manufacturer_slug: string | null;
  quantity: string | number | null;
  role: string | null;
};

type MembershipRow = RowDataPacket & {
  id: number;
  title: string;
  legacy_part_number: string;
  legacy_normalized_part_number: string;
  legacy_part_name: string | null;
  legacy_manufacturer_slug: string | null;
  quantity: string | number | null;
  role: string | null;
  source_title: string | null;
  source_url: string | null;
};

async function loadReplacementSetsForLegacyPart(partId: number): Promise<ReplacementSet[]> {
  if (!Number.isInteger(partId) || partId <= 0) return [];

  try {
    return await withServerTtlCache(
      `parts:replacement-sets:${partId}`,
      REPLACEMENT_TTL_MS,
      async () => {
        const db = await getDbReady();
        const [setRows] = await db.query<SetRow[]>(`
          SELECT prs.id, prs.title, prs.notes, sr.title AS source_title, sr.url AS source_url
          FROM part_replacement_sets prs
          INNER JOIN source_records sr ON sr.id=prs.source_record_id
          WHERE prs.legacy_part_id=?
            AND EXISTS (
              SELECT 1
              FROM part_replacement_set_items required_item
              INNER JOIN parts required_part ON required_part.id=required_item.part_id
                AND required_part.data_status IN ('partial','verified')
              WHERE required_item.replacement_set_id=prs.id
            )
            AND NOT EXISTS (
              SELECT 1
              FROM part_replacement_set_items hidden_item
              INNER JOIN parts hidden_part ON hidden_part.id=hidden_item.part_id
              WHERE hidden_item.replacement_set_id=prs.id
                AND hidden_part.data_status NOT IN ('partial','verified')
            )
          ORDER BY prs.id ASC
        `, [partId]);
        if (setRows.length === 0) return [];

        const ids = setRows.map((row) => Number(row.id));
        const placeholders = ids.map(() => '?').join(',');
        const [itemRows] = await db.query<ItemRow[]>(`
          SELECT prsi.replacement_set_id, p.part_number, p.normalized_part_number, p.name,
                 mf.slug AS manufacturer_slug, prsi.quantity, prsi.role
          FROM part_replacement_set_items prsi
          INNER JOIN parts p ON p.id=prsi.part_id
            AND p.data_status IN ('partial','verified')
          LEFT JOIN manufacturers mf ON mf.id=p.manufacturer_id
          WHERE prsi.replacement_set_id IN (${placeholders})
          ORDER BY prsi.replacement_set_id ASC, prsi.id ASC
        `, ids);

        return setRows.map((setRow) => ({
          id: Number(setRow.id),
          title: setRow.title,
          notes: setRow.notes,
          sourceTitle: setRow.source_title,
          sourceUrl: setRow.source_url,
          items: itemRows
            .filter((item) => Number(item.replacement_set_id) === Number(setRow.id))
            .map((item) => ({
              partNumber: item.part_number,
              normalizedPartNumber: item.normalized_part_number,
              name: item.name,
              manufacturerSlug: item.manufacturer_slug,
              quantity: item.quantity === null ? null : Number(item.quantity),
              role: item.role,
            })),
        }));
      },
    );
  } catch (error) {
    console.error('Unable to load service replacement sets:', error);
    return [];
  }
}

export const getReplacementSetsForLegacyPart = cache(loadReplacementSetsForLegacyPart);

export async function getReplacementSetMembershipsForPart(partId: number): Promise<ReplacementSetMembership[]> {
  if (!Number.isInteger(partId) || partId <= 0) return [];

  try {
    return await withServerTtlCache(
      `parts:replacement-set-memberships:${partId}`,
      REPLACEMENT_TTL_MS,
      async () => {
        const db = await getDbReady();
        const [rows] = await db.query<MembershipRow[]>(`
          SELECT prs.id, prs.title,
                 legacy.part_number AS legacy_part_number,
                 legacy.normalized_part_number AS legacy_normalized_part_number,
                 legacy.name AS legacy_part_name,
                 legacy_mf.slug AS legacy_manufacturer_slug,
                 prsi.quantity, prsi.role,
                 sr.title AS source_title, sr.url AS source_url
          FROM part_replacement_set_items prsi
          INNER JOIN part_replacement_sets prs ON prs.id=prsi.replacement_set_id
          INNER JOIN parts legacy ON legacy.id=prs.legacy_part_id
            AND legacy.data_status IN ('partial','verified')
          LEFT JOIN manufacturers legacy_mf ON legacy_mf.id=legacy.manufacturer_id
          INNER JOIN source_records sr ON sr.id=prs.source_record_id
          WHERE prsi.part_id=?
            AND NOT EXISTS (
              SELECT 1
              FROM part_replacement_set_items hidden_item
              INNER JOIN parts hidden_part ON hidden_part.id=hidden_item.part_id
              WHERE hidden_item.replacement_set_id=prs.id
                AND hidden_part.data_status NOT IN ('partial','verified')
            )
          ORDER BY prs.id ASC
        `, [partId]);

        return rows.map((row) => ({
          id: Number(row.id),
          title: row.title,
          legacyPartNumber: row.legacy_part_number,
          legacyNormalizedPartNumber: row.legacy_normalized_part_number,
          legacyPartName: row.legacy_part_name,
          legacyManufacturerSlug: row.legacy_manufacturer_slug,
          quantity: row.quantity === null ? null : Number(row.quantity),
          role: row.role,
          sourceTitle: row.source_title,
          sourceUrl: row.source_url,
        }));
      },
    );
  } catch (error) {
    console.error('Unable to load service replacement-set memberships:', error);
    return [];
  }
}
