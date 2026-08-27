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
