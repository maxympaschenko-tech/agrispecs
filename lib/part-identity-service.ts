import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

type CountRow = RowDataPacket & { total: number };
type IdentityRow = RowDataPacket & {
  id: number;
  part_number: string;
  normalized_part_number: string;
  manufacturer_name: string | null;
  manufacturer_slug: string | null;
};

export type PublishedPartIdentity = {
  id: number;
  partNumber: string;
  normalizedPartNumber: string;
  manufacturerName: string | null;
  manufacturerSlug: string | null;
};

function normalizePartNumber(value: string) {
  try {
    return decodeURIComponent(value).trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  } catch {
    return '';
  }
}

export async function getPublishedPartNumberMatchCount(partNumberOrSlug: string): Promise<number> {
  const normalized = normalizePartNumber(partNumberOrSlug);
  if (!normalized) return 0;

  try {
    const db = await getDbReady();
    const [rows] = await db.query<CountRow[]>(`
      SELECT COUNT(*) AS total
      FROM parts
      WHERE normalized_part_number=?
        AND data_status IN ('partial','verified')
    `, [normalized]);
    return Number(rows[0]?.total || 0);
  } catch (error) {
    console.error('Unable to count published part-number matches:', error);
    return 0;
  }
}

export async function getPublishedPartNumberMatches(partNumberOrSlug: string): Promise<PublishedPartIdentity[]> {
  const normalized = normalizePartNumber(partNumberOrSlug);
  if (!normalized) return [];

  try {
    const db = await getDbReady();
    const [rows] = await db.query<IdentityRow[]>(`
      SELECT
        p.id,
        p.part_number,
        p.normalized_part_number,
        mf.name AS manufacturer_name,
        mf.slug AS manufacturer_slug
      FROM parts p
      LEFT JOIN manufacturers mf ON mf.id=p.manufacturer_id
      WHERE p.normalized_part_number=?
        AND p.data_status IN ('partial','verified')
      ORDER BY COALESCE(mf.name, ''), p.id
    `, [normalized]);

    return rows.map((row) => ({
      id: Number(row.id),
      partNumber: row.part_number,
      normalizedPartNumber: row.normalized_part_number,
      manufacturerName: row.manufacturer_name,
      manufacturerSlug: row.manufacturer_slug,
    }));
  } catch (error) {
    console.error('Unable to load published part-number matches:', error);
    return [];
  }
}

export async function hasAmbiguousPublishedPartNumber(partNumberOrSlug: string): Promise<boolean> {
  return (await getPublishedPartNumberMatchCount(partNumberOrSlug)) > 1;
}
