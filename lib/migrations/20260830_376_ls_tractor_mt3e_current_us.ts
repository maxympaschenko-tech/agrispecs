import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  grossHp: number;
  ptoHp: number;
  transmission: string;
  speeds: string;
  weightLb: number;
};

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://lstractorusa.com/series/MT3E/';
const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_MT3E_Update_v7.pdf';

const models: Seed[] = [
  { slug: 'mt345e', name: 'MT345E', grossHp: 45, ptoHp: 38.2, transmission: 'Synchro Shuttle / Constant Mesh', speeds: 'F8 x R8', weightLb: 3724 },
  { slug: 'mt345he', name: 'MT345HE', grossHp: 45, ptoHp: 36.0, transmission: 'HST', speeds: '3 ranges', weightLb: 3750 },
  { slug: 'mt355e', name: 'MT355E', grossHp: 55, ptoHp: 46.7, transmission: 'Synchro Shuttle / Constant Mesh', speeds: 'F8 x R8', weightLb: 3750 },
  { slug: 'mt355he', name: 'MT355HE', grossHp: 55, ptoHp: 44.0, transmission: 'HST', speeds: '3 ranges', weightLb: 3750 },
];

const definitions: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.station', 'Operator station', 'text', null, 1],
  ['Engine', 'engine.type', 'Engine type', 'text', null, 2],
  ['Engine', 'engine.model', 'Engine model', 'text', null, 3],
  ['Engine', 'emissions.standard', 'Emissions standard', 'text', null, 4],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 6],
  ['Engine', 'engine.gross_power', 'Gross engine power', 'decimal', 'hp', 8],
  ['Engine', 'engine.rated_speed', 'Rated engine speed', 'integer', 'rpm', 9],
  ['Transmission', 'transmission.standard', 'Transmission', 'text', null, 10],
  ['Transmission', 'transmission.speeds', 'Transmission speeds / ranges', 'text', null, 20],
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
  ['Dimensions & Weight', 'dimensions.overall_height', 'Height to top of ROPS', 'decimal', 'in', 30],
  ['Dimensions & Weight', 'dimensions.wheelbase', 'Wheelbase', 'decimal', 'in', 40],
  ['Dimensions & Weight', 'dimensions.unladen_weight', 'Tractor weight without ballast', 'decimal', 'lb', 70],
  ['Tires', 'tires.ag', 'Ag tires front / rear', 'text', null, 10],
  ['Tires', 'tires.industrial', 'Industrial tires front / rear', 'text', null, 20],
  ['Tires', 'tires.turf', 'Turf tires front / rear', 'text', null, 30],
  ['Tires', 'tires.narrow_ag', 'Narrow Ag tires front / rear', 'text', null, 40],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor MT3E migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(raw)],
  );
  return Number(inserted.insertId);
}

async function put(c: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const lsTractorMt3eCurrentUsMigration: DbMigration = {
  id: '20260830_376_ls_tractor_mt3e_current_us',
  description: 'Add four current US LS Tractor MT3E configurations from the official model pages and current MT3E brochure',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'LS MT3E Series','ls-mt3e-series')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ls-mt3e-series' LIMIT 1`, [manufacturerId]);

    await ensureSource(c, sourceId, 'ls-tractor-mt3e-current-us-lineup-2026-08', SERIES_URL, 'LS Tractor USA current MT3E Series lineup', {
      market: 'United States',
      captured: '2026-08-30',
      currentGroups: ['MT345E/HE', 'MT355E/HE'],
      expandedConfigurations: models.map((m) => m.name),
    });

    const brochureSourceRecordId = await ensureSource(c, sourceId, 'ls-tractor-mt3e-brochure-2025-10-current', BROCHURE_URL, 'LS Tractor MT3E Series current brochure specifications', {
      market: 'United States',
      brochurePath: '/wp-content/uploads/2025/10/LS-Tractor-Brochure_MT3E_Update_v7.pdf',
      captured: '2026-08-30',
      sourceColumns: ['MT345E', 'MT345HE', 'MT355E', 'MT355HE'],
      normalization: {
        displacement: '114.7 cu in stored as 1.88 L',
        fuelTank: '13.7 US gal stored as 51.9 L',
      },
      sourceConflict: 'The current MT3E brochure publishes CAT I for the 3-point hitch, while current MT345E/HE and MT355E/HE web pages display CAT 2. This migration follows the model-specific brochure table and preserves the conflict here rather than silently reconciling it.',
      transmissionPolicy: 'The brochure separates E gear and HE hydrostatic configurations by model column; PTO values and transmission values are stored per those four columns.',
    });

    for (const group of [
      { externalId: 'ls-tractor-mt345e-he-current-us-2026-08', url: 'https://lstractorusa.com/tractor/mt345e-he/', title: 'LS Tractor MT345E/HE current US model page' },
      { externalId: 'ls-tractor-mt355e-he-current-us-2026-08', url: 'https://lstractorusa.com/tractor/mt355e-he/', title: 'LS Tractor MT355E/HE current US model page' },
    ]) {
      await ensureSource(c, sourceId, group.externalId, group.url, group.title, {
        market: 'United States',
        captured: '2026-08-30',
        role: 'Confirms the model group remains in the current US lineup and provides a second official cross-check for shared specifications and attachment listings.',
      });
    }

    const definitionIds = new Map<string, number>();
    for (const row of definitions) {
      await c.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        row,
      );
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    for (const m of models) {
      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US LS Tractor MT3E value compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, m.name, m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,'Current LS Tractor USA MT3E configuration. Primary numeric specification source: current MT3E brochure; current model page used as lineup cross-check.')
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, `ROPS; ${m.transmission}; ${m.speeds}`, brochureSourceRecordId],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string, string | number, string | null]> = [
        ['configuration.station', 'ROPS', null],
        ['engine.type', 'Vertical water-cooled 4-cycle diesel engine', null],
        ['engine.model', 'L3C19-T', null],
        ['emissions.standard', 'EPA & CARB Tier 4 Final; EU Stage IIIB', null],
        ['engine.displacement', 1.88, 'L'],
        ['engine.gross_power', m.grossHp, 'hp'],
        ['engine.rated_speed', 2600, 'rpm'],
        ['transmission.standard', m.transmission, null],
        ['transmission.speeds', m.speeds, null],
        ['brakes.type', 'Wet, multi-disc', null],
        ['steering.type', 'Hydrostatic power steering', null],
        ['pto.rated_power', m.ptoHp, 'hp'],
        ['pto.type', 'Independent', null],
        ['pto.rear_description', '540 rpm', null],
        ['hydraulics.control_system', 'Position', null],
        ['hydraulics.main_pump_capacity', 8.2, 'gpm'],
        ['hydraulics.power_steering_pump_capacity', 4.8, 'gpm'],
        ['hydraulics.total_flow', 13.0, 'gpm'],
        ['hitch.category', 'Category I (current MT3E brochure; current web model pages display CAT 2)', null],
        ['hitch.lift_capacity', 2910, 'lb'],
        ['hydraulics.remote_valves', '2 pairs front; 1 or 2 pairs rear optional', null],
        ['capacities.fuel_tank', 51.9, 'L'],
        ['dimensions.overall_length', 125, 'in'],
        ['dimensions.overall_width', 68, 'in'],
        ['dimensions.overall_height', 100, 'in'],
        ['dimensions.wheelbase', 74.8, 'in'],
        ['dimensions.unladen_weight', m.weightLb, 'lb'],
        ['tires.ag', '9.5-16 / 14.9-24', null],
        ['tires.industrial', '10.0-16.5 / 17.5L-24', null],
        ['tires.turf', '29 x 12.50-15 / 44 x 18.00-20', null],
        ['tires.narrow_ag', '7.0-14 / 9.5-24', null],
      ];

      for (const [key, value, unit] of values) {
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing LS Tractor MT3E spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, brochureSourceRecordId, value, unit);
      }
    }
  },
};
