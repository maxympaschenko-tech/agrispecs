import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

type CountRow = RowDataPacket & { total: number };

function normalizePartNumber(value: string) {
  return decodeURIComponent(value).trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
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

export async function hasAmbiguousPublishedPartNumber(partNumberOrSlug: string): Promise<boolean> {
  return (await getPublishedPartNumberMatchCount(partNumberOrSlug)) > 1;
}
