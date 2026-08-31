import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type CombineSeed = {
  slug: string;
  model: string;
  seriesName: string;
  seriesSlug: string;
  sourceUrl: string;
  machineClass?: string;
  ratedHp: number;
  maxHp: number;
  grainTank: number | string;
  unloadRate?: number | string;
  feederWidthIn?: number;
  separatorType?: string;
  note: string;
};

const models: CombineSeed[] = [
  {
    slug: 'af11', model: 'AF11', seriesName: 'AF Series', seriesSlug: 'af-series',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/harvesting/af-series/af11',
    machineClass: '10+', ratedHp: 775, maxHp: 775, grainTank: 567, unloadRate: 6,
    separatorType: 'Dual rotor',
    note: 'Current Case IH US AF11 product page captured 2026-08-31. Page states 775 engine horsepower, Class 10+, 567-bushel grain tank and 6 bu/sec unload rate.',
  },
  {
    slug: 'af10', model: 'AF10', seriesName: 'AF Series', seriesSlug: 'af-series',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/harvesting/af-series/af10',
    machineClass: '10+', ratedHp: 775, maxHp: 775, grainTank: '455 or 567 bu', unloadRate: '4.5 or 6.0 bu/sec',
    separatorType: 'Single rotor',
    note: 'Current Case IH US AF10 product page captured 2026-08-31. Page identifies the C16-powered 775 HP AF10 as a single-rotor Class 10+ combine with two grain-tank/unloading configurations.',
  },
  {
    slug: 'af9', model: 'AF9', seriesName: 'AF Series', seriesSlug: 'af-series',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/harvesting/af-series/af9',
    machineClass: '9', ratedHp: 634, maxHp: 634, grainTank: '455 or 567 bu', unloadRate: '4.5 or 6.0 bu/sec',
    note: 'Current Case IH US AF9 product page captured 2026-08-31. Page states 634 engine HP, Class 9, and two grain-tank/unloading configurations.',
  },
  {
    slug: 'axial-flow-6160', model: 'Axial-Flow 6160', seriesName: 'Axial-Flow 160 Series', seriesSlug: 'axial-flow-160',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/harvesting/axial-flow-160-series/axial-flow-6160',
    ratedHp: 348, maxHp: 411, grainTank: 300,
    note: 'Current Case IH US Axial-Flow 6160 product page captured 2026-08-31. Page states 348 rated HP, 411 peak HP and 300-bushel grain-tank capacity.',
  },
  {
    slug: 'axial-flow-7160', model: 'Axial-Flow 7160', seriesName: 'Axial-Flow 160 Series', seriesSlug: 'axial-flow-160',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/harvesting/axial-flow-160-series/axial-flow-7160',
    ratedHp: 375, maxHp: 442, grainTank: 350,
    note: 'Current Case IH US Axial-Flow 7160 product page captured 2026-08-31. Page states 375 rated HP, 442 peak HP and 350-bushel grain-tank capacity.',
  },
  {
    slug: 'axial-flow-7260', model: 'Axial-Flow 7260', seriesName: 'Axial-Flow 260 Series', seriesSlug: 'axial-flow-260',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/harvesting/axial-flow-260-series/axial-flow-7260',
    machineClass: '7', ratedHp: 402, maxHp: 468, grainTank: '315 bu standard; 410 bu optional', unloadRate: 4, feederWidthIn: 54,
    note: 'Current Case IH US Axial-Flow 7260 product page captured 2026-08-31. Page states 402 HP engine, 468 HP maximum output, 54-inch feeder, 315/410-bushel grain tank and 4 bu/sec unloading.',
  },
  {
    slug: 'axial-flow-8260', model: 'Axial-Flow 8260', seriesName: 'Axial-Flow 260 Series', seriesSlug: 'axial-flow-260',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/harvesting/axial-flow-260-series/axial-flow-8260',
    machineClass: '8', ratedHp: 480, maxHp: 555, grainTank: 410, unloadRate: 4.5, feederWidthIn: 54,
    note: 'Current Case IH US Axial-Flow 8260 product page captured 2026-08-31. Page states 480 HP engine, 555 HP maximum output, 54-inch feeder, 410-bushel grain tank and 4.5 bu/sec unloading.',
  },
  {
    slug: 'axial-flow-9260', model: 'Axial-Flow 9260', seriesName: 'Axial-Flow 260 Series', seriesSlug: 'axial-flow-260',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/harvesting/axial-flow-260-series/axial-flow-9260',
    machineClass: '9', ratedHp: 550, maxHp: 625, grainTank: 410, unloadRate: 4.5, feederWidthIn: 54,
    note: 'Current Case IH US Axial-Flow 9260 product page captured 2026-08-31. Page states 550 HP engine, 625 HP maximum output, 54-inch feeder, 410-bushel grain tank and 4.5 bu/sec unloading.',
  },
];

const definitions: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'configuration.machine_class', 'Combine class', 'text', null, 3],
  ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 20],
  ['Engine', 'engine.maximum_power', 'Maximum engine power', 'decimal', 'hp', 25],
  ['Feeding', 'feeding.width', 'Feeder width', 'decimal', 'in', 20],
  ['Threshing & Separating', 'threshing.separator_type', 'Separator type', 'text', null, 10],
  ['Grain Handling', 'grain.grain_tank_capacity', 'Grain tank capacity', 'decimal', 'bu', 10],
  ['Grain Handling', 'grain.peak_unloading_rate', 'Peak unloading rate', 'decimal', 'bu/sec', 20],
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected Case IH combine migration dependency was not found.');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Case IH','caseih.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function ensureSourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: CombineSeed) {
  const externalId = `case-ih-${model.slug}-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const rawReference = {
    captured: '2026-08-31',
    market: 'United States',
    equipmentType: 'Combine',
    model: model.model,
    technicalSource: model.sourceUrl,
    note: model.note,
  };
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, model.sourceUrl, externalId, `Case IH ${model.model} combine specifications`, JSON.stringify(rawReference)],
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

export const caseIHCombinesCurrentMigration: DbMigration = {
  id: '20260831_482_case_ih_combines_current',
  description: 'Add current Case IH AF, Axial-Flow 160 and Axial-Flow 260 combine models from official US product pages',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types (name,slug) VALUES ('Combine','combine') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers (name,slug) VALUES ('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const equipmentTypeId = await selectId(connection, `SELECT id FROM equipment_types WHERE slug='combine' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    const series = Array.from(new Map(models.map((model) => [model.seriesSlug, { name: model.seriesName, slug: model.seriesSlug }])).values());
    for (const item of series) {
      await connection.query(
        `INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [manufacturerId, equipmentTypeId, item.name, item.slug],
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
      if (!value) throw new Error(`Missing Case IH combine spec definition: ${key}`);
      return value;
    };

    for (const model of models) {
      const seriesId = await selectId(
        connection,
        `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,
        [manufacturerId, equipmentTypeId, model.seriesSlug],
      );
      const sourceRecordId = await ensureSourceRecord(connection, sourceId, model);

      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug, 'Current Case IH United States combine lineup'],
      );
      const machineId = await selectId(
        connection,
        `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,
        [manufacturerId, equipmentTypeId, model.slug],
      );

      const versionSlug = 'united-states-current-2026-08';
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, versionSlug]);
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States','Current US product-page specification',TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code=VALUES(market_code),market_name=VALUES(market_name),configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, versionSlug, sourceRecordId, model.note],
      );
      const versionId = await selectId(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, versionSlug]);

      const values: Array<[string, string | number, string | null]> = [
        ['configuration.type', 'Combine harvester', null],
        ['configuration.market_scope', 'United States', null],
        ['engine.rated_power', model.ratedHp, 'hp'],
        ['engine.maximum_power', model.maxHp, 'hp'],
        ['grain.grain_tank_capacity', model.grainTank, typeof model.grainTank === 'number' ? 'bu' : null],
      ];
      if (model.machineClass) values.push(['configuration.machine_class', model.machineClass, null]);
      if (model.unloadRate !== undefined) values.push(['grain.peak_unloading_rate', model.unloadRate, typeof model.unloadRate === 'number' ? 'bu/sec' : null]);
      if (model.feederWidthIn !== undefined) values.push(['feeding.width', model.feederWidthIn, 'in']);
      if (model.separatorType) values.push(['threshing.separator_type', model.separatorType, null]);

      for (const [key, value, unit] of values) {
        await putSpec(connection, machineId, versionId, def(key), sourceRecordId, value, unit);
      }
    }
  },
};
