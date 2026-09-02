import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export type ReplacementSetItem = {
  partNumber: string;
  normalizedPartNumber: string;
  name: string | null;
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
  quantity: string | number | null;
  role: string | null;
};

export async function getReplacementSetsForLegacyPart(partId: number): Promise<ReplacementSet[]> {
  if (!Number.isInteger(partId) || partId <= 0) return [];

  try {
    const db = await getDbReady();
    const [setRows] = await db.query<SetRow[]>(`
      SELECT prs.id, prs.title, prs.notes, sr.title AS source_title, sr.url AS source_url
      FROM part_replacement_sets prs
      LEFT JOIN source_records sr ON sr.id=prs.source_record_id
      WHERE prs.legacy_part_id=?
      ORDER BY prs.id ASC
    `, [partId]);
    if (setRows.length === 0) return [];

    const ids = setRows.map((row) => Number(row.id));
    const placeholders = ids.map(() => '?').join(',');
    const [itemRows] = await db.query<ItemRow[]>(`
      SELECT prsi.replacement_set_id, p.part_number, p.normalized_part_number, p.name,
             prsi.quantity, prsi.role
      FROM part_replacement_set_items prsi
      INNER JOIN parts p ON p.id=prsi.part_id
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
          quantity: item.quantity === null ? null : Number(item.quantity),
          role: item.role,
        })),
    }));
  } catch (error) {
    console.error('Unable to load service replacement sets:', error);
    return [];
  }
}
