import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  ratedHp: number;
  ratedKw: number;
  cylinders: number;
  headerCompatibility: string;
};

const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://agriculture.newholland.com/en-us/nar/products/haytools-spreaders/speedrower-plus-sp-windrowers';
const HEADERS_URL = 'https://agriculture.newholland.com/en-us/nar/products/haytools-spreaders/windrower-headers';
const TRANSITION_URL = 'https://agriculture.newholland.com/en-us/nar/new-holland-world/news/2026/help-hay-and-forage-growers-maximize-their-harvest';

const models: Seed[] = [
  {
    slug: 'speedrower-160-plus',
    model: 'Speedrower 160 PLUS',
    ratedHp: 150,
    ratedKw: 112,
    cylinders: 4,
    headerCompatibility: 'Durabine PLUS disc headers and Haybine HS sickle headers within the published Speedrower PLUS compatibility range',
  },
  {
    slug: 'speedrower-220-plus',
    model: 'Speedrower 220 PLUS',
    ratedHp: 210,
    ratedKw: 156,
    cylinders: 6,
    headerCompatibility: 'Durabine PLUS and Haybine HS headers; Honey Bee WSC30 and WSC36 swather headers are specifically listed for Speedrower 220 PLUS and 260 PLUS',
  },
  {
    slug: 'speedrower-260-plus',
    model: 'Speedrower 260 PLUS',
    ratedHp: 250,
    ratedKw: 186,
    cylinders: 6,
    headerCompatibility: 'Durabine PLUS and Haybine HS headers; Honey Bee WSC30 and WSC36 swather headers are specifically listed for Speedrower 220 PLUS and 260 PLUS',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Engine', 'windrower.engine_power', 'Engine power', 'decimal', 'hp', 10],
  ['Engine', 'windrower.engine_power_kw', 'Engine power', 'decimal', 'kW', 11],
  ['Engine', 'windrower.engine_cylinders', 'Engine cylinders', 'integer', null, 20],
  ['Engine', 'windrower.emissions', 'Emissions standard', 'text', null, 30],
  ['Windrower System', 'windrower.ground_drive', 'Ground drive', 'text', null, 20],
  ['Windrower System', 'windrower.precision_system', 'Precision and automation', 'text', null, 30],
  ['Windrower System', 'windrower.header_compatibility', 'Header compatibility', 'text', null, 40],
  ['Windrower System', 'windrower.merger_attachment', 'Merger attachment', 'text', null, 50],
  ['Travel', 'windrower.maximum_cutting_speed', 'Maximum cutting speed', 'decimal', 'mph', 10],
  ['Travel', 'windrower.maximum_transport_speed', 'Maximum transport speed', 'decimal', 'mph', 20],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('New Holland Speedrower PLUS migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland','agriculture.newholland.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `new-holland-${model.slug}-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [
      sourceId,
      FAMILY_URL,
      externalId,
      `New Holland ${model.model} current North America windrower data`,
      JSON.stringify({
        captured: '2026-08-31',
        market: 'United States / North America',
        equipmentType: 'Windrower',
        headersSource: HEADERS_URL,
        transitionAnnouncement: TRANSITION_URL,
        note: 'Speedrower PLUS remains on the active New Holland North America product page and Build & Price flow on 2026-08-31. The announced Speedrower 1 Series is separately documented as orderable with deliveries expected to begin in late 2026, so this migration does not silently replace the still-current PLUS machines with the announced successor lineup.',
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

export const newHollandSpeedrowerPlusCurrentMigration: DbMigration = {
  id: '20260831_500_new_holland_speedrower_plus_current',
  description: 'Add current New Holland North America Speedrower PLUS windrowers',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Windrower','windrower') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='windrower' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    await connection.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Speedrower PLUS','speedrower-plus') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='speedrower-plus' LIMIT 1`, [manufacturerId, equipmentTypeId]);

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
      if (!value) throw new Error(`Missing New Holland windrower definition ${key}`);
      return value;
    };

    for (const model of models) {
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Active New Holland North America Speedrower PLUS product line on 2026-08-31; successor 1 Series announced with late-2026 deliveries','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);

      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'NA','North America','Active Speedrower PLUS North America specification',TRUE,?,'Active New Holland North America product data captured 2026-08-31. Speedrower 1 Series is announced/orderable but deliveries are expected to begin in late 2026.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Self-propelled windrower');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'New Holland North America current product line');
      await put(connection, machineId, versionId, def('windrower.engine_power'), sourceRecordId, model.ratedHp, 'hp');
      await put(connection, machineId, versionId, def('windrower.engine_power_kw'), sourceRecordId, model.ratedKw, 'kW');
      await put(connection, machineId, versionId, def('windrower.engine_cylinders'), sourceRecordId, model.cylinders);
      await put(connection, machineId, versionId, def('windrower.emissions'), sourceRecordId, 'FPT ECOBlue Hi-eSCR, Tier 4B');
      await put(connection, machineId, versionId, def('windrower.ground_drive'), sourceRecordId, 'SensiDrive drive-by-wire ground drive system');
      await put(connection, machineId, versionId, def('windrower.precision_system'), sourceRecordId, 'IntelliSteer Auto Guidance and Headland Management capability');
      await put(connection, machineId, versionId, def('windrower.header_compatibility'), sourceRecordId, model.headerCompatibility);
      await put(connection, machineId, versionId, def('windrower.merger_attachment'), sourceRecordId, 'DuraMerger 419 PLUS merger attachment available');
      await put(connection, machineId, versionId, def('windrower.maximum_cutting_speed'), sourceRecordId, 20, 'mph');
      await put(connection, machineId, versionId, def('windrower.maximum_transport_speed'), sourceRecordId, 30, 'mph');
    }
  },
};
