import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  description: string;
  capacityBu?: number;
  tankSplits?: string;
  meters?: string;
  blowerOptions?: string;
  transportHeightFt?: number;
  overallLengthFt?: number;
  baseWidthFt?: number;
  highFlotationWidthFt?: number;
  baseWeightLb?: number;
  highFlotationWeightLb?: number;
  conveyorCapacity?: string;
};

const VERSION = 'united-states-current-2026-08';
const SOURCE_URL = 'https://www-cm-us.deere.com/en-us/products-solutions/seeding-equipment/commodity-carts/c650t-trailing-air-cart-mtgxq0g';
const models: Seed[] = [
  {
    slug: 'c650t', model: 'C650T', description: 'High-capacity trailing C-Series air cart',
    capacityBu: 650, tankSplits: '50, 130, 210 and 260 bu', meters: '6 or 8 meters per tank', blowerOptions: 'Single or dual; standard- or high-capacity blower',
    transportHeightFt: 13.33, overallLengthFt: 38.92, baseWidthFt: 17.67, highFlotationWidthFt: 20.17,
    baseWeightLb: 32761, highFlotationWeightLb: 34839, conveyorCapacity: '100 bu/min in wheat',
  },
  {
    slug: 'c1100t', model: 'C1100T', description: 'New XL C-Series trailing air cart named in the current John Deere US C-Series product page',
  },
  {
    slug: 'c1450t', model: 'C1450T', description: 'New XL C-Series trailing air cart named in the current John Deere US C-Series product page',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Air Cart System', 'air_cart.model_feature', 'Model-specific feature', 'text', null, 10],
  ['Capacities', 'air_cart.total_capacity', 'Total capacity', 'decimal', 'bu', 10],
  ['Air Cart System', 'air_cart.tank_splits', 'Tank splits', 'text', null, 20],
  ['Air Cart System', 'air_cart.meter_count', 'Meter configuration', 'text', null, 30],
  ['Air Cart System', 'air_cart.metering', 'Metering system', 'text', null, 40],
  ['Air Cart System', 'air_cart.blower_options', 'Blower options', 'text', null, 50],
  ['Air Cart System', 'air_cart.calibration', 'Calibration and scales', 'text', null, 60],
  ['Air Cart System', 'air_cart.conveyor_capacity', 'Conveyor capacity', 'text', null, 70],
  ['Dimensions & Transport', 'air_cart.transport_height', 'Transport height', 'decimal', 'ft', 10],
  ['Dimensions & Transport', 'air_cart.overall_length', 'Overall length', 'decimal', 'ft', 20],
  ['Dimensions & Transport', 'air_cart.base_width', 'Width with base tires', 'decimal', 'ft', 30],
  ['Dimensions & Transport', 'air_cart.high_flotation_width', 'Width with high-flotation tires', 'decimal', 'ft', 40],
  ['Dimensions & Weight', 'air_cart.base_weight', 'Base shipping weight', 'decimal', 'lb', 10],
  ['Dimensions & Weight', 'air_cart.high_flotation_weight', 'Shipping weight with high-flotation option', 'decimal', 'lb', 20],
  ['Steering & Brakes', 'air_cart.brake_type', 'Brake type', 'text', null, 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere C-Series air cart migration dependency missing');
  return Number(rows[0].id);
}
async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('John Deere','deere.com','manufacturer','official')`);
  return Number(result.insertId);
}
async function record(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `john-deere-${model.slug}-air-cart-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, SOURCE_URL, externalId, `John Deere ${model.model} current US C-Series air cart data`, JSON.stringify({ captured: '2026-08-31', market: 'United States', equipmentType: 'Air Cart', note: 'The current C650T US product page explicitly names new XL C1100T and C1450T carts but does not expose their detailed specification rows in the selected source. Their numerical fields therefore remain unpublished.', ...model })],
  );
  return Number(result.insertId);
}
async function put(connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null = null) {
  await connection.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId]);
}

export const johnDeereCSeriesAirCartsCurrentMigration: DbMigration = {
  id: '20260831_514_john_deere_c_series_air_carts_current',
  description: 'Add current John Deere US C650T and named XL C-Series C1100T/C1450T air carts with strict source-scoped specs',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Air Cart','air-cart') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('John Deere','john-deere') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='air-cart' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'C-Series Air Carts','c-series-air-carts') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='c-series-air-carts' LIMIT 1`, [manufacturerId, equipmentTypeId]);
    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => { const value = definitionIds.get(key); if (!value) throw new Error(`Missing John Deere air cart definition ${key}`); return value; };
    for (const model of models) {
      const sourceRecordId = await record(connection, sourceId, model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current John Deere United States C-Series air cart lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current C-Series trailing air cart',TRUE,?,'Current John Deere US C-Series source captured 2026-08-31. Detailed numerical specifications are stored only for C650T because the selected current page does not expose detailed rows for the newly named C1100T and C1450T.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Air cart');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'John Deere United States current C-Series catalog');
      await put(connection, machineId, versionId, def('air_cart.model_feature'), sourceRecordId, model.description);
      if (model.capacityBu !== undefined) await put(connection, machineId, versionId, def('air_cart.total_capacity'), sourceRecordId, model.capacityBu, 'bu');
      if (model.tankSplits) await put(connection, machineId, versionId, def('air_cart.tank_splits'), sourceRecordId, model.tankSplits);
      if (model.meters) await put(connection, machineId, versionId, def('air_cart.meter_count'), sourceRecordId, model.meters);
      if (model.slug === 'c650t') {
        await put(connection, machineId, versionId, def('air_cart.metering'), sourceRecordId, 'AccuRate stainless-steel electric meter with section control and curve compensation');
        await put(connection, machineId, versionId, def('air_cart.calibration'), sourceRecordId, 'EZCal and ActiveCal; tank scales support in-cab calibration and product monitoring');
        await put(connection, machineId, versionId, def('air_cart.brake_type'), sourceRecordId, 'Hydraulic disc');
      }
      if (model.blowerOptions) await put(connection, machineId, versionId, def('air_cart.blower_options'), sourceRecordId, model.blowerOptions);
      if (model.conveyorCapacity) await put(connection, machineId, versionId, def('air_cart.conveyor_capacity'), sourceRecordId, model.conveyorCapacity);
      if (model.transportHeightFt !== undefined) await put(connection, machineId, versionId, def('air_cart.transport_height'), sourceRecordId, model.transportHeightFt, 'ft');
      if (model.overallLengthFt !== undefined) await put(connection, machineId, versionId, def('air_cart.overall_length'), sourceRecordId, model.overallLengthFt, 'ft');
      if (model.baseWidthFt !== undefined) await put(connection, machineId, versionId, def('air_cart.base_width'), sourceRecordId, model.baseWidthFt, 'ft');
      if (model.highFlotationWidthFt !== undefined) await put(connection, machineId, versionId, def('air_cart.high_flotation_width'), sourceRecordId, model.highFlotationWidthFt, 'ft');
      if (model.baseWeightLb !== undefined) await put(connection, machineId, versionId, def('air_cart.base_weight'), sourceRecordId, model.baseWeightLb, 'lb');
      if (model.highFlotationWeightLb !== undefined) await put(connection, machineId, versionId, def('air_cart.high_flotation_weight'), sourceRecordId, model.highFlotationWeightLb, 'lb');
    }
  },
};
