import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
import type { PartSummary } from '@/lib/parts-service';

export type MachinePartSummary = PartSummary & {
  configurationNotes: string[];
};

type MachinePartRow = RowDataPacket & {
  id: number;
  part_number: string;
  normalized_part_number: string;
  name: string | null;
  data_status: 'seed' | 'partial' | 'verified' | 'review';
  category_name: string | null;
  category_slug: string | null;
  manufacturer_name: string | null;
  manufacturer_slug: string | null;
  fitment_count: number;
  configuration_notes: string | null;
};

export async function getMachinePartsWithConfigurations(
  machineId: string,
  machineVersionId?: number,
): Promise<MachinePartSummary[]> {
  if (!/^\d+$/.test(machineId)) return [];

  try {
    const db = await getDbReady();
    const versionFilter = machineVersionId ? 'AND (mp.machine_version_id IS NULL OR mp.machine_version_id = ?)' : '';
    const params: Array<number> = [Number(machineId)];
    if (machineVersionId) params.push(machineVersionId);

    const [rows] = await db.query<MachinePartRow[]>(`
      SELECT
        p.id,
        p.part_number,
        p.normalized_part_number,
        p.name,
        p.data_status,
        pc.name AS category_name,
        pc.slug AS category_slug,
        mf.name AS manufacturer_name,
        mf.slug AS manufacturer_slug,
        (
          SELECT COUNT(DISTINCT mp_count.machine_id)
          FROM machine_parts mp_count
          WHERE mp_count.part_id = p.id
        ) AS fitment_count,
        GROUP_CONCAT(
          DISTINCT NULLIF(TRIM(mp.configuration_note), '')
          ORDER BY mp.configuration_note
          SEPARATOR ' || '
        ) AS configuration_notes
      FROM machine_parts mp
      INNER JOIN parts p ON p.id = mp.part_id
      LEFT JOIN part_categories pc ON pc.id = p.category_id
      LEFT JOIN manufacturers mf ON mf.id = p.manufacturer_id
      WHERE mp.machine_id = ?
        ${versionFilter}
      GROUP BY p.id, p.part_number, p.normalized_part_number, p.name, p.data_status,
               pc.name, pc.slug, mf.name, mf.slug
      ORDER BY pc.name ASC, p.part_number ASC
    `, params);

    return rows.map((row) => ({
      id: Number(row.id),
      partNumber: row.part_number,
      normalizedPartNumber: row.normalized_part_number,
      name: row.name,
      categoryName: row.category_name,
      categorySlug: row.category_slug,
      manufacturerName: row.manufacturer_name,
      manufacturerSlug: row.manufacturer_slug,
      dataStatus: row.data_status,
      fitmentCount: Number(row.fitment_count || 0),
      configurationNotes: row.configuration_notes
        ? row.configuration_notes.split(' || ').map((note) => note.trim()).filter(Boolean)
        : [],
    }));
  } catch (error) {
    console.error('Unable to load machine parts with configuration context:', error);
    return [];
  }
}
