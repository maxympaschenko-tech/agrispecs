import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type TaskSeed = {
  specKey: string;
  taskKey: string;
  title: string;
  hours: number;
  initialHours?: number;
  months?: number;
  intervalText: string;
  notes: string;
};
type GroupSeed = {
  slugs: string[];
  url: string;
  externalId: string;
  title: string;
  sourceNotes: string;
  tasks: TaskSeed[];
};

const VERSION = 'united-states-current-2026-08';

const ENGINE_OIL = 'maintenance.engine_oil_change_interval';
const HST_FILTER = 'maintenance.hst_filter_change_interval';
const TRANSHYD_OIL = 'maintenance.transmission_hydraulic_oil_change_interval';
const TRANSHYD_FILTER = 'maintenance.transmission_hydraulic_filter_change_interval';
const HYD_OIL = 'maintenance.hydraulic_oil_change_interval';
const HYD_FILTER = 'maintenance.hydraulic_oil_filter_change_interval';

const groups: GroupSeed[] = [
  {
    slugs: ['1626-hst', '1626-shuttle'],
    url: 'https://www.mahindrausa.com/wp-content/uploads/2024/03/1626-Operator-Manual_compressed-compressed.pdf',
    externalId: 'mahindra-1626-operator-manual-maintenance-2026-08',
    title: 'Mahindra 1626 Operator Manual - official maintenance intervals',
    sourceNotes: 'Official Mahindra USA 1626 operator manual. Engine oil is changed after the first 50 hours and every 100 hours thereafter.',
    tasks: [
      { specKey: ENGINE_OIL, taskKey: 'engine-oil-change', title: 'Change engine oil', hours: 100, initialHours: 50, intervalText: 'First at 50 hours; then every 100 hours', notes: 'Mahindra 1626 operator manual engine lubrication service specification.' },
    ],
  },
  {
    slugs: ['1626-hst'],
    url: 'https://www.mahindrausa.com/wp-content/uploads/2024/03/1626-Operator-Manual_compressed-compressed.pdf',
    externalId: 'mahindra-1626-operator-manual-maintenance-2026-08',
    title: 'Mahindra 1626 Operator Manual - official maintenance intervals',
    sourceNotes: 'Official Mahindra USA 1626 operator manual. HST filter is changed after the first 50 hours and every 300 hours thereafter.',
    tasks: [
      { specKey: HST_FILTER, taskKey: 'hst-filter-change', title: 'Change hydrostatic-system filter', hours: 300, initialHours: 50, intervalText: 'First at 50 hours; then every 300 hours', notes: 'Applies to the hydrostatic-drive configuration only.' },
    ],
  },
  {
    slugs: ['1635-hst', '1635-hst-cab', '1635-shuttle'],
    url: 'https://www.mahindrausa.com/wp-content/uploads/2024/03/1635-Operator-Manual.pdf',
    externalId: 'mahindra-1635-operator-manual-maintenance-2026-08',
    title: 'Mahindra 1635 Operator Manual - official maintenance intervals',
    sourceNotes: 'Official Mahindra USA 1635 operator manual. Engine oil is changed after the first 50 hours and every 350 hours thereafter.',
    tasks: [
      { specKey: ENGINE_OIL, taskKey: 'engine-oil-change', title: 'Change engine oil', hours: 350, initialHours: 50, intervalText: 'First at 50 hours; then every 350 hours', notes: 'Mahindra 1635 operator manual engine lubrication service specification.' },
    ],
  },
  {
    slugs: ['1635-hst', '1635-hst-cab'],
    url: 'https://www.mahindrausa.com/wp-content/uploads/2024/03/1635-Operator-Manual.pdf',
    externalId: 'mahindra-1635-operator-manual-maintenance-2026-08',
    title: 'Mahindra 1635 Operator Manual - official maintenance intervals',
    sourceNotes: 'Official Mahindra USA 1635 operator manual. HST filter is changed after the first 100 hours and every 300 hours thereafter.',
    tasks: [
      { specKey: HST_FILTER, taskKey: 'hst-filter-change', title: 'Change hydrostatic-system filter', hours: 300, initialHours: 100, intervalText: 'First at 100 hours; then every 300 hours', notes: 'Applies to 1635 HST configurations only.' },
    ],
  },
  {
    slugs: ['1640-hst', '1640-hst-cab', '1640-shuttle'],
    url: 'https://www.mahindrausa.com/wp-content/uploads/2024/03/1640-Operator-Manual-pdf.pdf',
    externalId: 'mahindra-1640-operator-manual-maintenance-2026-08',
    title: 'Mahindra 1640 Operator Manual - official maintenance intervals',
    sourceNotes: 'Official Mahindra USA 1640 operator manual. Engine oil is changed after the first 50 hours and every 350 hours thereafter.',
    tasks: [
      { specKey: ENGINE_OIL, taskKey: 'engine-oil-change', title: 'Change engine oil', hours: 350, initialHours: 50, intervalText: 'First at 50 hours; then every 350 hours', notes: 'Mahindra 1640 operator manual engine lubrication service specification.' },
    ],
  },
  {
    slugs: ['1640-hst', '1640-hst-cab'],
    url: 'https://www.mahindrausa.com/wp-content/uploads/2024/03/1640-Operator-Manual-pdf.pdf',
    externalId: 'mahindra-1640-operator-manual-maintenance-2026-08',
    title: 'Mahindra 1640 Operator Manual - official maintenance intervals',
    sourceNotes: 'Official Mahindra USA 1640 operator manual. HST filter is changed after the first 100 hours and every 300 hours thereafter.',
    tasks: [
      { specKey: HST_FILTER, taskKey: 'hst-filter-change', title: 'Change hydrostatic-system filter', hours: 300, initialHours: 100, intervalText: 'First at 100 hours; then every 300 hours', notes: 'Applies to 1640 HST configurations only.' },
    ],
  },
  {
    slugs: ['4540-4wd', '4550-4wd'],
    url: 'https://www.mahindrausa.com/wp-content/uploads/2024/03/4500-Series-Operator-Manual-.pdf',
    externalId: 'mahindra-4500-operator-manual-routine-schedule-2026-08',
    title: 'Mahindra 4540/4550 4WD Routine Service Schedule',
    sourceNotes: 'Only values explicitly labeled Routine Service Schedule - 4540/4550 4WD are used. Other extracted legacy-model pages in the PDF are intentionally not used for current 4500 records.',
    tasks: [
      { specKey: HYD_OIL, taskKey: 'hydraulic-oil-change', title: 'Change hydraulic oil', hours: 1000, intervalText: 'Every 1,000 hours', notes: 'From the operator manual routine service schedule explicitly labeled for 4540/4550 4WD.' },
      { specKey: HYD_FILTER, taskKey: 'hydraulic-oil-filter-change', title: 'Change hydraulic oil filter', hours: 1000, intervalText: 'Every 1,000 hours', notes: 'From the operator manual routine service schedule explicitly labeled for 4540/4550 4WD.' },
    ],
  },
  {
    slugs: ['5145-shuttle', '5155-shuttle'],
    url: 'https://www.mahindrausa.com/wp-content/uploads/2024/03/5100-Series-Operator-Manual.pdf',
    externalId: 'mahindra-5100-operator-manual-maintenance-2026-08',
    title: 'Mahindra 5100 Series Operator Manual - official maintenance intervals',
    sourceNotes: 'Official Mahindra USA 5100 Series operator manual.',
    tasks: [
      { specKey: ENGINE_OIL, taskKey: 'engine-oil-filter-change', title: 'Change engine oil and oil filter', hours: 350, months: 12, initialHours: 50, intervalText: 'First at 50 hours; then every 350 hours or 1 year, whichever is earlier', notes: 'Operator manual specifies engine oil and filter together.' },
      { specKey: TRANSHYD_OIL, taskKey: 'transmission-hydraulic-oil-change', title: 'Change transmission and hydraulic oil', hours: 1100, intervalText: 'Every 1,100 hours', notes: 'Official 5100 Series operator manual interval.' },
      { specKey: TRANSHYD_FILTER, taskKey: 'transmission-hydraulic-filter-change', title: 'Change transmission and hydraulic oil filter', hours: 350, initialHours: 50, intervalText: 'First at 50 hours; then every 350 hours', notes: 'Official 5100 Series operator manual interval.' },
    ],
  },
  {
    slugs: ['6065-power-shuttle', '6065-power-shuttle-cab', '6065-shuttle', '6075-power-shuttle', '6075-power-shuttle-cab'],
    url: 'https://www.mahindrausa.com/wp-content/uploads/2024/03/6000-Series-Operator-Manual.pdf',
    externalId: 'mahindra-6000-operator-manual-maintenance-2026-08',
    title: 'Mahindra 6000 Series Operator Manual - official maintenance intervals',
    sourceNotes: 'Official Mahindra USA 6000 Series operator manual for current 6065/6075 configurations.',
    tasks: [
      { specKey: ENGINE_OIL, taskKey: 'engine-oil-filter-change', title: 'Change engine oil and oil filter', hours: 500, months: 12, initialHours: 50, intervalText: 'First at 50 hours; then every 500 hours or 1 year, whichever is earlier', notes: 'Operator manual specifies engine oil and filter together.' },
      { specKey: TRANSHYD_OIL, taskKey: 'transmission-hydraulic-oil-change', title: 'Change transmission and hydraulic oil', hours: 1300, intervalText: 'Every 1,300 hours', notes: 'Official 6000 Series operator manual interval.' },
      { specKey: TRANSHYD_FILTER, taskKey: 'transmission-hydraulic-filter-change', title: 'Change transmission and hydraulic oil filter', hours: 400, initialHours: 50, intervalText: 'First at 50 hours; then every 400 hours', notes: 'Official 6000 Series operator manual interval.' },
    ],
  },
];

const definitions: Array<[string, string, string, string, string | null, number]> = [
  ['Maintenance', ENGINE_OIL, 'Engine oil change interval', 'integer', 'hours', 10],
  ['Maintenance', HST_FILTER, 'HST filter change interval', 'integer', 'hours', 20],
  ['Maintenance', TRANSHYD_OIL, 'Transmission / hydraulic oil change interval', 'integer', 'hours', 30],
  ['Maintenance', TRANSHYD_FILTER, 'Transmission / hydraulic filter change interval', 'integer', 'hours', 40],
  ['Maintenance', HYD_OIL, 'Hydraulic oil change interval', 'integer', 'hours', 50],
  ['Maintenance', HYD_FILTER, 'Hydraulic oil filter change interval', 'integer', 'hours', 60],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Mahindra maintenance migration dependency missing');
  return Number(rows[0].id);
}

export const mahindraMaintenanceIntervalsMigration: DbMigration = {
  id: '20260830_323_mahindra_maintenance_intervals',
  description: 'Add official Mahindra USA maintenance intervals for 1600, 4500, 5100 and 6000 tractors',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='mahindra' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Mahindra' AND domain='mahindrausa.com' LIMIT 1`);

    const definitionIds = new Map<string, number>();
    for (const row of definitions) {
      await c.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        row,
      );
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    const sourceRecords = new Map<string, number>();
    for (const group of groups) {
      let sourceRecordId = sourceRecords.get(group.externalId) || 0;
      if (!sourceRecordId) {
        const [existing] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [group.externalId]);
        sourceRecordId = existing[0]?.id ? Number(existing[0].id) : 0;
        if (!sourceRecordId) {
          const [inserted] = await c.query<ResultSetHeader>(
            `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
            [sourceId, group.url, group.externalId, group.title, JSON.stringify({ market: 'United States', captured: '2026-08-30', notes: group.sourceNotes })],
          );
          sourceRecordId = Number(inserted.insertId);
        }
        sourceRecords.set(group.externalId, sourceRecordId);
      }

      for (const slug of group.slugs) {
        const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, slug]);
        const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

        for (const task of group.tasks) {
          const definitionId = definitionIds.get(task.specKey);
          if (!definitionId) throw new Error(`Missing Mahindra maintenance spec definition ${task.specKey}`);

          await c.query(
            `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_number,unit,source_record_id,confidence)
             VALUES(?,?,?,?,?,?,'official')
             ON DUPLICATE KEY UPDATE value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
            [machineId, versionId, definitionId, task.hours, 'hours', sourceRecordId],
          );

          await c.query(
            `INSERT INTO maintenance_tasks(machine_id,machine_version_id,task_key,section,action,title,interval_hours,interval_months,initial_interval_hours,interval_text,notes,source_record_id,confidence)
             VALUES(?,? ,?,'Maintenance','Change',?,?,?,?,?,?,?,'official')
             ON DUPLICATE KEY UPDATE machine_version_id=VALUES(machine_version_id),action=VALUES(action),title=VALUES(title),interval_hours=VALUES(interval_hours),interval_months=VALUES(interval_months),initial_interval_hours=VALUES(initial_interval_hours),interval_text=VALUES(interval_text),notes=VALUES(notes),confidence='official'`,
            [machineId, versionId, task.taskKey, task.title, task.hours, task.months ?? null, task.initialHours ?? null, task.intervalText, task.notes, sourceRecordId],
          );
        }
      }
    }
  },
};
