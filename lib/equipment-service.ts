import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export type EquipmentMachine = {
  id: string;
  equipmentType: string;
  equipmentTypeSlug: string;
  brand: string;
  brandSlug: string;
  model: string;
  modelSlug: string;
  title: string;
  dataStatus: 'seed' | 'partial' | 'verified' | 'review';
};

type EquipmentRow = RowDataPacket & {
  id: number;
  model_name: string;
  model_slug: string;
  data_status: 'seed' | 'partial' | 'verified' | 'review';
  manufacturer_name: string;
  manufacturer_slug: string;
  equipment_type_name: string;
  equipment_type_slug: string;
};

type EquipmentTypeRow = RowDataPacket & {
  name: string;
  slug: string;
  machine_count: number | string;
};

function rowToEquipment(row: EquipmentRow): EquipmentMachine {
  return {
    id: String(row.id),
    equipmentType: row.equipment_type_name,
    equipmentTypeSlug: row.equipment_type_slug,
    brand: row.manufacturer_name,
    brandSlug: row.manufacturer_slug,
    model: row.model_name,
    modelSlug: row.model_slug,
    title: `${row.manufacturer_name} ${row.model_name}`,
    dataStatus: row.data_status,
  };
}

const equipmentSelect = `
  SELECT
    m.id,
    m.model_name,
    m.slug AS model_slug,
    m.data_status,
    mf.name AS manufacturer_name,
    mf.slug AS manufacturer_slug,
    et.name AS equipment_type_name,
    et.slug AS equipment_type_slug
  FROM machines m
  INNER JOIN manufacturers mf ON mf.id = m.manufacturer_id
  INNER JOIN equipment_types et ON et.id = m.equipment_type_id
`;

export async function getNonTractorEquipment(): Promise<EquipmentMachine[]> {
  try {
    const db = await getDbReady();
    const [rows] = await db.query<EquipmentRow[]>(`${equipmentSelect}
      WHERE et.slug <> 'tractor'
      ORDER BY et.name ASC, mf.name ASC, m.model_name ASC
    `);
    return rows.map(rowToEquipment);
  } catch (error) {
    console.error('Unable to load non-tractor equipment:', error);
    return [];
  }
}

export async function getEquipmentMachine(
  equipmentTypeSlug: string,
  brandSlug: string,
  modelSlug: string,
): Promise<EquipmentMachine | undefined> {
  try {
    const db = await getDbReady();
    const [rows] = await db.query<EquipmentRow[]>(`${equipmentSelect}
      WHERE et.slug = ?
        AND mf.slug = ?
        AND m.slug = ?
      LIMIT 1
    `, [equipmentTypeSlug, brandSlug, modelSlug]);
    return rows[0] ? rowToEquipment(rows[0]) : undefined;
  } catch (error) {
    console.error('Unable to load equipment machine:', error);
    return undefined;
  }
}

export async function searchNonTractorEquipment(term: string): Promise<EquipmentMachine[]> {
  const normalized = term.trim();
  if (!normalized) return [];
  try {
    const db = await getDbReady();
    const like = `%${normalized}%`;
    const [rows] = await db.query<EquipmentRow[]>(`${equipmentSelect}
      WHERE et.slug <> 'tractor'
        AND (
          m.model_name LIKE ?
          OR mf.name LIKE ?
          OR et.name LIKE ?
          OR CONCAT(mf.name, ' ', m.model_name) LIKE ?
        )
      ORDER BY et.name ASC, mf.name ASC, m.model_name ASC
      LIMIT 50
    `, [like, like, like, like]);
    return rows.map(rowToEquipment);
  } catch (error) {
    console.error('Unable to search non-tractor equipment:', error);
    return [];
  }
}

export async function getNonTractorEquipmentTypes(): Promise<Array<{ name: string; slug: string; machineCount: number }>> {
  try {
    const db = await getDbReady();
    const [rows] = await db.query<EquipmentTypeRow[]>(`
      SELECT et.name, et.slug, COUNT(m.id) AS machine_count
      FROM equipment_types et
      INNER JOIN machines m ON m.equipment_type_id = et.id
      WHERE et.slug <> 'tractor'
        AND m.data_status IN ('partial','verified')
      GROUP BY et.id
      ORDER BY et.name ASC
    `);
    return rows.map((row) => ({ name: row.name, slug: row.slug, machineCount: Number(row.machine_count || 0) }));
  } catch (error) {
    console.error('Unable to load equipment types:', error);
    return [];
  }
}
