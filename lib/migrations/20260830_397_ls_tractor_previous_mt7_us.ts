import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  transmission: string;
  speeds: string;
};

const VERSION = 'united-states-previous-mt7-generation';
const SERIES_URL = 'https://lstractorusa.com/series/previous-mt7/';
const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2021/09/LS-Tractor-Brochure-MT7.pdf';

const models: Seed[] = [
  {
    slug: 'mt7101cps-previous',
    name: 'MT7101CPS',
    url: 'https://lstractorusa.com/tractor/mt7101cps/',
    transmission: 'Power Shuttle',
    speeds: 'F40 x R40',
  },
  {
    slug: 'mt7101csps',
    name: 'MT7101CSPS',
    url: 'https://lstractorusa.com/tractor/mt7101csps/',
    transmission: 'Semi-Powershift with Power Shuttle',
    speeds: 'F32 x R32',
  },
];

const definitions: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.station', 'Operator station', 'text', null, 1],
  ['Engine', 'engine.model', 'Engine model', 'text', null, 3],
  ['Engine', 'engine.type', 'Engine type', 'text', null, 4],
  ['Engine', 'emissions.standard', 'Emissions standard', 'text', null, 5],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 6],
  ['Engine', 'engine.gross_power', 'Gross engine power', 'decimal', 'hp', 8],
  ['Engine', 'engine.rated_speed', 'Rated engine speed', 'integer', 'rpm', 9],
  ['Transmission', 'transmission.standard', 'Transmission', 'text', null, 10],
  ['Transmission', 'transmission.speeds', 'Transmission speeds / ranges', 'text', null, 20],
  ['Transmission', 'transmission.forward_speed_range', 'Forward speed range', 'text', null, 25],
  ['Transmission', 'brakes.type', 'Brakes', 'text', null, 30],
  ['Transmission', 'steering.type', 'Steering', 'text', null, 40],
  ['PTO', 'pto.rated_power', 'PTO power', 'decimal', 'hp', 10],
  ['PTO', 'pto.type', 'PTO type', 'text', null, 15],
  ['PTO', 'pto.rear_description', 'Rear PTO', 'text', null, 20],
  ['Hydraulics', 'hydraulics.control_system', 'Hydraulic control system', 'text', null, 5],
  ['Hydraulics', 'hydraulics.main_pump_capacity', 'Implement hydraulic pump capacity', 'decimal', 'gpm', 10],
  ['Hydraulics', 'hydraulics.power_steering_pump_capacity', 'Power-steering pump capacity', 'decimal', 'gpm', 20],
  ['Hydraulics', 'hydraulics.total_flow', 'Total hydraulic flow', 'decimal', 'gpm', 30],
  ['Hydraulics', 'hitch.category', '3-point hitch category', 'text', null, 40],
  ['Hydraulics', 'hitch.lift_capacity', '3-point hitch lift capacity', 'decimal', 'lb', 50],
  ['Hydraulics', 'hydraulics.remote_valves', 'Remote valves', 'text', null, 60],
  ['Capacities', 'capacities.fuel_tank', 'Fuel tank capacity', 'decimal', 'L', 10],
  ['Dimensions & Weight', 'dimensions.overall_length', 'Overall length', 'decimal', 'in', 10],
  ['Dimensions & Weight', 'dimensions.overall_width', 'Overall width with tires', 'decimal', 'in', 20],
  ['Dimensions & Weight', 'dimensions.overall_height', 'Overall height', 'decimal', 'in', 30],
  ['Dimensions & Weight', 'dimensions.wheelbase', 'Wheelbase', 'decimal', 'in', 40],
  ['Dimensions & Weight', 'dimensions.unladen_weight', 'Tractor weight without ballast', 'decimal', 'lb', 70],
  ['Tires', 'tires.ag', 'Ag tires front / rear', 'text', null, 10],
  ['Tires', 'tires.r14', 'R14 tires front / rear', 'text', null, 40],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor Previous MT7 migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(
  c: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  raw: unknown,
) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(raw)],
  );
  return Number(inserted.insertId);
}

async function put(
  c: Parameters<DbMigration['apply']>[0],
  machineId: number,
  versionId: number,
  definitionId: number,
  sourceRecordId: number,
  value: string | number,
  unit: string | null,
) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const lsTractorPreviousMt7UsMigration: DbMigration = {
  id: '20260830_397_ls_tractor_previous_mt7_us',
  description: 'Archive previous-generation MT7101CPS and MT7101CSPS without colliding with the current New MT7 MT7101CPS record',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug)
       VALUES(?,?,'LS Previous MT7 Series','ls-previous-mt7-series')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ls-previous-mt7-series' LIMIT 1`, [manufacturerId]);

    await ensureSource(c, sourceId, 'ls-tractor-previous-mt7-lineup-2026-08', SERIES_URL, 'LS Tractor USA Previous MT7 selector snapshot', {
      market: 'United States',
      captured: '2026-08-30',
      generationStatus: 'Previous',
      models: ['MT7101CPS', 'MT7101CSPS'],
      currentFlagPolicy: 'Both archive versions are stored with is_current=false.',
      identityPolicy: 'MT7101CPS exists in both Previous MT7 and New MT7 with materially different transmissions. Because machines.slug and machines.series_id are machine-level identifiers in this database, the previous-generation machine uses slug mt7101cps-previous while retaining model_name MT7101CPS. This prevents archive data from reassigning or overwriting the current New MT7 record.',
    });

    const brochureSourceId = await ensureSource(c, sourceId, 'ls-tractor-previous-mt7-generation-brochure', BROCHURE_URL, 'LS Tractor MT7101CPS / MT7101CSPS previous-generation brochure', {
      generation: 'Previous MT7',
      models: ['MT7101CPS', 'MT7101CSPS'],
      shared: {
        engineModel: 'F5G',
        grossHp: 100.6,
        ptoHp: 85.5,
        ratedRpm: 2200,
        displacementCuIn: 206.7,
        fuelGal: 30.4,
        forwardSpeedMph: '0.1 - 22.6',
        ptoType: 'Independent / Ground Speed PTO',
        rearPtoRpm: '540 / 750 / 1,000',
        implementPumpGpm: 15.7,
        steeringPumpGpm: 6.5,
        totalFlowGpm: 22.2,
        hitchCategory: 'CAT II',
        hitchLiftLb: 8378,
        dimensionsIn: { length: 152.2, width: 78.7, wheelbase: 90, height: 105.4 },
        weightLb: 7714,
      },
      variants: {
        MT7101CPS: { transmission: 'Power Shuttle', speeds: '40 x 40' },
        MT7101CSPS: { transmission: 'Semi-Powershift with Power Shuttle', speeds: '32 x 32' },
      },
      generationConflict: 'The current New MT7 also markets a model named MT7101CPS, but its current brochure specifies Power Shuttle 24 x 24, different speed range, 107 in height and 7,985 lb. The previous-generation 40 x 40 MT7101CPS is therefore modeled as a distinct archive machine identity.',
    });

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

    const ll8100Id = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug='ll8100' LIMIT 1`, [manufacturerId]);

    for (const m of models) {
      const liveSourceId = await ensureSource(c, sourceId, `ls-tractor-${m.slug}-previous-mt7-html-2026-08`, m.url, `LS Tractor ${m.name} still-published Previous MT7 model page`, {
        market: 'United States',
        captured: '2026-08-30',
        generation: 'Previous MT7',
        transmission: m.transmission,
        speeds: m.speeds,
        role: 'Still-published model-page cross-check for previous-generation availability and transmission. Generation brochure remains the archive specification source.',
      });

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Previous-generation US LS Tractor MT7 utility tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, m.name, m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);

      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,FALSE,?,'Previous-generation LS Tractor MT7 configuration. Archive-only and intentionally excluded from current New MT7 filters.')
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=FALSE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, `Cab; ${m.transmission}; ${m.speeds}`, liveSourceId],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string, string | number, string | null]> = [
        ['configuration.station', 'Cab', null],
        ['engine.model', 'F5G', null],
        ['engine.type', '4-cylinder, CRDI, water-cooled diesel', null],
        ['emissions.standard', 'Tier 4 Final', null],
        ['engine.displacement', 3.387, 'L'],
        ['engine.gross_power', 100.6, 'hp'],
        ['engine.rated_speed', 2200, 'rpm'],
        ['transmission.standard', m.transmission, null],
        ['transmission.speeds', m.speeds, null],
        ['transmission.forward_speed_range', '0.1 - 22.6 mph', null],
        ['brakes.type', 'Wet, multi-disc', null],
        ['steering.type', 'Hydrostatic power steering', null],
        ['pto.rated_power', 85.5, 'hp'],
        ['pto.type', 'Independent / Ground Speed PTO', null],
        ['pto.rear_description', '540 / 750 / 1,000 rpm', null],
        ['hydraulics.control_system', 'Position / Draft', null],
        ['hydraulics.main_pump_capacity', 15.7, 'gpm'],
        ['hydraulics.power_steering_pump_capacity', 6.5, 'gpm'],
        ['hydraulics.total_flow', 22.2, 'gpm'],
        ['hitch.category', 'Category II', null],
        ['hitch.lift_capacity', 8378, 'lb'],
        ['hydraulics.remote_valves', '3 pairs front; 2 pairs rear', null],
        ['capacities.fuel_tank', 115.1, 'L'],
        ['dimensions.overall_length', 152.2, 'in'],
        ['dimensions.overall_width', 78.7, 'in'],
        ['dimensions.overall_height', 105.4, 'in'],
        ['dimensions.wheelbase', 90, 'in'],
        ['dimensions.unladen_weight', 7714, 'lb'],
        ['tires.ag', '13.6-24 / 18.4-34', null],
        ['tires.r14', '340/70R28 / 460/75R38', null],
      ];

      for (const [key, value, unit] of values) {
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing Previous MT7 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, brochureSourceId, value, unit);
      }

      await c.query(
        `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES(?,?,?,?, 'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [
          machineId,
          ll8100Id,
          'LL8100 generation-correct fitment is confirmed by the Previous MT7 selector/model page and previous-generation MT7 brochure. The global LL8100 attachment retains separately labeled current/generation official measurement differences.',
          brochureSourceId,
        ],
      );
    }
  },
};
