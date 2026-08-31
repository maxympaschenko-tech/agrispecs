import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  rotors: number;
  teddingWidth: string;
  weightLb: number;
  minimumPowerHp: number;
  transportWidth: string;
  gearbox: string;
};

const VERSION = 'north-america-current-2026-08';
const SOURCE_URL = 'https://agriculture.newholland.com/en-us/nar/products/haytools-spreaders/proted-rotary-tedders';
const models: Seed[] = [
  {
    slug: 'proted-3417', model: 'ProTed 3417', rotors: 4, teddingWidth: '17 ft 1 in (5.2 m)', weightLb: 904, minimumPowerHp: 20,
    transportWidth: '9 ft 6 in', gearbox: 'Periodic-grease modular gearbox',
  },
  {
    slug: 'proted-3625', model: 'ProTed 3625', rotors: 6, teddingWidth: '24 ft 11 in (7.6 m)', weightLb: 2640, minimumPowerHp: 50,
    transportWidth: '9 ft 9 in', gearbox: 'Permanent oil-bath lubrication',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Tedding System', 'tedder.rotor_count', 'Number of rotors', 'integer', null, 10],
  ['Tedding System', 'tedder.working_width', 'Tedding width', 'text', null, 20],
  ['Tedding System', 'tedder.tines', 'Tine system', 'text', null, 30],
  ['Tedding System', 'tedder.gearbox', 'Gearbox lubrication', 'text', null, 40],
  ['Tedding System', 'tedder.frame', 'Frame and drive', 'text', null, 50],
  ['Dimensions & Transport', 'tedder.transport_width', 'Transport width', 'text', null, 10],
  ['Dimensions & Weight', 'tedder.weight', 'Machine weight', 'decimal', 'lb', 10],
  ['Tractor Requirements', 'tedder.minimum_power', 'Minimum tractor power', 'decimal', 'hp', 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('New Holland ProTed migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland','agriculture.newholland.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function record(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `new-holland-${model.slug}-rotary-tedder-na-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, SOURCE_URL, externalId, `New Holland ${model.model} current North America rotary tedder specifications`, JSON.stringify({ captured: '2026-08-31', market: 'North America', equipmentType: 'Rotary Tedder', ...model })],
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

export const newHollandProTedRotaryTeddersCurrentMigration: DbMigration = {
  id: '20260831_508_new_holland_proted_rotary_tedders_current',
  description: 'Add current New Holland North America ProTed 3417 and 3625 rotary tedders',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Rotary Tedder','rotary-tedder') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='rotary-tedder' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'ProTed Rotary Tedders','proted-rotary-tedders') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='proted-rotary-tedders' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing ProTed definition ${key}`);
      return value;
    };

    for (const model of models) {
      const sourceRecordId = await record(connection, sourceId, model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current New Holland North America ProTed rotary tedder lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','Current ProTed rotary tedder specification',TRUE,?,'Current New Holland North America product-page data captured 2026-08-31.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Rotary tedder');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'New Holland North America current product line');
      await put(connection, machineId, versionId, def('tedder.rotor_count'), sourceRecordId, model.rotors);
      await put(connection, machineId, versionId, def('tedder.working_width'), sourceRecordId, model.teddingWidth);
      await put(connection, machineId, versionId, def('tedder.tines'), sourceRecordId, 'Coil-spring tines lift and invert crop for more even drying');
      await put(connection, machineId, versionId, def('tedder.gearbox'), sourceRecordId, model.gearbox);
      await put(connection, machineId, versionId, def('tedder.frame'), sourceRecordId, 'Heavy-duty one-piece boxed frame with modular gearboxes, large drive shafts and double U-joints');
      await put(connection, machineId, versionId, def('tedder.transport_width'), sourceRecordId, model.transportWidth);
      await put(connection, machineId, versionId, def('tedder.weight'), sourceRecordId, model.weightLb, 'lb');
      await put(connection, machineId, versionId, def('tedder.minimum_power'), sourceRecordId, model.minimumPowerHp, 'hp');
    }
  },
};
