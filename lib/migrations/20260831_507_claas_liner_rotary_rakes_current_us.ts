import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  family: 'single' | 'dual-center' | 'dual-side' | 'four';
  sourceUrl: string;
  rotorCount: number;
  delivery: string;
  workingWidthFt: string;
  rotorDiameterFt: string;
  tineBar: string;
};

const VERSION = 'united-states-current-2026-08';
const SINGLE_URL = 'https://www.claas.com/en-us/agricultural-machinery/forage-harvesting-machinery/rakes/liner-single-rotor-swathers';
const CENTER_URL = 'https://www.claas.com/en-us/agricultural-machinery/forage-harvesting-machinery/rakes/liner-dual-rotor-swathers-with-central-swathing';
const SIDE_URL = 'https://www.claas.com/en-us/agricultural-machinery/forage-harvesting-machinery/rakes/liner-dual-rotor-swathers-with-side-swathing';
const FOUR_URL = 'https://www.claas.com/en-us/agricultural-machinery/forage-harvesting-machinery/rakes/liner-four-rotor-swathers';

const models: Seed[] = [
  { slug: 'liner-450-t-na', model: 'LINER 450 T NA', family: 'single', sourceUrl: SINGLE_URL, rotorCount: 1, delivery: 'Side swathing', workingWidthFt: '14.80 ft', rotorDiameterFt: '11.50 ft', tineBar: 'Yes (PROFIX)' },
  { slug: 'liner-370-t-na', model: 'LINER 370 T NA', family: 'single', sourceUrl: SINGLE_URL, rotorCount: 1, delivery: 'Side swathing', workingWidthFt: '12.10 ft', rotorDiameterFt: '9.50 ft', tineBar: 'Yes' },

  { slug: 'liner-3100-trend', model: 'LINER 3100 TREND', family: 'dual-center', sourceUrl: CENTER_URL, rotorCount: 2, delivery: 'Center swathing', workingWidthFt: '28.60-32.80 ft', rotorDiameterFt: '13.75 ft', tineBar: 'Yes (PROFIX)' },
  { slug: 'liner-2900-business', model: 'LINER 2900 BUSINESS', family: 'dual-center', sourceUrl: CENTER_URL, rotorCount: 2, delivery: 'Center swathing', workingWidthFt: '26.30-29.50 ft', rotorDiameterFt: '12.50 ft', tineBar: 'Yes (PROFIX)' },
  { slug: 'liner-2900-trend', model: 'LINER 2900 TREND', family: 'dual-center', sourceUrl: CENTER_URL, rotorCount: 2, delivery: 'Center swathing', workingWidthFt: '26.30-29.50 ft', rotorDiameterFt: '12.50 ft', tineBar: 'Yes (PROFIX)' },
  { slug: 'liner-2800-business', model: 'LINER 2800 BUSINESS', family: 'dual-center', sourceUrl: CENTER_URL, rotorCount: 2, delivery: 'Center swathing', workingWidthFt: '24.20-26.90 ft', rotorDiameterFt: '11.50 ft', tineBar: 'Yes (PROFIX)' },
  { slug: 'liner-2800-trend', model: 'LINER 2800 TREND', family: 'dual-center', sourceUrl: CENTER_URL, rotorCount: 2, delivery: 'Center swathing', workingWidthFt: '24.20-26.90 ft', rotorDiameterFt: '11.50 ft', tineBar: 'Yes (PROFIX)' },
  { slug: 'liner-2700-trend', model: 'LINER 2700 TREND', family: 'dual-center', sourceUrl: CENTER_URL, rotorCount: 2, delivery: 'Center swathing', workingWidthFt: '22.30-24.30 ft', rotorDiameterFt: '10.50 ft', tineBar: 'Yes (PROFIX)' },
  { slug: 'liner-2600-trend', model: 'LINER 2600 TREND', family: 'dual-center', sourceUrl: CENTER_URL, rotorCount: 2, delivery: 'Center swathing', workingWidthFt: '20.30-22.30 ft', rotorDiameterFt: '9.50 ft', tineBar: 'Yes' },

  { slug: 'liner-1900', model: 'LINER 1900', family: 'dual-side', sourceUrl: SIDE_URL, rotorCount: 2, delivery: 'Side swathing', workingWidthFt: '26.40 ft', rotorDiameterFt: '12.50 ft', tineBar: 'Yes (PROFIX)' },
  { slug: 'liner-1800-twin', model: 'LINER 1800 TWIN', family: 'dual-side', sourceUrl: SIDE_URL, rotorCount: 2, delivery: 'Side swathing / TWIN double-swath mode', workingWidthFt: '24.40-28.50 ft', rotorDiameterFt: '11.50 ft', tineBar: 'Yes (PROFIX)' },
  { slug: 'liner-1700-twin', model: 'LINER 1700 TWIN', family: 'dual-side', sourceUrl: SIDE_URL, rotorCount: 2, delivery: 'Side swathing / TWIN double-swath mode', workingWidthFt: '22.40-26.30 ft', rotorDiameterFt: '10.50 ft', tineBar: 'Yes (PROFIX)' },
  { slug: 'liner-800-twin-na', model: 'LINER 800 TWIN NA', family: 'dual-side', sourceUrl: SIDE_URL, rotorCount: 2, delivery: 'Side swathing / TWIN double-swath mode', workingWidthFt: '13.00-24.60 ft', rotorDiameterFt: '11.50 ft', tineBar: 'Yes' },
  { slug: 'liner-700-twin-na', model: 'LINER 700 TWIN NA', family: 'dual-side', sourceUrl: SIDE_URL, rotorCount: 2, delivery: 'Side swathing / TWIN double-swath mode', workingWidthFt: '11.50-20.70 ft', rotorDiameterFt: '9.50 ft', tineBar: 'Yes (PROFIX)' },

  { slug: 'liner-4900-business-pro', model: 'LINER 4900 BUSINESS PRO', family: 'four', sourceUrl: FOUR_URL, rotorCount: 4, delivery: 'Center swathing', workingWidthFt: '33.00-49.30 ft', rotorDiameterFt: '12.50 ft', tineBar: 'Yes (PROFIX)' },
  { slug: 'liner-4800-business-pro', model: 'LINER 4800 BUSINESS PRO', family: 'four', sourceUrl: FOUR_URL, rotorCount: 4, delivery: 'Center swathing', workingWidthFt: '30.50-44.60 ft', rotorDiameterFt: '11.50 ft', tineBar: 'Yes (PROFIX)' },
  { slug: 'liner-4800-business', model: 'LINER 4800 BUSINESS', family: 'four', sourceUrl: FOUR_URL, rotorCount: 4, delivery: 'Center swathing', workingWidthFt: '30.50-44.60 ft', rotorDiameterFt: '11.50 ft', tineBar: 'Yes (PROFIX)' },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'rotary_rake.family', 'Rake family', 'text', null, 20],
  ['Raking System', 'rotary_rake.rotor_count', 'Number of rotors', 'integer', null, 10],
  ['Raking System', 'rotary_rake.crop_delivery', 'Crop delivery', 'text', null, 20],
  ['Raking System', 'rotary_rake.working_width', 'Working width', 'text', null, 30],
  ['Raking System', 'rotary_rake.rotor_diameter', 'Swathing rotor diameter', 'text', null, 40],
  ['Raking System', 'rotary_rake.removable_tine_bar', 'Removable tine bar', 'text', null, 50],
  ['Raking System', 'rotary_rake.rotor_drive', 'Rotor drive', 'text', null, 60],
  ['Raking System', 'rotary_rake.ground_following', 'Ground contour following', 'text', null, 70],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('CLAAS LINER rotary rake migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='CLAAS' AND domain='claas.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('CLAAS','claas.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function ensureRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `claas-${model.slug}-rotary-rake-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, model.sourceUrl, externalId, `CLAAS ${model.model} current US rotary rake specifications`, JSON.stringify({ captured: '2026-08-31', market: 'United States', equipmentType: 'Rotary Rake', ...model })],
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

export const claasLinerRotaryRakesCurrentUsMigration: DbMigration = {
  id: '20260831_507_claas_liner_rotary_rakes_current_us',
  description: 'Add current CLAAS US LINER single, dual and four-rotor rakes',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Rotary Rake','rotary-rake') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('CLAAS','claas') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='claas' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='rotary-rake' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'LINER Rotary Rakes','liner-rotary-rakes') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='liner-rotary-rakes' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing CLAAS LINER definition ${key}`);
      return value;
    };

    for (const model of models) {
      const sourceRecordId = await ensureRecord(connection, sourceId, model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current CLAAS United States LINER rotary rake lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current CLAAS LINER rotary rake specification',TRUE,?,'Current CLAAS US product-page specification tables captured 2026-08-31. Values not shown in the selected US table remain unpublished.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Rotary rake');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'CLAAS United States current catalog');
      await put(connection, machineId, versionId, def('rotary_rake.family'), sourceRecordId, model.family);
      await put(connection, machineId, versionId, def('rotary_rake.rotor_count'), sourceRecordId, model.rotorCount);
      await put(connection, machineId, versionId, def('rotary_rake.crop_delivery'), sourceRecordId, model.delivery);
      await put(connection, machineId, versionId, def('rotary_rake.working_width'), sourceRecordId, model.workingWidthFt);
      await put(connection, machineId, versionId, def('rotary_rake.rotor_diameter'), sourceRecordId, model.rotorDiameterFt);
      await put(connection, machineId, versionId, def('rotary_rake.removable_tine_bar'), sourceRecordId, model.tineBar);
      await put(connection, machineId, versionId, def('rotary_rake.rotor_drive'), sourceRecordId, 'Professional rotor drive assembly running in an oil bath');
      await put(connection, machineId, versionId, def('rotary_rake.ground_following'), sourceRecordId, 'Rotor chassis positioned close to tine orbit for ground-contour following and reduced crop contamination');
    }
  },
};
