import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  rotorCount: number;
  delivery: string;
  maxWidth: string;
  rotorDiameter?: string;
  ptoHp?: number;
  operation: string;
};

const VERSION = 'north-america-current-2026-08';
const SOURCE_URL = 'https://agriculture.newholland.com/en-us/nar/products/haytools-spreaders/prorotor-rotary-rakes';
const models: Seed[] = [
  {
    slug: 'prorotor-3114',
    model: 'ProRotor 3114',
    rotorCount: 1,
    delivery: 'Left-side delivery',
    maxWidth: '13 ft 9 in (4.2 m)',
    rotorDiameter: '11 ft',
    ptoHp: 20,
    operation: 'Single-rotor side-delivery rake; individual windrows or doubled windrows in two passes',
  },
  {
    slug: 'prorotor-3223',
    model: 'ProRotor 3223',
    rotorCount: 2,
    delivery: 'Left-side delivery',
    maxWidth: '23 ft 3 in (7.1 m)',
    ptoHp: 50,
    operation: 'Dual-rotor tandem side-delivery rake; optional front swath board can form two individual windrows',
  },
  {
    slug: 'prorotor-3226',
    model: 'ProRotor 3226',
    rotorCount: 2,
    delivery: 'Center delivery',
    maxWidth: '25 ft 7 in (7.8 m)',
    operation: 'Dual-rotor center-delivery rake with rear-wheel steering and up to 85-degree turning angle',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Raking System', 'rotary_rake.rotor_count', 'Number of rotors', 'integer', null, 10],
  ['Raking System', 'rotary_rake.crop_delivery', 'Crop delivery', 'text', null, 20],
  ['Raking System', 'rotary_rake.maximum_working_width', 'Maximum raking width', 'text', null, 30],
  ['Raking System', 'rotary_rake.rotor_diameter', 'Rotor diameter', 'text', null, 40],
  ['Raking System', 'rotary_rake.operation', 'Raking configuration', 'text', null, 50],
  ['Raking System', 'rotary_rake.gearbox', 'Rotor gearbox', 'text', null, 60],
  ['Raking System', 'rotary_rake.tine_system', 'Tine system', 'text', null, 70],
  ['Tractor Requirements', 'rotary_rake.minimum_pto_power', 'Minimum PTO power', 'decimal', 'hp', 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('New Holland ProRotor migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland','agriculture.newholland.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function ensureRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `new-holland-${model.slug}-rotary-rake-na-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, SOURCE_URL, externalId, `New Holland ${model.model} current North America rotary rake specifications`, JSON.stringify({ captured: '2026-08-31', market: 'North America', equipmentType: 'Rotary Rake', ...model })],
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

export const newHollandProRotorRotaryRakesCurrentMigration: DbMigration = {
  id: '20260831_506_new_holland_prorotor_rotary_rakes_current',
  description: 'Add current New Holland North America ProRotor 3114, 3223 and 3226 rotary rakes',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Rotary Rake','rotary-rake') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='rotary-rake' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'ProRotor Rotary Rakes','prorotor-rotary-rakes') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='prorotor-rotary-rakes' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing ProRotor definition ${key}`);
      return value;
    };

    for (const model of models) {
      const sourceRecordId = await ensureRecord(connection, sourceId, model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current New Holland North America ProRotor rotary rake lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','Current ProRotor rotary rake specification',TRUE,?,'Current New Holland North America product-page data captured 2026-08-31. Unpublished model-specific values remain blank.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Rotary rake');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'New Holland North America current product line');
      await put(connection, machineId, versionId, def('rotary_rake.rotor_count'), sourceRecordId, model.rotorCount);
      await put(connection, machineId, versionId, def('rotary_rake.crop_delivery'), sourceRecordId, model.delivery);
      await put(connection, machineId, versionId, def('rotary_rake.maximum_working_width'), sourceRecordId, model.maxWidth);
      if (model.rotorDiameter) await put(connection, machineId, versionId, def('rotary_rake.rotor_diameter'), sourceRecordId, model.rotorDiameter);
      await put(connection, machineId, versionId, def('rotary_rake.operation'), sourceRecordId, model.operation);
      await put(connection, machineId, versionId, def('rotary_rake.gearbox'), sourceRecordId, 'Sealed oil-lubricated rotor gearbox');
      await put(connection, machineId, versionId, def('rotary_rake.tine_system'), sourceRecordId, 'Curved tangential-mounted tine arms with long flexible three-coil tines');
      if (model.ptoHp !== undefined) await put(connection, machineId, versionId, def('rotary_rake.minimum_pto_power'), sourceRecordId, model.ptoHp, 'hp');
    }
  },
};
