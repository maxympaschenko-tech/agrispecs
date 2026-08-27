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

type VersionRow = RowDataPacket & {
  id: number;
  slug: string;
  market_code: string | null;
  market_name: string | null;
  model_year_start: number | null;
  model_year_end: number | null;
  configuration: string | null;
  is_current: number;
  notes: string | null;
  spec_count: number;
};

type SpecRow = RowDataPacket & {
  spec_key: string;
  section: string;
  label: string;
  value_text: string | null;
  value_number: string | number | null;
  unit: string | null;
  confidence: 'official' | 'high' | 'medium' | 'low';
  source_title: string | null;
  source_url: string | null;
  source_published_date: string | null;
};

export type MachineVersion = {
  id: number;
  slug: string;
  marketCode: string | null;
  marketName: string | null;
  modelYearStart: number | null;
  modelYearEnd: number | null;
  configuration: string | null;
  isCurrent: boolean;
  notes: string | null;
  specCount: number;
};

export type MachineSpec = {
  specKey: string;
  section: string;
  label: string;
  valueText: string | null;
  valueNumber: number | null;
  unit: string | null;
  confidence: 'official' | 'high' | 'medium' | 'low';
  sourceTitle: string | null;
  sourceUrl: string | null;
  sourcePublishedDate: string | null;
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

export async function getMachineVersions(machineId: string): Promise<MachineVersion[]> {
  if (!/^\d+$/.test(machineId)) return [];

  try {
    const [rows] = await getDb().query<VersionRow[]>(`
      SELECT
        mv.id,
        mv.slug,
        mv.market_code,
        mv.market_name,
        mv.model_year_start,
        mv.model_year_end,
        mv.configuration,
        mv.is_current,
        mv.notes,
        COUNT(ms.id) AS spec_count
      FROM machine_versions mv
      LEFT JOIN machine_specs ms ON ms.machine_version_id = mv.id
      WHERE mv.machine_id = ?
      GROUP BY mv.id
      ORDER BY spec_count DESC, mv.is_current DESC, mv.model_year_end DESC, mv.model_year_start DESC
    `, [Number(machineId)]);

    return rows.map((row) => ({
      id: row.id,
      slug: row.slug,
      marketCode: row.market_code,
      marketName: row.market_name,
      modelYearStart: row.model_year_start,
      modelYearEnd: row.model_year_end,
      configuration: row.configuration,
      isCurrent: Boolean(row.is_current),
      notes: row.notes,
      specCount: Number(row.spec_count || 0),
    }));
  } catch (error) {
    console.error('Unable to load machine versions:', error);
    return [];
  }
}

export async function getMachineSpecs(machineId: string, machineVersionId?: number): Promise<MachineSpec[]> {
  if (!/^\d+$/.test(machineId) || !machineVersionId) return [];

  try {
    const [rows] = await getDb().query<SpecRow[]>(`
      SELECT
        sd.spec_key,
        sd.section,
        sd.label,
        ms.value_text,
        ms.value_number,
        ms.unit,
        ms.confidence,
        sr.title AS source_title,
        sr.url AS source_url,
        DATE_FORMAT(sr.published_date, '%Y-%m-%d') AS source_published_date
      FROM machine_specs ms
      INNER JOIN spec_definitions sd ON sd.id = ms.spec_definition_id
      LEFT JOIN source_records sr ON sr.id = ms.source_record_id
      WHERE ms.machine_id = ? AND ms.machine_version_id = ?
      ORDER BY sd.section ASC, sd.display_order ASC, sd.label ASC
    `, [Number(machineId), machineVersionId]);

    return rows.map((row) => ({
      specKey: row.spec_key,
      section: row.section,
      label: row.label,
      valueText: row.value_text,
      valueNumber: row.value_number === null ? null : Number(row.value_number),
      unit: row.unit,
      confidence: row.confidence,
      sourceTitle: row.source_title,
      sourceUrl: row.source_url,
      sourcePublishedDate: row.source_published_date,
    }));
  } catch (error) {
    console.error('Unable to load machine specifications:', error);
    return [];
  }
}
