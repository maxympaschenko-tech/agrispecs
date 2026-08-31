import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; model: string; hp: number; liftCapacityLb: number };

const VERSION = 'north-america-current-2026-08';
const URL = 'https://www.casece.com/en-us/northamerica/products/forklifts';
const models: Seed[] = [
  { slug: '586h', model: '586H', hp: 74, liftCapacityLb: 6000 },
  { slug: '588h', model: '588H', hp: 74, liftCapacityLb: 8000 },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'case.brand_context', 'Brand context', 'text', null, 3],
  ['Engine', 'rough_terrain_forklift.engine_power', 'Published horsepower', 'decimal', 'hp', 10],
  ['Forklift Performance', 'rough_terrain_forklift.lift_capacity', 'Lift capacity', 'decimal', 'lb', 10],
  ['Forklift Performance', 'rough_terrain_forklift.mast_range', 'Published mast options', 'text', null, 20],
  ['Forklift Performance', 'rough_terrain_forklift.forward_mast_tilt', 'Maximum forward mast tilt', 'decimal', 'deg', 30],
  ['Forklift Performance', 'rough_terrain_forklift.rear_mast_tilt', 'Maximum rear mast tilt', 'decimal', 'deg', 40],
  ['Forklift Performance', 'rough_terrain_forklift.side_shift', 'Standard side shift', 'text', null, 50],
  ['Travel', 'rough_terrain_forklift.max_road_speed', 'Published maximum road speed', 'decimal', 'mph', 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('CASE rough terrain forklift migration dependency missing');
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
  const externalId = 'case-h-series-rough-terrain-forklifts-na-current-2026-08';
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const rawReference = {
    captured: '2026-08-31', market: 'North America', equipmentType: 'Rough Terrain Forklift', models,
    family: { mastOptions: '11 to 22 ft', maxRoadSpeedMph: 24, forwardTiltDeg: 45, rearTiltDeg: 15, standardSideShift: '3 in each direction' },
    farmContext: 'CASE states H Series rough terrain forklifts are suitable for farms and other operations handling heavy palletized materials.',
  };
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, URL, externalId, 'CASE H Series rough terrain forklifts current North America specifications', JSON.stringify(rawReference)],
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

export const caseRoughTerrainForkliftsCurrentMigration: DbMigration = {
  id: '20260831_542_case_rough_terrain_forklifts_current',
  description: 'Add current CASE North America 586H and 588H rough terrain forklifts',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Rough Terrain Forklift','rough-terrain-forklift') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('CASE','case') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='rough-terrain-forklift' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    const sourceRecordId = await sourceRecord(connection, sourceId);

    await connection.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'CASE H Series Rough Terrain Forklifts','case-h-series-rough-terrain-forklifts') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='case-h-series-rough-terrain-forklifts' LIMIT 1`, [manufacturerId, equipmentTypeId]);

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
      if (!value) throw new Error(`Missing CASE rough terrain forklift definition ${key}`);
      return value;
    };

    for (const model of models) {
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current CASE North America H Series rough terrain forklift; CASE explicitly identifies the series as suitable for farms and heavy palletized material handling','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'NA','North America','Current CASE H Series rough terrain forklift family specification',TRUE,?,'Current CASE North America family page captured 2026-08-31. Model-specific horsepower and lift capacity are combined only with family features explicitly presented for H Series forklifts.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Rough terrain forklift');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'North America current catalog');
      await put(connection, machineId, versionId, def('case.brand_context'), sourceRecordId, 'CASE Construction Equipment');
      await put(connection, machineId, versionId, def('rough_terrain_forklift.engine_power'), sourceRecordId, model.hp, 'hp');
      await put(connection, machineId, versionId, def('rough_terrain_forklift.lift_capacity'), sourceRecordId, model.liftCapacityLb, 'lb');
      await put(connection, machineId, versionId, def('rough_terrain_forklift.mast_range'), sourceRecordId, '11 to 22 ft mast options');
      await put(connection, machineId, versionId, def('rough_terrain_forklift.forward_mast_tilt'), sourceRecordId, 45, 'deg');
      await put(connection, machineId, versionId, def('rough_terrain_forklift.rear_mast_tilt'), sourceRecordId, 15, 'deg');
      await put(connection, machineId, versionId, def('rough_terrain_forklift.side_shift'), sourceRecordId, '3 in in either direction');
      await put(connection, machineId, versionId, def('rough_terrain_forklift.max_road_speed'), sourceRecordId, 24, 'mph');
    }
  },
};
