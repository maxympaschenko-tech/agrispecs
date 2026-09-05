import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type TaskInput = {
  taskKey: string;
  section: string;
  action: string;
  title: string;
  partNumber?: string;
  intervalHours: number;
  intervalMonths?: number;
  intervalText: string;
  notes?: string;
  sourceRecordId: number;
  confidence: 'official' | 'high';
};

const MANUAL_URL = 'https://www.ebooklibonline.com/onlinepages/PREVIEW-51493747-linked%20pdf.pdf';
const MANUAL_EXTERNAL_ID = 'nh-t5-autocommand-operator-manual-51493747-maintenance-preview-2019-02';
const OFFICIAL_T5_URL = 'https://agriculture.newholland.com/en-us/nar/products/tractors-telehandlers/t5-series';
const OFFICIAL_T5_EXTERNAL_ID = 'new-holland-t5-series-na-600-hour-engine-oil-2026-09';
const VERSION_SLUG = 'autocommand-stage-v-manual-51493747';

const models = [
  { slug: 't5-110', model: 'T5.110' },
  { slug: 't5-120', model: 'T5.120' },
  { slug: 't5-130', model: 'T5.130' },
  { slug: 't5-140', model: 'T5.140' },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T5 AutoCommand maintenance migration dependency.');
  return Number(rows[0].id);
}

async function ensureSource(
  connection: Parameters<DbMigration['apply']>[0],
  name: string,
  domain: string,
  sourceType: 'manufacturer' | 'manual',
  authorityLevel: 'official' | 'secondary',
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM sources WHERE name=? AND domain=? ORDER BY id LIMIT 1`,
    [name, domain],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?,?,?,?)`,
    [name, domain, sourceType, authorityLevel],
  );
  return Number(result.insertId);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  publishedDate: string | null,
  rawReference: unknown,
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
    [externalId],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,published_date,raw_reference) VALUES (?,?,?,?,?,?)`,
    [sourceId, url, externalId, title, publishedDate, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

export const newHollandT5AutoCommandMaintenanceMigration: DbMigration = {
  id: '20260905_630_new_holland_t5_autocommand_maintenance',
  description: 'Add version-scoped T5.110-T5.140 AutoCommand maintenance intervals from operator manual 51493747',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);

    const manualSourceId = await ensureSource(
      connection,
      'New Holland Operator Manual Preview',
      'ebooklibonline.com',
      'manual',
      'secondary',
    );
    const manualSourceRecordId = await ensureSourceRecord(
      connection,
      manualSourceId,
      MANUAL_EXTERNAL_ID,
      MANUAL_URL,
      'New Holland T5.110/T5.120/T5.130/T5.140 AutoCommand Operator Manual 51493747 - maintenance index',
      '2019-02-01',
      {
        role: 'Operator-manual maintenance interval and task evidence',
        publicationNumber: '51493747',
        edition: '1st edition English, February 2019',
        models: models.map((item) => item.model),
        configuration: 'AutoCommand',
        evidence: {
          every600Hours: [
            'Change engine oil and filter',
            'Change the first stage fuel filter and the fuel filter element',
            'Change the engine air cleaner outer element',
            'Change the hydraulic charge pump oil filter and the transmission oil filter',
            'Clean the DEF/AdBlue in-line filter',
            'Check the transmission oil level, the rear axle oil level and the hydraulic oil level',
          ],
          every1200HoursOrAnnually: [
            'Change the cab air filters',
            'Change the hydraulic suction pump oil filter',
          ],
          every1200HoursOrEvery2Years: [
            'Change the engine air cleaner inner element',
            'Change the transmission oil, the rear axle oil and the hydraulic oil',
          ],
          every1800HoursOrEvery2Years: [
            'Engine - breather filter replacement',
          ],
        },
        provenanceNote: 'The hosted PDF is a preview/reproduction of an original New Holland operator manual, not an official New Holland web host. Maintenance tasks are therefore stored with high rather than official confidence unless independently confirmed by an official New Holland source.',
        marketGuardrail: 'The preview does not establish a North America-specific manual edition. Tasks are scoped to the AutoCommand manual family, not asserted as universal across every T5 transmission or regional build.',
      },
    );

    const officialSourceId = await ensureSource(
      connection,
      'New Holland Agriculture',
      'agriculture.newholland.com',
      'manufacturer',
      'official',
    );
    const officialSourceRecordId = await ensureSourceRecord(
      connection,
      officialSourceId,
      OFFICIAL_T5_EXTERNAL_ID,
      OFFICIAL_T5_URL,
      'New Holland T5 Series North America - simple maintenance and 600-hour engine oil interval',
      null,
      {
        role: 'Official current North American T5 service-interval corroboration',
        models: models.map((item) => item.model),
        evidence: 'New Holland states that the T5 Series has a 600-hour engine oil change interval.',
        scope: 'Official confirmation of the engine-oil interval only. Other tasks in this migration use operator-manual evidence.',
      },
    );

    const partIds = new Map<string, number>();
    for (const partNumber of ['84228488', '51447239', '87720899']) {
      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, partNumber],
      );
      partIds.set(partNumber, partId);
    }

    const manualTasks: Omit<TaskInput, 'sourceRecordId' | 'confidence'>[] = [
      {
        taskKey: 'autocommand-engine-oil-filter-600',
        section: 'Engine',
        action: 'Replace',
        title: 'engine oil filter',
        partNumber: '84228488',
        intervalHours: 600,
        intervalText: 'Every 600 hours',
        notes: 'Operator manual 51493747 specifies changing engine oil and filter at this interval. Part 84228488 is separately verified for the T5.110-T5.140 AutoCommand Stage V family.',
      },
      {
        taskKey: 'autocommand-fuel-filters-600',
        section: 'Fuel & Air',
        action: 'Replace',
        title: 'first-stage fuel filter and fuel filter element',
        intervalHours: 600,
        intervalText: 'Every 600 hours',
        notes: 'The manual defines two fuel-service positions. Multiple OEM fuel-filter numbers are verified across T5 Stage V builds, so no single part number is forced onto this task; confirm the exact build and service position before ordering.',
      },
      {
        taskKey: 'autocommand-outer-air-cleaner-600',
        section: 'Fuel & Air',
        action: 'Replace',
        title: 'engine air cleaner outer element',
        partNumber: '51447239',
        intervalHours: 600,
        intervalText: 'Every 600 hours',
        notes: 'Part 51447239 is separately verified as the primary/outer engine air filter for T5.110-T5.140 AutoCommand Stage V configurations.',
      },
      {
        taskKey: 'autocommand-hydraulic-transmission-filters-600',
        section: 'Transmission',
        action: 'Replace',
        title: 'hydraulic charge-pump and transmission oil filters',
        intervalHours: 600,
        intervalText: 'Every 600 hours',
        notes: 'The manual specifies two filter roles. Exact OEM numbers can vary by build and service position; this task intentionally avoids collapsing them into one part number.',
      },
      {
        taskKey: 'autocommand-def-inline-filter-clean-600',
        section: 'Engine',
        action: 'Clean',
        title: 'DEF / AdBlue in-line filter',
        intervalHours: 600,
        intervalText: 'Every 600 hours',
      },
      {
        taskKey: 'autocommand-driveline-fluid-levels-600',
        section: 'Transmission',
        action: 'Check',
        title: 'transmission, rear axle and hydraulic oil levels',
        intervalHours: 600,
        intervalText: 'Every 600 hours',
      },
      {
        taskKey: 'autocommand-cab-air-filters-1200',
        section: 'Cab',
        action: 'Replace',
        title: 'cab air filters',
        intervalHours: 1200,
        intervalMonths: 12,
        intervalText: 'Every 1200 hours or annually',
        notes: 'Roof configuration changes the correct OEM cab-filter part number, so the maintenance task is intentionally not pinned to a single filter.',
      },
      {
        taskKey: 'autocommand-hydraulic-suction-filter-1200',
        section: 'Hydraulics',
        action: 'Replace',
        title: 'hydraulic suction pump oil filter',
        intervalHours: 1200,
        intervalMonths: 12,
        intervalText: 'Every 1200 hours or annually',
        notes: 'Confirm the exact hydraulic-system build and filter position before ordering.',
      },
      {
        taskKey: 'autocommand-inner-air-cleaner-1200',
        section: 'Fuel & Air',
        action: 'Replace',
        title: 'engine air cleaner inner element',
        partNumber: '87720899',
        intervalHours: 1200,
        intervalMonths: 24,
        intervalText: 'Every 1200 hours or every 2 years',
        notes: 'Part 87720899 is separately verified as the secondary/inner engine air filter for the T5.110-T5.140 AutoCommand Stage V family.',
      },
      {
        taskKey: 'autocommand-transmission-rear-axle-hydraulic-oil-1200',
        section: 'Transmission',
        action: 'Change',
        title: 'transmission, rear axle and hydraulic oil',
        intervalHours: 1200,
        intervalMonths: 24,
        intervalText: 'Every 1200 hours or every 2 years',
        notes: 'Fluid specification and capacity can depend on build configuration; this task records the interval without inventing a universal fluid quantity.',
      },
      {
        taskKey: 'autocommand-engine-breather-1800',
        section: 'Engine',
        action: 'Replace',
        title: 'engine breather filter',
        intervalHours: 1800,
        intervalMonths: 24,
        intervalText: 'Every 1800 hours or every 2 years',
        notes: 'The interval is directly listed in operator manual 51493747. No part number is attached because the exact Stage V AutoCommand breather-filter fitment is still being verified separately.',
      },
    ];

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [model.slug],
      );

      await connection.query(
        `INSERT INTO machine_versions (
          machine_id,slug,market_code,market_name,model_year_start,model_year_end,configuration,is_current,source_record_id,notes
        ) VALUES (?,?,NULL,'Market not specified',2019,NULL,'AutoCommand Stage V',FALSE,?,?)
        ON DUPLICATE KEY UPDATE
          market_name=VALUES(market_name),model_year_start=VALUES(model_year_start),model_year_end=VALUES(model_year_end),
          configuration=VALUES(configuration),is_current=VALUES(is_current),source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [
          machineId,
          VERSION_SLUG,
          manualSourceRecordId,
          'Maintenance-only version context from New Holland operator manual 51493747. It does not imply current availability in every market or universal applicability to other T5 transmissions.',
        ],
      );
      const machineVersionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, VERSION_SLUG],
      );

      const upsertTask = async (task: TaskInput) => {
        const partId = task.partNumber ? partIds.get(task.partNumber) ?? null : null;
        await connection.query(
          `INSERT INTO maintenance_tasks (
            machine_id,machine_version_id,task_key,section,action,title,part_id,interval_hours,interval_months,
            interval_text,notes,source_record_id,confidence
          ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
          ON DUPLICATE KEY UPDATE
            machine_version_id=VALUES(machine_version_id),section=VALUES(section),action=VALUES(action),title=VALUES(title),
            part_id=VALUES(part_id),interval_hours=VALUES(interval_hours),interval_months=VALUES(interval_months),
            interval_text=VALUES(interval_text),notes=VALUES(notes),confidence=VALUES(confidence)`,
          [
            machineId,
            machineVersionId,
            task.taskKey,
            task.section,
            task.action,
            task.title,
            partId,
            task.intervalHours,
            task.intervalMonths ?? null,
            task.intervalText,
            task.notes ?? null,
            task.sourceRecordId,
            task.confidence,
          ],
        );
      };

      await upsertTask({
        taskKey: 'autocommand-engine-oil-600-official',
        section: 'Engine',
        action: 'Change',
        title: 'engine oil',
        intervalHours: 600,
        intervalText: 'Every 600 hours',
        notes: 'Official New Holland North America current T5 page confirms a 600-hour engine oil change interval. The AutoCommand operator manual independently places engine oil service at 600 hours.',
        sourceRecordId: officialSourceRecordId,
        confidence: 'official',
      });

      for (const task of manualTasks) {
        await upsertTask({ ...task, sourceRecordId: manualSourceRecordId, confidence: 'high' });
      }
    }
  },
};
