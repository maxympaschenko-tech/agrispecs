import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export type MachineImage = {
  id: number;
  imageUrl: string;
  sourcePageUrl: string;
  author: string | null;
  licenseName: string | null;
  licenseUrl: string | null;
  caption: string | null;
  altText: string | null;
  isPrimary: boolean;
};

type MachineImageRow = RowDataPacket & {
  id: number;
  image_url: string;
  source_page_url: string;
  author: string | null;
  license_name: string | null;
  license_url: string | null;
  caption: string | null;
  alt_text: string | null;
  is_primary: number;
};

export async function getMachineImages(machineId: string): Promise<MachineImage[]> {
  if (!/^\d+$/.test(machineId)) return [];
  try {
    const db = await getDbReady();
    const [rows] = await db.query<MachineImageRow[]>(`
      SELECT id,image_url,source_page_url,author,license_name,license_url,caption,alt_text,is_primary
      FROM machine_images
      WHERE machine_id=?
      ORDER BY is_primary DESC,display_order ASC,id ASC
    `,[Number(machineId)]);
    return rows.map((row) => ({
      id: Number(row.id),
      imageUrl: row.image_url,
      sourcePageUrl: row.source_page_url,
      author: row.author,
      licenseName: row.license_name,
      licenseUrl: row.license_url,
      caption: row.caption,
      altText: row.alt_text,
      isPrimary: Boolean(row.is_primary),
    }));
  } catch (error) {
    console.error('Unable to load machine images:', error);
    return [];
  }
}
