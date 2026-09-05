import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export type ReplacementChainNode = {
  id: number;
  partNumber: string;
  normalizedPartNumber: string;
  name: string | null;
  manufacturerName: string | null;
  manufacturerSlug: string | null;
};

type ReplacementRow = RowDataPacket & {
  id: number;
  part_number: string;
  normalized_part_number: string;
  name: string | null;
  manufacturer_name: string | null;
  manufacturer_slug: string | null;
};

export type ReplacementChain = {
  nodes: ReplacementChainNode[];
  complete: boolean;
  ambiguous: boolean;
};

export async function getReplacementChain(startPartId: number): Promise<ReplacementChain> {
  const db = await getDbReady();
  const nodes: ReplacementChainNode[] = [];
  const visited = new Set<number>([startPartId]);
  let currentId = startPartId;

  for (let depth = 0; depth < 10; depth += 1) {
    const [rows] = await db.query<ReplacementRow[]>(`
      SELECT p2.id, p2.part_number, p2.normalized_part_number, p2.name,
             mf.name AS manufacturer_name, mf.slug AS manufacturer_slug
      FROM part_cross_references pcr
      JOIN parts p2 ON p2.id=pcr.cross_part_id
        AND p2.data_status IN ('partial','verified')
      LEFT JOIN manufacturers mf ON mf.id=p2.manufacturer_id
      WHERE pcr.part_id=?
        AND pcr.relation_type IN ('replaces','supersedes')
        AND pcr.source_record_id IS NOT NULL
      ORDER BY p2.part_number ASC
    `, [currentId]);

    if (rows.length === 0) return { nodes, complete:true, ambiguous:false };
    if (rows.length > 1) return { nodes, complete:false, ambiguous:true };

    const row = rows[0];
    const id = Number(row.id);
    if (visited.has(id)) return { nodes, complete:false, ambiguous:true };
    visited.add(id);

    nodes.push({
      id,
      partNumber: row.part_number,
      normalizedPartNumber: row.normalized_part_number,
      name: row.name,
      manufacturerName: row.manufacturer_name,
      manufacturerSlug: row.manufacturer_slug,
    });
    currentId = id;
  }

  return { nodes, complete:false, ambiguous:false };
}
