import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  family: 'Precision Disk' | 'Flex Hoe';
  sourceUrl: string;
  workingWidth: string;
  rowSpacing: string;
  configuration: string;
  operatingSpeed?: string;
  transportHeight?: string;
  transportWidth?: string;
  roadClearance?: string;
  emptyWeight?: string;
  tankCapacity?: string;
  opener?: string;
  packing?: string;
};

const VERSION = 'united-states-current-2026-08';
const PRECISION_FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/precision-disk-air-drills';
const FLEX_FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/flex-hoe-air-drills';
const models: Seed[] = [
  {
    slug: 'precision-disk-500ds', model: 'Precision Disk 500DS', family: 'Precision Disk',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/precision-disk-air-drills/500ds',
    workingWidth: '30-60 ft', rowSpacing: '10 in', configuration: 'Double-shoot air drill; tow-between or tow-behind air cart application',
    transportHeight: '13.1-14.9 ft', transportWidth: '12-18.8 ft', roadClearance: '8.5 in', emptyWeight: '21,200-25,000 lb',
    opener: 'Parallel-link disk row unit with Precision Placement Knife for simultaneous seed and fertilizer placement',
  },
  {
    slug: 'precision-disk-550', model: 'Precision Disk 550', family: 'Precision Disk',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/precision-disk-air-drills/550',
    workingWidth: '30, 40, 50 or 60 ft', rowSpacing: '7.5 or 10 in; front/rear rank lock can provide 15 or 20 in', configuration: 'Tow-behind or tow-between Precision Air cart configuration',
    transportHeight: '13 ft 1 in-13 ft 10 in', transportWidth: '12 ft 5 in-18 ft 8 in', emptyWeight: '17,790-28,360 lb',
    opener: 'Parallel-link Precision Disk row unit; Furrow Command available',
  },
  {
    slug: 'precision-disk-550t', model: 'Precision Disk 550T', family: 'Precision Disk',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/precision-disk-air-drills/550t',
    workingWidth: '30 or 40 ft', rowSpacing: '7.5, 10 or 15 in; rank lock can provide 15 or 20 in', configuration: 'Mounted seed-tank air drill',
    transportHeight: '13 ft 1 in-13 ft 10 in', transportWidth: '12 ft 5 in-18 ft 8 in', roadClearance: '8.5 in', emptyWeight: '17,790-28,360 lb',
    tankCapacity: '110 bu on 30-ft model; 140 bu on 40-ft model', opener: 'Parallel-link Precision Disk row unit; Furrow Command available',
  },
  {
    slug: 'flex-hoe-400', model: 'Flex Hoe 400', family: 'Flex Hoe', sourceUrl: FLEX_FAMILY_URL,
    workingWidth: 'Five base sizes from 27 to 57 ft', rowSpacing: 'Configuration-dependent', configuration: 'Flexible folding-frame air hoe drill',
    opener: 'Parallel-link or spring-shank opener options',
  },
  {
    slug: 'flex-hoe-700', model: 'Flex Hoe 700', family: 'Flex Hoe', sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/flex-hoe-air-drills/700',
    workingWidth: '60, 70 or 80 ft', rowSpacing: '7.5, 10 or 12 in', configuration: 'Flexible folding-frame air hoe drill',
    operatingSpeed: '4-6 mph', transportHeight: '13.6 ft', transportWidth: '17.8 ft', opener: 'Parallel-link or spring-shank opener options',
    packing: 'In-line gang packing; optional walking-gang system',
  },
  {
    slug: 'flex-hoe-900', model: 'Flex Hoe 900', family: 'Flex Hoe', sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/flex-hoe-air-drills/900',
    workingWidth: '50, 60, 70 or 80 ft', rowSpacing: '10 or 12 in', configuration: 'Flexible folding-frame air hoe drill',
    operatingSpeed: '4-5 mph', transportHeight: '16.6 ft', transportWidth: '18.4 ft', opener: 'Parallel-link or spring-shank opener options',
    packing: 'Parallel-link packing system',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'air_drill.family', 'Air drill family', 'text', null, 20],
  ['Machine Configuration', 'air_drill.configuration', 'Drill configuration', 'text', null, 30],
  ['Seeding System', 'air_drill.working_width', 'Working / toolbar width', 'text', null, 10],
  ['Seeding System', 'air_drill.row_spacing', 'Row / shank spacing', 'text', null, 20],
  ['Seeding System', 'air_drill.opener', 'Opener / row unit', 'text', null, 30],
  ['Seeding System', 'air_drill.packing', 'Packing system', 'text', null, 40],
  ['Travel', 'air_drill.operating_speed', 'Operating speed', 'text', null, 10],
  ['Dimensions & Transport', 'air_drill.transport_height', 'Transport height', 'text', null, 10],
  ['Dimensions & Transport', 'air_drill.transport_width', 'Transport width', 'text', null, 20],
  ['Dimensions & Transport', 'air_drill.road_clearance', 'Road-to-opener clearance', 'text', null, 30],
  ['Dimensions & Weight', 'air_drill.empty_weight', 'Empty weight', 'text', null, 10],
  ['Capacities', 'air_drill.seed_tank_capacity', 'Mounted seed tank capacity', 'text', null, 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH air drill migration dependency missing');
  return Number(rows[0].id);
}
async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`);
  return Number(result.insertId);
}
async function record(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `case-ih-${model.slug}-air-drill-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId, model.sourceUrl, externalId, `Case IH ${model.model} current US air drill specifications`, JSON.stringify({ captured: '2026-08-31', market: 'United States', equipmentType: 'Air Drill', precisionFamilySource: PRECISION_FAMILY_URL, flexFamilySource: FLEX_FAMILY_URL, ...model })]);
  return Number(result.insertId);
}
async function put(connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null = null) {
  await connection.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId]);
}

export const caseIhAirDrillsCurrentMigration: DbMigration = {
  id: '20260831_512_case_ih_air_drills_current',
  description: 'Add current Case IH US Precision Disk and Flex Hoe air drill lineups',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Air Drill','air-drill') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='air-drill' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    for (const series of [{ name: 'Precision Disk Air Drills', slug: 'precision-disk-air-drills' }, { name: 'Flex Hoe Air Drills', slug: 'flex-hoe-air-drills' }]) {
      await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId, series.name, series.slug]);
    }
    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => { const value = definitionIds.get(key); if (!value) throw new Error(`Missing air drill definition ${key}`); return value; };
    for (const model of models) {
      const seriesSlug = model.family === 'Precision Disk' ? 'precision-disk-air-drills' : 'flex-hoe-air-drills';
      const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, seriesSlug]);
      const sourceRecordId = await record(connection, sourceId, model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Case IH United States air drill lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,'Current Case IH US product-page data captured 2026-08-31. Configuration ranges remain textual where the manufacturer publishes multiple widths or spacing options under one model.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`, [machineId, VERSION, model.configuration, sourceRecordId]);
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Air drill');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'Case IH United States current catalog');
      await put(connection, machineId, versionId, def('air_drill.family'), sourceRecordId, model.family);
      await put(connection, machineId, versionId, def('air_drill.configuration'), sourceRecordId, model.configuration);
      await put(connection, machineId, versionId, def('air_drill.working_width'), sourceRecordId, model.workingWidth);
      await put(connection, machineId, versionId, def('air_drill.row_spacing'), sourceRecordId, model.rowSpacing);
      if (model.opener) await put(connection, machineId, versionId, def('air_drill.opener'), sourceRecordId, model.opener);
      if (model.packing) await put(connection, machineId, versionId, def('air_drill.packing'), sourceRecordId, model.packing);
      if (model.operatingSpeed) await put(connection, machineId, versionId, def('air_drill.operating_speed'), sourceRecordId, model.operatingSpeed);
      if (model.transportHeight) await put(connection, machineId, versionId, def('air_drill.transport_height'), sourceRecordId, model.transportHeight);
      if (model.transportWidth) await put(connection, machineId, versionId, def('air_drill.transport_width'), sourceRecordId, model.transportWidth);
      if (model.roadClearance) await put(connection, machineId, versionId, def('air_drill.road_clearance'), sourceRecordId, model.roadClearance);
      if (model.emptyWeight) await put(connection, machineId, versionId, def('air_drill.empty_weight'), sourceRecordId, model.emptyWeight);
      if (model.tankCapacity) await put(connection, machineId, versionId, def('air_drill.seed_tank_capacity'), sourceRecordId, model.tankCapacity);
    }
  },
};
