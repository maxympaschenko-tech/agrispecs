import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; name: string; url: string; transmission: string; weightLb: number };

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://lstractorusa.com/series/mt5/';
const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_MT5_Update_v4.pdf';
const models: Seed[] = [
  { slug: 'mt573c', name: 'MT573C', url: 'https://lstractorusa.com/tractor/mt573c/', transmission: 'Synchro Shuttle', weightLb: 6620 },
  { slug: 'mt573cps', name: 'MT573CPS', url: 'https://lstractorusa.com/tractor/mt573cps/', transmission: 'Power Shuttle', weightLb: 6669 },
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
  if (!rows[0]) throw new Error('LS Tractor MT5 migration dependency missing');
  return Number(rows[0].id);
}
async function ensureSource(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId, url, externalId, title, JSON.stringify(raw)]);
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

export const lsTractorMt5CurrentUsMigration: DbMigration = {
  id: '20260830_384_ls_tractor_mt5_current_us',
  description: 'Add current US MT573C and MT573CPS with model-specific transmission and weight data',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'LS MT5 Series','ls-mt5-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ls-mt5-series' LIMIT 1`, [manufacturerId]);

    await ensureSource(c, sourceId, 'ls-tractor-mt5-current-us-lineup-2026-08', SERIES_URL, 'LS Tractor USA current MT5 lineup', {
      market: 'United States', captured: '2026-08-30', currentModels: models.map((m) => m.name),
      note: 'Current MT5 series page lists MT573C and MT573CPS as the two 73 hp cab models.'
    });
    await ensureSource(c, sourceId, 'ls-tractor-mt5-brochure-2025-10-current', BROCHURE_URL, 'LS Tractor current MT5 brochure', {
      market: 'United States', captured: '2026-08-30',
      sharedSpecs: { grossHp: 73, ptoHp: 62, engine: 'L4C25-T', emissions: 'EPA Tier 4F', ratedRpm: 2500, displacementCuIn: 152.9, fuelGal: 26.4, speeds: 'F20 x R20', pto: '540 / 750 / 1000', implementPumpGpm: 13.2, steeringPumpGpm: 6.6, totalFlowGpm: 19.8, hitchLiftLb: 6614 },
      sourceConflict: 'Current 2025/10 brochure extraction labels Synchro Shuttle for both columns and 6,620 lb for both, while the current MT573CPS model page explicitly identifies Power Shuttle and 6,669 lb. Model-specific page values are retained for MT573CPS.'
    });

    const definitionIds = new Map<string, number>();
    for (const row of definitions) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, row);
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    for (const m of models) {
      const sourceRecordId = await ensureSource(c, sourceId, `ls-tractor-${m.slug}-current-us-2026-08`, m.url, `LS Tractor ${m.name} current US model page`, { market: 'United States', captured: '2026-08-30', role: 'Primary current variant source; current MT5 brochure cross-checks shared specifications.' });
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US LS Tractor MT5 utility tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [manufacturerId, equipmentTypeId, seriesId, m.name, m.slug]);
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,'Current LS Tractor USA MT5 cab configuration; model page is primary for transmission and variant weight.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, `Cab; ${m.transmission}; F20 x R20`, sourceRecordId]);
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      const values: Array<[string, string | number, string | null]> = [
        ['configuration.station', 'Cab', null], ['engine.type', 'Vertical water-cooled 4-cylinder diesel engine', null], ['engine.model', 'L4C25-T', null], ['emissions.standard', 'EPA Tier 4F', null], ['engine.displacement', 2.505, 'L'], ['engine.gross_power', 73, 'hp'], ['engine.rated_speed', 2500, 'rpm'],
        ['transmission.standard', m.transmission, null], ['transmission.speeds', 'F20 x R20', null], ['steering.type', 'Hydrostatic power steering', null], ['pto.rated_power', 62, 'hp'], ['pto.type', 'Independent', null], ['pto.rear_description', '540 / 750 / 1000 rpm', null],
        ['hydraulics.control_system', 'Position / Draft', null], ['hydraulics.main_pump_capacity', 13.2, 'gpm'], ['hydraulics.power_steering_pump_capacity', 6.6, 'gpm'], ['hydraulics.total_flow', 19.8, 'gpm'], ['hitch.category', 'Category II', null], ['hitch.lift_capacity', 6614, 'lb'], ['hydraulics.remote_valves', '3 pairs front; 3 pairs rear', null],
        ['capacities.fuel_tank', 100, 'L'], ['dimensions.overall_length', 150, 'in'], ['dimensions.overall_width', 77.5, 'in'], ['dimensions.overall_height', 104.4, 'in'], ['dimensions.wheelbase', 84.6, 'in'], ['dimensions.unladen_weight', m.weightLb, 'lb'], ['tires.ag', '11.2-24 / 16.9-30', null], ['tires.r14', 'W320/85R24 122D / W460/85R30 145D', null],
      ];
      for (const [key, value, unit] of values) {
        const definitionId = definitionIds.get(key); if (!definitionId) throw new Error(`Missing LS Tractor MT5 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, sourceRecordId, value, unit);
      }
    }
  },
};
