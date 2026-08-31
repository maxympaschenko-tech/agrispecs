import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; model: string; hp?: number; batteryKwh?: number; weightLb: number; powertrain: 'Diesel' | 'Electric' };

const VERSION = 'north-america-current-2026-08';
const URL = 'https://www.casece.com/en-us/northamerica/products/excavators/mini-excavators';
const models: Seed[] = [
  { slug: 'cx12d', model: 'CX12D', hp: 11.8, weightLb: 2932, powertrain: 'Diesel' },
  { slug: 'cx15ev', model: 'CX15EV', batteryKwh: 21.5, weightLb: 3186, powertrain: 'Electric' },
  { slug: 'cx17c', model: 'CX17C', hp: 16.8, weightLb: 3910, powertrain: 'Diesel' },
  { slug: 'cx19d', model: 'CX19D', hp: 18.4, weightLb: 4145, powertrain: 'Diesel' },
  { slug: 'cx25ev', model: 'CX25EV', batteryKwh: 32.3, weightLb: 5159, powertrain: 'Electric' },
  { slug: 'cx26c', model: 'CX26C', hp: 24.8, weightLb: 5520, powertrain: 'Diesel' },
  { slug: 'cx30c', model: 'CX30C', hp: 24.8, weightLb: 6306, powertrain: 'Diesel' },
  { slug: 'cx30d', model: 'CX30D', hp: 24.4, weightLb: 7143, powertrain: 'Diesel' },
  { slug: 'cx34d', model: 'CX34D', hp: 24.4, weightLb: 7672, powertrain: 'Diesel' },
  { slug: 'cx37c', model: 'CX37C', hp: 24.4, weightLb: 7990, powertrain: 'Diesel' },
  { slug: 'cx38d', model: 'CX38D', hp: 24.4, weightLb: 8620, powertrain: 'Diesel' },
  { slug: 'cx42d', model: 'CX42D', hp: 43.3, weightLb: 9259, powertrain: 'Diesel' },
  { slug: 'cx50d', model: 'CX50D', hp: 58.7, weightLb: 10912, powertrain: 'Diesel' },
  { slug: 'cx57c', model: 'CX57C', hp: 66.9, weightLb: 12270, powertrain: 'Diesel' },
  { slug: 'cx60c', model: 'CX60C', hp: 64.7, weightLb: 12940, powertrain: 'Diesel' },
  { slug: 'cx60d', model: 'CX60D', hp: 59.4, weightLb: 13162, powertrain: 'Diesel' },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'case.brand_context', 'Brand context', 'text', null, 3],
  ['Machine Configuration', 'mini_excavator.powertrain', 'Powertrain', 'text', null, 4],
  ['Engine', 'mini_excavator.engine_power', 'Published horsepower', 'decimal', 'hp', 10],
  ['Electrical', 'mini_excavator.battery_capacity', 'Battery capacity', 'decimal', 'kWh', 10],
  ['Dimensions & Weight', 'mini_excavator.operating_weight', 'Operating weight', 'decimal', 'lb', 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('CASE mini excavator migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='CASE Construction Equipment' AND domain='casece.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('CASE Construction Equipment','casece.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number) {
  const externalId = 'case-mini-excavators-na-current-2026-08';
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const rawReference = {
    captured: '2026-08-31', market: 'North America', equipmentType: 'Mini Excavator', models,
    note: 'Current family table publishes horsepower for diesel models and battery capacity for electric models. CASE agriculture page lists mini excavators among agriculture equipment.',
  };
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, URL, externalId, 'CASE mini excavators current North America model table', JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

async function put(
  connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number,
  sourceRecordId: number, value: string | number, unit: string | null = null,
) {
  await connection.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const caseMiniExcavatorsCurrentMigration: DbMigration = {
  id: '20260831_544_case_mini_excavators_current',
  description: 'Add current CASE North America mini excavators',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Mini Excavator','mini-excavator') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('CASE','case') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='mini-excavator' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    const sourceRecordId = await sourceRecord(connection, sourceId);

    await connection.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'CASE Mini Excavators','case-mini-excavators') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='case-mini-excavators' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        definition,
      );
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing CASE mini excavator definition ${key}`);
      return value;
    };

    for (const model of models) {
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current CASE North America mini excavator lineup; CASE agriculture page explicitly lists mini excavators for agriculture applications','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'NA','North America','Current CASE mini excavator family-table specification',TRUE,?,'Current CASE North America family page captured 2026-08-31. Electric models retain published battery capacity rather than receiving an inferred horsepower value.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Mini excavator');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'North America current catalog');
      await put(connection, machineId, versionId, def('case.brand_context'), sourceRecordId, 'CASE Construction Equipment');
      await put(connection, machineId, versionId, def('mini_excavator.powertrain'), sourceRecordId, model.powertrain);
      await put(connection, machineId, versionId, def('mini_excavator.operating_weight'), sourceRecordId, model.weightLb, 'lb');
      if (model.hp !== undefined) await put(connection, machineId, versionId, def('mini_excavator.engine_power'), sourceRecordId, model.hp, 'hp');
      if (model.batteryKwh !== undefined) await put(connection, machineId, versionId, def('mini_excavator.battery_capacity'), sourceRecordId, model.batteryKwh, 'kWh');
    }
  },
};
