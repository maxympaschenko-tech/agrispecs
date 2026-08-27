import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export type PartSummary = {
  id: number;
  partNumber: string;
  normalizedPartNumber: string;
  name: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  manufacturerName: string | null;
  manufacturerSlug: string | null;
  dataStatus: 'seed' | 'partial' | 'verified' | 'review';
  fitmentCount: number;
};

export type PartFitment = {
  machineId: number;
  brand: string;
  brandSlug: string;
  model: string;
  modelSlug: string;
  fitmentNote: string | null;
  quantity: number | null;
  serialPrefix: string | null;
  serialFrom: string | null;
  serialTo: string | null;
  configurationNote: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  sourcePublishedDate: string | null;
};

export type PartRelation = {
  direction: 'outgoing' | 'incoming';
  relationType: 'cross_reference' | 'replaces' | 'supersedes' | 'alternative';
  partNumber: string;
  normalizedPartNumber: string;
  name: string | null;
  manufacturerName: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
};

export type PartDetail = PartSummary & {
  description: string | null;
  fitments: PartFitment[];
  relations: PartRelation[];
};

type PartRow = RowDataPacket & {
  id: number;
  part_number: string;
  normalized_part_number: string;
  name: string | null;
  description: string | null;
  data_status: 'seed' | 'partial' | 'verified' | 'review';
  category_name: string | null;
  category_slug: string | null;
  manufacturer_name: string | null;
  manufacturer_slug: string | null;
  fitment_count: number;
};

type FitmentRow = RowDataPacket & {
  machine_id: number;
  brand: string;
  brand_slug: string;
  model: string;
  model_slug: string;
  fitment_note: string | null;
  quantity: string | number | null;
  serial_prefix: string | null;
  serial_from: string | null;
  serial_to: string | null;
  configuration_note: string | null;
  source_title: string | null;
  source_url: string | null;
  source_published_date: string | null;
};

type RelationRow = RowDataPacket & {
  direction: 'outgoing' | 'incoming';
  relation_type: PartRelation['relationType'];
  part_number: string;
  normalized_part_number: string;
  name: string | null;
  manufacturer_name: string | null;
  source_title: string | null;
  source_url: string | null;
};

function rowToPart(row: PartRow): PartSummary {
  return {
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
  };
}

const partSelect = `
  SELECT
    p.id,
    p.part_number,
    p.normalized_part_number,
    p.name,
    p.description,
    p.data_status,
    pc.name AS category_name,
    pc.slug AS category_slug,
    mf.name AS manufacturer_name,
    mf.slug AS manufacturer_slug,
    (
      SELECT COUNT(DISTINCT mp_count.machine_id)
      FROM machine_parts mp_count
      WHERE mp_count.part_id = p.id
    ) AS fitment_count
  FROM parts p
  LEFT JOIN part_categories pc ON pc.id = p.category_id
  LEFT JOIN manufacturers mf ON mf.id = p.manufacturer_id
`;

export async function getParts(): Promise<PartSummary[]> {
  try {
    const db = await getDbReady();
    const [rows] = await db.query<PartRow[]>(`${partSelect}
      ORDER BY mf.name ASC, pc.name ASC, p.part_number ASC
    `);
    return rows.map(rowToPart);
  } catch (error) {
    console.error('Unable to load parts catalog:', error);
    return [];
  }
}

export async function searchParts(term: string): Promise<PartSummary[]> {
  const normalizedTerm = term.trim();
  if (!normalizedTerm) return [];

  const normalizedNumber = normalizedTerm.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const like = `%${normalizedTerm}%`;
  const numberLike = `%${normalizedNumber}%`;

  try {
    const db = await getDbReady();
    const [rows] = await db.query<PartRow[]>(`${partSelect}
      WHERE p.normalized_part_number LIKE ?
         OR p.part_number LIKE ?
         OR p.name LIKE ?
         OR pc.name LIKE ?
      ORDER BY
        CASE WHEN p.normalized_part_number = ? THEN 0 ELSE 1 END,
        p.part_number ASC
      LIMIT 50
    `, [numberLike, like, like, like, normalizedNumber]);
    return rows.map(rowToPart);
  } catch (error) {
    console.error('Unable to search parts:', error);
    return [];
  }
}

export async function getPart(partNumberOrSlug: string): Promise<PartDetail | undefined> {
  const normalized = decodeURIComponent(partNumberOrSlug).trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!normalized) return undefined;

  try {
    const db = await getDbReady();
    const [rows] = await db.query<PartRow[]>(`${partSelect}
      WHERE p.normalized_part_number = ?
      LIMIT 1
    `, [normalized]);

    if (!rows[0]) return undefined;
    const base = rowToPart(rows[0]);

    const [fitmentRows] = await db.query<FitmentRow[]>(`
      SELECT
        m.id AS machine_id,
        mf.name AS brand,
        mf.slug AS brand_slug,
        m.model_name AS model,
        m.slug AS model_slug,
        mp.fitment_note,
        mp.quantity,
        mp.serial_prefix,
        mp.serial_from,
        mp.serial_to,
        mp.configuration_note,
        sr.title AS source_title,
        sr.url AS source_url,
        DATE_FORMAT(sr.published_date, '%Y-%m-%d') AS source_published_date
      FROM machine_parts mp
      INNER JOIN machines m ON m.id = mp.machine_id
      INNER JOIN manufacturers mf ON mf.id = m.manufacturer_id
      LEFT JOIN source_records sr ON sr.id = mp.source_record_id
      WHERE mp.part_id = ?
      ORDER BY mf.name ASC, m.model_name ASC, mp.fitment_note ASC
    `, [base.id]);

    const [relationRows] = await db.query<RelationRow[]>(`
      SELECT 'outgoing' AS direction, pcr.relation_type, p2.part_number, p2.normalized_part_number,
             p2.name, mf2.name AS manufacturer_name, sr.title AS source_title, sr.url AS source_url
      FROM part_cross_references pcr
      JOIN parts p2 ON p2.id=pcr.cross_part_id
      LEFT JOIN manufacturers mf2 ON mf2.id=p2.manufacturer_id
      LEFT JOIN source_records sr ON sr.id=pcr.source_record_id
      WHERE pcr.part_id=?
      UNION ALL
      SELECT 'incoming' AS direction, pcr.relation_type, p1.part_number, p1.normalized_part_number,
             p1.name, mf1.name AS manufacturer_name, sr.title AS source_title, sr.url AS source_url
      FROM part_cross_references pcr
      JOIN parts p1 ON p1.id=pcr.part_id
      LEFT JOIN manufacturers mf1 ON mf1.id=p1.manufacturer_id
      LEFT JOIN source_records sr ON sr.id=pcr.source_record_id
      WHERE pcr.cross_part_id=?
      ORDER BY part_number ASC
    `, [base.id, base.id]);

    return {
      ...base,
      description: rows[0].description,
      fitments: fitmentRows.map((row) => ({
        machineId: Number(row.machine_id),
        brand: row.brand,
        brandSlug: row.brand_slug,
        model: row.model,
        modelSlug: row.model_slug,
        fitmentNote: row.fitment_note,
        quantity: row.quantity === null ? null : Number(row.quantity),
        serialPrefix: row.serial_prefix,
        serialFrom: row.serial_from,
        serialTo: row.serial_to,
        configurationNote: row.configuration_note,
        sourceTitle: row.source_title,
        sourceUrl: row.source_url,
        sourcePublishedDate: row.source_published_date,
      })),
      relations: relationRows.map((row) => ({
        direction: row.direction,
        relationType: row.relation_type,
        partNumber: row.part_number,
        normalizedPartNumber: row.normalized_part_number,
        name: row.name,
        manufacturerName: row.manufacturer_name,
        sourceTitle: row.source_title,
        sourceUrl: row.source_url,
      })),
    };
  } catch (error) {
    console.error('Unable to load part:', error);
    return undefined;
  }
}

export async function getMachineParts(machineId: string): Promise<PartSummary[]> {
  if (!/^\d+$/.test(machineId)) return [];

  try {
    const db = await getDbReady();
    const [rows] = await db.query<PartRow[]>(`
      SELECT
        p.id,
        p.part_number,
        p.normalized_part_number,
        p.name,
        p.description,
        p.data_status,
        pc.name AS category_name,
        pc.slug AS category_slug,
        mf.name AS manufacturer_name,
        mf.slug AS manufacturer_slug,
        (
          SELECT COUNT(DISTINCT mp_count.machine_id)
          FROM machine_parts mp_count
          WHERE mp_count.part_id = p.id
        ) AS fitment_count
      FROM machine_parts mp
      INNER JOIN parts p ON p.id = mp.part_id
      LEFT JOIN part_categories pc ON pc.id = p.category_id
      LEFT JOIN manufacturers mf ON mf.id = p.manufacturer_id
      WHERE mp.machine_id = ?
      GROUP BY p.id, p.part_number, p.normalized_part_number, p.name, p.description, p.data_status,
               pc.name, pc.slug, mf.name, mf.slug
      ORDER BY pc.name ASC, p.part_number ASC
    `, [Number(machineId)]);
    return rows.map(rowToPart);
  } catch (error) {
    console.error('Unable to load machine parts:', error);
    return [];
  }
}
