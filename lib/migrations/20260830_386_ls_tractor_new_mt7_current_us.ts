import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  engineModel: string;
  grossHp: number;
  ptoHp: number;
  forwardSpeed: string;
  hitchLiftLb: number;
  heightIn: number;
  weightLb: number;
  r14Tires: string;
  agTires: string;
};

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://lstractorusa.com/series/new-mt7/';
const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_MT7_Update_v7.pdf';

const models: Seed[] = [
  { slug: 'mt774cps', name: 'MT774CPS', url: 'https://lstractorusa.com/tractor/new-mt774cps/', engineModel: 'F34-55kW', grossHp: 73.7, ptoHp: 65.6, forwardSpeed: '0.9-20.8 mph', hitchLiftLb: 7275, heightIn: 105, weightLb: 7827, r14Tires: '320/85R24 / 460/85R30', agTires: '11.2-24 / 16.9-30' },
  { slug: 'mt7101cps', name: 'MT7101CPS', url: 'https://lstractorusa.com/tractor/new-mt7101cps/', engineModel: 'F5G-75kW', grossHp: 100.6, ptoHp: 85.5, forwardSpeed: '1.0-23.1 mph', hitchLiftLb: 8378, heightIn: 107, weightLb: 7985, r14Tires: '340/70R28 / 460/75R38', agTires: '13.6-24 / 18.4-34' },
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
  if (!rows[0]) throw new Error('LS Tractor New MT7 migration dependency missing');
  return Number(rows[0].id);
}
async function ensureSource(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId, url, externalId, title, JSON.stringify(raw)]);
  return Number(inserted.insertId);
}
async function put(c: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null) {
  await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId]);
}

export const lsTractorNewMt7CurrentUsMigration: DbMigration = {
  id: '20260830_386_ls_tractor_new_mt7_current_us',
  description: 'Add current US New MT7 MT774CPS and MT7101CPS from the current series, model pages and 2025/10 brochure',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);

    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'LS New MT7 Series','ls-new-mt7-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ls-new-mt7-series' LIMIT 1`, [manufacturerId]);

    await ensureSource(c, sourceId, 'ls-tractor-new-mt7-current-us-lineup-2026-08', SERIES_URL, 'LS Tractor USA current New MT7 lineup', {
      market: 'United States', captured: '2026-08-30', currentModels: models.map((m) => m.name),
      excludedPreviousGeneration: ['MT7101CSPS', 'previous-generation MT7101CPS'],
      generationPolicy: 'LS Tractor USA separates Previous MT7 from New MT7. Current records in this migration follow only the New MT7 selector: MT774CPS and MT7101CPS.'
    });
    const brochureSourceRecordId = await ensureSource(c, sourceId, 'ls-tractor-new-mt7-brochure-2025-10-current', BROCHURE_URL, 'LS Tractor current MT7 brochure', {
      market: 'United States', captured: '2026-08-30',
      models: ['MT774CPS', 'MT7101CPS'], shared: { station: 'Cabin', transmission: 'Power Shuttle', speeds: '24 X 24', displacementCuIn: 206.7, fuelGal: 30.4, implementPumpGpm: 15.7, steeringPumpGpm: 6.5, totalFlowGpm: 22.2, hitchCategory: 'CAT II', ptoType: 'Independent', rearPto: '540 / 750 / 1,000' },
      normalization: { displacement: '206.7 cu in stored as 3.387 L', fuelTank: '30.4 US gal stored as 115.1 L' },
      sourceConflict: 'The current New MT7101CPS model page renders PTO Type as “Power Shuttle”, which is a drivetrain term and conflicts with the current MT7 brochure. The brochure explicitly lists PTO Type “Independent” for both MT774CPS and MT7101CPS; the normalized PTO type follows the brochure.'
    });

    const definitionIds = new Map<string, number>();
    for (const row of definitions) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, row);
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    for (const m of models) {
      const sourceRecordId = await ensureSource(c, sourceId, `ls-tractor-${m.slug}-new-current-us-2026-08`, m.url, `LS Tractor ${m.name} current New MT7 US model page`, { market: 'United States', captured: '2026-08-30', generation: 'New MT7', role: 'Current model availability and variant-specific model/weight/height/tire cross-check; current MT7 brochure is primary normalized specification table.' });
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US LS Tractor New MT7 utility tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [manufacturerId, equipmentTypeId, seriesId, m.name, m.slug]);
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Cab; Power Shuttle; 24F x 24R',TRUE,?,'Current LS Tractor USA New MT7 configuration. Current brochure is primary for normalized specification matrix; current model page confirms availability and variant details.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      const values: Array<[string, string | number, string | null]> = [
        ['configuration.station', 'Cab', null], ['engine.type', '4-cylinder, CRDI, water-cooled diesel', null], ['engine.model', m.engineModel, null], ['emissions.standard', 'Tier 4', null], ['engine.displacement', 3.387, 'L'], ['engine.gross_power', m.grossHp, 'hp'], ['engine.rated_speed', 2200, 'rpm'],
        ['transmission.standard', 'Power Shuttle', null], ['transmission.speeds', 'F24 x R24', null], ['transmission.forward_speed_range', m.forwardSpeed, null], ['brakes.type', 'Wet, multi-disc', null], ['steering.type', 'Hydrostatic power steering', null],
        ['pto.rated_power', m.ptoHp, 'hp'], ['pto.type', 'Independent', null], ['pto.rear_description', '540 / 750 / 1,000 rpm', null],
        ['hydraulics.control_system', 'Position / Draft', null], ['hydraulics.main_pump_capacity', 15.7, 'gpm'], ['hydraulics.power_steering_pump_capacity', 6.5, 'gpm'], ['hydraulics.total_flow', 22.2, 'gpm'], ['hitch.category', 'Category II', null], ['hitch.lift_capacity', m.hitchLiftLb, 'lb'], ['hydraulics.remote_valves', '3 pairs front; 2 pairs rear', null],
        ['capacities.fuel_tank', 115.1, 'L'], ['dimensions.overall_length', 152.2, 'in'], ['dimensions.overall_width', 78.7, 'in'], ['dimensions.overall_height', m.heightIn, 'in'], ['dimensions.wheelbase', 90, 'in'], ['dimensions.unladen_weight', m.weightLb, 'lb'], ['tires.ag', m.agTires, null], ['tires.r14', m.r14Tires, null],
      ];
      for (const [key, value, unit] of values) {
        const definitionId = definitionIds.get(key); if (!definitionId) throw new Error(`Missing LS Tractor New MT7 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, brochureSourceRecordId, value, unit);
      }
    }
  },
};
