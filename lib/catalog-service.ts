import type { RowDataPacket } from 'mysql2';
import { getDb } from '@/lib/db';
import {
  machines as seedMachines,
  getBrands as getSeedBrands,
  type Machine,
} from '@/lib/catalog';

type MachineRow = RowDataPacket & {
  id: number;
  model_name: string;
  model_slug: string;
  data_status: 'seed' | 'partial' | 'verified' | 'review';
  manufacturer_name: string;
  manufacturer_slug: string;
};

type BrandRow = RowDataPacket & {
  name: string;
  slug: string;
};

function rowToMachine(row: MachineRow): Machine {
  return {
    id: String(row.id),
    category: 'tractor',
    brand: row.manufacturer_name,
    brandSlug: row.manufacturer_slug,
    model: row.model_name,
    modelSlug: row.model_slug,
    title: `${row.manufacturer_name} ${row.model_name}`,
    dataStatus: row.data_status,
  };
}

export async function getMachines(): Promise<Machine[]> {
  try {
    const [rows] = await getDb().query<MachineRow[]>(`
      SELECT
        m.id,
        m.model_name,
        m.slug AS model_slug,
        m.data_status,
        mf.name AS manufacturer_name,
        mf.slug AS manufacturer_slug
      FROM machines m
      INNER JOIN manufacturers mf ON mf.id = m.manufacturer_id
      INNER JOIN equipment_types et ON et.id = m.equipment_type_id
      WHERE et.slug = 'tractor'
      ORDER BY mf.name ASC, m.model_name ASC
    `);

    if (rows.length > 0) return rows.map(rowToMachine);
  } catch (error) {
    console.error('Falling back to seed machines:', error);
  }

  return seedMachines;
}

export async function getMachine(brandSlug: string, modelSlug: string): Promise<Machine | undefined> {
  try {
    const [rows] = await getDb().query<MachineRow[]>(`
      SELECT
        m.id,
        m.model_name,
        m.slug AS model_slug,
        m.data_status,
        mf.name AS manufacturer_name,
        mf.slug AS manufacturer_slug
      FROM machines m
      INNER JOIN manufacturers mf ON mf.id = m.manufacturer_id
      INNER JOIN equipment_types et ON et.id = m.equipment_type_id
      WHERE et.slug = 'tractor'
        AND mf.slug = ?
        AND m.slug = ?
      LIMIT 1
    `, [brandSlug, modelSlug]);

    if (rows[0]) return rowToMachine(rows[0]);
  } catch (error) {
    console.error('Falling back to seed machine:', error);
  }

  return seedMachines.find(
    (machine) => machine.brandSlug === brandSlug && machine.modelSlug === modelSlug,
  );
}

export async function getBrands(): Promise<Array<{ slug: string; name: string }>> {
  try {
    const [rows] = await getDb().query<BrandRow[]>(`
      SELECT DISTINCT mf.name, mf.slug
      FROM manufacturers mf
      INNER JOIN machines m ON m.manufacturer_id = mf.id
      INNER JOIN equipment_types et ON et.id = m.equipment_type_id
      WHERE et.slug = 'tractor'
      ORDER BY mf.name ASC
    `);

    if (rows.length > 0) return rows.map((row) => ({ slug: row.slug, name: row.name }));
  } catch (error) {
    console.error('Falling back to seed brands:', error);
  }

  return getSeedBrands();
}

export async function getMachinesByBrand(brandSlug: string): Promise<Machine[]> {
  const machines = await getMachines();
  return machines.filter((machine) => machine.brandSlug === brandSlug);
}

export async function searchMachines(term: string): Promise<Machine[]> {
  const normalized = term.trim();
  if (!normalized) return [];

  try {
    const like = `%${normalized}%`;
    const [rows] = await getDb().query<MachineRow[]>(`
      SELECT
        m.id,
        m.model_name,
        m.slug AS model_slug,
        m.data_status,
        mf.name AS manufacturer_name,
        mf.slug AS manufacturer_slug
      FROM machines m
      INNER JOIN manufacturers mf ON mf.id = m.manufacturer_id
      INNER JOIN equipment_types et ON et.id = m.equipment_type_id
      WHERE et.slug = 'tractor'
        AND (m.model_name LIKE ? OR mf.name LIKE ? OR CONCAT(mf.name, ' ', m.model_name) LIKE ?)
      ORDER BY mf.name ASC, m.model_name ASC
      LIMIT 50
    `, [like, like, like]);

    if (rows.length > 0) return rows.map(rowToMachine);
  } catch (error) {
    console.error('Falling back to seed search:', error);
  }

  const lower = normalized.toLowerCase();
  return seedMachines.filter((machine) =>
    `${machine.brand} ${machine.model}`.toLowerCase().includes(lower),
  );
}
