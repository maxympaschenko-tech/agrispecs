import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type TaskInput = {
  taskKey: string;
  section: string;
  action: string;
  title: string;
  intervalHours?: number;
  intervalMonths?: number;
  intervalText: string;
  notes?: string;
};

const MANUAL_URL = 'https://www.ebooklibonline.com/onlinepages/PREVIEW-51493747-linked%20pdf.pdf';
const SOURCE_EXTERNAL_ID = 'nh-t5-autocommand-51493747-maintenance-index-completion-2026-09';
const VERSION_SLUG = 'autocommand-manual-51493747';

const models = [
  { slug: 't5-110', model: 'T5.110' },
  { slug: 't5-120', model: 'T5.120' },
  { slug: 't5-130', model: 'T5.130' },
  { slug: 't5-140', model: 'T5.140' },
] as const;

const tasks: TaskInput[] = [
  {
    taskKey: 'autocommand-front-axle-levels-600',
    section: 'Axle',
    action: 'Check',
    title: '4WD front axle differential and hub oil levels',
    intervalHours: 600,
    intervalText: 'Every 600 hours',
    notes: 'Operator manual 51493747 lists this check at the 600-hour service. Applies to 4WD equipment where fitted.',
  },
  {
    taskKey: 'autocommand-front-pto-oil-level-600',
    section: 'PTO',
    action: 'Check',
    title: 'front PTO gearbox oil level',
    intervalHours: 600,
    intervalText: 'Every 600 hours',
    notes: 'Applies where a front PTO is fitted.',
  },
  {
    taskKey: 'autocommand-poly-v-belt-inspect-600',
    section: 'Engine',
    action: 'Inspect',
    title: 'poly V-belt',
    intervalHours: 600,
    intervalText: 'Every 600 hours',
  },
  {
    taskKey: 'autocommand-compressor-belt-inspect-600',
    section: 'Engine',
    action: 'Inspect',
    title: 'compressor drive belt',
    intervalHours: 600,
    intervalText: 'Every 600 hours',
    notes: 'Applies to equipped compressor systems.',
  },
  {
    taskKey: 'autocommand-4wd-planetary-hub-oil-600',
    section: 'Axle',
    action: 'Change',
    title: '4WD planetary hub oil',
    intervalHours: 600,
    intervalText: 'Every 600 hours',
    notes: 'Applies to the 4WD front axle configuration covered by the manual.',
  },
  {
    taskKey: 'autocommand-4wd-differential-oil-1200',
    section: 'Axle',
    action: 'Change',
    title: '4WD differential oil',
    intervalHours: 1200,
    intervalMonths: 12,
    intervalText: 'Every 1200 hours or annually',
  },
  {
    taskKey: 'autocommand-front-pto-oil-1200',
    section: 'PTO',
    action: 'Change',
    title: 'front PTO gearbox oil',
    intervalHours: 1200,
    intervalMonths: 12,
    intervalText: 'Every 1200 hours or annually',
    notes: 'Applies where a front PTO is fitted.',
  },
  {
    taskKey: 'autocommand-rear-axle-bearing-grease-1200',
    section: 'Axle',
    action: 'Grease',
    title: 'rear axle shaft bearing',
    intervalHours: 1200,
    intervalMonths: 12,
    intervalText: 'Every 1200 hours or annually',
  },
  {
    taskKey: 'autocommand-def-inline-filter-replace-1200',
    section: 'Engine',
    action: 'Replace',
    title: 'DEF / AdBlue in-line filter',
    intervalHours: 1200,
    intervalMonths: 24,
    intervalText: 'Every 1200 hours or every 2 years',
    notes: 'The manual separately calls for cleaning this in-line filter every 600 hours. No OEM part number is attached because the exact in-line filter part for this manual generation has not been proven.',
  },
  {
    taskKey: 'autocommand-air-brake-drier-reservoir-1200',
    section: 'Brakes',
    action: 'Replace',
    title: 'air brake drier reservoir',
    intervalHours: 1200,
    intervalMonths: 24,
    intervalText: 'Every 1200 hours or every 2 years',
    notes: 'Applies to tractors equipped with the relevant air-brake system.',
  },
  {
    taskKey: 'autocommand-poly-v-belts-replace-1200',
    section: 'Engine',
    action: 'Replace',
    title: 'poly V-belts',
    intervalHours: 1200,
    intervalMonths: 24,
    intervalText: 'Every 1200 hours or every 2 years',
  },
  {
    taskKey: 'autocommand-ac-receiver-drier-2years',
    section: 'Cab',
    action: 'Replace',
    title: 'air conditioning receiver drier',
    intervalMonths: 24,
    intervalText: 'Every 2 years',
    notes: 'Applies to tractors equipped with air conditioning.',
  },
  {
    taskKey: 'autocommand-camshaft-tappets-2400',
    section: 'Engine',
    action: 'Check',
    title: 'camshaft tappets',
    intervalHours: 2400,
    intervalMonths: 24,
    intervalText: 'Every 2400 hours or every 2 years',
  },
  {
    taskKey: 'autocommand-def-main-filter-3600',
    section: 'Engine',
    action: 'Replace',
    title: 'DEF / AdBlue main filter',
    intervalHours: 3600,
    intervalMonths: 24,
    intervalText: 'Every 3600 hours or every 2 years',
    notes: 'Operator manual 51493747 identifies the service role as the DEF/AdBlue main filter. Part 47748585 is separately verified as a main DEF/DENOX filter on Stage V North American T5 AutoCommand/Dynamic Command tractors, but it is deliberately not attached to this broader manual-scoped task because the accessible manual preview does not prove the exact emissions/market generation.',
  },
  {
    taskKey: 'autocommand-engine-coolant-3600-4years',
    section: 'Engine',
    action: 'Change',
    title: 'engine coolant fluid',
    intervalHours: 3600,
    intervalMonths: 48,
    intervalText: 'Every 3600 hours or every 4 years',
    notes: 'Fluid specification and capacity are not inferred by this migration.',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5 AutoCommand maintenance-completion dependency.');
  return Number(rows[0].id);
}

export const newHollandT5AutoCommandMaintenanceCompletionMigration: DbMigration = {
  id: '20260905_634_new_holland_t5_autocommand_maintenance_completion',
  description: 'Complete the T5.110-T5.140 AutoCommand maintenance index from operator manual 51493747 without forcing unproven OEM part numbers',
  async apply(connection) {
    const sourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='New Holland Operator Manual Preview' AND domain='ebooklibonline.com' ORDER BY id LIMIT 1`,
    );

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
      [SOURCE_EXTERNAL_ID],
    );
    let sourceRecordId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,published_date,raw_reference) VALUES (?,?,?,?,?,?)`,
        [
          sourceId,
          MANUAL_URL,
          SOURCE_EXTERNAL_ID,
          'New Holland T5.110/T5.120/T5.130/T5.140 AutoCommand Operator Manual 51493747 - complete maintenance interval index',
          '2019-02-01',
          JSON.stringify({
            role: 'Additional maintenance intervals omitted from migration 630',
            publicationNumber: '51493747',
            configuration: 'AutoCommand',
            models: models.map((model) => model.model),
            evidence: {
              every600Hours: [
                'Check the 4WD front axle differential oil level and the hubs oil level',
                'Check the front PTO gearbox oil level',
                'Inspect the poly V-belt',
                'Inspect the compressor drive belt',
                'Change the 4WD planetary hub oil',
              ],
              every1200HoursOrAnnually: [
                'Change the 4WD differential oil',
                'Change the front PTO gearbox oil',
                'Grease the rear axle shaft bearing',
              ],
              every1200HoursOrEvery2Years: [
                'Change the DEF/AdBlue in-line filter',
                'Change the air brake drier reservoir',
                'Change the poly V-belts',
              ],
              every2Years: ['Change the air conditioning receiver drier'],
              every2400HoursOrEvery2Years: ['Camshaft tappets - check'],
              every3600HoursOrEvery2Years: ['Change the DEF/AdBlue main filter'],
              every3600HoursOrEvery4Years: ['Change the engine coolant fluid'],
            },
            guardrail: 'The accessible preview proves AutoCommand and the four model names but does not prove a North America-specific or Stage V edition. No OEM part number is attached unless the exact manual-generation bridge is independently established.',
          }),
        ],
      );
      sourceRecordId = Number(result.insertId);
    }

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [model.slug],
      );
      const machineVersionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, VERSION_SLUG],
      );

      for (const task of tasks) {
        await connection.query(
          `INSERT INTO maintenance_tasks (
            machine_id,machine_version_id,task_key,section,action,title,part_id,interval_hours,interval_months,
            interval_text,notes,source_record_id,confidence
          ) VALUES (?,?,?,?,?,?,NULL,?,?,?,?,?,'high')
          ON DUPLICATE KEY UPDATE
            machine_version_id=VALUES(machine_version_id),section=VALUES(section),action=VALUES(action),title=VALUES(title),
            part_id=NULL,interval_hours=VALUES(interval_hours),interval_months=VALUES(interval_months),interval_text=VALUES(interval_text),
            notes=VALUES(notes),confidence='high'`,
          [
            machineId,
            machineVersionId,
            task.taskKey,
            task.section,
            task.action,
            task.title,
            task.intervalHours ?? null,
            task.intervalMonths ?? null,
            task.intervalText,
            task.notes ?? null,
            sourceRecordId,
          ],
        );
      }
    }
  },
};
