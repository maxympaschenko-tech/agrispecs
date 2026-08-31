import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const VERSION = 'north-america-current-2026-08';
const URL = 'https://www.casece.com/en-us/northamerica/products/minotaur-dl550-compact-dozer-loader';

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'case.brand_context', 'Brand context', 'text', null, 3],
  ['Engine', 'compact_dozer_loader.engine_power', 'Published horsepower', 'decimal', 'hp', 10],
  ['Loader Performance', 'compact_dozer_loader.rated_operating_capacity', 'Rated operating capacity', 'decimal', 'lb', 10],
  ['Loader Performance', 'compact_dozer_loader.breakout_force', 'Published breakout force', 'text', null, 20],
  ['Loader Performance', 'compact_dozer_loader.drawbar_pull', 'Published drawbar pull', 'text', null, 30],
  ['Loader Performance', 'compact_dozer_loader.dozer_interface', 'Dozer interface', 'text', null, 40],
  ['Loader Performance', 'compact_dozer_loader.hydraulics', 'Auxiliary hydraulics', 'text', null, 50],
  ['Dimensions & Weight', 'compact_dozer_loader.operating_weight', 'Operating weight', 'decimal', 'lb', 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('CASE Minotaur DL550 migration dependency missing');
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
  const externalId = 'case-minotaur-dl550-na-current-2026-08';
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const rawReference = {
    captured: '2026-08-31', market: 'North America', equipmentType: 'Compact Dozer Loader', model: 'Minotaur DL550',
    horsepower: 114, operatingWeightLb: 18600, ratedOperatingCapacityLb: 5500,
    drawbarPull: 'More than 25,000 lb', breakoutForce: 'More than 12,000 lb',
    dozerInterface: 'Integrated C-frame dozer blade', hydraulics: 'Standard enhanced high-flow hydraulics',
    farmContext: 'CASE agriculture page lists Compact Dozer Loaders among agriculture equipment.',
  };
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, URL, externalId, 'CASE Minotaur DL550 current North America specifications', JSON.stringify(rawReference)],
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

export const caseMinotaurDl550CompactDozerLoaderCurrentMigration: DbMigration = {
  id: '20260831_545_case_minotaur_dl550_compact_dozer_loader_current',
  description: 'Add current CASE Minotaur DL550 compact dozer loader',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Compact Dozer Loader','compact-dozer-loader') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('CASE','case') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='compact-dozer-loader' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    const sourceRecordId = await sourceRecord(connection, sourceId);

    await connection.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'CASE Minotaur','case-minotaur') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='case-minotaur' LIMIT 1`, [manufacturerId, equipmentTypeId]);

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
      if (!value) throw new Error(`Missing CASE Minotaur DL550 definition ${key}`);
      return value;
    };

    await connection.query(
      `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
       VALUES(?,?,?,?,?,'Current CASE North America compact dozer loader; CASE agriculture page explicitly lists compact dozer loaders for agriculture','partial')
       ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
      [manufacturerId, equipmentTypeId, seriesId, 'Minotaur DL550', 'minotaur-dl550'],
    );
    const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug='minotaur-dl550' LIMIT 1`, [manufacturerId, equipmentTypeId]);
    await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
    await connection.query(
      `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
       VALUES(?,?,'NA','North America','Current CASE Minotaur DL550 compact dozer loader specification',TRUE,?,'Current CASE North America product page captured 2026-08-31. Greater-than force values are preserved as published text rather than converted into false exact numbers.')
       ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
      [machineId, VERSION, sourceRecordId],
    );
    const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
    await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Compact dozer loader');
    await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'North America current catalog');
    await put(connection, machineId, versionId, def('case.brand_context'), sourceRecordId, 'CASE Construction Equipment');
    await put(connection, machineId, versionId, def('compact_dozer_loader.engine_power'), sourceRecordId, 114, 'hp');
    await put(connection, machineId, versionId, def('compact_dozer_loader.rated_operating_capacity'), sourceRecordId, 5500, 'lb');
    await put(connection, machineId, versionId, def('compact_dozer_loader.breakout_force'), sourceRecordId, 'More than 12,000 lb');
    await put(connection, machineId, versionId, def('compact_dozer_loader.drawbar_pull'), sourceRecordId, 'More than 25,000 lb');
    await put(connection, machineId, versionId, def('compact_dozer_loader.dozer_interface'), sourceRecordId, 'Integrated C-frame dozer blade');
    await put(connection, machineId, versionId, def('compact_dozer_loader.hydraulics'), sourceRecordId, 'Standard enhanced high-flow hydraulics');
    await put(connection, machineId, versionId, def('compact_dozer_loader.operating_weight'), sourceRecordId, 18600, 'lb');
  },
};
