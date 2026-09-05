import { cache } from 'react';
import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
import { withServerTtlCache } from '@/lib/server-ttl-cache';
import {
  machines as seedMachines,
  type Machine,
} from '@/lib/catalog';

const TRACTOR_CATALOG_TTL_MS = 5 * 60 * 1000;

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

type AttachmentRow = RowDataPacket & {
  id: number;
  manufacturer_name: string;
  manufacturer_slug: string;
  attachment_type: string;
  model_name: string;
  slug: string;
  lift_capacity_text: string | null;
  lift_height_text: string | null;
  configuration_text: string | null;
  data_status: 'seed' | 'partial' | 'verified' | 'review';
  compatibility_note: string | null;
  confidence: 'official' | 'high' | 'medium' | 'low';
  source_title: string | null;
  source_url: string | null;
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

export type MachineAttachment = {
  id: number;
  manufacturerName: string;
  manufacturerSlug: string;
  attachmentType: string;
  modelName: string;
  slug: string;
  liftCapacityText: string | null;
  liftHeightText: string | null;
  configurationText: string | null;
  dataStatus: 'seed' | 'partial' | 'verified' | 'review';
  compatibilityNote: string | null;
  confidence: 'official' | 'high' | 'medium' | 'low';
  sourceTitle: string | null;
  sourceUrl: string | null;
};

function rowToMachine(row: MachineRow): Machine {
  const generationSuffix = /(^|-)previous($|-)/.test(row.model_slug) ? ' — Previous generation' : '';
  return {
    id: String(row.id),
    category: 'tractor',
    brand: row.manufacturer_name,
    brandSlug: row.manufacturer_slug,
    model: row.model_name,
    modelSlug: row.model_slug,
    title: `${row.manufacturer_name} ${row.model_name}${generationSuffix}`,
    dataStatus: row.data_status,
  };
}

export async function getMachines(): Promise<Machine[]> {
  return withServerTtlCache(
    'tractors:catalog',
    TRACTOR_CATALOG_TTL_MS,
    async () => {
      try {
        const db = await getDbReady();
        const [rows] = await db.query<MachineRow[]>(`
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
    },
    (machines) => machines.some((machine) => machine.dataStatus !== 'seed'),
  );
}

async function loadMachine(brandSlug: string, modelSlug: string): Promise<Machine | undefined> {
  try {
    const db = await getDbReady();
    const [rows] = await db.query<MachineRow[]>(`
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
        AND m.data_status IN ('partial','verified','review')
      LIMIT 1
    `, [brandSlug, modelSlug]);

    return rows[0] ? rowToMachine(rows[0]) : undefined;
  } catch (error) {
    console.error('Unable to load tractor machine:', error);
    return undefined;
  }
}

export const getMachine = cache(loadMachine);

export async function getBrands(): Promise<Array<{ slug: string; name: string }>> {
  return withServerTtlCache(
    'tractors:brands',
    TRACTOR_CATALOG_TTL_MS,
    async () => {
      try {
        const db = await getDbReady();
        const [rows] = await db.query<BrandRow[]>(`
          SELECT DISTINCT mf.name, mf.slug
          FROM manufacturers mf
          INNER JOIN machines m ON m.manufacturer_id = mf.id
          INNER JOIN equipment_types et ON et.id = m.equipment_type_id
          WHERE et.slug = 'tractor'
            AND m.data_status IN ('partial','verified','review')
          ORDER BY mf.name ASC
        `);

        return rows.map((row) => ({ slug: row.slug, name: row.name }));
      } catch (error) {
        console.error('Unable to load tractor brands:', error);
        return [];
      }
    },
    (brands) => brands.length > 0,
  );
}

export async function getMachinesByBrand(brandSlug: string): Promise<Machine[]> {
  const normalized = brandSlug.trim().toLowerCase();
  if (!normalized) return [];

  return withServerTtlCache(
    `tractors:brand:${normalized}`,
    TRACTOR_CATALOG_TTL_MS,
    async () => {
      try {
        const db = await getDbReady();
        const [rows] = await db.query<MachineRow[]>(`
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
            AND m.data_status IN ('partial','verified','review')
          ORDER BY m.model_name ASC
        `, [normalized]);

        return rows.map(rowToMachine);
      } catch (error) {
        console.error('Unable to load tractor machines by brand:', error);
        return [];
      }
    },
    (machines) => machines.length > 0,
  );
}

export async function searchMachines(term: string): Promise<Machine[]> {
  const normalized = term.trim();
  if (!normalized) return [];

  const compactKey = normalized.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const like = `%${normalized}%`;
  const keyLike = compactKey ? `%${compactKey}%` : '__NO_COMPACT_SEARCH_KEY__';
  const modelKeySql = `UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(m.model_name,' ',''),'-',''),'/',''),'.',''),'_',''))`;
  const fullKeySql = `UPPER(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(CONCAT(mf.name,m.model_name),' ',''),'-',''),'/',''),'.',''),'_',''))`;

  try {
    const db = await getDbReady();
    const [rows] = await db.query<MachineRow[]>(`
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
        AND m.data_status IN ('partial','verified')
        AND (
          m.model_name LIKE ?
          OR mf.name LIKE ?
          OR CONCAT(mf.name, ' ', m.model_name) LIKE ?
          OR ${modelKeySql} LIKE ?
          OR ${fullKeySql} LIKE ?
        )
      ORDER BY
        CASE
          WHEN ${modelKeySql} = ? THEN 0
          WHEN ${fullKeySql} = ? THEN 1
          WHEN m.model_name LIKE ? THEN 2
          WHEN CONCAT(mf.name, ' ', m.model_name) LIKE ? THEN 3
          ELSE 4
        END,
        mf.name ASC,
        m.model_name ASC
      LIMIT 50
    `, [like, like, like, keyLike, keyLike, compactKey, compactKey, like, like]);

    return rows.map(rowToMachine);
  } catch (error) {
    console.error('Unable to search tractors:', error);
    return [];
  }
}

async function loadMachineVersions(machineId: string): Promise<MachineVersion[]> {
  if (!/^\d+$/.test(machineId)) return [];

  try {
    const db = await getDbReady();
    const [rows] = await db.query<VersionRow[]>(`
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
        COUNT(spec_source.id) AS spec_count
      FROM machine_versions mv
      LEFT JOIN machine_specs ms ON ms.machine_version_id = mv.id
      LEFT JOIN source_records spec_source ON spec_source.id = ms.source_record_id
      WHERE mv.machine_id = ?
      GROUP BY mv.id
      ORDER BY mv.is_current DESC, spec_count DESC, mv.model_year_end DESC, mv.model_year_start DESC
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

export const getMachineVersions = cache(loadMachineVersions);

async function loadMachineSpecs(machineId: string, machineVersionId?: number): Promise<MachineSpec[]> {
  if (!/^\d+$/.test(machineId) || !machineVersionId) return [];

  try {
    const db = await getDbReady();
    const [rows] = await db.query<SpecRow[]>(`
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
      INNER JOIN source_records sr ON sr.id = ms.source_record_id
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

export const getMachineSpecs = cache(loadMachineSpecs);

export async function getMachineAttachments(machineId: string): Promise<MachineAttachment[]> {
  if (!/^\d+$/.test(machineId)) return [];

  try {
    const db = await getDbReady();
    const [rows] = await db.query<AttachmentRow[]>(`
      SELECT
        a.id,
        amf.name AS manufacturer_name,
        amf.slug AS manufacturer_slug,
        a.attachment_type,
        a.model_name,
        a.slug,
        COALESCE(ma.performance_capacity_text,a.lift_capacity_text) AS lift_capacity_text,
        COALESCE(ma.performance_height_text,a.lift_height_text) AS lift_height_text,
        COALESCE(ma.performance_configuration_text,a.configuration_text) AS configuration_text,
        a.data_status,
        ma.compatibility_note,
        ma.confidence,
        sr.title AS source_title,
        sr.url AS source_url
      FROM machine_attachments ma
      INNER JOIN attachments a ON a.id = ma.attachment_id
      INNER JOIN manufacturers amf ON amf.id = a.manufacturer_id
      INNER JOIN source_records sr ON sr.id = ma.source_record_id
      WHERE ma.machine_id = ? AND a.data_status IN ('partial','verified')
      ORDER BY a.attachment_type ASC, a.model_name ASC
    `, [Number(machineId)]);

    return rows.map((row) => ({
      id: row.id,
      manufacturerName: row.manufacturer_name,
      manufacturerSlug: row.manufacturer_slug,
      attachmentType: row.attachment_type,
      modelName: row.model_name,
      slug: row.slug,
      liftCapacityText: row.lift_capacity_text,
      liftHeightText: row.lift_height_text,
      configurationText: row.configuration_text,
      dataStatus: row.data_status,
      compatibilityNote: row.compatibility_note,
      confidence: row.confidence,
      sourceTitle: row.source_title,
      sourceUrl: row.source_url,
    }));
  } catch (error) {
    console.error('Unable to load machine attachments:', error);
    return [];
  }
}
