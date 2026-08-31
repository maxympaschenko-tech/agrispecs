import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  sourceUrl: string;
  ratedHp: number;
  peakHp: number;
  tank: number | string;
  boomOptions: string;
  maxBoomFt: number;
  maxSpeedMph: number;
  note: string;
};

const VERSION = 'united-states-current-2026-08';
const BOOM_OPTIONS = '60/90 ft; 60/100 ft; 60/90/120 ft; 66/120 ft; 66/132 ft; or 69/135 ft depending configuration';
const models: Seed[] = [
  {
    slug: 'patriot-3250', model: 'Patriot 3250',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/application-equipment/patriot-50-series-sprayers/patriot-3250',
    ratedHp: 285, peakHp: 309, tank: '800 or 1,000 gal', boomOptions: BOOM_OPTIONS, maxBoomFt: 135, maxSpeedMph: 32,
    note: 'Current Case IH United States Patriot 3250 product page captured 2026-08-31. The product tank is configuration-dependent at 800 or 1,000 gallons.',
  },
  {
    slug: 'patriot-4350', model: 'Patriot 4350',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/application-equipment/patriot-50-series-sprayers/patriot-4350',
    ratedHp: 335, peakHp: 374, tank: 1200, boomOptions: BOOM_OPTIONS, maxBoomFt: 135, maxSpeedMph: 37,
    note: 'Current Case IH United States Patriot 4350 product page captured 2026-08-31.',
  },
  {
    slug: 'patriot-4450', model: 'Patriot 4450',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/application-equipment/patriot-50-series-sprayers/patriot-4450',
    ratedHp: 390, peakHp: 415, tank: 1600, boomOptions: BOOM_OPTIONS, maxBoomFt: 135, maxSpeedMph: 37,
    note: 'Current Case IH United States Patriot 4450 product page captured 2026-08-31.',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 20],
  ['Engine', 'engine.peak_power', 'Peak engine power', 'decimal', 'hp', 25],
  ['Application System', 'application.solution_tank_capacity', 'Product tank capacity', 'decimal', 'gal', 10],
  ['Application System', 'application.boom_width_options', 'Boom width options', 'text', null, 30],
  ['Application System', 'application.maximum_boom_width', 'Maximum boom width', 'decimal', 'ft', 35],
  ['Travel', 'travel.maximum_speed', 'Maximum travel speed', 'decimal', 'mph', 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH Patriot sprayer migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `case-ih-${model.slug}-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const rawReference = {
    captured: '2026-08-31', market: 'United States', equipmentType: 'Sprayer', model: model.model,
    ratedHp: model.ratedHp, peakHp: model.peakHp, tank: model.tank,
    boomOptions: model.boomOptions, maxBoomFt: model.maxBoomFt, maxSpeedMph: model.maxSpeedMph, note: model.note,
  };
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, model.sourceUrl, externalId, `Case IH ${model.model} current US sprayer specifications`, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

async function put(connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null) {
  await connection.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const caseIHPatriotSprayersCurrentMigration: DbMigration = {
  id: '20260831_487_case_ih_patriot_sprayers_current',
  description: 'Add current Case IH US Patriot 3250, 4350 and 4450 self-propelled sprayers',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Sprayer','sprayer') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='sprayer' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    await connection.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Patriot 50 Series','patriot-50-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='patriot-50-series' LIMIT 1`, [manufacturerId, equipmentTypeId]);

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
      if (!value) throw new Error(`Missing Case IH Patriot sprayer spec definition ${key}`);
      return value;
    };

    for (const model of models) {
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current Case IH United States Patriot 50 Series self-propelled sprayer','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current US Patriot 50 Series sprayer specification',TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code=VALUES(market_code),market_name=VALUES(market_name),configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId, model.note],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      const values: Array<[string, string | number, string | null]> = [
        ['configuration.type', 'Self-propelled sprayer', null],
        ['configuration.market_scope', 'United States', null],
        ['engine.rated_power', model.ratedHp, 'hp'],
        ['engine.peak_power', model.peakHp, 'hp'],
        ['application.solution_tank_capacity', model.tank, typeof model.tank === 'number' ? 'gal' : null],
        ['application.boom_width_options', model.boomOptions, null],
        ['application.maximum_boom_width', model.maxBoomFt, 'ft'],
        ['travel.maximum_speed', model.maxSpeedMph, 'mph'],
      ];
      for (const [key, value, unit] of values) await put(connection, machineId, versionId, def(key), sourceRecordId, value, unit);
    }
  },
};
