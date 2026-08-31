import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type CombineSeed = {
  slug: string;
  model: string;
  series: 'S7' | 'X9';
  sourceUrl: string;
  ratedHp: number;
  maxHp: number;
  engineModel: string;
  displacementL: number;
  ratedRpm: number;
  fuelGal: number;
  grainTankBu: number;
  unloadingBuSec: number;
  feederWidthIn: number;
  feederLengthIn?: number;
  feederDrive: string;
  separatorType: string;
  rotorLengthIn: number;
  rotorDiameterIn: number;
  rotorSpeed: string;
  concaveSqFt: number;
  separatingSqFt: number;
  cleaningSqFt: number;
  baseWeightLb?: number;
  frontAxleWeightLb?: number;
  sourceNote: string;
};

const CURRENT_LINEUP_URL = 'https://www.deere.com/en-us/products-solutions/harvesting';
const S7_BROCHURE_URL = 'https://www.deere.com/assets/pdfs/region-4/products/harvesting/s-series-combines/4592208-s-series-combines.pdf';
const X9_BROCHURE_URL = 'https://www.deere.com/assets/pdfs/region-4/products/harvesting/x-series-combines/4592750-x-series-combines.pdf';
const VERSION_SLUG = 'united-states-current-2026-08';

const models: CombineSeed[] = [
  {
    slug: 's7-600', model: 'S7 600', series: 'S7',
    sourceUrl: 'https://www.deere.com/en-us/products-solutions/harvesting/combines/s7-600-combine-mzi3qkg',
    ratedHp: 333, maxHp: 382, engineModel: 'John Deere JD9 9.0 L', displacementL: 9.0, ratedRpm: 2200,
    fuelGal: 250, grainTankBu: 300, unloadingBuSec: 3.6,
    feederWidthIn: 55, feederLengthIn: 67.9, feederDrive: 'Fixed or variable', separatorType: 'Rotary',
    rotorLengthIn: 123, rotorDiameterIn: 30, rotorSpeed: '210-550 rpm low range; 400-1000 rpm high range',
    concaveSqFt: 11.8, separatingSqFt: 16.6, cleaningSqFt: 54.9,
    baseWeightLb: 43006, frontAxleWeightLb: 21737,
    sourceNote: 'Current John Deere US S7 600 product page captured 2026-08-31. Product-page values are primary where they differ from older brochure values.',
  },
  {
    slug: 's7-700', model: 'S7 700', series: 'S7', sourceUrl: S7_BROCHURE_URL,
    ratedHp: 402, maxHp: 460, engineModel: 'John Deere JD9 9.0 L', displacementL: 9.0, ratedRpm: 2200,
    fuelGal: 250, grainTankBu: 300, unloadingBuSec: 4.2,
    feederWidthIn: 55, feederLengthIn: 67.9, feederDrive: 'Fixed, variable, or multi-speed', separatorType: 'Rotary',
    rotorLengthIn: 123, rotorDiameterIn: 30, rotorSpeed: '210-530 rpm low range; 400-1000 rpm high range',
    concaveSqFt: 11.8, separatingSqFt: 16.6, cleaningSqFt: 54.9,
    baseWeightLb: 43752, frontAxleWeightLb: 22857,
    sourceNote: 'Technical values from the official John Deere S7 Series specification brochure. The S7 family is independently confirmed in the current John Deere US harvesting catalog captured 2026-08-31.',
  },
  {
    slug: 's7-800', model: 'S7 800', series: 'S7',
    sourceUrl: 'https://www-cm-us.deere.com/en-us/products-solutions/harvesting/combines/s7-800-combine-mzi5qkg',
    ratedHp: 473, maxHp: 540, engineModel: 'John Deere JD14 13.6 L', displacementL: 13.6, ratedRpm: 2000,
    fuelGal: 330, grainTankBu: 400, unloadingBuSec: 4.2,
    feederWidthIn: 55, feederLengthIn: 67.9, feederDrive: 'Fixed or multi-speed', separatorType: 'Rotary',
    rotorLengthIn: 123, rotorDiameterIn: 30, rotorSpeed: '620-1350 rpm cleaning fan; rotor specification is source-backed separately on the product page/brochure',
    concaveSqFt: 11.8, separatingSqFt: 21.4, cleaningSqFt: 54.9,
    baseWeightLb: 49141, frontAxleWeightLb: 24511,
    sourceNote: 'Current John Deere US S7 800 product page captured 2026-08-31. Product-page values are primary where the older S7 brochure exposes configuration-dependent alternatives.',
  },
  {
    slug: 's7-900', model: 'S7 900', series: 'S7', sourceUrl: S7_BROCHURE_URL,
    ratedHp: 543, maxHp: 617, engineModel: 'John Deere JD14 13.6 L', displacementL: 13.6, ratedRpm: 2000,
    fuelGal: 330, grainTankBu: 400, unloadingBuSec: 4.2,
    feederWidthIn: 55, feederLengthIn: 67.9, feederDrive: 'Fixed or multi-speed', separatorType: 'Rotary',
    rotorLengthIn: 123, rotorDiameterIn: 30, rotorSpeed: '210-530 rpm low range; 400-1000 rpm high range',
    concaveSqFt: 11.8, separatingSqFt: 16.6, cleaningSqFt: 54.9,
    baseWeightLb: 49141, frontAxleWeightLb: 24511,
    sourceNote: 'Technical values from the official John Deere S7 Series specification brochure. The S7 family is independently confirmed in the current John Deere US harvesting catalog captured 2026-08-31.',
  },
  {
    slug: 'x9-1000', model: 'X9 1000', series: 'X9', sourceUrl: X9_BROCHURE_URL,
    ratedHp: 549, maxHp: 630, engineModel: 'John Deere JD14 13.6 L', displacementL: 13.6, ratedRpm: 1900,
    fuelGal: 330, grainTankBu: 420, unloadingBuSec: 4.6,
    feederWidthIn: 67.7, feederDrive: 'Fixed or variable', separatorType: 'Dual rotor',
    rotorLengthIn: 138.2, rotorDiameterIn: 24, rotorSpeed: '300-1300 rpm',
    concaveSqFt: 17.22, separatingSqFt: 38.75, cleaningSqFt: 75.02,
    sourceNote: 'Technical values from the official John Deere X Series specification brochure. X9 is confirmed in the current John Deere US harvesting catalog captured 2026-08-31.',
  },
  {
    slug: 'x9-1100', model: 'X9 1100', series: 'X9', sourceUrl: X9_BROCHURE_URL,
    ratedHp: 603, maxHp: 690, engineModel: 'John Deere JD14 13.6 L', displacementL: 13.6, ratedRpm: 1900,
    fuelGal: 330, grainTankBu: 460, unloadingBuSec: 5.3,
    feederWidthIn: 67.7, feederDrive: 'Fixed or variable', separatorType: 'Dual rotor',
    rotorLengthIn: 138.2, rotorDiameterIn: 24, rotorSpeed: '300-1300 rpm',
    concaveSqFt: 17.22, separatingSqFt: 38.75, cleaningSqFt: 75.02,
    sourceNote: 'Technical values from the official John Deere X Series specification brochure. John Deere technical publications also list current North American X9 1100 serial-range documentation.',
  },
];

const definitions: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Engine', 'engine.model', 'Engine model', 'text', null, 5],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 10],
  ['Engine', 'engine.rated_speed', 'Rated engine speed', 'integer', 'rpm', 15],
  ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 20],
  ['Engine', 'engine.maximum_power', 'Maximum engine power', 'decimal', 'hp', 25],
  ['Feeding', 'feeding.drive_type', 'Feeder drive type', 'text', null, 10],
  ['Feeding', 'feeding.width', 'Feeder width', 'decimal', 'in', 20],
  ['Feeding', 'feeding.length', 'Feeder length', 'decimal', 'in', 30],
  ['Threshing & Separating', 'threshing.separator_type', 'Separator type', 'text', null, 10],
  ['Threshing & Separating', 'threshing.rotor_length', 'Rotor length', 'decimal', 'in', 20],
  ['Threshing & Separating', 'threshing.rotor_diameter', 'Rotor diameter', 'decimal', 'in', 30],
  ['Threshing & Separating', 'threshing.rotor_speed_range', 'Rotor speed range', 'text', null, 40],
  ['Threshing & Separating', 'threshing.concave_area', 'Concave area', 'decimal', 'sq ft', 50],
  ['Threshing & Separating', 'threshing.separating_area', 'Separating area', 'decimal', 'sq ft', 60],
  ['Cleaning', 'cleaning.total_louvered_area', 'Total cleaning area (louvered)', 'decimal', 'sq ft', 10],
  ['Grain Handling', 'grain.grain_tank_capacity', 'Grain tank capacity', 'decimal', 'bu', 10],
  ['Grain Handling', 'grain.peak_unloading_rate', 'Peak unloading rate', 'decimal', 'bu/sec', 20],
  ['Capacities', 'capacities.fuel_tank', 'Fuel tank capacity', 'decimal', 'gal', 10],
  ['Dimensions & Weight', 'dimensions.base_machine_weight', 'Base machine weight', 'decimal', 'lb', 10],
  ['Dimensions & Weight', 'dimensions.front_axle_weight', 'Front axle weight', 'decimal', 'lb', 20],
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected John Deere combine migration dependency was not found.');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function ensureSourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: CombineSeed) {
  const externalId = `john-deere-${model.slug}-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const rawReference = {
    captured: '2026-08-31',
    market: 'United States / North America',
    equipmentType: 'Combine',
    model: model.model,
    currentLineupSource: CURRENT_LINEUP_URL,
    technicalSource: model.sourceUrl,
    note: model.sourceNote,
  };
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, model.sourceUrl, externalId, `John Deere ${model.model} combine specifications`, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

async function putSpec(
  connection: Parameters<DbMigration['apply']>[0],
  machineId: number,
  versionId: number,
  definitionId: number,
  sourceRecordId: number,
  value: string | number,
  unit: string | null = null,
) {
  await connection.query(
    `INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES (?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const johnDeereCombinesCurrentMigration: DbMigration = {
  id: '20260831_480_john_deere_combines_current',
  description: 'Add current John Deere US S7 and X9 combine models with source-backed harvesting specifications',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types (name,slug) VALUES ('Combine','combine') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers (name,slug) VALUES ('John Deere','john-deere') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await selectId(connection, `SELECT id FROM equipment_types WHERE slug='combine' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    for (const series of ['S7', 'X9'] as const) {
      await connection.query(
        `INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [manufacturerId, equipmentTypeId, series, series.toLowerCase()],
      );
    }

    const definitionIds = new Map<string, number>();
    for (const definition of definitions) {
      await connection.query(
        `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        definition,
      );
      definitionIds.set(definition[1], await selectId(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }

    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing John Deere combine spec definition: ${key}`);
      return value;
    };

    for (const model of models) {
      const seriesId = await selectId(
        connection,
        `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,
        [manufacturerId, equipmentTypeId, model.series.toLowerCase()],
      );
      const sourceRecordId = await ensureSourceRecord(connection, sourceId, model);

      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug, 'Current John Deere US harvesting lineup; source-backed combine specification record'],
      );
      const machineId = await selectId(
        connection,
        `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,
        [manufacturerId, equipmentTypeId, model.slug],
      );

      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION_SLUG]);
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States','Current US harvesting catalog specification',TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code=VALUES(market_code),market_name=VALUES(market_name),configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION_SLUG, sourceRecordId, model.sourceNote],
      );
      const versionId = await selectId(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION_SLUG]);

      const values: Array<[string, string | number, string | null]> = [
        ['configuration.type', 'Combine harvester', null],
        ['configuration.market_scope', 'United States / North America', null],
        ['engine.model', model.engineModel, null],
        ['engine.displacement', model.displacementL, 'L'],
        ['engine.rated_speed', model.ratedRpm, 'rpm'],
        ['engine.rated_power', model.ratedHp, 'hp'],
        ['engine.maximum_power', model.maxHp, 'hp'],
        ['feeding.drive_type', model.feederDrive, null],
        ['feeding.width', model.feederWidthIn, 'in'],
        ['threshing.separator_type', model.separatorType, null],
        ['threshing.rotor_length', model.rotorLengthIn, 'in'],
        ['threshing.rotor_diameter', model.rotorDiameterIn, 'in'],
        ['threshing.rotor_speed_range', model.rotorSpeed, null],
        ['threshing.concave_area', model.concaveSqFt, 'sq ft'],
        ['threshing.separating_area', model.separatingSqFt, 'sq ft'],
        ['cleaning.total_louvered_area', model.cleaningSqFt, 'sq ft'],
        ['grain.grain_tank_capacity', model.grainTankBu, 'bu'],
        ['grain.peak_unloading_rate', model.unloadingBuSec, 'bu/sec'],
        ['capacities.fuel_tank', model.fuelGal, 'gal'],
      ];
      if (model.feederLengthIn !== undefined) values.push(['feeding.length', model.feederLengthIn, 'in']);
      if (model.baseWeightLb !== undefined) values.push(['dimensions.base_machine_weight', model.baseWeightLb, 'lb']);
      if (model.frontAxleWeightLb !== undefined) values.push(['dimensions.front_axle_weight', model.frontAxleWeightLb, 'lb']);

      for (const [key, value, unit] of values) {
        await putSpec(connection, machineId, versionId, def(key), sourceRecordId, value, unit);
      }
    }
  },
};
