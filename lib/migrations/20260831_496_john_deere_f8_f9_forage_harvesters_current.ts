import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  series: 'F8' | 'F9';
  engineModel: string;
  displacementL: number;
  cylinders: number;
  turbo: string;
  fuelGal: number;
  defGal?: number;
  ratedHp?: number;
  maximumHp?: number;
  familyRatedHp?: number;
  harvestMotionPlusHp?: number;
  ecoHp?: number;
  sourceUrl: string;
};

const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.deere.com/en/hay-forage/harvesting/self-propelled-forage-harvesters/9800-forage-harvester/';
const HEADER_WIDTHS = '14.8, 19.7, 24.6, or 29.5 ft maize header working widths; 6, 8, 10, or 12 rows';
const PICKUP_WIDTHS = '9.84, 11.45, 13.12, 14.76, or 15.09 ft grass pickup transport widths';

const models: Seed[] = [
  { slug: 'f8-100', model: 'F8 100', series: 'F8', engineModel: 'John Deere JD14X 6136', displacementL: 13.6, cylinders: 6, turbo: 'Single-stage turbocharger (SST)', fuelGal: 290, defGal: 39.9, ratedHp: 420, sourceUrl: FAMILY_URL },
  { slug: 'f8-200', model: 'F8 200', series: 'F8', engineModel: 'John Deere JD14X 6136', displacementL: 13.6, cylinders: 6, turbo: 'Single-stage turbocharger (SST)', fuelGal: 290, defGal: 39.9, ratedHp: 459, ecoHp: 420, sourceUrl: 'https://www.deere.com/en-us/products-solutions/hay-forage-equipment/harvesting/f8-200-self-propelled-forage-harvester-mzayqvo' },
  { slug: 'f8-300', model: 'F8 300', series: 'F8', engineModel: 'John Deere JD14X 6136', displacementL: 13.6, cylinders: 6, turbo: 'Single-stage turbocharger (SST)', fuelGal: 290, defGal: 39.9, ratedHp: 498, ecoHp: 420, sourceUrl: 'https://www.deere.com/en-us/products-solutions/hay-forage-equipment/harvesting/f8-300-self-propelled-forage-harvester-mzazqvo' },
  { slug: 'f8-400', model: 'F8 400', series: 'F8', engineModel: 'John Deere JD14X 6136', displacementL: 13.6, cylinders: 6, turbo: 'Single-stage turbocharger (SST)', fuelGal: 290, defGal: 39.9, ratedHp: 537, ecoHp: 459, sourceUrl: 'https://www.deere.com/en-us/products-solutions/hay-forage-equipment/harvesting/f8-400-self-propelled-forage-harvester-mza0qvo' },
  { slug: 'f8-500', model: 'F8 500', series: 'F8', engineModel: 'John Deere JD14X 6136', displacementL: 13.6, cylinders: 6, turbo: 'Single-stage turbocharger (SST)', fuelGal: 290, defGal: 39.9, ratedHp: 577, ecoHp: 498, sourceUrl: 'https://www.deere.com/en-us/products-solutions/hay-forage-equipment/harvesting/f8-500-self-propelled-forage-harvester-mza1qvo' },
  { slug: 'f8-600', model: 'F8 600', series: 'F8', engineModel: 'John Deere JD14X 6136', displacementL: 13.6, cylinders: 6, turbo: 'Dual-stage turbocharger (DST)', fuelGal: 290, defGal: 39.9, ratedHp: 636, ecoHp: 537, sourceUrl: FAMILY_URL },
  { slug: 'f9-500', model: 'F9 500', series: 'F9', engineModel: 'John Deere JD18X 6180', displacementL: 18, cylinders: 6, turbo: 'Dual-stage turbocharger (DST)', fuelGal: 396, ratedHp: 630, maximumHp: 755, sourceUrl: 'https://www.deere.com/en-us/products-solutions/hay-forage-equipment/harvesting/f9-500-self-propelled-forage-harvester-mzexqvo' },
  { slug: 'f9-600', model: 'F9 600', series: 'F9', engineModel: 'John Deere JD18X', displacementL: 18, cylinders: 6, turbo: 'JD18X HarvestMotion powertrain', fuelGal: 396, familyRatedHp: 757, harvestMotionPlusHp: 805, ecoHp: 690, sourceUrl: 'https://www.deere.com/en-us/products-solutions/hay-forage-equipment/harvesting/f9-600-self-propelled-forage-harvester-mzeyqvo' },
  { slug: 'f9-700', model: 'F9 700', series: 'F9', engineModel: 'John Deere JD18X', displacementL: 18, cylinders: 6, turbo: 'JD18X HarvestMotion powertrain', fuelGal: 396, familyRatedHp: 809, harvestMotionPlusHp: 838, ecoHp: 690, sourceUrl: FAMILY_URL },
  { slug: 'f9-900', model: 'F9 900', series: 'F9', engineModel: 'Liebherr V12', displacementL: 24.2, cylinders: 12, turbo: 'Liebherr V12 HarvestMotion powertrain', fuelGal: 396, defGal: 39.9, familyRatedHp: 879, ecoHp: 810, sourceUrl: FAMILY_URL },
  { slug: 'f9-1000', model: 'F9 1000', series: 'F9', engineModel: 'Liebherr V12', displacementL: 24.2, cylinders: 12, turbo: 'Liebherr V12 HarvestMotion powertrain', fuelGal: 396, defGal: 39.9, familyRatedHp: 1006, ecoHp: 810, sourceUrl: FAMILY_URL },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Engine', 'engine.model', 'Engine model', 'text', null, 5],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 10],
  ['Engine', 'engine.cylinders', 'Cylinders', 'integer', null, 15],
  ['Engine', 'engine.aspiration', 'Engine / turbo configuration', 'text', null, 20],
  ['Engine', 'engine.rated_power', 'Rated engine power (individual product page)', 'decimal', 'hp', 30],
  ['Engine', 'engine.maximum_power', 'Maximum engine power (individual product page)', 'decimal', 'hp', 35],
  ['Engine', 'engine.family_table_rated_power', 'F8/F9 family table rated power', 'decimal', 'hp', 40],
  ['Engine', 'engine.harvestmotion_plus_power', 'HarvestMotion Plus power', 'decimal', 'hp', 45],
  ['Engine', 'engine.eco_mode_power', 'ECO mode power', 'decimal', 'hp', 50],
  ['Capacities', 'capacities.fuel_tank', 'Fuel tank capacity', 'decimal', 'gal', 10],
  ['Capacities', 'capacities.def_tank', 'DEF tank capacity', 'decimal', 'gal', 20],
  ['Header Connection', 'forage.maize_header_options', 'Maize header options', 'text', null, 10],
  ['Header Connection', 'forage.grass_pickup_options', 'Grass pickup options', 'text', null, 20],
  ['Kernel Processing', 'forage.kernel_processor_options', 'Kernel processor options', 'text', null, 10],
  ['Harvesting System', 'forage.automation', 'Harvest automation', 'text', null, 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere F8/F9 forage harvester migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('John Deere','deere.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `john-deere-${model.slug}-spfh-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, model.sourceUrl, externalId, `John Deere ${model.model} current US self-propelled forage harvester data`, JSON.stringify({ captured: '2026-08-31', market: 'United States', equipmentType: 'Self-Propelled Forage Harvester', familySource: FAMILY_URL, note: 'F9 family power metrics remain separately labeled where the current family table and individual F9 500 product page use different rated-power values.', ...model })],
  );
  return Number(result.insertId);
}

async function put(connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null = null) {
  await connection.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const johnDeereF8F9ForageHarvestersCurrentMigration: DbMigration = {
  id: '20260831_496_john_deere_f8_f9_forage_harvesters_current',
  description: 'Add current John Deere US F8 and F9 self-propelled forage harvester lineup with power-source distinctions preserved',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Self-Propelled Forage Harvester','self-propelled-forage-harvester') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('John Deere','john-deere') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='self-propelled-forage-harvester' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    for (const series of [{ name: 'F8 Series', slug: 'f8-series' }, { name: 'F9 Series', slug: 'f9-series' }]) {
      await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId, series.name, series.slug]);
    }

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => { const value = definitionIds.get(key); if (!value) throw new Error(`Missing forage harvester definition ${key}`); return value; };

    for (const model of models) {
      const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.series === 'F8' ? 'f8-series' : 'f9-series']);
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current John Deere United States F8/F9 self-propelled forage harvester lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current F8/F9 US specification',TRUE,?,'Current John Deere F8/F9 data captured 2026-08-31. Individual-page rated/max power and family-table HarvestMotion metrics are deliberately stored under different spec keys when the published values differ.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Self-propelled forage harvester');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'United States current F8/F9 catalog');
      await put(connection, machineId, versionId, def('engine.model'), sourceRecordId, model.engineModel);
      await put(connection, machineId, versionId, def('engine.displacement'), sourceRecordId, model.displacementL, 'L');
      await put(connection, machineId, versionId, def('engine.cylinders'), sourceRecordId, model.cylinders);
      await put(connection, machineId, versionId, def('engine.aspiration'), sourceRecordId, model.turbo);
      await put(connection, machineId, versionId, def('capacities.fuel_tank'), sourceRecordId, model.fuelGal, 'gal');
      if (model.defGal !== undefined) await put(connection, machineId, versionId, def('capacities.def_tank'), sourceRecordId, model.defGal, 'gal');
      if (model.ratedHp !== undefined) await put(connection, machineId, versionId, def('engine.rated_power'), sourceRecordId, model.ratedHp, 'hp');
      if (model.maximumHp !== undefined) await put(connection, machineId, versionId, def('engine.maximum_power'), sourceRecordId, model.maximumHp, 'hp');
      if (model.familyRatedHp !== undefined) await put(connection, machineId, versionId, def('engine.family_table_rated_power'), sourceRecordId, model.familyRatedHp, 'hp');
      if (model.harvestMotionPlusHp !== undefined) await put(connection, machineId, versionId, def('engine.harvestmotion_plus_power'), sourceRecordId, model.harvestMotionPlusHp, 'hp');
      if (model.ecoHp !== undefined) await put(connection, machineId, versionId, def('engine.eco_mode_power'), sourceRecordId, model.ecoHp, 'hp');
      await put(connection, machineId, versionId, def('forage.maize_header_options'), sourceRecordId, HEADER_WIDTHS);
      await put(connection, machineId, versionId, def('forage.grass_pickup_options'), sourceRecordId, PICKUP_WIDTHS);
      await put(connection, machineId, versionId, def('forage.kernel_processor_options'), sourceRecordId, 'John Deere Ultimate250 KP or XStream305 KP');
      await put(connection, machineId, versionId, def('forage.automation'), sourceRecordId, 'ProTouch Harvest and Ground Speed Automation available in the current F8/F9 platform');
    }
  },
};
