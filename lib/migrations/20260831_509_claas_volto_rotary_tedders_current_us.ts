import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  workingWidth?: string;
  rotorDiameter?: string;
  transportClass: string;
};

const VERSION = 'united-states-current-2026-08';
const SOURCE_URL = 'https://www.claas.com/en-us/agricultural-machinery/forage-harvesting-machinery/hay-tedders/volto-trailed-tedders';
const models: Seed[] = [
  { slug: 'volto-1500-ts', model: 'VOLTO 1500 TS', transportClass: 'Trailed VOLTO TS configuration' },
  { slug: 'volto-1500-t', model: 'VOLTO 1500 T', transportClass: 'Trailed VOLTO T configuration' },
  { slug: 'volto-1300-ts', model: 'VOLTO 1300 TS', transportClass: 'Trailed VOLTO TS configuration' },
  { slug: 'volto-1300-t', model: 'VOLTO 1300 T', transportClass: 'Trailed VOLTO T configuration' },
  { slug: 'volto-1100-t-na', model: 'VOLTO 1100 T NA', workingWidth: '35 ft', rotorDiameter: '59 in', transportClass: 'Trailed North America configuration' },
  { slug: 'volto-900-t', model: 'VOLTO 900 T', workingWidth: '28 ft', rotorDiameter: '59 in', transportClass: 'Trailed VOLTO T configuration' },
  { slug: 'volto-800-th-skd', model: 'VOLTO 800 TH SKD', workingWidth: '25 ft', rotorDiameter: '67 in', transportClass: 'Trailed VOLTO TH SKD configuration' },
  { slug: 'volto-55-th', model: 'VOLTO 55 TH', workingWidth: '17 ft', rotorDiameter: '67 in', transportClass: 'Trailed VOLTO TH configuration' },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'tedder.transport_class', 'Tedder configuration', 'text', null, 20],
  ['Tedding System', 'tedder.working_width', 'Working width', 'text', null, 10],
  ['Tedding System', 'tedder.rotor_diameter', 'Rotor diameter', 'text', null, 20],
  ['Tedding System', 'tedder.crop_flow_system', 'Crop flow system', 'text', null, 30],
  ['Tedding System', 'tedder.drive_system', 'Drive system', 'text', null, 40],
  ['Tedding System', 'tedder.tines', 'Tine system', 'text', null, 50],
  ['Dimensions & Transport', 'tedder.transport_system', 'Transport system', 'text', null, 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('CLAAS VOLTO migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='CLAAS' AND domain='claas.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('CLAAS','claas.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function record(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `claas-${model.slug}-rotary-tedder-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, SOURCE_URL, externalId, `CLAAS ${model.model} current US rotary tedder data`, JSON.stringify({ captured: '2026-08-31', market: 'United States', equipmentType: 'Rotary Tedder', note: 'Working width and rotor diameter are stored only where the current CLAAS US table exposes a value; blank cells remain unpublished.', ...model })],
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

export const claasVoltoRotaryTeddersCurrentUsMigration: DbMigration = {
  id: '20260831_509_claas_volto_rotary_tedders_current_us',
  description: 'Add current CLAAS US VOLTO trailed rotary tedder lineup',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Rotary Tedder','rotary-tedder') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('CLAAS','claas') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='claas' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='rotary-tedder' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'VOLTO Trailed Tedders','volto-trailed-tedders') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='volto-trailed-tedders' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing CLAAS VOLTO definition ${key}`);
      return value;
    };

    for (const model of models) {
      const sourceRecordId = await record(connection, sourceId, model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current CLAAS United States VOLTO trailed tedder lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current CLAAS VOLTO trailed tedder specification',TRUE,?,'Current CLAAS US product-page data captured 2026-08-31. Blank table cells remain unpublished.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Rotary tedder');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'CLAAS United States current catalog');
      await put(connection, machineId, versionId, def('tedder.transport_class'), sourceRecordId, model.transportClass);
      if (model.workingWidth) await put(connection, machineId, versionId, def('tedder.working_width'), sourceRecordId, model.workingWidth);
      if (model.rotorDiameter) await put(connection, machineId, versionId, def('tedder.rotor_diameter'), sourceRecordId, model.rotorDiameter);
      await put(connection, machineId, versionId, def('tedder.crop_flow_system'), sourceRecordId, 'MAX SPREAD rotor technology with tine arms angled 29.3 degrees rearward');
      await put(connection, machineId, versionId, def('tedder.drive_system'), sourceRecordId, 'PERMALINK drive technology');
      await put(connection, machineId, versionId, def('tedder.tines'), sourceRecordId, 'Five-winding tines with tine-loss guard');
      await put(connection, machineId, versionId, def('tedder.transport_system'), sourceRecordId, 'Hydraulic folding to compact road transport position; T models use a trailed transport chassis');
    }
  },
};
