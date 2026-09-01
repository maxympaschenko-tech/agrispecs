import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  bodyConfiguration: string;
  cargoCapacity: string;
  towingCapacityLb: number;
  weightLb: number;
  heightIn: number;
  widthIn: number;
  groundClearance: string;
  notes: string;
};

const VERSION = 'united-states-current-2026-catalog';
const SOURCE_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/2026-full-product-line-brochure.pdf?sfvrsn=efd39503_10';
const models: Seed[] = [
  {
    slug: 'rtv-x-cab',
    model: 'RTV-X Cab',
    bodyConfiguration: 'Factory-enclosed cab; Standard and Premium trims',
    cargoCapacity: '1,102 lb',
    towingCapacityLb: 1300,
    weightLb: 2414,
    heightIn: 82.3,
    widthIn: 65.4,
    groundClearance: '10.4 in',
    notes: '2026 Kubota USA full product line catalog. RTV-X Cab values are configuration-specific and remain separate from the open-station RTV-X record. Published weight is 2,414 lb; cargo capacity is 1,102 lb; towing capacity is a 1,300 lb manufacturer estimate.',
  },
  {
    slug: 'rtv-x-crew',
    model: 'RTV-X Crew',
    bodyConfiguration: 'Convertible crew configuration; Basic, Standard and Premium trims',
    cargoCapacity: '1,102 lb (long bed position) / 661 lb (short bed position)',
    towingCapacityLb: 1300,
    weightLb: 2370,
    heightIn: 79.7,
    widthIn: 63.2,
    groundClearance: '9.4 in at rear axle',
    notes: '2026 Kubota USA full product line catalog. RTV-X Crew cargo ratings are retained as the published long/short configuration pair rather than collapsed into one number. Published weight is 2,370 lb and towing capacity is a 1,300 lb manufacturer estimate.',
  },
  {
    slug: 'rtv-x-long-bed',
    model: 'RTV-X Long Bed',
    bodyConfiguration: 'Long-bed two-seat configuration with ProKonvert cargo box',
    cargoCapacity: '1,212 lb',
    towingCapacityLb: 1300,
    weightLb: 2340,
    heightIn: 80,
    widthIn: 63,
    groundClearance: '11.3 in / 9.4 in as published',
    notes: '2026 Kubota USA full product line catalog identifies RTV-X Long Bed as a current configuration. Published weight is 2,340 lb, cargo capacity is 1,212 lb, and towing capacity is a 1,300 lb manufacturer estimate. The catalog publishes two ground-clearance values without a single merged basis, so both are retained as text.',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'kubota.utility_vehicle.series', 'Kubota utility vehicle family', 'text', null, 3],
  ['Machine Configuration', 'kubota.utility_vehicle.body_configuration', 'Body configuration', 'text', null, 4],
  ['Engine', 'kubota.utility_vehicle.engine_type', 'Engine type', 'text', null, 10],
  ['Engine', 'kubota.utility_vehicle.published_power', 'Published horsepower', 'decimal', 'hp', 20],
  ['Engine', 'kubota.utility_vehicle.power_basis', 'Power source basis', 'text', null, 30],
  ['Utility Vehicle Performance', 'kubota.utility_vehicle.cargo_bed_load', 'Cargo bed load', 'text', null, 10],
  ['Utility Vehicle Performance', 'kubota.utility_vehicle.towing_capacity', 'Towing capacity', 'text', null, 20],
  ['Utility Vehicle Performance', 'kubota.utility_vehicle.power_steering', 'Power steering', 'text', null, 30],
  ['Utility Vehicle Performance', 'kubota.utility_vehicle.brakes', 'Brakes', 'text', null, 40],
  ['Travel', 'kubota.utility_vehicle.transmission', 'Transmission', 'text', null, 10],
  ['Capacities', 'kubota.utility_vehicle.fuel_tank', 'Fuel tank', 'decimal', 'gal', 10],
  ['Dimensions & Weight', 'kubota.utility_vehicle.operating_weight', 'Published vehicle weight', 'decimal', 'lb', 10],
  ['Dimensions & Weight', 'kubota.utility_vehicle.width', 'Overall width', 'decimal', 'in', 20],
  ['Dimensions & Weight', 'kubota.utility_vehicle.height', 'Overall height', 'decimal', 'in', 30],
  ['Dimensions & Weight', 'kubota.utility_vehicle.ground_clearance', 'Ground clearance', 'text', null, 40],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, p);
  if (!rows[0]) throw new Error('Kubota RTV-X configuration migration dependency missing');
  return Number(rows[0].id);
}

async function source(c: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Kubota','kubotausa.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function record(c: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `kubota-${model.slug}-utility-vehicle-us-2026-catalog`;
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, SOURCE_URL, externalId, `Kubota ${model.model} 2026 U.S. catalog specifications`, JSON.stringify({ captured: '2026-09-01', market: 'United States', equipmentType: 'Utility Vehicle', publication: '2026 Kubota USA Full Product Line Brochure', model })],
  );
  return Number(result.insertId);
}

async function put(c: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, recordId: number, value: string | number, unit: string | null = null) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, recordId],
  );
}

export const kubotaRtvXCurrentConfigurationsMigration: DbMigration = {
  id: '20260901_569_kubota_rtv_x_current_configurations',
  description: 'Add current Kubota RTV-X Cab Crew and Long Bed configurations from the 2026 U.S. catalog',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Utility Vehicle','utility-vehicle') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Kubota','kubota') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='utility-vehicle' LIMIT 1`);
    const sourceId = await source(c);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId, 'Kubota RTV-X', 'kubota-rtv-x'],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='kubota-rtv-x' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await c.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        definition,
      );
      definitionIds.set(definition[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing Kubota RTV-X configuration definition ${key}`);
      return value;
    };

    for (const model of models) {
      const recordId = await record(c, sourceId, model);
      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Kubota USA RTV-X configuration from the 2026 manufacturer catalog','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','2026 Kubota USA catalog configuration',TRUE,?,?) ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,
        [machineId, VERSION, recordId, model.notes],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      await put(c, machineId, versionId, def('configuration.type'), recordId, 'Utility vehicle');
      await put(c, machineId, versionId, def('configuration.market_scope'), recordId, 'United States 2026 catalog');
      await put(c, machineId, versionId, def('kubota.utility_vehicle.series'), recordId, 'RTV-X');
      await put(c, machineId, versionId, def('kubota.utility_vehicle.body_configuration'), recordId, model.bodyConfiguration);
      await put(c, machineId, versionId, def('kubota.utility_vehicle.engine_type'), recordId, '3-cylinder, 4-cycle, diesel, OHV');
      await put(c, machineId, versionId, def('kubota.utility_vehicle.published_power'), recordId, 23.3, 'hp');
      await put(c, machineId, versionId, def('kubota.utility_vehicle.power_basis'), recordId, 'Kubota 2026 catalog gross horsepower, SAE J1995');
      await put(c, machineId, versionId, def('kubota.utility_vehicle.cargo_bed_load'), recordId, model.cargoCapacity);
      await put(c, machineId, versionId, def('kubota.utility_vehicle.towing_capacity'), recordId, `${model.towingCapacityLb.toLocaleString('en-US')} lb manufacturer estimate`);
      await put(c, machineId, versionId, def('kubota.utility_vehicle.power_steering'), recordId, 'Hydrostatic power steering');
      await put(c, machineId, versionId, def('kubota.utility_vehicle.brakes'), recordId, 'Wet disc brake, front/rear');
      await put(c, machineId, versionId, def('kubota.utility_vehicle.transmission'), recordId, 'Variable Hydraulic Transmission (VHT-X)');
      await put(c, machineId, versionId, def('kubota.utility_vehicle.fuel_tank'), recordId, 7.9, 'gal');
      await put(c, machineId, versionId, def('kubota.utility_vehicle.operating_weight'), recordId, model.weightLb, 'lb');
      await put(c, machineId, versionId, def('kubota.utility_vehicle.width'), recordId, model.widthIn, 'in');
      await put(c, machineId, versionId, def('kubota.utility_vehicle.height'), recordId, model.heightIn, 'in');
      await put(c, machineId, versionId, def('kubota.utility_vehicle.ground_clearance'), recordId, model.groundClearance);
    }
  },
};