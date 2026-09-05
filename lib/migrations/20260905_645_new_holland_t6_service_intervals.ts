import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const SOURCE_URL = 'https://agriculture.newholland.com/en-us/nar/our-vision/sustainable-farming';
const SOURCE_EXTERNAL_ID = 'new-holland-nar-t6-750-1500-service-intervals-2026-09';

const models = [
  { slug: 't6-145', model: 'T6.145' },
  { slug: 't6-155', model: 'T6.155' },
  { slug: 't6-160', model: 'T6.160' },
  { slug: 't6-175', model: 'T6.175' },
  { slug: 't6-180', model: 'T6.180' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing current T6 service-interval migration dependency.');
  return Number(rows[0].id);
}

async function ensureSource(
  connection: Parameters<DbMigration['apply']>[0],
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM sources WHERE domain='agriculture.newholland.com' AND source_type='manufacturer' ORDER BY CASE WHEN authority_level='official' THEN 0 ELSE 1 END,id LIMIT 1`,
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('New Holland Agriculture','agriculture.newholland.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
    [SOURCE_EXTERNAL_ID],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [
      sourceId,
      SOURCE_URL,
      SOURCE_EXTERNAL_ID,
      'New Holland North America - T6/T7 longer service intervals with HI-eSCR 2',
      JSON.stringify({
        role: 'Official current North American T6 service-interval evidence',
        evidence: {
          engineServiceIntervalHours: 750,
          transmissionServiceIntervalHours: 1500,
          statement: 'New Holland states that the complete T6 and T7 ranges have service intervals extended by 25% to 750 hours and transmission service intervals extended to 1500 hours.',
        },
        corroboration: {
          operatorManual: 'New Holland operator manual 90478716, 2nd edition English, January 2022',
          manualModels: ['T6.145','T6.155','T6.160','T6.165','T6.175','T6.180'],
          manualEvidence: 'The maintenance chart contains EVERY 750 HOURS, including Change engine oil and filter, fuel-filter service, outer air-cleaner replacement and charge-pump oil-filter replacement.',
        },
        correctionNote: 'The linked T6 brochure is internally inconsistent: its engine narrative also states 750/1500 hours, while the final specification table still shows 600 engine hours. This official live NAR sustainability page plus the 2022 operator manual resolve the current Stage V engine interval in favor of 750 hours.',
        guardrail: 'This source record establishes interval timing only. It does not identify OEM part numbers or configuration-specific filter positions.',
      }),
    ],
  );
  return Number(result.insertId);
}

export const newHollandT6ServiceIntervalsMigration: DbMigration = {
  id: '20260905_645_new_holland_t6_service_intervals',
  description: 'Add official current North American 750-hour engine and 1500-hour transmission service intervals for the five current diesel T6 models',
  async apply(connection) {
    const sourceId = await ensureSource(connection);
    const sourceRecordId = await ensureSourceRecord(connection, sourceId);

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [model.slug],
      );
      const versionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=TRUE LIMIT 1`,
        [machineId, CURRENT_VERSION],
      );

      const tasks = [
        {
          taskKey: 'current-t6-engine-oil-filter-750',
          section: 'Engine',
          action: 'Change',
          title: 'engine oil and filter',
          intervalHours: 750,
          intervalText: 'Every 750 hours',
          notes: 'Official New Holland North America HI-eSCR 2 service interval. Operator manual 90478716 independently places engine oil and filter in the EVERY 750 HOURS section. Exact filter part number remains configuration/build-specific and is not attached here.',
        },
        {
          taskKey: 'current-t6-transmission-service-1500',
          section: 'Transmission',
          action: 'Perform',
          title: 'driveline / transmission service',
          intervalHours: 1500,
          intervalText: 'Every 1,500 hours',
          notes: 'Official New Holland North America states that T6/T7 transmission service intervals are extended to 1,500 hours. Follow the operator manual for the exact oil/filter procedure and transmission configuration; no part number is inferred here.',
        },
      ] as const;

      for (const task of tasks) {
        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM maintenance_tasks WHERE machine_id=? AND task_key=? AND source_record_id=? LIMIT 1`,
          [machineId, task.taskKey, sourceRecordId],
        );
        if (existing[0]) {
          await connection.query(
            `UPDATE maintenance_tasks
             SET machine_version_id=?,section=?,action=?,title=?,part_id=NULL,interval_hours=?,interval_months=NULL,
                 initial_interval_hours=NULL,capacity_value=NULL,capacity_unit=NULL,interval_text=?,notes=?,confidence='official'
             WHERE id=?`,
            [
              versionId,
              task.section,
              task.action,
              task.title,
              task.intervalHours,
              task.intervalText,
              task.notes,
              Number(existing[0].id),
            ],
          );
        } else {
          await connection.query(
            `INSERT INTO maintenance_tasks (
              machine_id,machine_version_id,task_key,section,action,title,part_id,interval_hours,interval_months,
              initial_interval_hours,capacity_value,capacity_unit,interval_text,notes,source_record_id,confidence
            ) VALUES (?,?,?,?,?,?,NULL,?,NULL,NULL,NULL,NULL,?,?,?,'official')`,
            [
              machineId,
              versionId,
              task.taskKey,
              task.section,
              task.action,
              task.title,
              task.intervalHours,
              task.intervalText,
              task.notes,
              sourceRecordId,
            ],
          );
        }
      }
    }
  },
};
