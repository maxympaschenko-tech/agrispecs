import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Task = {
  key: string;
  section: string;
  action: string;
  title: string;
  hours: number | null;
  months: number | null;
  text: string;
  notes?: string;
};

const MANUAL_VERSION = 'operator-manual-90478716';
const MANUAL_URL = 'https://www.manualslib.com/manual/3563733/New-Holland-T6-145.html';
const MANUAL_EXTERNAL_ID = 'new-holland-t6-operator-manual-90478716-2022-01-maintenance';

const models = [
  { slug: 't6-145', model: 'T6.145' },
  { slug: 't6-155', model: 'T6.155' },
  { slug: 't6-160', model: 'T6.160' },
  { slug: 't6-175', model: 'T6.175' },
  { slug: 't6-180', model: 'T6.180' },
] as const;

const tasks: Task[] = [
  { key: 'manual-90478716-coolant-level-10', section: 'Engine', action: 'Check', title: 'engine coolant level', hours: 10, months: null, text: 'Every 10 hours or daily' },
  { key: 'manual-90478716-engine-oil-level-10', section: 'Engine', action: 'Check', title: 'engine oil level', hours: 10, months: null, text: 'Every 10 hours or daily' },
  { key: 'manual-90478716-washer-fluid-10', section: 'Cab', action: 'Check', title: 'windscreen washer reservoir', hours: 10, months: null, text: 'Every 10 hours or daily' },

  { key: 'manual-90478716-cab-filter-clean-50', section: 'Cab', action: 'Clean', title: 'cab air filters', hours: 50, months: null, text: 'Every 50 hours' },
  { key: 'manual-90478716-cooler-clean-50', section: 'Cooling', action: 'Clean', title: 'cooler section', hours: 50, months: null, text: 'Every 50 hours' },
  { key: 'manual-90478716-scr-ducts-clean-50', section: 'DEF / SCR', action: 'Clean', title: 'SCR cover air ducts', hours: 50, months: null, text: 'Every 50 hours' },
  { key: 'manual-90478716-grease-fittings-50', section: 'Chassis', action: 'Grease', title: 'all lubrication fittings', hours: 50, months: null, text: 'Every 50 hours' },
  { key: 'manual-90478716-wheel-nuts-50', section: 'Wheels & Tires', action: 'Check', title: 'front wheel, rear wheel and rear wheel weight nuts', hours: 50, months: null, text: 'Every 50 hours' },
  { key: 'manual-90478716-tires-50', section: 'Wheels & Tires', action: 'Check', title: 'tire pressures and tire condition', hours: 50, months: null, text: 'Every 50 hours' },

  { key: 'manual-90478716-poly-v-inspect-150', section: 'Engine', action: 'Inspect', title: 'poly V-belt', hours: 150, months: null, text: 'Every 150 hours' },
  { key: 'manual-90478716-compressor-belt-inspect-150', section: 'Cab', action: 'Inspect', title: 'compressor drive belt', hours: 150, months: null, text: 'Every 150 hours', notes: 'Applies to the installed compressor configuration.' },
  { key: 'manual-90478716-loader-screws-150', section: 'Attachments', action: 'Check', title: 'front loader mounting screws', hours: 150, months: null, text: 'Every 150 hours', notes: 'Only when a front loader is fitted.' },

  { key: 'manual-90478716-battery-fluid-375', section: 'Electrical', action: 'Check', title: 'battery fluid level', hours: 375, months: null, text: 'Every 375 hours' },
  { key: 'manual-90478716-driveline-levels-375', section: 'Transmission', action: 'Check', title: 'transmission, rear axle and hydraulic oil levels', hours: 375, months: null, text: 'Every 375 hours' },
  { key: 'manual-90478716-front-axle-levels-375', section: 'Front Axle', action: 'Check', title: '4WD front axle differential and hub oil levels', hours: 375, months: null, text: 'Every 375 hours', notes: '4WD axle only.' },
  { key: 'manual-90478716-front-pto-level-375', section: 'PTO', action: 'Check', title: 'front PTO gearbox oil level', hours: 375, months: null, text: 'Every 375 hours', notes: 'Only when front PTO is fitted.' },

  { key: 'manual-90478716-engine-oil-filter-750', section: 'Engine', action: 'Change', title: 'engine oil and filter', hours: 750, months: null, text: 'Every 750 hours', notes: 'The current North America interval is independently confirmed by the official New Holland source used in migration 645.' },
  { key: 'manual-90478716-fuel-filters-750', section: 'Fuel', action: 'Change', title: 'first-stage fuel filter and fuel filter element', hours: 750, months: null, text: 'Every 750 hours' },
  { key: 'manual-90478716-outer-air-cleaner-750', section: 'Engine', action: 'Change', title: 'engine air cleaner outer element', hours: 750, months: null, text: 'Every 750 hours', notes: 'The manual also requires replacement when the restriction warning appears.' },
  { key: 'manual-90478716-charge-pump-filter-750', section: 'Transmission', action: 'Change', title: 'charge pump oil filter', hours: 750, months: null, text: 'Every 750 hours', notes: 'Filter arrangement depends on the installed hydraulic/transmission configuration.' },
  { key: 'manual-90478716-air-intake-connections-750', section: 'Engine', action: 'Check', title: 'engine air intake connections', hours: 750, months: null, text: 'Every 750 hours' },
  { key: 'manual-90478716-oil-cooler-couplings-750', section: 'Transmission', action: 'Check', title: 'transmission oil cooler pipe couplings', hours: 750, months: null, text: 'Every 750 hours' },
  { key: 'manual-90478716-def-suction-clean-750', section: 'DEF / SCR', action: 'Clean', title: 'DEF / AdBlue suction filter', hours: 750, months: null, text: 'Every 750 hours', notes: 'Manual describes a 100-micron filter in the main DEF supply line; no OEM part number is inferred here.' },
  { key: 'manual-90478716-accumulators-750', section: 'Hydraulics', action: 'Check', title: 'hydraulic accumulators', hours: 750, months: null, text: 'Every 750 hours', notes: 'Where fitted; manual states annual pressure checks should be performed by an authorized dealer.' },

  { key: 'manual-90478716-planetary-hub-oil-750-24m', section: 'Front Axle', action: 'Change', title: '4WD planetary hub oil', hours: 750, months: 24, text: 'Every 750 hours or every 2 years', notes: '4WD axle only.' },

  { key: 'manual-90478716-front-pto-oil-1500', section: 'PTO', action: 'Change', title: 'front PTO gearbox oil', hours: 1500, months: null, text: 'Every 1,500 hours', notes: 'Only when front PTO is fitted.' },
  { key: 'manual-90478716-cab-filters-1500-12m', section: 'Cab', action: 'Change', title: 'cab air filters', hours: 1500, months: 12, text: 'Every 1,500 hours or annually' },
  { key: 'manual-90478716-rear-axle-bearing-1500-12m', section: 'Chassis', action: 'Grease', title: 'rear axle shaft bearing', hours: 1500, months: 12, text: 'Every 1,500 hours or annually' },

  { key: 'manual-90478716-inner-air-cleaner-1500-24m', section: 'Engine', action: 'Change', title: 'engine air cleaner inner element', hours: 1500, months: 24, text: 'Every 1,500 hours or every 2 years' },
  { key: 'manual-90478716-valve-tappets-1500-24m', section: 'Engine', action: 'Check', title: 'valve tappet clearance', hours: 1500, months: 24, text: 'Every 1,500 hours or every 2 years', notes: 'Manual recommends dealer adjustment because special tools are required.' },
  { key: 'manual-90478716-def-suction-replace-1500-24m', section: 'DEF / SCR', action: 'Change', title: 'DEF / AdBlue suction filter', hours: 1500, months: 24, text: 'Every 1,500 hours or every 2 years', notes: 'Manual describes a 100-micron filter in the main DEF supply line; no OEM part number is inferred here.' },
  { key: 'manual-90478716-hydraulic-suction-filter-1500-24m', section: 'Hydraulics', action: 'Change', title: 'hydraulic suction pump oil filter', hours: 1500, months: 24, text: 'Every 1,500 hours or every 2 years', notes: 'Applies to the relevant variable-displacement-pump configuration.' },
  { key: 'manual-90478716-air-brake-drier-1500-24m', section: 'Brakes', action: 'Change', title: 'air brake drier reservoir', hours: 1500, months: 24, text: 'Every 1,500 hours or every 2 years', notes: 'Only when the air-brake system is fitted.' },
  { key: 'manual-90478716-driveline-oil-1500-24m', section: 'Transmission', action: 'Change', title: 'transmission, rear axle and hydraulic oil', hours: 1500, months: 24, text: 'Every 1,500 hours or every 2 years' },
  { key: 'manual-90478716-front-differential-oil-1500-24m', section: 'Front Axle', action: 'Change', title: '4WD differential oil', hours: 1500, months: 24, text: 'Every 1,500 hours or every 2 years', notes: '4WD axle only.' },
  { key: 'manual-90478716-engine-oil-separator-1500-24m', section: 'Engine', action: 'Change', title: 'engine oil separator', hours: 1500, months: 24, text: 'Every 1,500 hours or every 2 years' },
  { key: 'manual-90478716-ac-compressor-belt-1500-24m', section: 'Cab', action: 'Change', title: 'air-conditioning compressor drive belt', hours: 1500, months: 24, text: 'Every 1,500 hours or every 2 years', notes: 'Applies when the air-conditioning compressor drive belt is fitted.' },

  { key: 'manual-90478716-poly-v-belts-1500-48m', section: 'Engine', action: 'Change', title: 'poly V-belts', hours: 1500, months: 48, text: 'Every 1,500 hours or every 4 years' },
  { key: 'manual-90478716-ac-receiver-drier-24m', section: 'Cab', action: 'Change', title: 'air-conditioning receiver drier', hours: null, months: 24, text: 'Every 2 years' },
  { key: 'manual-90478716-def-main-filter-3750-36m', section: 'DEF / SCR', action: 'Change', title: 'DEF / AdBlue main filter', hours: 3750, months: 36, text: 'Every 3,750 hours or every 3 years', notes: 'Manual identifies this as the 10-micron main filter below the DEF supply module; no OEM part number is inferred here.' },
  { key: 'manual-90478716-coolant-3750-48m', section: 'Cooling', action: 'Change', title: 'engine coolant', hours: 3750, months: 48, text: 'Every 3,750 hours or every 4 years' },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T6 manual-maintenance migration dependency.');
  return Number(rows[0].id);
}

async function ensureManualSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM sources WHERE name='ManualsLib' AND domain='manualslib.com' ORDER BY id LIMIT 1`,
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('ManualsLib','manualslib.com','manual','secondary')`,
  );
  return Number(result.insertId);
}

async function ensureManualRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
    [MANUAL_EXTERNAL_ID],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,published_date,raw_reference) VALUES (?,?,?,?,?,?)`,
    [
      sourceId,
      MANUAL_URL,
      MANUAL_EXTERNAL_ID,
      'New Holland T6.145-T6.180 Operator Manual 90478716 maintenance chart',
      '2022-01-01',
      JSON.stringify({
        role: 'Maintenance-chart evidence from a mirror of the original New Holland operator manual',
        publication: {
          partNumber: '90478716',
          edition: '2nd edition English',
          date: 'January 2022',
          title: 'Operator’s Manual - T6.145, T6.155, T6.160, T6.165, T6.175, T6.180 Agricultural Tractors',
        },
        coveredIntervals: ['10 hours/daily','50 hours','150 hours','375 hours','750 hours','750 hours/2 years','1500 hours','1500 hours/1 year','1500 hours/2 years','1500 hours/4 years','2 years','3750 hours/3 years','3750 hours/4 years'],
        guardrail: 'The publication does not by itself establish current 2026 North America model scope, transmission fitment, exact build years or OEM filter part numbers. Tasks are therefore stored in a separate non-current manual version context. Current-US 750/1500 timing is sourced separately from official New Holland North America evidence.',
      }),
    ],
  );
  return Number(result.insertId);
}

export const newHollandT6Manual90478716MaintenanceMigration: DbMigration = {
  id: '20260905_646_new_holland_t6_manual_90478716_maintenance',
  description: 'Add detailed T6.145-T6.180 maintenance schedule from operator manual 90478716 in a non-current manual-specific version context',
  async apply(connection) {
    const sourceId = await ensureManualSource(connection);
    const sourceRecordId = await ensureManualRecord(connection, sourceId);

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [model.slug],
      );

      await connection.query(
        `INSERT INTO machine_versions (
          machine_id,slug,market_code,market_name,model_year_start,model_year_end,configuration,is_current,source_record_id,notes
        ) VALUES (?,?,NULL,'Market not specified',NULL,NULL,?,FALSE,?,?)
        ON DUPLICATE KEY UPDATE
          market_code=NULL,market_name='Market not specified',model_year_start=NULL,model_year_end=NULL,
          configuration=VALUES(configuration),is_current=FALSE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [
          machineId,
          MANUAL_VERSION,
          `${model.model} operator manual 90478716`,
          sourceRecordId,
          'Original New Holland operator manual publication 90478716, 2nd edition English, January 2022. Stored separately from the current-US version because the manual alone does not establish 2026 market/build scope.',
        ],
      );
      const versionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, MANUAL_VERSION],
      );

      for (const task of tasks) {
        await connection.query(
          `INSERT INTO maintenance_tasks (
            machine_id,machine_version_id,task_key,section,action,title,part_id,interval_hours,interval_months,
            initial_interval_hours,capacity_value,capacity_unit,interval_text,notes,source_record_id,confidence
          ) VALUES (?,?,?,?,?,?,NULL,?,?,NULL,NULL,NULL,?,?,?,'high')
          ON DUPLICATE KEY UPDATE
            machine_version_id=VALUES(machine_version_id),section=VALUES(section),action=VALUES(action),title=VALUES(title),
            part_id=NULL,interval_hours=VALUES(interval_hours),interval_months=VALUES(interval_months),initial_interval_hours=NULL,
            capacity_value=NULL,capacity_unit=NULL,interval_text=VALUES(interval_text),notes=VALUES(notes),confidence='high'`,
          [
            machineId,
            versionId,
            task.key,
            task.section,
            task.action,
            task.title,
            task.hours,
            task.months,
            task.text,
            task.notes || null,
            sourceRecordId,
          ],
        );
      }
    }
  },
};
