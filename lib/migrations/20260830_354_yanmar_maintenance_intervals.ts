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
const ENGINE_OIL_FILTER = 'maintenance.engine_oil_filter_change_interval';
const TRANSHYD_OIL = 'maintenance.transmission_hydraulic_oil_change_interval';
const TRANSHYD_FILTER = 'maintenance.transmission_hydraulic_filter_change_interval';
const FRONT_AXLE_OIL = 'maintenance.front_axle_oil_change_interval';
const FUEL_FILTER = 'maintenance.fuel_filter_change_interval';
const WATER_SEPARATOR = 'maintenance.fuel_water_separator_change_interval';
const COOLANT = 'maintenance.coolant_change_interval';

const SA_GUIDE = 'https://www.yanmartractor.com/webres/File/1A8330-95952%20V1_1%20SA%20Series%20Quick%20Operation%20Guide.pdf';
const YT235_GUIDE = 'https://www.yanmartractor.com/webres/File/1A8425-95960_YT235%20Quick%20Maintenance%20Guide.pdf';

const groups: GroupSeed[] = [
  {
    slugs: ['sa223', 'sa325', 'sa425'],
    url: SA_GUIDE,
    externalId: 'yanmar-sa223-325-425-quick-maintenance-2026-08',
    title: 'Yanmar SA223/SA325/SA425 Quick Operation & Maintenance Guide',
    sourceNotes: 'Official Yanmar America quick maintenance guide specifically names SA223, SA325 and SA425. Special-edition SA223 KURO and SA425DHX are intentionally excluded from this maintenance fitment.',
    tasks: [
      { specKey: ENGINE_OIL, taskKey: 'engine-oil-change', title: 'Change engine oil', hours: 200, initialHours: 50, intervalText: 'First at 50 hours; at 200 hours; then every 200 hours', notes: 'Official SA223/325/425 quick maintenance guide.' },
      { specKey: ENGINE_OIL_FILTER, taskKey: 'engine-oil-filter-change', title: 'Change engine oil filter', hours: 200, initialHours: 50, intervalText: 'First at 50 hours; at 200 hours; then every 200 hours', notes: 'Official SA223/325/425 quick maintenance guide.' },
      { specKey: TRANSHYD_OIL, taskKey: 'transmission-hydraulic-oil-change', title: 'Change transmission / hydraulic oil', hours: 300, initialHours: 50, intervalText: 'First at 50 hours; at 300 hours; then every 300 hours', notes: 'The guide groups transmission filters and oil under the same 50/300-hour schedule.' },
      { specKey: TRANSHYD_FILTER, taskKey: 'transmission-hydraulic-filter-change', title: 'Change transmission and line filters', hours: 300, initialHours: 50, intervalText: 'First at 50 hours; at 300 hours; then every 300 hours', notes: 'Official SA223/325/425 guide lists transmission and line filters.' },
      { specKey: FRONT_AXLE_OIL, taskKey: 'front-axle-oil-change', title: 'Change front axle gear oil', hours: 500, intervalText: 'Check after first 50 hours; replace every 500 hours', notes: 'The first 50-hour item is an inspection, not a replacement; therefore no initial replacement interval is stored.' },
      { specKey: FUEL_FILTER, taskKey: 'fuel-filter-change', title: 'Change fuel filter', hours: 500, intervalText: 'Every 500 hours or if necessary', notes: 'Official SA223/325/425 quick maintenance guide.' },
      { specKey: WATER_SEPARATOR, taskKey: 'fuel-water-separator-change', title: 'Change fuel / water separator element', hours: 100, intervalText: 'Drain every 50 hours; replace every 100 hours or if necessary', notes: 'Replacement interval is stored as 100 hours; the 50-hour drain action remains in interval text.' },
      { specKey: COOLANT, taskKey: 'coolant-change', title: 'Change engine coolant', hours: 1000, months: 24, intervalText: 'Every 1,000 hours or 2 years', notes: 'Official SA223/325/425 quick maintenance guide.' },
    ],
  },
  {
    slugs: ['yt235', 'yt235c'],
    url: YT235_GUIDE,
    externalId: 'yanmar-yt235-quick-maintenance-2026-08',
    title: 'Yanmar YT235 Quick Maintenance Guide',
    sourceNotes: 'Official Yanmar America YT235 guide includes both ROPS and CAB coolant capacities, so the periodical schedule is applied to current YT235 and YT235C records.',
    tasks: [
      { specKey: ENGINE_OIL, taskKey: 'engine-oil-change', title: 'Change engine oil', hours: 200, initialHours: 50, intervalText: 'First at 50 hours; then every 200 hours', notes: 'Official YT235 quick maintenance guide.' },
      { specKey: ENGINE_OIL_FILTER, taskKey: 'engine-oil-filter-change', title: 'Change engine oil filter', hours: 200, initialHours: 50, intervalText: 'First at 50 hours; then every 200 hours', notes: 'Official YT235 quick maintenance guide.' },
      { specKey: FUEL_FILTER, taskKey: 'fuel-filter-change', title: 'Change fuel filter', hours: 200, intervalText: 'Every 200 hours', notes: 'Model-specific YT235 guide is preferred over Yanmar’s generic service-roadmap fuel-filter interval.' },
      { specKey: WATER_SEPARATOR, taskKey: 'fuel-water-separator-change', title: 'Change water separator element', hours: 100, intervalText: 'Drain every 50 hours; replace every 100 hours', notes: 'Replacement interval is stored; the 50-hour drain action is retained in text.' },
      { specKey: TRANSHYD_OIL, taskKey: 'transmission-hydraulic-oil-change', title: 'Change transmission / hydraulic oil', hours: 300, initialHours: 50, intervalText: 'First at 50 hours; then every 300 hours', notes: 'Confirmed by both the YT235 quick guide and current Yanmar transmission-hydraulic service article.' },
      { specKey: TRANSHYD_FILTER, taskKey: 'transmission-hydraulic-filter-change', title: 'Change transmission oil and line filters', hours: 300, initialHours: 50, intervalText: 'First at 50 hours; then every 300 hours', notes: 'Official YT235 quick maintenance guide.' },
      { specKey: FRONT_AXLE_OIL, taskKey: 'front-axle-oil-change', title: 'Change front axle case oil', hours: 300, initialHours: 50, intervalText: 'First at 50 hours; then every 300 hours', notes: 'Model-specific YT235 guide; this is intentionally not replaced by a generic Yanmar roadmap interval.' },
      { specKey: COOLANT, taskKey: 'coolant-change', title: 'Change engine coolant', hours: 1000, months: 24, intervalText: 'Every 1,000 hours or 2 years', notes: 'Official YT235 quick maintenance guide.' },
    ],
  },
  {
    slugs: ['yt347', 'yt347c', 'yt359', 'yt359c'],
    url: 'https://www.yanmartractor.com/resources/tractor-tips/yt3-tractor-oil-change-/',
    externalId: 'yanmar-yt3-engine-oil-maintenance-2026-08',
    title: 'Yanmar YT3 Tractor Oil Change - official interval',
    sourceNotes: 'Current Yanmar America YT3 service article specifies engine oil after first 50 hours, at 200 hours, then every 200 hours.',
    tasks: [
      { specKey: ENGINE_OIL, taskKey: 'engine-oil-filter-change', title: 'Change engine oil and oil filter', hours: 200, initialHours: 50, intervalText: 'First at 50 hours; at 200 hours; then every 200 hours', notes: 'Current Yanmar YT3 oil-change article replaces the oil filter as part of the procedure.' },
    ],
  },
  {
    slugs: ['yt347', 'yt347c', 'yt359', 'yt359c'],
    url: 'https://www.yanmartractor.com/resources/tractor-tips/yt3-tractor-transmission-hydraulic-oil-change/',
    externalId: 'yanmar-yt3-transhyd-maintenance-2026-08',
    title: 'Yanmar YT3 Transmission Hydraulic Oil Change - official interval',
    sourceNotes: 'Current Yanmar America YT3 article specifies transmission hydraulic oil and filter after first 50 hours, at 300 hours, then every 300 hours.',
    tasks: [
      { specKey: TRANSHYD_OIL, taskKey: 'transmission-hydraulic-oil-change', title: 'Change transmission / hydraulic oil', hours: 300, initialHours: 50, intervalText: 'First at 50 hours; at 300 hours; then every 300 hours', notes: 'Current official YT3 transmission-hydraulic service article.' },
      { specKey: TRANSHYD_FILTER, taskKey: 'transmission-hydraulic-filter-change', title: 'Change transmission / hydraulic filters', hours: 300, initialHours: 50, intervalText: 'First at 50 hours; at 300 hours; then every 300 hours', notes: 'The current YT3 article explicitly covers oil and filter service together.' },
    ],
  },
  {
    slugs: ['yt347', 'yt347c', 'yt359', 'yt359c'],
    url: 'https://www.yanmartractor.com/resources/tractor-tips/yt3-tractor-axle-oil-change/',
    externalId: 'yanmar-yt3-front-axle-maintenance-2026-08',
    title: 'Yanmar YT3 Front Axle Oil Change - official interval',
    sourceNotes: 'Current Yanmar America YT3 article specifies initial 50-hour, 300-hour and recurring 300-hour front axle oil replacement.',
    tasks: [
      { specKey: FRONT_AXLE_OIL, taskKey: 'front-axle-oil-change', title: 'Change front axle gear oil', hours: 300, initialHours: 50, intervalText: 'First at 50 hours; at 300 hours; then every 300 hours', notes: 'Current official YT3 front-axle service article.' },
    ],
  },
  {
    slugs: ['ym342', 'ym347', 'ym359'],
    url: 'https://www.yanmartractor.com/resources/tractor-tips/ym3-series-tractor-oil-change/',
    externalId: 'yanmar-ym3-engine-oil-maintenance-2026-08',
    title: 'Yanmar YM3 Series Tractor Oil Change - official interval',
    sourceNotes: 'Current Yanmar America YM3 article states engine oil and filter service every 250 hours or annually, whichever comes first.',
    tasks: [
      { specKey: ENGINE_OIL, taskKey: 'engine-oil-filter-change', title: 'Change engine oil and oil filter', hours: 250, months: 12, intervalText: 'Every 250 hours or annually, whichever comes first', notes: 'Current official YM3 model-family service article.' },
    ],
  },
  {
    slugs: ['ym342', 'ym347', 'ym359'],
    url: 'https://www.yanmartractor.com/resources/tractor-tips/ym3-series-transmission-hydraulic-oil-change/',
    externalId: 'yanmar-ym3-transhyd-maintenance-2026-08',
    title: 'Yanmar YM3 Transmission Hydraulic Oil Change - official recurring interval',
    sourceNotes: 'Current article says first service after “50 miles” and then at 300 hours/every 300 hours. Because the first-service unit is internally anomalous for tractor maintenance, no initial-hour value is inferred; only the explicit recurring 300-hour interval is structured.',
    tasks: [
      { specKey: TRANSHYD_OIL, taskKey: 'transmission-hydraulic-oil-change', title: 'Change transmission / hydraulic oil', hours: 300, intervalText: 'At 300 hours and every 300 hours thereafter; current source separately says first service after “50 miles”', notes: 'The source’s anomalous “50 miles” initial unit is preserved in text and not converted to hours.' },
      { specKey: TRANSHYD_FILTER, taskKey: 'transmission-hydraulic-filter-change', title: 'Change transmission / hydraulic filter', hours: 300, intervalText: 'At 300 hours and every 300 hours thereafter; current source separately says first service after “50 miles”', notes: 'No initial_interval_hours is stored because the current first-party article uses a non-hour unit for that initial service.' },
    ],
  },
];

const definitions: Array<[string,string,string,string,string|null,number]> = [
  ['Maintenance', ENGINE_OIL, 'Engine oil change interval', 'integer', 'hours', 10],
  ['Maintenance', ENGINE_OIL_FILTER, 'Engine oil filter change interval', 'integer', 'hours', 15],
  ['Maintenance', TRANSHYD_OIL, 'Transmission / hydraulic oil change interval', 'integer', 'hours', 30],
  ['Maintenance', TRANSHYD_FILTER, 'Transmission / hydraulic filter change interval', 'integer', 'hours', 40],
  ['Maintenance', FRONT_AXLE_OIL, 'Front axle oil change interval', 'integer', 'hours', 50],
  ['Maintenance', FUEL_FILTER, 'Fuel filter change interval', 'integer', 'hours', 60],
  ['Maintenance', WATER_SEPARATOR, 'Fuel / water separator element change interval', 'integer', 'hours', 70],
  ['Maintenance', COOLANT, 'Coolant change interval', 'integer', 'hours', 80],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Yanmar maintenance migration dependency missing');
  return Number(rows[0].id);
}

export const yanmarMaintenanceIntervalsMigration: DbMigration = {
  id: '20260830_354_yanmar_maintenance_intervals',
  description: 'Add official Yanmar America maintenance intervals for SA, YT2, YT3 and YM3 current US tractors',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='yanmar' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Yanmar' AND domain='yanmartractor.com' LIMIT 1`);

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
          if (!definitionId) throw new Error(`Missing Yanmar maintenance spec definition ${task.specKey}`);

          await c.query(
            `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_number,unit,source_record_id,confidence)
             VALUES(?,?,?,?,?,?,'official')
             ON DUPLICATE KEY UPDATE value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
            [machineId, versionId, definitionId, task.hours, 'hours', sourceRecordId],
          );

          await c.query(
            `INSERT INTO maintenance_tasks(machine_id,machine_version_id,task_key,section,action,title,interval_hours,interval_months,initial_interval_hours,interval_text,notes,source_record_id,confidence)
             VALUES(?,? ,?,'Maintenance','Change',?,?,?,?,?,?,?,'official')
             ON DUPLICATE KEY UPDATE machine_version_id=VALUES(machine_version_id),action=VALUES(action),title=VALUES(title),interval_hours=VALUES(interval_hours),interval_months=VALUES(interval_months),initial_interval_hours=VALUES(initial_interval_hours),interval_text=VALUES(interval_text),notes=VALUES(notes),source_record_id=VALUES(source_record_id),confidence='official'`,
            [machineId, versionId, task.taskKey, task.title, task.hours, task.months ?? null, task.initialHours ?? null, task.intervalText, task.notes, sourceRecordId],
          );
        }
      }
    }
  },
};
