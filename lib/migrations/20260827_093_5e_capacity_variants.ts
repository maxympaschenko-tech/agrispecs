import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

const SOURCE_URL = 'https://www.deere.com/assets/pdfs/common/parts-and-service/manuals-training/5E%20Tier%202%2C%20Tier%203%2C%20iT4%20and%20FT4%20Series%20Utility%20Tractors%20%28North%20American%20Version%29%20%EF%BF%83%EF%BE%A2%EF%BF%82%EF%BE%80%EF%BF%82%EF%BE%93%205045E%2C%205055E%2C%205065E%2C%205075E.pdf';
const SOURCE_EXTERNAL_ID = 'jd-5e-na-capacities-2019-01';

type IdRow = RowDataPacket & { id: number };

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during 5E capacities migration.');
  return Number(rows[0].id);
}

export const johnDeere5ECapacityVariantsMigration: DbMigration = {
  id: '20260827_093_5e_capacity_variants',
  description: 'Add configuration-specific North American fluid capacities for John Deere 5045E, 5055E, 5065E and 5075E',
  async apply(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS machine_capacities (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        machine_id BIGINT UNSIGNED NOT NULL,
        machine_version_id BIGINT UNSIGNED NULL,
        system_key VARCHAR(191) NOT NULL,
        label VARCHAR(255) NOT NULL,
        configuration VARCHAR(191) NOT NULL DEFAULT '',
        value_number DECIMAL(14,3) NOT NULL,
        unit VARCHAR(40) NOT NULL,
        fluid_name VARCHAR(255) NULL,
        notes VARCHAR(500) NULL,
        source_record_id BIGINT UNSIGNED NOT NULL,
        confidence ENUM('official','high','medium','low') NOT NULL DEFAULT 'official',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_machine_capacity_source (machine_id,system_key,configuration,source_record_id),
        KEY idx_machine_capacities_machine (machine_id,system_key),
        CONSTRAINT fk_machine_capacity_machine FOREIGN KEY (machine_id) REFERENCES machines(id),
        CONSTRAINT fk_machine_capacity_version FOREIGN KEY (machine_version_id) REFERENCES machine_versions(id),
        CONSTRAINT fk_machine_capacity_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [SOURCE_EXTERNAL_ID]);
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
        [sourceId, SOURCE_URL, SOURCE_EXTERNAL_ID, 'John Deere 5E Tier 2, Tier 3, iT4 and FT4 Utility Tractors - North American Capacities', '2019-01-01'],
      );
      sourceRecordId = Number(result.insertId);
    }

    const capacities = [
      { key:'fuel-tank-open', label:'Fuel tank', config:'Open Station', value:68, unit:'L', fluid:null, notes:'Approximate capacity: 18 US gal.' },
      { key:'fuel-tank-cab', label:'Fuel tank', config:'Cab', value:82, unit:'L', fluid:null, notes:'Approximate capacity: 21.6 US gal.' },
      { key:'cooling-system', label:'Cooling system', config:'', value:9.5, unit:'L', fluid:'John Deere Cool-Gard II', notes:'Approximate capacity: 2.5 US gal.' },
      { key:'engine-oil', label:'Engine oil', config:'', value:8.5, unit:'L', fluid:'John Deere Plus-50 II', notes:'Approximate capacity: 2.24 US gal.' },
      { key:'trans-hyd-sync-shuttle', label:'Transmission and hydraulic system', config:'Trans Sync Shuttle', value:38, unit:'L', fluid:'John Deere Hy-Gard', notes:'Approximate capacity: 10 US gal.' },
      { key:'trans-hyd-powrreverser', label:'Transmission and hydraulic system', config:'PowrReverser', value:43.5, unit:'L', fluid:'John Deere Hy-Gard', notes:'Approximate capacity: 11.5 US gal.' },
      { key:'mfwd-axle-housing', label:'MFWD axle housing', config:'MFWD', value:4.5, unit:'L', fluid:'John Deere Hy-Gard', notes:'Approximate capacity: 1.18 US gal.' },
      { key:'mfwd-wheel-hub', label:'MFWD wheel hub', config:'Each hub', value:0.8, unit:'L', fluid:'John Deere Hy-Gard', notes:'Approximate capacity: 0.21 US gal per hub.' },
    ] as const;

    for (const slug of ['5045e','5055e','5065e','5075e']) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`,
        [slug],
      );

      for (const capacity of capacities) {
        await connection.query(
          `INSERT INTO machine_capacities (
            machine_id,system_key,label,configuration,value_number,unit,fluid_name,notes,source_record_id,confidence
          ) VALUES (?,?,?,?,?,?,?,?,?,'official')
          ON DUPLICATE KEY UPDATE
            label=VALUES(label),value_number=VALUES(value_number),unit=VALUES(unit),fluid_name=VALUES(fluid_name),
            notes=VALUES(notes),confidence='official'`,
          [machineId, capacity.key, capacity.label, capacity.config, capacity.value, capacity.unit, capacity.fluid, capacity.notes, sourceRecordId],
        );
      }
    }
  },
};
