import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

const GUIDE_1025R_URL = 'https://www.deere.com/assets/pdfs/common/qrg/rpg-1025r-cut-ww-edition.pdf';
const GUIDE_5E_URL = 'https://www.deere.com/assets/pdfs/common/parts-and-service/manuals-training/5e-tier-2-tier-3-it4-and-ft4-series-utility-tractors-north-american-version-5045e-5055e.pdf';

type IdRow = RowDataPacket & { id: number };

type TaskInput = {
  machineSlug: string;
  taskKey: string;
  section: string;
  action: string;
  title: string;
  partNumber?: string;
  intervalHours?: number;
  intervalMonths?: number;
  initialIntervalHours?: number;
  capacityValue?: number;
  capacityUnit?: string;
  intervalText: string;
  notes?: string;
  sourceRecordId: number;
};

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during maintenance migration.');
  return Number(rows[0].id);
}

export const maintenanceSchedulesMigration: DbMigration = {
  id: '20260827_090_maintenance_schedules',
  description: 'Add structured maintenance schedules and fluids for John Deere 1025R and North American 5E tractors',
  async apply(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS maintenance_tasks (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        machine_id BIGINT UNSIGNED NOT NULL,
        machine_version_id BIGINT UNSIGNED NULL,
        task_key VARCHAR(191) NOT NULL,
        section VARCHAR(100) NOT NULL,
        action VARCHAR(80) NOT NULL,
        title VARCHAR(255) NOT NULL,
        part_id BIGINT UNSIGNED NULL,
        interval_hours INT UNSIGNED NULL,
        interval_months INT UNSIGNED NULL,
        initial_interval_hours INT UNSIGNED NULL,
        capacity_value DECIMAL(12,3) NULL,
        capacity_unit VARCHAR(40) NULL,
        interval_text VARCHAR(500) NOT NULL,
        notes TEXT NULL,
        source_record_id BIGINT UNSIGNED NULL,
        confidence ENUM('official','high','medium','low') NOT NULL DEFAULT 'official',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_maintenance_task_source (machine_id, task_key, source_record_id),
        KEY idx_maintenance_machine_interval (machine_id, interval_hours),
        KEY idx_maintenance_part (part_id),
        CONSTRAINT fk_maintenance_machine FOREIGN KEY (machine_id) REFERENCES machines(id),
        CONSTRAINT fk_maintenance_version FOREIGN KEY (machine_version_id) REFERENCES machine_versions(id),
        CONSTRAINT fk_maintenance_part FOREIGN KEY (part_id) REFERENCES parts(id),
        CONSTRAINT fk_maintenance_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Fluids','fluids') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const fluidsId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='fluids' LIMIT 1`);
    for (const [name, slug] of [
      ['Engine Oils','engine-oils'],
      ['Transmission & Hydraulic Fluids','transmission-hydraulic-fluids'],
    ]) {
      await connection.query(
        `INSERT INTO part_categories (parent_id,name,slug) VALUES (?,?,?) ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`,
        [fluidsId, name, slug],
      );
    }

    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Cab Air Filters','cab-air-filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    const engineOilCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='engine-oils' LIMIT 1`);
    const transmissionFluidCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='transmission-hydraulic-fluids' LIMIT 1`);
    const cabAirCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='cab-air-filters' LIMIT 1`);

    for (const part of [
      { number: 'TY26669', name: 'Plus-50 II 10W-30 Engine Oil', categoryId: engineOilCategoryId },
      { number: 'TY22000', name: 'Low Viscosity Hy-Gard Transmission / Hydraulic Oil', categoryId: transmissionFluidCategoryId },
      { number: 'HF235742801', name: 'Cab Air Filter', categoryId: cabAirCategoryId },
    ]) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, part.categoryId, part.number, part.number, part.name],
      );
    }

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    async function ensureSource(externalId: string, url: string, title: string, publishedDate: string) {
      const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [externalId]);
      if (existing[0]?.id) return Number(existing[0].id);
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
        [sourceId, url, externalId, title, publishedDate],
      );
      return Number(result.insertId);
    }

    const source1025R = await ensureSource(
      'jd-rpg-1025r-worldwide-2024-01',
      GUIDE_1025R_URL,
      'John Deere 1025R Compact Utility Tractor Replacement Parts Guide - HJ100001 and later',
      '2024-01-01',
    );
    const source5E = await ensureSource(
      'jd-5e-na-filter-overview-2020-03',
      GUIDE_5E_URL,
      'John Deere 5E North American Filter Overview with Service Intervals - 5045E, 5055E, 5065E, 5075E',
      '2020-03-01',
    );

    async function machineId(slug: string) {
      return selectId(
        connection,
        `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`,
        [slug],
      );
    }

    async function partId(number: string) {
      return selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, number]);
    }

    async function linkPartToMachine(machineSlug: string, number: string, note: string, sourceRecordId: number) {
      const mid = await machineId(machineSlug);
      const pid = await partId(number);
      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
        [mid, pid, note],
      );
      if (!existing[0]) {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`,
          [mid, pid, note, sourceRecordId],
        );
      }
    }

    await linkPartToMachine('1025r', 'TY26669', 'Plus-50 II 10W-30 engine oil; 2.7 L (2.9 qt) with filter', source1025R);
    await linkPartToMachine('1025r', 'TY22000', 'Low Viscosity Hy-Gard transmission oil; 12.3 L (12.9 qt)', source1025R);
    await linkPartToMachine('1025r', 'HF235742801', 'Cab air filter; change every 50 hours when equipped', source1025R);

    async function upsertTask(task: TaskInput) {
      const mid = await machineId(task.machineSlug);
      const pid = task.partNumber ? await partId(task.partNumber) : null;
      await connection.query(
        `INSERT INTO maintenance_tasks (
          machine_id,task_key,section,action,title,part_id,interval_hours,interval_months,initial_interval_hours,
          capacity_value,capacity_unit,interval_text,notes,source_record_id,confidence
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'official')
        ON DUPLICATE KEY UPDATE
          section=VALUES(section),action=VALUES(action),title=VALUES(title),part_id=VALUES(part_id),
          interval_hours=VALUES(interval_hours),interval_months=VALUES(interval_months),initial_interval_hours=VALUES(initial_interval_hours),
          capacity_value=VALUES(capacity_value),capacity_unit=VALUES(capacity_unit),interval_text=VALUES(interval_text),
          notes=VALUES(notes),confidence='official'`,
        [
          mid, task.taskKey, task.section, task.action, task.title, pid,
          task.intervalHours ?? null, task.intervalMonths ?? null, task.initialIntervalHours ?? null,
          task.capacityValue ?? null, task.capacityUnit ?? null, task.intervalText, task.notes ?? null, task.sourceRecordId,
        ],
      );
    }

    const tasks1025R: TaskInput[] = [
      { machineSlug:'1025r', taskKey:'engine-oil', section:'Engine', action:'Change', title:'Engine oil', partNumber:'TY26669', intervalHours:200, intervalMonths:12, capacityValue:2.7, capacityUnit:'L', intervalText:'Every 200 hours and annually', notes:'John Deere Plus-50 II 10W-30; capacity with filter is 2.7 L (2.9 qt).', sourceRecordId:source1025R },
      { machineSlug:'1025r', taskKey:'engine-oil-filter', section:'Engine', action:'Replace', title:'Engine oil filter', partNumber:'M806418', intervalHours:200, intervalMonths:12, intervalText:'Every 200 hours and annually', sourceRecordId:source1025R },
      { machineSlug:'1025r', taskKey:'primary-air-filter', section:'Fuel & Air', action:'Replace', title:'Primary air filter', partNumber:'LVU34503', intervalHours:200, intervalMonths:12, intervalText:'Every 200 hours and annually', notes:'LVU34503 applies to serial JJ153037 and later; earlier machines use M131802.', sourceRecordId:source1025R },
      { machineSlug:'1025r', taskKey:'secondary-air-filter', section:'Fuel & Air', action:'Replace', title:'Secondary air filter', partNumber:'LVU34504', intervalHours:200, intervalMonths:12, intervalText:'Every 200 hours and annually', notes:'LVU34504 applies to serial JJ153037 and later; earlier machines use M131803.', sourceRecordId:source1025R },
      { machineSlug:'1025r', taskKey:'inline-fuel-filter', section:'Fuel & Air', action:'Replace', title:'Inline fuel filter', partNumber:'AM116304', intervalHours:400, intervalMonths:12, intervalText:'Every 400 hours and annually', sourceRecordId:source1025R },
      { machineSlug:'1025r', taskKey:'fuel-filter-element', section:'Fuel & Air', action:'Replace', title:'Fuel filter element', partNumber:'MIU804763', intervalHours:400, intervalMonths:12, intervalText:'Every 400 hours and annually', sourceRecordId:source1025R },
      { machineSlug:'1025r', taskKey:'transmission-oil', section:'Transmission', action:'Change', title:'Transmission oil', partNumber:'TY22000', intervalHours:200, capacityValue:12.3, capacityUnit:'L', intervalText:'Every 200 hours', notes:'John Deere Low Viscosity Hy-Gard; capacity 12.3 L (12.9 qt).', sourceRecordId:source1025R },
      { machineSlug:'1025r', taskKey:'transmission-filter', section:'Transmission', action:'Replace', title:'Hydraulic / transmission oil filter', partNumber:'LVA16054', intervalHours:200, intervalText:'Every 200 hours', sourceRecordId:source1025R },
      { machineSlug:'1025r', taskKey:'cab-air-filter', section:'Cab', action:'Replace', title:'Cab air filter', partNumber:'HF235742801', intervalHours:50, intervalText:'Every 50 hours', notes:'If equipped.', sourceRecordId:source1025R },
    ];
    for (const task of tasks1025R) await upsertTask(task);

    for (const slug of ['5045e','5055e','5065e','5075e']) {
      const tasks5E: TaskInput[] = [
        { machineSlug:slug, taskKey:'engine-oil-filter', section:'Engine', action:'Replace', title:'Engine oil filter', partNumber:'RE519626', intervalHours:250, intervalMonths:12, initialIntervalHours:100, intervalText:'After initial 100 hours, then every 250 hours or annually', notes:'With Plus-50 II oil and a John Deere filter, the guide states the interval may be extended to 500 hours.', sourceRecordId:source5E },
        { machineSlug:slug, taskKey:'hydraulic-oil-filter', section:'Hydraulics', action:'Replace', title:'Hydraulic oil filter', partNumber:'RE45864', intervalHours:250, initialIntervalHours:100, intervalText:'After initial 100 hours, then every 250 hours and at the 1200-hour service', notes:'Use the operator manual to confirm the complete hydraulic oil service procedure.', sourceRecordId:source5E },
        { machineSlug:slug, taskKey:'primary-air-filter-ft4', section:'Fuel & Air', action:'Service / replace', title:'Primary air filter (Final Tier 4)', partNumber:'SU29300', intervalHours:250, intervalMonths:12, intervalText:'Service every 250 hours or annually, and as required by conditions', notes:'Final Tier 4 engine application.', sourceRecordId:source5E },
        { machineSlug:slug, taskKey:'secondary-air-filter-ft4', section:'Fuel & Air', action:'Service / replace', title:'Secondary air filter (Final Tier 4)', partNumber:'SU29301', intervalHours:250, intervalMonths:12, intervalText:'Service every 250 hours or annually, and as required by conditions', notes:'Final Tier 4 engine application.', sourceRecordId:source5E },
        { machineSlug:slug, taskKey:'fuel-filter-ft4', section:'Fuel & Air', action:'Replace', title:'Fuel filter (Final Tier 4)', partNumber:'R536698', intervalHours:500, intervalText:'Every 500 hours', notes:'Final Tier 4 engine application.', sourceRecordId:source5E },
      ];
      for (const task of tasks5E) await upsertTask(task);
    }
  },
};
