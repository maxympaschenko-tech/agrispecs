import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type LoaderSeed = {
  model: string;
  slug: string;
  liftCapacity: string;
  liftHeight: string;
  leveling: string;
};

const SOURCE_EXTERNAL_ID = 'jd-front-loader-compatibility-2026-08';
const SOURCE_URL = 'https://www.deere.com/en/loaders/front-end-loaders-for-tractors/';

const loaders: LoaderSeed[] = [
  {
    model: '520M',
    slug: '520m',
    liftCapacity: 'NSL 3334.9-3611.6 lb (1512.7-1638.2 kg); MSL 2460.1-2661 lb (1115.9-1207 kg)',
    liftHeight: 'NSL 130-132 in (3302-3352 mm); MSL 130-132 in (3302-3352 mm)',
    leveling: 'Non-self-leveling and mechanical self-leveling',
  },
  {
    model: '540M',
    slug: '540m',
    liftCapacity: 'NSL 2394-2666 lb (1088-1212 kg); MSL 3117.3-3309.1 lb (1414-1501 kg)',
    liftHeight: 'NSL 137-141 in (3482-3571 mm); MSL 138-141 in (3501-3578 mm)',
    leveling: 'Non-self-leveling and mechanical self-leveling',
  },
  {
    model: '540R',
    slug: '540r',
    liftCapacity: '3406 lb (1545 kg)',
    liftHeight: '141.85 in (3600 mm)',
    leveling: 'Non-self-leveling and mechanical self-leveling',
  },
  {
    model: '600M',
    slug: '600m',
    liftCapacity: 'NSL 3104-3236 lb (1408-1468 kg); MSL 3891-4085 lb (1765-1853 kg)',
    liftHeight: 'NSL 148.8-152.8 in (3782-3881 mm); MSL 148-153 in (3759-3886 mm)',
    leveling: 'Non-self-leveling and mechanical self-leveling',
  },
];

const tractorSlugs = ['5075m','5095m','5105m','5120m','5130m'] as const;

function compatibilityNote(loaderSlug: string) {
  if (loaderSlug === '520m') return 'John Deere lists this loader as compatible with these 5M tractors in 4WD configuration.';
  if (loaderSlug === '540m') return 'John Deere lists this loader as compatible with these 5M tractors in NSL and MSL configurations.';
  if (loaderSlug === '540r') return 'John Deere lists this loader as compatible with these 5M tractors in NSL and MSL configurations.';
  return 'John Deere lists this loader as compatible with these 5M tractors with an NSL-only boom configuration.';
}

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing loader compatibility migration dependency.');
  return Number(rows[0].id);
}

export const loaderCompatibilityMigration: DbMigration = {
  id: '20260827_126_loader_compatibility',
  description: 'Add source-backed John Deere 5M to 520M, 540M, 540R and 600M front-loader compatibility',
  async apply(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS attachments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        manufacturer_id BIGINT UNSIGNED NOT NULL,
        attachment_type VARCHAR(80) NOT NULL,
        model_name VARCHAR(160) NOT NULL,
        slug VARCHAR(180) NOT NULL,
        lift_capacity_text VARCHAR(500) NULL,
        lift_height_text VARCHAR(500) NULL,
        configuration_text VARCHAR(500) NULL,
        data_status ENUM('seed','partial','verified','review') NOT NULL DEFAULT 'seed',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_attachment (manufacturer_id,attachment_type,slug),
        KEY idx_attachment_type_status (attachment_type,data_status),
        CONSTRAINT fk_attachment_manufacturer FOREIGN KEY (manufacturer_id) REFERENCES manufacturers(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS machine_attachments (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        machine_id BIGINT UNSIGNED NOT NULL,
        attachment_id BIGINT UNSIGNED NOT NULL,
        compatibility_note VARCHAR(700) NULL,
        source_record_id BIGINT UNSIGNED NULL,
        confidence ENUM('official','high','medium','low') NOT NULL DEFAULT 'official',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_machine_attachment_source (machine_id,attachment_id,source_record_id),
        KEY idx_machine_attachments_attachment (attachment_id,machine_id),
        CONSTRAINT fk_machine_attachment_machine FOREIGN KEY (machine_id) REFERENCES machines(id),
        CONSTRAINT fk_machine_attachment_attachment FOREIGN KEY (attachment_id) REFERENCES attachments(id),
        CONSTRAINT fk_machine_attachment_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [SOURCE_EXTERNAL_ID]);
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'John Deere Front End Loaders for Tractors - Utility Tractor Loader Compatibility'],
      );
      sourceRecordId = Number(result.insertId);
    }

    for (const loader of loaders) {
      await connection.query(
        `INSERT INTO attachments (
          manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status
        ) VALUES (?,'front-loader',?,?,?,?,?,'verified')
        ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),
          lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId,loader.model,loader.slug,loader.liftCapacity,loader.liftHeight,loader.leveling],
      );
      const attachmentId = await selectId(
        connection,
        `SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug=? LIMIT 1`,
        [manufacturerId,loader.slug],
      );

      for (const tractorSlug of tractorSlugs) {
        const machineId = await selectId(connection, `
          SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
          WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1
        `, [tractorSlug]);
        await connection.query(
          `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES (?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),confidence='official'`,
          [machineId,attachmentId,compatibilityNote(loader.slug),sourceRecordId],
        );
      }
    }
  },
};
