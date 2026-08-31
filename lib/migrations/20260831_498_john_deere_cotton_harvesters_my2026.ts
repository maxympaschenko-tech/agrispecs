import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  harvestMethod: string;
  nominalHp: number;
  boostHp: number;
  maxHp: number;
  fuelGal: number;
  harvestUnit: string;
  rowConfiguration: string;
  harvestSystemDetail: string;
  auxiliaryCapacity?: string;
  currentProductUrl: string;
};

const VERSION = 'united-states-my2026';
const PDF_URL = 'https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/agricultural/COTTON_05FEB2026.pdf';
const CURRENT_FAMILY_URL = 'https://www.deere.com/en-us/products-solutions/harvesting';

const models: Seed[] = [
  {
    slug: 'cp770',
    model: 'CP770',
    harvestMethod: 'Cotton picker',
    nominalHp: 555,
    boostHp: 589,
    maxHp: 610,
    fuelGal: 330,
    harvestUnit: 'MP16 two-piece spindle picking units',
    rowConfiguration: '6 rows; 30, 32, 36, 38, or 40 in row spacing',
    harvestSystemDetail: 'MP16 row units with automatic grease dosing, ground-speed synchronization, precision moisture control, and twin conveying fans',
    auxiliaryCapacity: '360 gal water tank; 68 gal picking-unit lubrication tank',
    currentProductUrl: 'https://www.deere.com/en-us/products-solutions/harvesting/cotton/cp770-cotton-picker-ndhb40n',
  },
  {
    slug: 'cs770',
    model: 'CS770',
    harvestMethod: 'Cotton stripper',
    nominalHp: 515,
    boostHp: 548,
    maxHp: 566,
    fuelGal: 270,
    harvestUnit: 'SH8R, SH12R, or SH12F cotton stripper head',
    rowConfiguration: 'SH8R: 8-row rigid, 36/38/40 in; SH12R: 12-row rigid, 30/32/36 in; SH12F: 12-row folding, 38/40 in; published skip-row configurations also available',
    harvestSystemDetail: 'Low-profile Bat-Brush row units with hydraulic row-unit/cross-auger drive and a high-performance field cleaner with three 13.25 in saw drums',
    auxiliaryCapacity: '68 gal auxiliary solution system',
    currentProductUrl: 'https://www.deere.com/en-us/products-solutions/harvesting/cotton/cs770-cotton-stripper-njhb40n',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'configuration.model_year', 'Model year', 'integer', null, 3],
  ['Engine', 'cotton.engine_model', 'Engine model', 'text', null, 5],
  ['Engine', 'cotton.engine_displacement', 'Engine displacement', 'decimal', 'L', 10],
  ['Engine', 'cotton.engine_nominal_power', 'Nominal engine power', 'decimal', 'hp', 20],
  ['Engine', 'cotton.engine_boost_power', 'Boost engine power', 'decimal', 'hp', 30],
  ['Engine', 'cotton.engine_max_power', 'Maximum engine power', 'decimal', 'hp', 40],
  ['Engine', 'cotton.engine_rated_speed', 'Nominal/boost rated speed', 'integer', 'rpm', 50],
  ['Cotton Harvesting System', 'cotton.harvest_method', 'Harvest method', 'text', null, 5],
  ['Cotton Harvesting System', 'cotton.harvest_unit', 'Picking units / stripper head', 'text', null, 10],
  ['Cotton Harvesting System', 'cotton.row_configuration', 'Row configuration', 'text', null, 20],
  ['Cotton Harvesting System', 'cotton.harvest_system_detail', 'Harvesting system', 'text', null, 30],
  ['Cotton Harvesting System', 'cotton.auxiliary_capacity', 'Harvest-system auxiliary capacity', 'text', null, 40],
  ['Module Builder', 'cotton.accumulator_capacity', 'Cotton accumulator capacity', 'decimal', 'ft3', 10],
  ['Module Builder', 'cotton.module_max_diameter', 'Maximum round module diameter', 'decimal', 'in', 20],
  ['Module Builder', 'cotton.module_width', 'Round module width', 'decimal', 'in', 30],
  ['Module Builder', 'cotton.wrap_capacity', 'Wrap carrying capacity', 'integer', 'portions', 40],
  ['Travel', 'cotton.road_transport_speed', 'Road transport speed', 'decimal', 'mph', 10],
  ['Capacities', 'cotton.fuel_tank', 'Fuel tank capacity', 'decimal', 'gal', 10],
  ['Capacities', 'cotton.def_tank', 'DEF tank capacity', 'decimal', 'gal', 20],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere cotton harvester migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('John Deere','deere.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `john-deere-${model.slug}-cotton-us-my2026`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,published_date,raw_reference) VALUES(?,?,?,?,?,?)`,
    [
      sourceId,
      PDF_URL,
      externalId,
      `John Deere ${model.model} MY2026 United States cotton harvester specifications`,
      '2026-02-05',
      JSON.stringify({
        captured: '2026-08-31',
        market: 'United States',
        modelYear: 2026,
        equipmentType: 'Cotton Harvester',
        officialPdf: PDF_URL,
        currentFamilyPage: CURRENT_FAMILY_URL,
        currentProductPage: model.currentProductUrl,
        note: 'The February 5, 2026 John Deere United States price/specification document identifies the base machine as Model Year 2026. The current Deere US harvesting catalog captured 2026-08-31 continues to list CP770 and CS770.',
        ...model,
      }),
    ],
  );
  return Number(result.insertId);
}

async function put(
  connection: Parameters<DbMigration['apply']>[0],
  machineId: number,
  versionId: number,
  definitionId: number,
  sourceRecordId: number,
  value: string | number,
  unit: string | null = null,
) {
  await connection.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const johnDeereCottonHarvestersMy2026Migration: DbMigration = {
  id: '20260831_498_john_deere_cotton_harvesters_my2026',
  description: 'Add John Deere CP770 cotton picker and CS770 cotton stripper for United States MY2026',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Cotton Harvester','cotton-harvester') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('John Deere','john-deere') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='cotton-harvester' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    await connection.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'770 Cotton Harvesters','770-cotton-harvesters') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='770-cotton-harvesters' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        definition,
      );
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing cotton harvester definition ${key}`);
      return value;
    };

    for (const model of models) {
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'John Deere United States MY2026 cotton harvester; still listed in current US harvesting catalog on 2026-08-31','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);

      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Model Year 2026 US cotton harvester',TRUE,?,'Official John Deere US MY2026 price/specification document dated 2026-02-05; current US harvesting catalog still lists CP770 and CS770 as of 2026-08-31.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, model.harvestMethod);
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'United States MY2026');
      await put(connection, machineId, versionId, def('configuration.model_year'), sourceRecordId, 2026);
      await put(connection, machineId, versionId, def('cotton.engine_model'), sourceRecordId, 'Final Tier IV 13.6L John Deere PowerTech PWS');
      await put(connection, machineId, versionId, def('cotton.engine_displacement'), sourceRecordId, 13.6, 'L');
      await put(connection, machineId, versionId, def('cotton.engine_nominal_power'), sourceRecordId, model.nominalHp, 'hp');
      await put(connection, machineId, versionId, def('cotton.engine_boost_power'), sourceRecordId, model.boostHp, 'hp');
      await put(connection, machineId, versionId, def('cotton.engine_max_power'), sourceRecordId, model.maxHp, 'hp');
      await put(connection, machineId, versionId, def('cotton.engine_rated_speed'), sourceRecordId, 1900, 'rpm');
      await put(connection, machineId, versionId, def('cotton.harvest_method'), sourceRecordId, model.harvestMethod);
      await put(connection, machineId, versionId, def('cotton.harvest_unit'), sourceRecordId, model.harvestUnit);
      await put(connection, machineId, versionId, def('cotton.row_configuration'), sourceRecordId, model.rowConfiguration);
      await put(connection, machineId, versionId, def('cotton.harvest_system_detail'), sourceRecordId, model.harvestSystemDetail);
      if (model.auxiliaryCapacity) await put(connection, machineId, versionId, def('cotton.auxiliary_capacity'), sourceRecordId, model.auxiliaryCapacity);
      await put(connection, machineId, versionId, def('cotton.accumulator_capacity'), sourceRecordId, 300, 'ft3');
      await put(connection, machineId, versionId, def('cotton.module_max_diameter'), sourceRecordId, 96, 'in');
      await put(connection, machineId, versionId, def('cotton.module_width'), sourceRecordId, 94, 'in');
      await put(connection, machineId, versionId, def('cotton.wrap_capacity'), sourceRecordId, 120, 'portions');
      await put(connection, machineId, versionId, def('cotton.road_transport_speed'), sourceRecordId, 20, 'mph');
      await put(connection, machineId, versionId, def('cotton.fuel_tank'), sourceRecordId, model.fuelGal, 'gal');
      await put(connection, machineId, versionId, def('cotton.def_tank'), sourceRecordId, 27.5, 'gal');
    }
  },
};
