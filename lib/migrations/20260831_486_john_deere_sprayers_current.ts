import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  seriesName: string;
  seriesSlug: string;
  sourceUrl: string;
  ratedHp: number;
  maxHp: number;
  displacementL: number;
  fuelGal: number;
  solutionGal: number;
  rinseGal: number;
  boomOptions?: string;
  maxBoomFt?: number;
  cropClearanceIn?: number;
  solutionControl?: string;
  note: string;
};

const BROCHURE_URL = 'https://www.deere.com/assets/pdfs/region-4/products/sprayers/4940012-self-propelled-sprayers-floaters.pdf';
const MY2026_PRICE_URL = 'https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/agricultural/SPRAYERS_LESS_PUKs_05FEB2026.pdf';
const QUICK_REFERENCE_URL = 'https://www.deere.com/en/parts-and-service/manuals-and-training/quick-reference-guides/crop-care/';
const VERSION = 'united-states-current-2026-08';

const models: Seed[] = [
  {
    slug: '408r', model: '408R', seriesName: '400 R Series', seriesSlug: '400-r-series', sourceUrl: MY2026_PRICE_URL,
    ratedHp: 280, maxHp: 300, displacementL: 6.8, fuelGal: 128.2, solutionGal: 800, rinseGal: 120,
    boomOptions: '100 ft base boom in the Model Year 2026 US price-page configuration', maxBoomFt: 100,
    note: 'Current Model Year 2026 John Deere US 408R price-page configuration captured 2026-08-31. Engine and capacity values are cross-checked to the official John Deere self-propelled sprayer brochure; the 100-ft boom is stored as the MY2026 base configuration, not as the only possible field configuration.',
  },
  {
    slug: '410r', model: '410R', seriesName: '400 R Series', seriesSlug: '400-r-series',
    sourceUrl: 'https://www.deere.com/en-us/products-solutions/sprayers-and-applicators/self-propelled-sprayers-and-applicators/410r-sprayer-njgyn4k',
    ratedHp: 310, maxHp: 330, displacementL: 9.0, fuelGal: 149.2, solutionGal: 1000, rinseGal: 120,
    boomOptions: '90, 100, 120, or 132 ft; steel or carbon fiber depending configuration', maxBoomFt: 132, cropClearanceIn: 60,
    solutionControl: 'Automatic Solution Control (ASC); optional Pressure Recirculation & Product Reclaim; optional ASC Premium with Pressure Recirculation & Product Reclaim',
    note: 'Current John Deere US 410R product page captured 2026-08-31. Product-page specifications are primary; fuel capacity is cross-checked to the official John Deere self-propelled sprayer brochure.',
  },
  {
    slug: '412r', model: '412R', seriesName: '400 R Series', seriesSlug: '400-r-series', sourceUrl: BROCHURE_URL,
    ratedHp: 326, maxHp: 357, displacementL: 9.0, fuelGal: 149.2, solutionGal: 1200, rinseGal: 170,
    note: 'Technical specifications from the official John Deere 400/600 Series self-propelled sprayer brochure. Current 412R status is independently confirmed by John Deere crop-care replacement-parts guides and 2025 machine references.',
  },
  {
    slug: '612r', model: '612R', seriesName: '600 R Series', seriesSlug: '600-r-series', sourceUrl: BROCHURE_URL,
    ratedHp: 355, maxHp: 388, displacementL: 9.0, fuelGal: 149.2, solutionGal: 1200, rinseGal: 170,
    note: 'Technical specifications from the official John Deere 600 Series self-propelled sprayer brochure. Current 612R status is independently confirmed by John Deere crop-care quick-reference and replacement-parts guides.',
  },
  {
    slug: '616r', model: '616R', seriesName: '600 R Series', seriesSlug: '600-r-series', sourceUrl: BROCHURE_URL,
    ratedHp: 375, maxHp: 415, displacementL: 9.0, fuelGal: 149.2, solutionGal: 1600, rinseGal: 160,
    note: 'Technical specifications from the official John Deere 600 Series self-propelled sprayer brochure. Current 616R status is independently confirmed by John Deere crop-care quick-reference and replacement-parts guides.',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 10],
  ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 20],
  ['Engine', 'engine.maximum_power', 'Maximum engine power', 'decimal', 'hp', 25],
  ['Application System', 'application.solution_tank_capacity', 'Solution tank capacity', 'decimal', 'gal', 10],
  ['Application System', 'application.solution_tank_material', 'Solution tank material', 'text', null, 15],
  ['Application System', 'application.rinse_tank_capacity', 'Rinse tank capacity', 'decimal', 'gal', 20],
  ['Application System', 'application.solution_control', 'Solution system control', 'text', null, 25],
  ['Application System', 'application.boom_width_options', 'Boom width options', 'text', null, 30],
  ['Application System', 'application.maximum_boom_width', 'Maximum boom width', 'decimal', 'ft', 35],
  ['Application System', 'application.crop_clearance', 'Standard crop clearance', 'decimal', 'in', 40],
  ['Capacities', 'capacities.fuel_tank', 'Fuel tank capacity', 'decimal', 'gal', 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere sprayer migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('John Deere','deere.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `john-deere-${model.slug}-sprayer-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const rawReference = {
    captured: '2026-08-31', market: 'United States', equipmentType: 'Sprayer', model: model.model,
    ratedHp: model.ratedHp, maxHp: model.maxHp, displacementL: model.displacementL,
    fuelGal: model.fuelGal, solutionGal: model.solutionGal, rinseGal: model.rinseGal,
    boomOptions: model.boomOptions || null, maxBoomFt: model.maxBoomFt || null, cropClearanceIn: model.cropClearanceIn || null,
    currentModelEvidence: QUICK_REFERENCE_URL,
    technicalCrossCheck: BROCHURE_URL,
    note: model.note,
  };
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, model.sourceUrl, externalId, `John Deere ${model.model} current US sprayer specifications`, JSON.stringify(rawReference)],
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

export const johnDeereSprayersCurrentMigration: DbMigration = {
  id: '20260831_486_john_deere_sprayers_current',
  description: 'Add current John Deere US 408R, 410R, 412R, 612R and 616R self-propelled sprayers',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Sprayer','sprayer') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('John Deere','john-deere') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='sprayer' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    for (const series of Array.from(new Map(models.map((model) => [model.seriesSlug, { name: model.seriesName, slug: model.seriesSlug }])).values())) {
      await connection.query(
        `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [manufacturerId, equipmentTypeId, series.name, series.slug],
      );
    }

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
      if (!value) throw new Error(`Missing John Deere sprayer spec definition ${key}`);
      return value;
    };

    for (const model of models) {
      const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.seriesSlug]);
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current John Deere United States self-propelled sprayer lineup','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current US self-propelled sprayer specification',TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code=VALUES(market_code),market_name=VALUES(market_name),configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId, model.note],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      const values: Array<[string, string | number, string | null]> = [
        ['configuration.type', 'Self-propelled sprayer', null],
        ['configuration.market_scope', 'United States', null],
        ['engine.displacement', model.displacementL, 'L'],
        ['engine.rated_power', model.ratedHp, 'hp'],
        ['engine.maximum_power', model.maxHp, 'hp'],
        ['application.solution_tank_capacity', model.solutionGal, 'gal'],
        ['application.solution_tank_material', 'Stainless steel', null],
        ['application.rinse_tank_capacity', model.rinseGal, 'gal'],
        ['capacities.fuel_tank', model.fuelGal, 'gal'],
      ];
      if (model.solutionControl) values.push(['application.solution_control', model.solutionControl, null]);
      if (model.boomOptions) values.push(['application.boom_width_options', model.boomOptions, null]);
      if (model.maxBoomFt !== undefined) values.push(['application.maximum_boom_width', model.maxBoomFt, 'ft']);
      if (model.cropClearanceIn !== undefined) values.push(['application.crop_clearance', model.cropClearanceIn, 'in']);
      for (const [key, value, unit] of values) await put(connection, machineId, versionId, def(key), sourceRecordId, value, unit);
    }
  },
};
