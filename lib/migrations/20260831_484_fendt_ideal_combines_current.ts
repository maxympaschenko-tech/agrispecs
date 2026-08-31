import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  publishedHp: number;
  engineDescription: string;
  processor: string;
  rotorCount: number;
  concaveSqIn: number;
  separationSqIn: number;
};

const SOURCE_URL = 'https://www.fendt.com/us/products/combines/fendt-ideal';
const VERSION = 'united-states-current-2026-08';
const models: Seed[] = [
  {
    slug: 'ideal-7', model: 'IDEAL 7', publishedHp: 476,
    engineDescription: '9.8-liter AGCO Power engine; Tier 4F',
    processor: 'Single Helix', rotorCount: 1, concaveSqIn: 1287, separationSqIn: 2232,
  },
  {
    slug: 'ideal-8', model: 'IDEAL 8', publishedHp: 541,
    engineDescription: 'MAN engine; Tier 4F',
    processor: 'Dual Helix', rotorCount: 2, concaveSqIn: 2573, separationSqIn: 4464,
  },
  {
    slug: 'ideal-9', model: 'IDEAL 9', publishedHp: 650,
    engineDescription: 'MAN engine; Tier 4F',
    processor: 'Dual Helix', rotorCount: 2, concaveSqIn: 2573, separationSqIn: 4464,
  },
  {
    slug: 'ideal-10', model: 'IDEAL 10', publishedHp: 779,
    engineDescription: 'MAN engine; Tier 4F',
    processor: 'Dual Helix', rotorCount: 2, concaveSqIn: 2573, separationSqIn: 4464,
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Engine', 'engine.published_power', 'Published engine power', 'decimal', 'hp', 10],
  ['Engine', 'engine.description', 'Engine description', 'text', null, 20],
  ['Engine', 'engine.emissions', 'Emissions', 'text', null, 50],
  ['Feeding', 'feeding.rotorfeeder_diameter', 'RotorFeeder diameter', 'decimal', 'in', 10],
  ['Threshing & Separating', 'threshing.processor_type', 'Processor type', 'text', null, 5],
  ['Threshing & Separating', 'threshing.rotor_count', 'Rotor count', 'integer', null, 10],
  ['Threshing & Separating', 'threshing.concave_area_sq_in', 'Threshing concave area', 'decimal', 'sq in', 20],
  ['Threshing & Separating', 'threshing.separation_area_sq_in', 'Separation area', 'decimal', 'sq in', 30],
  ['Cleaning', 'cleaning.system', 'Cleaning system', 'text', null, 10],
  ['Cleaning', 'cleaning.fan_speed_range', 'Cleaning fan speed range', 'text', null, 20],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Fendt IDEAL combine migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Fendt' AND domain='fendt.com' LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Fendt','fendt.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `fendt-${model.slug}-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const rawReference = {
    captured: '2026-08-31',
    market: 'United States',
    equipmentType: 'Combine',
    model: model.model,
    publishedHp: model.publishedHp,
    engineDescription: model.engineDescription,
    processor: model.processor,
    rotorCount: model.rotorCount,
    concaveSqIn: model.concaveSqIn,
    separationSqIn: model.separationSqIn,
    common: {
      rotorFeederDiameterIn: 23.625,
      cleaningSystem: 'CyclonePlus',
      cleaningFanSpeed: '150-1350 rpm',
    },
    sourcePolicy: 'Values are stored only where the current Fendt US IDEAL page explicitly exposes them. Published horsepower is kept under a neutral published-power label because the page model overview does not label it as rated or peak power.',
  };
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, SOURCE_URL, externalId, `Fendt ${model.model} current US combine specifications`, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

async function put(
  connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number,
  definitionId: number, sourceRecordId: number, value: string | number, unit: string | null,
) {
  await connection.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const fendtIdealCombinesCurrentMigration: DbMigration = {
  id: '20260831_484_fendt_ideal_combines_current',
  description: 'Add current Fendt US IDEAL 7, 8, 9 and 10 combines from the official IDEAL product page',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Combine','combine') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('Fendt','fendt') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='fendt' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='combine' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    await connection.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'IDEAL','ideal')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='ideal' LIMIT 1`, [manufacturerId, equipmentTypeId]);

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
      if (!value) throw new Error(`Missing Fendt IDEAL spec definition ${key}`);
      return value;
    };

    for (const model of models) {
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current Fendt United States IDEAL combine lineup','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current US IDEAL combine specification',TRUE,?,'Current Fendt US IDEAL product data captured 2026-08-31. Unlabeled model-overview horsepower is stored as published engine power, not inferred as rated or peak power.')
         ON DUPLICATE KEY UPDATE market_code=VALUES(market_code),market_name=VALUES(market_name),configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      const values: Array<[string, string | number, string | null]> = [
        ['configuration.type', 'Combine harvester', null],
        ['configuration.market_scope', 'United States', null],
        ['engine.published_power', model.publishedHp, 'hp'],
        ['engine.description', model.engineDescription, null],
        ['engine.emissions', 'Tier 4F', null],
        ['feeding.rotorfeeder_diameter', 23.625, 'in'],
        ['threshing.processor_type', model.processor, null],
        ['threshing.rotor_count', model.rotorCount, null],
        ['threshing.concave_area_sq_in', model.concaveSqIn, 'sq in'],
        ['threshing.separation_area_sq_in', model.separationSqIn, 'sq in'],
        ['cleaning.system', 'CyclonePlus', null],
        ['cleaning.fan_speed_range', '150-1350 rpm', null],
      ];
      for (const [key, value, unit] of values) {
        await put(connection, machineId, versionId, def(key), sourceRecordId, value, unit);
      }
    }
  },
};
