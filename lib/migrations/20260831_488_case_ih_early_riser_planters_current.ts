import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  sourceUrl: string;
  frameType: string;
  rowOptions: string;
  spacingOptions: string;
  frameSize?: string;
  workingWidth?: string;
  sections?: string;
  seedCapacity?: string;
  liquidCapacityGal?: number;
  hopperCapacity?: string;
  tractorPower?: string;
  carrier?: string;
  maxPlantingSpeedMph?: number;
  note: string;
};

const VERSION = 'united-states-current-2026-08';
const models: Seed[] = [
  {
    slug: 'early-riser-2110', model: 'Early Riser 2110',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/2000-series-early-riser-planter/2110-rigid-mounted',
    frameType: 'Rigid mounted', rowOptions: '6, 8, 11, or 15 rows', spacingOptions: '15, 30, 36, 38, or 40 in',
    frameSize: '7 x 7 in', hopperCapacity: '1.9 or 3.0 bu on-row hopper',
    note: 'Current Case IH US Early Riser 2110 product page captured 2026-08-31.',
  },
  {
    slug: 'early-riser-2120', model: 'Early Riser 2120',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/2000-series-early-riser-planter/2120-rigid-trailing',
    frameType: 'Rigid trailing', rowOptions: '6, 8, or 11 rows', spacingOptions: '15 or 30 in',
    frameSize: '7 x 7 in', hopperCapacity: '1.9 or 3.0 bu on-row hopper',
    note: 'Current Case IH US Early Riser 2120 product page captured 2026-08-31.',
  },
  {
    slug: 'early-riser-2130', model: 'Early Riser 2130',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/2000-series-early-riser-planter/2130-stack-fold-planter',
    frameType: 'Mounted stack-fold', rowOptions: '12, 16, or 18 rows', spacingOptions: '30, 36, 38, or 40 in',
    frameSize: '7 x 7 in', sections: '3', maxPlantingSpeedMph: 10,
    note: 'Current Case IH US Early Riser 2130 product page captured 2026-08-31.',
  },
  {
    slug: 'early-riser-2140', model: 'Early Riser 2140',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/2000-series-early-riser-planter/2140-pivot-transport',
    frameType: 'Pivot-transport', rowOptions: '23, 24, 31, or 32 rows', spacingOptions: '15, 20, or 22 in',
    frameSize: '8 x 8 in', sections: '3', tractorPower: '250-380 engine hp depending planter size and desired speed', carrier: 'Wheeled or track carrier',
    note: 'Current Case IH US Early Riser 2140 product page captured 2026-08-31.',
  },
  {
    slug: 'early-riser-2150', model: 'Early Riser 2150',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/2000-series-early-riser-planter/2150-front-fold-trailing',
    frameType: 'Front-fold trailing', rowOptions: '12, 16, or 24 rows', spacingOptions: '30 in', workingWidth: '30-60 ft',
    seedCapacity: 'Up to 120 bu bulk seed capacity', liquidCapacityGal: 600,
    note: 'Current Case IH US Early Riser 2150 product page captured 2026-08-31. Capacity values are stored as published maximum/available values rather than implying every configuration includes them.',
  },
  {
    slug: 'early-riser-2150s', model: 'Early Riser 2150S',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/2000-series-early-riser-planter/2150s-front-fold-trailing',
    frameType: 'Front-fold trailing', rowOptions: '23, 24, 31, or 32 rows', spacingOptions: '15 or 20 in', workingWidth: '30-40 ft', sections: '3',
    seedCapacity: '100 bu bulk seed capacity', liquidCapacityGal: 525,
    note: 'Current Case IH US Early Riser 2150S product page captured 2026-08-31.',
  },
  {
    slug: 'early-riser-2160', model: 'Early Riser 2160',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/2000-series-early-riser-planter/2160-large-front-fold-trailing',
    frameType: 'Large front-fold trailing', rowOptions: '24, 32, 36, 47, or 48 rows', spacingOptions: '15, 20, 22, or 30 in', workingWidth: '44-90 ft',
    sections: '3 or 5', seedCapacity: '120 bu bulk seed capacity', liquidCapacityGal: 600, tractorPower: '380 hp minimum or more depending size, desired speed, and terrain', carrier: 'Wheeled or tracked configurations',
    note: 'Current Case IH US Early Riser 2160 product page captured 2026-08-31.',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Planting System', 'planting.frame_type', 'Frame type', 'text', null, 5],
  ['Planting System', 'planting.row_options', 'Row options', 'text', null, 10],
  ['Planting System', 'planting.row_spacing_options', 'Row spacing options', 'text', null, 15],
  ['Planting System', 'planting.frame_size', 'Frame size', 'text', null, 20],
  ['Planting System', 'planting.working_width', 'Working width', 'text', null, 25],
  ['Planting System', 'planting.sections', 'Frame sections', 'text', null, 30],
  ['Planting System', 'planting.seed_capacity', 'Seed capacity', 'text', null, 35],
  ['Planting System', 'planting.on_row_hopper_capacity', 'On-row hopper capacity', 'text', null, 40],
  ['Planting System', 'planting.liquid_fertilizer_capacity', 'Liquid fertilizer capacity', 'decimal', 'gal', 45],
  ['Planting System', 'planting.recommended_tractor_power', 'Recommended tractor power', 'text', null, 50],
  ['Planting System', 'planting.carrier', 'Carrier configuration', 'text', null, 55],
  ['Travel', 'travel.maximum_operating_speed', 'Maximum planting speed', 'decimal', 'mph', 20],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH Early Riser planter migration dependency missing');
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
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, model.sourceUrl, externalId, `Case IH ${model.model} current US planter specifications`, JSON.stringify({ captured: '2026-08-31', market: 'United States', equipmentType: 'Planter', ...model })],
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

export const caseIHEarlyRiserPlantersCurrentMigration: DbMigration = {
  id: '20260831_488_case_ih_early_riser_planters_current',
  description: 'Add current Case IH US 2000 Series Early Riser planter lineup',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Planter','planter') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='planter' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    await connection.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'2000 Series Early Riser','2000-series-early-riser') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='2000-series-early-riser' LIMIT 1`, [manufacturerId, equipmentTypeId]);

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
      if (!value) throw new Error(`Missing Case IH planter spec definition ${key}`);
      return value;
    };

    for (const model of models) {
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current Case IH United States 2000 Series Early Riser planter','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current US Early Riser planter configuration',TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code=VALUES(market_code),market_name=VALUES(market_name),configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId, model.note],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      const values: Array<[string, string | number, string | null]> = [
        ['configuration.type', 'Planter', null],
        ['configuration.market_scope', 'United States', null],
        ['planting.frame_type', model.frameType, null],
        ['planting.row_options', model.rowOptions, null],
        ['planting.row_spacing_options', model.spacingOptions, null],
      ];
      if (model.frameSize) values.push(['planting.frame_size', model.frameSize, null]);
      if (model.workingWidth) values.push(['planting.working_width', model.workingWidth, null]);
      if (model.sections) values.push(['planting.sections', model.sections, null]);
      if (model.seedCapacity) values.push(['planting.seed_capacity', model.seedCapacity, null]);
      if (model.hopperCapacity) values.push(['planting.on_row_hopper_capacity', model.hopperCapacity, null]);
      if (model.liquidCapacityGal !== undefined) values.push(['planting.liquid_fertilizer_capacity', model.liquidCapacityGal, 'gal']);
      if (model.tractorPower) values.push(['planting.recommended_tractor_power', model.tractorPower, null]);
      if (model.carrier) values.push(['planting.carrier', model.carrier, null]);
      if (model.maxPlantingSpeedMph !== undefined) values.push(['travel.maximum_operating_speed', model.maxPlantingSpeedMph, 'mph']);
      for (const [key, value, unit] of values) await put(connection, machineId, versionId, def(key), sourceRecordId, value, unit);
    }
  },
};
