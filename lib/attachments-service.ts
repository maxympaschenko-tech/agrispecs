import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export type MachineAttachment = {
  id: number;
  modelName: string;
  slug: string;
  attachmentType: string;
  liftCapacityText: string | null;
  liftHeightText: string | null;
  configurationText: string | null;
  compatibilityNote: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
};

export type AttachmentCatalogItem = {
  id: number;
  manufacturerName: string;
  manufacturerSlug: string;
  modelName: string;
  slug: string;
  attachmentType: string;
  compatibleMachineCount: number;
};

export type AttachmentCompatibleMachine = {
  machineId: number;
  brand: string;
  brandSlug: string;
  model: string;
  modelSlug: string;
  compatibilityNote: string | null;
};

export type AttachmentDetail = AttachmentCatalogItem & {
  liftCapacityText: string | null;
  liftHeightText: string | null;
  configurationText: string | null;
  compatibleMachines: AttachmentCompatibleMachine[];
  sourceTitle: string | null;
  sourceUrl: string | null;
};

type AttachmentRow = RowDataPacket & {
  id: number;
  model_name: string;
  slug: string;
  attachment_type: string;
  lift_capacity_text: string | null;
  lift_height_text: string | null;
  configuration_text: string | null;
  compatibility_note: string | null;
  source_title: string | null;
  source_url: string | null;
};

type AttachmentCatalogRow = RowDataPacket & {
  id: number;
  manufacturer_name: string;
  manufacturer_slug: string;
  model_name: string;
  slug: string;
  attachment_type: string;
  compatible_machine_count: number;
  lift_capacity_text?: string | null;
  lift_height_text?: string | null;
  configuration_text?: string | null;
};

type CompatibleMachineRow = RowDataPacket & {
  machine_id: number;
  brand: string;
  brand_slug: string;
  model: string;
  model_slug: string;
  compatibility_note: string | null;
  source_title: string | null;
  source_url: string | null;
};

function rowToCatalogItem(row: AttachmentCatalogRow): AttachmentCatalogItem {
  return {
    id: Number(row.id),
    manufacturerName: row.manufacturer_name,
    manufacturerSlug: row.manufacturer_slug,
    modelName: row.model_name,
    slug: row.slug,
    attachmentType: row.attachment_type,
    compatibleMachineCount: Number(row.compatible_machine_count || 0),
  };
}

export async function getMachineAttachments(machineId: string): Promise<MachineAttachment[]> {
  if (!/^\d+$/.test(machineId)) return [];

  try {
    const db = await getDbReady();
    const [rows] = await db.query<AttachmentRow[]>(`
      SELECT
        a.id,
        a.model_name,
        a.slug,
        a.attachment_type,
        a.lift_capacity_text,
        a.lift_height_text,
        a.configuration_text,
        ma.compatibility_note,
        sr.title AS source_title,
        sr.url AS source_url
      FROM machine_attachments ma
      JOIN attachments a ON a.id=ma.attachment_id
      LEFT JOIN source_records sr ON sr.id=ma.source_record_id
      WHERE ma.machine_id=? AND a.data_status IN ('partial','verified')
      ORDER BY a.attachment_type ASC, a.model_name ASC
    `, [Number(machineId)]);

    return rows.map((row) => ({
      id: Number(row.id),
      modelName: row.model_name,
      slug: row.slug,
      attachmentType: row.attachment_type,
      liftCapacityText: row.lift_capacity_text,
      liftHeightText: row.lift_height_text,
      configurationText: row.configuration_text,
      compatibilityNote: row.compatibility_note,
      sourceTitle: row.source_title,
      sourceUrl: row.source_url,
    }));
  } catch (error) {
    console.error('Unable to load machine attachments:', error);
    return [];
  }
}

export async function getAttachmentCatalog(): Promise<AttachmentCatalogItem[]> {
  try {
    const db = await getDbReady();
    const [rows] = await db.query<AttachmentCatalogRow[]>(`
      SELECT
        a.id,
        mf.name AS manufacturer_name,
        mf.slug AS manufacturer_slug,
        a.model_name,
        a.slug,
        a.attachment_type,
        COUNT(DISTINCT ma.machine_id) AS compatible_machine_count
      FROM attachments a
      JOIN manufacturers mf ON mf.id=a.manufacturer_id
      JOIN machine_attachments ma ON ma.attachment_id=a.id
      WHERE a.data_status IN ('partial','verified')
      GROUP BY a.id,mf.name,mf.slug,a.model_name,a.slug,a.attachment_type
      HAVING COUNT(DISTINCT ma.machine_id) > 0
      ORDER BY mf.name,a.attachment_type,a.model_name
    `);

    return rows.map(rowToCatalogItem);
  } catch (error) {
    console.error('Unable to load attachment catalog:', error);
    return [];
  }
}

export async function searchAttachments(term: string): Promise<AttachmentCatalogItem[]> {
  const normalized = term.trim();
  if (!normalized) return [];

  try {
    const db = await getDbReady();
    const like = `%${normalized}%`;
    const [rows] = await db.query<AttachmentCatalogRow[]>(`
      SELECT
        a.id,
        mf.name AS manufacturer_name,
        mf.slug AS manufacturer_slug,
        a.model_name,
        a.slug,
        a.attachment_type,
        COUNT(DISTINCT ma.machine_id) AS compatible_machine_count
      FROM attachments a
      JOIN manufacturers mf ON mf.id=a.manufacturer_id
      JOIN machine_attachments ma ON ma.attachment_id=a.id
      WHERE a.data_status IN ('partial','verified')
        AND (
          a.model_name LIKE ?
          OR mf.name LIKE ?
          OR CONCAT(mf.name,' ',a.model_name) LIKE ?
          OR a.attachment_type LIKE ?
          OR CONCAT(a.model_name,' loader') LIKE ?
        )
      GROUP BY a.id,mf.name,mf.slug,a.model_name,a.slug,a.attachment_type
      HAVING COUNT(DISTINCT ma.machine_id) > 0
      ORDER BY mf.name,a.attachment_type,a.model_name
      LIMIT 30
    `, [like,like,like,like,like]);

    return rows.map(rowToCatalogItem);
  } catch (error) {
    console.error('Unable to search attachments:', error);
    return [];
  }
}

export async function getAttachment(brandSlug: string, attachmentSlug: string): Promise<AttachmentDetail | null> {
  try {
    const db = await getDbReady();
    const [attachmentRows] = await db.query<AttachmentCatalogRow[]>(`
      SELECT
        a.id,
        mf.name AS manufacturer_name,
        mf.slug AS manufacturer_slug,
        a.model_name,
        a.slug,
        a.attachment_type,
        a.lift_capacity_text,
        a.lift_height_text,
        a.configuration_text,
        (SELECT COUNT(DISTINCT ma.machine_id) FROM machine_attachments ma WHERE ma.attachment_id=a.id) AS compatible_machine_count
      FROM attachments a
      JOIN manufacturers mf ON mf.id=a.manufacturer_id
      WHERE mf.slug=? AND a.slug=? AND a.data_status IN ('partial','verified')
      LIMIT 1
    `, [brandSlug, attachmentSlug]);

    const attachment = attachmentRows[0];
    if (!attachment) return null;

    const [machineRows] = await db.query<CompatibleMachineRow[]>(`
      SELECT
        m.id AS machine_id,
        mf.name AS brand,
        mf.slug AS brand_slug,
        m.model_name AS model,
        m.slug AS model_slug,
        ma.compatibility_note,
        sr.title AS source_title,
        sr.url AS source_url
      FROM machine_attachments ma
      JOIN machines m ON m.id=ma.machine_id
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      LEFT JOIN source_records sr ON sr.id=ma.source_record_id
      WHERE ma.attachment_id=? AND m.data_status IN ('partial','verified')
      ORDER BY mf.name,m.model_name
    `, [Number(attachment.id)]);

    const firstSource = machineRows.find((row) => row.source_url);

    return {
      id: Number(attachment.id),
      manufacturerName: attachment.manufacturer_name,
      manufacturerSlug: attachment.manufacturer_slug,
      modelName: attachment.model_name,
      slug: attachment.slug,
      attachmentType: attachment.attachment_type,
      compatibleMachineCount: Number(attachment.compatible_machine_count || 0),
      liftCapacityText: attachment.lift_capacity_text ?? null,
      liftHeightText: attachment.lift_height_text ?? null,
      configurationText: attachment.configuration_text ?? null,
      compatibleMachines: machineRows.map((row) => ({
        machineId: Number(row.machine_id),
        brand: row.brand,
        brandSlug: row.brand_slug,
        model: row.model,
        modelSlug: row.model_slug,
        compatibilityNote: row.compatibility_note,
      })),
      sourceTitle: firstSource?.source_title ?? null,
      sourceUrl: firstSource?.source_url ?? null,
    };
  } catch (error) {
    console.error('Unable to load attachment detail:', error);
    return null;
  }
}
