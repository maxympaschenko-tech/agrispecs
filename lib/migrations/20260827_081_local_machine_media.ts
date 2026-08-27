import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type ColumnRow = RowDataPacket & { found: number };

const images = [
  {
    sourceKey: 'commons-bammental-jd-5075e-2016',
    publicUrl: '/media/machines/john-deere/5075e/main.jpg',
    localPath: 'public/media/machines/john-deere/5075e/main.jpg',
    remoteFileUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Bammental_-_Jubil%C3%A4umsumzug_-_John_Deere_5075_E_-_2016-07-17_14-45-54.jpg?width=1600',
  },
  {
    sourceKey: 'commons-jd-1025r-petrolia-2026',
    publicUrl: '/media/machines/john-deere/1025r/main.jpg',
    localPath: 'public/media/machines/john-deere/1025r/main.jpg',
    remoteFileUrl: 'https://commons.wikimedia.org/wiki/Special:Redirect/file/Man_driving_John_Deere_1025R_on_street%2C_Petrolia%2C_Ontario%2C_2026-05-17.jpg?width=1600',
  },
] as const;

async function hasColumn(connection: Parameters<DbMigration['apply']>[0], column: string) {
  const [rows] = await connection.query<ColumnRow[]>(`
    SELECT COUNT(*) AS found
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'machine_images'
      AND COLUMN_NAME = ?
  `,[column]);
  return Number(rows[0]?.found || 0) > 0;
}

export const localMachineMediaMigration: DbMigration = {
  id: '20260827_081_local_machine_media',
  description: 'Serve licensed machine images from local Hostinger public media while retaining original source URLs',
  async apply(connection) {
    if (!(await hasColumn(connection,'storage_mode'))) {
      await connection.query(`ALTER TABLE machine_images ADD COLUMN storage_mode ENUM('local','remote') NOT NULL DEFAULT 'remote' AFTER image_url`);
    }
    if (!(await hasColumn(connection,'local_path'))) {
      await connection.query(`ALTER TABLE machine_images ADD COLUMN local_path VARCHAR(500) NULL AFTER storage_mode`);
    }
    if (!(await hasColumn(connection,'remote_file_url'))) {
      await connection.query(`ALTER TABLE machine_images ADD COLUMN remote_file_url TEXT NULL AFTER local_path`);
    }
    if (!(await hasColumn(connection,'checksum_sha256'))) {
      await connection.query(`ALTER TABLE machine_images ADD COLUMN checksum_sha256 CHAR(64) NULL AFTER remote_file_url`);
    }

    for (const image of images) {
      await connection.query(`
        UPDATE machine_images
        SET image_url=?, storage_mode='local', local_path=?, remote_file_url=?
        WHERE source_key=?
      `,[image.publicUrl,image.localPath,image.remoteFileUrl,image.sourceKey]);
    }
  },
};
