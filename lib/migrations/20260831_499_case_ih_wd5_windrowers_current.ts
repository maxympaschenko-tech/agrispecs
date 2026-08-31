import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  powerHp: number;
  cylinders: number;
  fieldCruise: string;
  sourceUrl: string;
};

const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/windrowers/wd5-series-windrower';
const CATEGORY_URL = 'https://www.caseih.com/en-us/unitedstates/products/windrowers/';

const models: Seed[] = [
  {
    slug: 'wd1505',
    model: 'WD1505',
    powerHp: 150,
    cylinders: 4,
    fieldCruise: 'Not listed for the 4-cylinder WD1505 on the current WD5 Field Cruise description',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/windrowers/windrowers/wd1505',
  },
  {
    slug: 'wd2105',
    model: 'WD2105',
    powerHp: 210,
    cylinders: 6,
    fieldCruise: 'Field Cruise with ECO Power Mode, Power Cruise Mode, and Headland Feature on 6-cylinder WD5 machines equipped with Pro 700',
    sourceUrl: FAMILY_URL,
  },
  {
    slug: 'wd2505',
    model: 'WD2505',
    powerHp: 250,
    cylinders: 6,
    fieldCruise: 'Field Cruise with ECO Power Mode, Power Cruise Mode, and Headland Feature on 6-cylinder WD5 machines equipped with Pro 700',
    sourceUrl: FAMILY_URL,
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Engine', 'windrower.engine_power', 'Engine power', 'decimal', 'hp', 10],
  ['Engine', 'windrower.engine_cylinders', 'Engine cylinders', 'integer', null, 20],
  ['Engine', 'windrower.emissions', 'Emissions standard', 'text', null, 30],
  ['Windrower System', 'windrower.header_drive', 'Header drive', 'text', null, 10],
  ['Windrower System', 'windrower.ground_drive', 'Ground drive', 'text', null, 20],
  ['Windrower System', 'windrower.field_cruise', 'Field Cruise', 'text', null, 30],
  ['Windrower System', 'windrower.precision_display', 'Precision display', 'text', null, 40],
  ['Windrower System', 'windrower.triple_windrow_attachment', 'Triple Windrower Attachment', 'text', null, 50],
  ['Travel', 'windrower.maximum_cutting_speed', 'Maximum cutting speed', 'decimal', 'mph', 10],
  ['Travel', 'windrower.maximum_transport_speed', 'Maximum transport speed', 'decimal', 'mph', 20],
  ['Capacities', 'windrower.fuel_capacity', 'Fuel capacity', 'decimal', 'gal', 10],
  ['Capacities', 'windrower.def_capacity', 'DEF capacity', 'decimal', 'gal', 20],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH WD5 windrower migration dependency missing');
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
  const externalId = `case-ih-${model.slug}-windrower-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [
      sourceId,
      model.sourceUrl,
      externalId,
      `Case IH ${model.model} current United States windrower specifications`,
      JSON.stringify({
        captured: '2026-08-31',
        market: 'United States',
        equipmentType: 'Windrower',
        familySource: FAMILY_URL,
        categorySource: CATEGORY_URL,
        note: 'The current Case IH US WD5 page lists WD1505, WD2105, and WD2505 as available models. Common capacities, travel speeds and WD5 technology are stored only where explicitly described for the series.',
        ...model,
      }),
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

export const caseIHWd5WindrowersCurrentMigration: DbMigration = {
  id: '20260831_499_case_ih_wd5_windrowers_current',
  description: 'Add current Case IH US WD1505, WD2105 and WD2505 windrowers',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Windrower','windrower') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='windrower' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    await connection.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'WD5 Series','wd5-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='wd5-series' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        definition,
      );
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing windrower definition ${key}`);
      return value;
    };

    for (const model of models) {
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current Case IH United States WD5 windrower lineup','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);

      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current WD5 US specification',TRUE,?,'Current Case IH United States WD5 product/catalog data captured 2026-08-31.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Self-propelled windrower');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'United States current WD5 catalog');
      await put(connection, machineId, versionId, def('windrower.engine_power'), sourceRecordId, model.powerHp, 'hp');
      await put(connection, machineId, versionId, def('windrower.engine_cylinders'), sourceRecordId, model.cylinders);
      await put(connection, machineId, versionId, def('windrower.emissions'), sourceRecordId, 'Tier 4 B/Final');
      await put(connection, machineId, versionId, def('windrower.header_drive'), sourceRecordId, 'Hydraulic');
      await put(connection, machineId, versionId, def('windrower.ground_drive'), sourceRecordId, 'Hydrostatic ground drive');
      if (model.cylinders === 6) await put(connection, machineId, versionId, def('windrower.field_cruise'), sourceRecordId, model.fieldCruise);
      await put(connection, machineId, versionId, def('windrower.precision_display'), sourceRecordId, 'Pro 700 10-in color touchscreen display; auto-guidance ready');
      await put(connection, machineId, versionId, def('windrower.triple_windrow_attachment'), sourceRecordId, 'Triple Windrower Attachment available for WD5 windrowers');
      await put(connection, machineId, versionId, def('windrower.maximum_cutting_speed'), sourceRecordId, 20, 'mph');
      await put(connection, machineId, versionId, def('windrower.maximum_transport_speed'), sourceRecordId, 30, 'mph');
      await put(connection, machineId, versionId, def('windrower.fuel_capacity'), sourceRecordId, 120, 'gal');
      await put(connection, machineId, versionId, def('windrower.def_capacity'), sourceRecordId, 19, 'gal');
    }
  },
};
