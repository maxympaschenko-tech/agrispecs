import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CC_BY_SA_40 = 'https://creativecommons.org/licenses/by-sa/4.0/';

export const moreMachineImagesMigration: DbMigration = {
  id: '20260827_082_more_machine_images',
  description: 'Add locally served licensed image metadata for John Deere 6R 150',
  async apply(connection) {
    const [machineRows] = await connection.query<IdRow[]>(`
      SELECT m.id
      FROM machines m
      INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='john-deere' AND m.slug='6r-150'
      LIMIT 1
    `);
    if (!machineRows[0]) throw new Error('John Deere 6R 150 machine row was not found during image migration.');

    await connection.query(`
      INSERT INTO machine_images (
        machine_id,source_key,image_url,source_page_url,author,license_name,license_url,caption,alt_text,is_primary,display_order
      ) VALUES (?,?,?,?,?,?,?,?,?,TRUE,0)
      ON DUPLICATE KEY UPDATE
        machine_id=VALUES(machine_id),image_url=VALUES(image_url),source_page_url=VALUES(source_page_url),
        author=VALUES(author),license_name=VALUES(license_name),license_url=VALUES(license_url),
        caption=VALUES(caption),alt_text=VALUES(alt_text),is_primary=TRUE,display_order=0
    `,[
      Number(machineRows[0].id),
      'commons-jd-6r-150-gotland-2024',
      '/media/machines/john-deere/6r-150/main.jpg',
      'https://commons.wikimedia.org/wiki/File:John_Deere_6R_150.jpg',
      'Bene Riobó',
      'CC BY-SA 4.0',
      CC_BY_SA_40,
      'John Deere 6R 150 at Gotlands Skördefestival, Sweden, 2024.',
      'John Deere 6R 150 tractor',
    ]);
  },
};
