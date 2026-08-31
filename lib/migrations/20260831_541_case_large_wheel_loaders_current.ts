import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; model: string; hp: number; weightLb: number };

const VERSION = 'north-america-current-2026-08';
const URL = 'https://www.casece.com/en-us/northamerica/products/wheel-loaders/large-wheel-loaders';
const models: Seed[] = [
  { slug: '521g', model: '521G', hp: 142, weightLb: 24203 },
  { slug: '621g', model: '621G', hp: 172, weightLb: 28159 },
  { slug: '651g', model: '651G', hp: 172, weightLb: 30890 },
  { slug: '721g', model: '721G', hp: 195, weightLb: 36011 },
  { slug: '821g', model: '821G', hp: 230, weightLb: 42414 },
  { slug: '921g', model: '921G', hp: 255, weightLb: 45070 },
  { slug: '1021g', model: '1021G', hp: 318, weightLb: 56365 },
  { slug: '1121g', model: '1121G', hp: 345, weightLb: 61650 },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'case.brand_context', 'Brand context', 'text', null, 3],
  ['Engine', 'large_wheel_loader.engine_power', 'Published horsepower', 'decimal', 'hp', 10],
  ['Dimensions & Weight', 'large_wheel_loader.operating_weight', 'Operating weight', 'decimal', 'lb', 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('CASE large wheel loader migration dependency missing');
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
  const externalId = 'case-large-wheel-loaders-na-current-2026-08';
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [
      sourceId,
      URL,
      externalId,
      'CASE large wheel loaders current North America model table',
      JSON.stringify({ captured: '2026-08-31', market: 'North America', equipmentType: 'Large Wheel Loader', models }),
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

export const caseLargeWheelLoadersCurrentMigration: DbMigration = {
  id: '20260831_541_case_large_wheel_loaders_current',
  description: 'Add current CASE North America large wheel loaders',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Large Wheel Loader','large-wheel-loader') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('CASE','case') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='large-wheel-loader' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    const sourceRecordId = await sourceRecord(connection, sourceId);

    await connection.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'CASE G Series Large Wheel Loaders','case-g-series-large-wheel-loaders') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(
      connection,
      `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='case-g-series-large-wheel-loaders' LIMIT 1`,
      [manufacturerId, equipmentTypeId],
    );

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
      if (!value) throw new Error(`Missing CASE large wheel loader definition ${key}`);
      return value;
    };

    for (const model of models) {
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current CASE North America large wheel loader lineup; CASE agriculture page explicitly lists large wheel loaders for farm and ranch use','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(
        connection,
        `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,
        [manufacturerId, equipmentTypeId, model.slug],
      );
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'NA','North America','Current CASE large wheel loader family-table specification',TRUE,?,'Current CASE North America family model table captured 2026-08-31. Only horsepower and operating weight are published here for all eight models; other details are left unpublished unless separately sourced.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Large wheel loader');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'North America current catalog');
      await put(connection, machineId, versionId, def('case.brand_context'), sourceRecordId, 'CASE Construction Equipment');
      await put(connection, machineId, versionId, def('large_wheel_loader.engine_power'), sourceRecordId, model.hp, 'hp');
      await put(connection, machineId, versionId, def('large_wheel_loader.operating_weight'), sourceRecordId, model.weightLb, 'lb');
    }
  },
};
