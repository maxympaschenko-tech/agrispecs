import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; model: string };

const VERSION = 'north-america-current-2026-08';
const SOURCE_URL = 'https://agriculture.newholland.com/en-us/nar/products/haytools-spreaders/hayliner-small-square-balers/hayliner-265';
const models: Seed[] = [
  { slug: 'hayliner-265', model: 'Hayliner 265' },
  { slug: 'hayliner-275', model: 'Hayliner 275' },
  { slug: 'hayliner-275-plus', model: 'Hayliner 275 PLUS' },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Bale Formation', 'baler.bale_cross_section', 'Bale cross section', 'text', null, 10],
  ['Bale Formation', 'baler.bale_length_range', 'Adjustable bale length', 'text', null, 20],
  ['Bale Formation', 'baler.plunger_speed', 'Plunger speed', 'decimal', 'strokes/min', 30],
  ['Pickup & Feeding', 'baler.feeding_system', 'Feeding system', 'text', null, 20],
  ['Tying System', 'baler.tying_system', 'Tying system', 'text', null, 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('New Holland Hayliner migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland','agriculture.newholland.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `new-holland-${model.slug}-small-square-baler-na-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, SOURCE_URL, externalId, `New Holland ${model.model} current North America small square baler specifications`, JSON.stringify({ captured: '2026-08-31', market: 'North America', equipmentType: 'Small Square Baler', model: model.model, baleCrossSection: '14 x 18 in', adjustableBaleLength: '12-52 in', plungerSpeed: '93 strokes/min' })],
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

export const newHollandHaylinerSmallSquareBalersCurrentMigration: DbMigration = {
  id: '20260831_493_new_holland_hayliner_small_square_balers_current',
  description: 'Add current New Holland North America Hayliner 265, 275 and 275 PLUS small square balers',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Small Square Baler','small-square-baler') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='small-square-baler' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Hayliner Series','hayliner-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='hayliner-series' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => { const value = definitionIds.get(key); if (!value) throw new Error(`Missing Hayliner definition ${key}`); return value; };

    for (const model of models) {
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current New Holland North America Hayliner small square baler lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','Current Hayliner small square baler specification',TRUE,?,'Official New Holland North America family-page data captured 2026-08-31. Tractor requirements are not stored because the current public HTML table does not expose model-level numeric values.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Small square baler');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'North America current catalog');
      await put(connection, machineId, versionId, def('baler.bale_cross_section'), sourceRecordId, '14 x 18 in');
      await put(connection, machineId, versionId, def('baler.bale_length_range'), sourceRecordId, '12-52 in adjustable');
      await put(connection, machineId, versionId, def('baler.plunger_speed'), sourceRecordId, 93, 'strokes/min');
      await put(connection, machineId, versionId, def('baler.feeding_system'), sourceRecordId, 'Rotary feeding system with paired rotating tines and feeder fork');
      await put(connection, machineId, versionId, def('baler.tying_system'), sourceRecordId, 'Gear-driven twine-tying or wire-twisting system depending configuration');
    }
  },
};
