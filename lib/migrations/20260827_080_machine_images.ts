import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CC_BY_SA_40 = 'https://creativecommons.org/licenses/by-sa/4.0/';

const images = [
  {
    machineSlug: '5075e',
    sourceKey: 'commons-bammental-jd-5075e-2016',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Bammental_-_Jubil%C3%A4umsumzug_-_John_Deere_5075_E_-_2016-07-17_14-45-54.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Bammental_-_Jubil%C3%A4umsumzug_-_John_Deere_5075_E_-_2016-07-17_14-45-54.jpg',
    author: 'Radosław Drożdżewski (Zwiadowca21)',
    licenseName: 'CC BY-SA 4.0',
    licenseUrl: CC_BY_SA_40,
    caption: 'John Deere 5075E in Bammental, Germany, 2016.',
    altText: 'John Deere 5075E tractor',
  },
  {
    machineSlug: '1025r',
    sourceKey: 'commons-jd-1025r-petrolia-2026',
    imageUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Man_driving_John_Deere_1025R_on_street%2C_Petrolia%2C_Ontario%2C_2026-05-17.jpg',
    sourcePageUrl: 'https://commons.wikimedia.org/wiki/File:Man_driving_John_Deere_1025R_on_street%2C_Petrolia%2C_Ontario%2C_2026-05-17.jpg',
    author: 'Chris Woodrich',
    licenseName: 'CC BY-SA 4.0',
    licenseUrl: CC_BY_SA_40,
    caption: 'John Deere 1025R in Petrolia, Ontario, 2026.',
    altText: 'John Deere 1025R tractor',
  },
] as const;

async function selectMachineId(connection: Parameters<DbMigration['apply']>[0], slug: string) {
  const [rows] = await connection.query<IdRow[]>(`
    SELECT m.id
    FROM machines m
    INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id
    WHERE mf.slug='john-deere' AND m.slug=?
    LIMIT 1
  `,[slug]);
  if (!rows[0]) throw new Error(`Machine ${slug} was not found during image migration.`);
  return Number(rows[0].id);
}

export const machineImagesMigration: DbMigration = {
  id: '20260827_080_machine_images',
  description: 'Add licensed machine image metadata and first Wikimedia Commons tractor photos',
  async apply(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS machine_images (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        machine_id BIGINT UNSIGNED NOT NULL,
        machine_version_id BIGINT UNSIGNED NULL,
        source_key VARCHAR(191) NOT NULL UNIQUE,
        image_url TEXT NOT NULL,
        source_page_url TEXT NOT NULL,
        author VARCHAR(255) NULL,
        license_name VARCHAR(120) NULL,
        license_url TEXT NULL,
        caption VARCHAR(500) NULL,
        alt_text VARCHAR(255) NULL,
        is_primary BOOLEAN NOT NULL DEFAULT FALSE,
        display_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        KEY idx_machine_images_machine (machine_id,is_primary,display_order),
        CONSTRAINT fk_machine_images_machine FOREIGN KEY (machine_id) REFERENCES machines(id),
        CONSTRAINT fk_machine_images_version FOREIGN KEY (machine_version_id) REFERENCES machine_versions(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (const image of images) {
      const machineId = await selectMachineId(connection,image.machineSlug);
      await connection.query(`
        INSERT INTO machine_images (
          machine_id,source_key,image_url,source_page_url,author,license_name,license_url,caption,alt_text,is_primary,display_order
        ) VALUES (?,?,?,?,?,?,?,?,?,TRUE,0)
        ON DUPLICATE KEY UPDATE
          machine_id=VALUES(machine_id),image_url=VALUES(image_url),source_page_url=VALUES(source_page_url),
          author=VALUES(author),license_name=VALUES(license_name),license_url=VALUES(license_url),
          caption=VALUES(caption),alt_text=VALUES(alt_text),is_primary=TRUE,display_order=0
      `,[machineId,image.sourceKey,image.imageUrl,image.sourcePageUrl,image.author,image.licenseName,image.licenseUrl,image.caption,image.altText]);
    }
  },
};
