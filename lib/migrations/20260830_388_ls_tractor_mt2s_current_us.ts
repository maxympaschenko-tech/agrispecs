import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://lstractorusa.com/series/mt2s/';
const MODEL_URL = 'https://lstractorusa.com/tractor/new-mt225s/';
const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_MT2S_Update_V8.pdf';

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
  ['PTO', 'pto.mid_description', 'Mid PTO', 'text', null, 30],
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
  ['Tires', 'tires.industrial', 'Industrial tires front / rear', 'text', null, 20],
  ['Tires', 'tires.turf', 'Turf tires front / rear', 'text', null, 30],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor MT2S migration dependency missing');
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

export const lsTractorMt2sCurrentUsMigration: DbMigration = {
  id: '20260830_388_ls_tractor_mt2s_current_us',
  description: 'Add current US LS Tractor MT225S from the current MT2S page and 2025/10 brochure',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'LS MT2S Series','ls-mt2s-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ls-mt2s-series' LIMIT 1`, [manufacturerId]);

    await ensureSource(c, sourceId, 'ls-tractor-mt2s-current-us-lineup-2026-08', SERIES_URL, 'LS Tractor USA current MT2S lineup', { market: 'United States', captured: '2026-08-30', currentModels: ['MT225S'] });
    const brochureSourceId = await ensureSource(c, sourceId, 'ls-tractor-mt2s-brochure-2025-10-current', BROCHURE_URL, 'LS Tractor current MT2S brochure', {
      market: 'United States', captured: '2026-08-30', model: 'MT225S',
      normalization: { displacement: '77.3 cu in stored as 1.267 L', fuelTank: '6.79 US gal stored as 25.7 L' },
      sourceQuality: 'Current MT225S model page and current 2025/10 MT2S brochure agree on tractor specifications; brochure supplies clean tire rows and attachment matrices.'
    });
    const modelSourceId = await ensureSource(c, sourceId, 'ls-tractor-mt225s-current-us-2026-08', MODEL_URL, 'LS Tractor MT225S current US model page', { market: 'United States', captured: '2026-08-30', role: 'Current availability and model-page cross-check.' });

    const definitionIds = new Map<string, number>();
    for (const row of definitions) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, row);
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US LS Tractor MT2S small compact tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [manufacturerId, equipmentTypeId, seriesId, 'MT225S', 'mt225s']);
    const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug='mt225s' LIMIT 1`, [manufacturerId]);
    await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
    await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','ROPS; HST; 3 ranges',TRUE,?,'Current LS Tractor USA MT225S. Current 2025/10 brochure is primary normalized specification source; live model page confirms the same tractor configuration.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, modelSourceId]);
    const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
    const values: Array<[string, string | number, string | null]> = [
      ['configuration.station', 'ROPS', null], ['engine.type', '3-cylinder indirect-injection diesel', null], ['engine.model', '3TNV80F-ZXKLST (Yanmar)', null], ['emissions.standard', 'Tier 4', null], ['engine.displacement', 1.267, 'L'], ['engine.gross_power', 24.7, 'hp'], ['engine.rated_speed', 2800, 'rpm'],
      ['transmission.standard', 'HST', null], ['transmission.speeds', '3 ranges', null], ['brakes.type', 'Wet, multi-disc', null], ['steering.type', 'Hydrostatic power steering', null],
      ['pto.rated_power', 19.3, 'hp'], ['pto.type', 'Independent', null], ['pto.rear_description', '540 rpm standard', null], ['pto.mid_description', '2,500 rpm optional', null],
      ['hydraulics.control_system', 'Position', null], ['hydraulics.main_pump_capacity', 5.6, 'gpm'], ['hydraulics.power_steering_pump_capacity', 3.7, 'gpm'], ['hydraulics.total_flow', 9.3, 'gpm'], ['hitch.category', 'Category I', null], ['hitch.lift_capacity', 1896, 'lb'], ['hydraulics.remote_valves', '1 pair optional', null],
      ['capacities.fuel_tank', 25.7, 'L'], ['dimensions.overall_length', 111.9, 'in'], ['dimensions.overall_width', 48.7, 'in'], ['dimensions.overall_height', 86.4, 'in'], ['dimensions.wheelbase', 63.4, 'in'], ['dimensions.unladen_weight', 1764, 'lb'],
      ['tires.ag', '7-12 / 11.2-16', null], ['tires.industrial', '23 x 8.5-12 / 12-16.5', null], ['tires.turf', '22 x 8.5-12 / 31 x 15.5-15', null],
    ];
    for (const [key, value, unit] of values) {
      const definitionId = definitionIds.get(key); if (!definitionId) throw new Error(`Missing LS Tractor MT2S spec definition ${key}`);
      await put(c, machineId, versionId, definitionId, brochureSourceId, value, unit);
    }
  },
};
