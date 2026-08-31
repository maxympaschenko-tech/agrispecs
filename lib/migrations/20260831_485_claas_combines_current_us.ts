import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  seriesName: string;
  seriesSlug: string;
  sourceUrl: string;
  runningGear: 'Wheels' | 'TERRA TRAC';
  threshingSystem: string;
  secondarySeparation: string;
  threshingWidthIn: number;
  grainTank: number | string;
  unloadRate: number | string;
  processorNote?: string;
};

const LEXION_URL = 'https://www.claas.com/en-us/agricultural-machinery/combine-harvesters/lexion-8000';
const TRION_URL = 'https://www.claas.com/en-us/agricultural-machinery/combine-harvesters/trion-700';
const VERSION = 'united-states-current-2026-08';

const lexion = (slug: string, model: string, runningGear: 'Wheels' | 'TERRA TRAC', width: number, tank: number | string, unload: number | string): Seed => ({
  slug, model, seriesName: 'LEXION 8000 / 7000', seriesSlug: 'lexion-8000-7000', sourceUrl: LEXION_URL,
  runningGear, threshingSystem: 'APS SYNFLOW HYBRID', secondarySeparation: 'ROTO PLUS',
  threshingWidthIn: width, grainTank: tank, unloadRate: unload,
});

const models: Seed[] = [
  lexion('lexion-8900-terra-trac', 'LEXION 8900 TERRA TRAC', 'TERRA TRAC', 67, 510, 5.1),
  lexion('lexion-8800', 'LEXION 8800', 'Wheels', 67, 425, '4.30-5.10 bu/s depending configuration'),
  lexion('lexion-8800-terra-trac', 'LEXION 8800 TERRA TRAC', 'TERRA TRAC', 67, '425-510 bu depending configuration', '4.30-5.10 bu/s depending configuration'),
  lexion('lexion-8700', 'LEXION 8700', 'Wheels', 67, 425, '4.30-5.10 bu/s depending configuration'),
  lexion('lexion-8700-terra-trac', 'LEXION 8700 TERRA TRAC', 'TERRA TRAC', 67, '425-510 bu depending configuration', '4.30-5.10 bu/s depending configuration'),
  lexion('lexion-8600', 'LEXION 8600', 'Wheels', 67, 425, '4.30-5.10 bu/s depending configuration'),
  lexion('lexion-8600-terra-trac', 'LEXION 8600 TERRA TRAC', 'TERRA TRAC', 67, '425-510 bu depending configuration', '4.30-5.10 bu/s depending configuration'),
  lexion('lexion-8500', 'LEXION 8500', 'Wheels', 67, 425, '4.30-5.10 bu/s depending configuration'),
  lexion('lexion-8500-terra-trac', 'LEXION 8500 TERRA TRAC', 'TERRA TRAC', 67, '425-510 bu depending configuration', '4.30-5.10 bu/s depending configuration'),
  lexion('lexion-7500', 'LEXION 7500', 'Wheels', 56, 385, '4.30-5.10 bu/s depending configuration'),
  lexion('lexion-7500-terra-trac', 'LEXION 7500 TERRA TRAC', 'TERRA TRAC', 56, 385, '4.30-5.10 bu/s depending configuration'),
  {
    slug: 'trion-740', model: 'TRION 740', seriesName: 'TRION 700', seriesSlug: 'trion-700', sourceUrl: TRION_URL,
    runningGear: 'Wheels', threshingSystem: 'APS HYBRID', secondarySeparation: 'ROTO PLUS', threshingWidthIn: 56,
    grainTank: 385, unloadRate: 3.8, processorNote: 'Single rotor',
  },
  {
    slug: 'trion-740-terra-trac', model: 'TRION 740 TERRA TRAC', seriesName: 'TRION 700', seriesSlug: 'trion-700', sourceUrl: TRION_URL,
    runningGear: 'TERRA TRAC', threshingSystem: 'APS HYBRID', secondarySeparation: 'ROTO PLUS', threshingWidthIn: 56,
    grainTank: 385, unloadRate: 3.8, processorNote: 'Single rotor',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'configuration.running_gear', 'Running gear', 'text', null, 3],
  ['Threshing & Separating', 'threshing.system', 'Threshing system', 'text', null, 5],
  ['Threshing & Separating', 'threshing.secondary_separation', 'Secondary separation', 'text', null, 10],
  ['Threshing & Separating', 'threshing.processor_type', 'Processor type', 'text', null, 15],
  ['Threshing & Separating', 'threshing.drum_width', 'Threshing drum width', 'decimal', 'in', 20],
  ['Grain Handling', 'grain.grain_tank_capacity', 'Grain tank capacity', 'decimal', 'bu', 10],
  ['Grain Handling', 'grain.peak_unloading_rate', 'Peak unloading rate', 'decimal', 'bu/sec', 20],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('CLAAS combine migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='CLAAS' AND domain='claas.com' LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('CLAAS','claas.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `claas-${model.slug}-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const rawReference = {
    captured: '2026-08-31', market: 'United States / North America', equipmentType: 'Combine', model: model.model,
    runningGear: model.runningGear, threshingSystem: model.threshingSystem, secondarySeparation: model.secondarySeparation,
    threshingWidthIn: model.threshingWidthIn, grainTank: model.grainTank, unloadRate: model.unloadRate,
    processorNote: model.processorNote || null,
    sourcePolicy: 'Current CLAAS US technical table values are stored directly. Horsepower is intentionally omitted in this migration because model-year power updates visible across CLAAS sources require separate version-specific normalization.',
  };
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, model.sourceUrl, externalId, `CLAAS ${model.model} current US combine specifications`, JSON.stringify(rawReference)],
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

export const claasCombinesCurrentUsMigration: DbMigration = {
  id: '20260831_485_claas_combines_current_us',
  description: 'Add current CLAAS US LEXION 8000/7000 and TRION 740 combine configurations from official technical tables',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Combine','combine') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('CLAAS','claas') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='claas' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='combine' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    const series = Array.from(new Map(models.map((model) => [model.seriesSlug, { name: model.seriesName, slug: model.seriesSlug }])).values());
    for (const item of series) {
      await connection.query(
        `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [manufacturerId, equipmentTypeId, item.name, item.slug],
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
      if (!value) throw new Error(`Missing CLAAS combine spec definition ${key}`);
      return value;
    };

    for (const model of models) {
      const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.seriesSlug]);
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current CLAAS United States combine catalog','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current US combine technical-table configuration',TRUE,?,'Current CLAAS US technical data captured 2026-08-31. Power values are deliberately deferred to a separate model-year-normalized source pass.')
         ON DUPLICATE KEY UPDATE market_code=VALUES(market_code),market_name=VALUES(market_name),configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      const values: Array<[string, string | number, string | null]> = [
        ['configuration.type', 'Combine harvester', null],
        ['configuration.market_scope', 'United States / North America', null],
        ['configuration.running_gear', model.runningGear, null],
        ['threshing.system', model.threshingSystem, null],
        ['threshing.secondary_separation', model.secondarySeparation, null],
        ['threshing.drum_width', model.threshingWidthIn, 'in'],
        ['grain.grain_tank_capacity', model.grainTank, typeof model.grainTank === 'number' ? 'bu' : null],
        ['grain.peak_unloading_rate', model.unloadRate, typeof model.unloadRate === 'number' ? 'bu/sec' : null],
      ];
      if (model.processorNote) values.push(['threshing.processor_type', model.processorNote, null]);
      for (const [key, value, unit] of values) {
        await put(connection, machineId, versionId, def(key), sourceRecordId, value, unit);
      }
    }
  },
};
