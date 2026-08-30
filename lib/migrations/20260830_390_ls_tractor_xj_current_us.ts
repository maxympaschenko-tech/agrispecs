import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://lstractorusa.com/series/xj/';
const MODEL_URL = 'https://lstractorusa.com/tractor/xj2025h/';
const BROCHURE_URL = 'https://lstractorusa.com/wp-content/uploads/2025/10/LS-Tractor-Brochure_XJ_Update_V5.pdf';

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
  ['Capacities', 'capacities.fuel_tank', 'Fuel tank capacity', 'decimal', 'L', 10],
  ['Dimensions & Weight', 'dimensions.overall_length', 'Overall length', 'decimal', 'in', 10],
  ['Dimensions & Weight', 'dimensions.overall_width', 'Overall width with tires', 'decimal', 'in', 20],
  ['Dimensions & Weight', 'dimensions.overall_height', 'Overall height', 'decimal', 'in', 30],
  ['Dimensions & Weight', 'dimensions.wheelbase', 'Wheelbase', 'decimal', 'in', 40],
  ['Dimensions & Weight', 'dimensions.unladen_weight', 'Tractor weight without ballast', 'decimal', 'lb', 70],
  ['Tires', 'tires.industrial', 'Industrial tires front / rear', 'text', null, 20],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor XJ migration dependency missing');
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

export const lsTractorXjCurrentUsMigration: DbMigration = {
  id: '20260830_390_ls_tractor_xj_current_us',
  description: 'Add current US XJ2025H using live model-page values while documenting current brochure conflicts',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'LS XJ Series','ls-xj-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ls-xj-series' LIMIT 1`, [manufacturerId]);

    await ensureSource(c, sourceId, 'ls-tractor-xj-current-us-lineup-2026-08', SERIES_URL, 'LS Tractor USA current XJ lineup', { market: 'United States', captured: '2026-08-30', currentModels: ['XJ2025H'], seriesSummary: { engineHp: 24.4, ptoHp: 18.5, hitchLiftLb: 1433, loaderLiftLb: 1091 } });
    const modelSourceId = await ensureSource(c, sourceId, 'ls-tractor-xj2025h-current-us-2026-08', MODEL_URL, 'LS Tractor XJ2025H current US model page', {
      market: 'United States', captured: '2026-08-30',
      normalizedCurrentValues: { engineHp: 24.4, ptoHp: 18.5, heightToRopsIn: 92.3, weightLb: 1609, hitchLiftLb: 1433 },
      modelPageInternalConflict: 'The current page marketing bullets mention multiple contradictory 3-point figures (including 1,808 lb and 966 lb), while its formal specification table and current series card publish 1,433 lb. The normalized hitch value follows the formal specification table/series card.'
    });
    await ensureSource(c, sourceId, 'ls-tractor-xj-brochure-2025-10-current', BROCHURE_URL, 'LS Tractor current XJ brochure', {
      market: 'United States', captured: '2026-08-30',
      brochureValues: { engineHp: 24.7, ptoHp: 18.5, heightToRopsIn: 84.5, weightLb: 1689, hitchLiftLb: 1433 },
      sourceConflict: 'The 2025/10 XJ brochure conflicts with the live current XJ series/model page on gross horsepower, ROPS height and tractor weight. For current normalization this migration follows the live series/model page (24.4 hp, 92.3 in, 1,609 lb) and preserves the brochure figures here.'
    });

    const definitionIds = new Map<string, number>();
    for (const row of definitions) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, row);
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US LS Tractor XJ small compact tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [manufacturerId, equipmentTypeId, seriesId, 'XJ2025H', 'xj2025h']);
    const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug='xj2025h' LIMIT 1`, [manufacturerId]);
    await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
    await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','ROPS; hydrostatic drive; 2 ranges',TRUE,?,'Current LS Tractor USA XJ2025H. Live current model page is primary for conflicting current tractor values; brochure differences are retained in provenance.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, modelSourceId]);
    const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
    const values: Array<[string, string | number, string | null]> = [
      ['configuration.station', 'ROPS', null], ['engine.type', '3-cylinder indirect-injection, water-cooled diesel', null], ['engine.model', 'Mitsubishi S3L2', null], ['emissions.standard', 'Tier 4', null], ['engine.displacement', 1.318, 'L'], ['engine.gross_power', 24.4, 'hp'], ['engine.rated_speed', 2500, 'rpm'],
      ['transmission.standard', 'Hydrostatic drive', null], ['transmission.speeds', '2 ranges', null], ['brakes.type', 'Wet, multi-disc', null], ['steering.type', 'Hydrostatic power steering', null],
      ['pto.rated_power', 18.5, 'hp'], ['pto.type', 'Independent', null], ['pto.rear_description', '540 rpm standard', null], ['pto.mid_description', '2,000 rpm standard', null],
      ['hydraulics.control_system', 'Manual position', null], ['hydraulics.main_pump_capacity', 5.9, 'gpm'], ['hydraulics.power_steering_pump_capacity', 2.6, 'gpm'], ['hydraulics.total_flow', 8.5, 'gpm'], ['hitch.category', 'Category I', null], ['hitch.lift_capacity', 1433, 'lb'],
      ['capacities.fuel_tank', 25.0, 'L'], ['dimensions.overall_length', 103, 'in'], ['dimensions.overall_width', 44.9, 'in'], ['dimensions.overall_height', 92.3, 'in'], ['dimensions.wheelbase', 59, 'in'], ['dimensions.unladen_weight', 1609, 'lb'], ['tires.industrial', '23 x 8.5-12 / 33 x 12-16.5', null],
    ];
    for (const [key, value, unit] of values) {
      const definitionId = definitionIds.get(key); if (!definitionId) throw new Error(`Missing LS Tractor XJ spec definition ${key}`);
      await put(c, machineId, versionId, definitionId, modelSourceId, value, unit);
    }
  },
};
