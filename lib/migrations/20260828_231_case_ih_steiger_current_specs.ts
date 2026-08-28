import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type ModelSeed = {
  slug: string;
  model: string;
  ratedHp: number;
  maxHp: number;
  displacementL?: number;
  transmission?: string;
  configuration: string;
  url: string;
  externalId: string;
};

const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/tractors/steiger-series';
const FAMILY_EXTERNAL_ID = 'case-ih-steiger-current-us-425-785-2026-08';
const VERSION_SLUG = 'united-states-current-2026-08';

const models: ModelSeed[] = [
  {
    slug: 'steiger-425',
    model: 'Steiger 425',
    ratedHp: 425,
    maxHp: 467,
    displacementL: 12.9,
    transmission: 'PowerDrive / CVXDrive',
    configuration: 'Wheeled, Rowtrac',
    url: 'https://www.caseih.com/en-us/unitedstates/products/tractors/steiger-series/steiger-425',
    externalId: 'case-ih-steiger-425-current-us',
  },
  {
    slug: 'steiger-475',
    model: 'Steiger 475',
    ratedHp: 475,
    maxHp: 522,
    displacementL: 12.9,
    transmission: 'PowerDrive / CVXDrive',
    configuration: 'Wheeled, Rowtrac, Quadtrac',
    url: 'https://www.caseih.com/en-us/unitedstates/products/tractors/steiger-series/steiger-475',
    externalId: 'case-ih-steiger-475-current-us',
  },
  {
    slug: 'steiger-525',
    model: 'Steiger 525',
    ratedHp: 525,
    maxHp: 578,
    displacementL: 12.9,
    transmission: 'PowerDrive / CVXDrive',
    configuration: 'Wheeled, Rowtrac, Quadtrac, Scraper',
    url: 'https://www.caseih.com/en-us/unitedstates/products/tractors/steiger-series/steiger-525',
    externalId: 'case-ih-steiger-525-current-us',
  },
  {
    slug: 'steiger-555',
    model: 'Steiger 555',
    ratedHp: 555,
    maxHp: 614,
    displacementL: 12.9,
    transmission: 'PowerDrive / CVXDrive',
    configuration: 'Wheeled, Quadtrac, Scraper',
    url: 'https://www.caseih.com/en-us/unitedstates/products/tractors/steiger-series/steiger-555',
    externalId: 'case-ih-steiger-555-current-us',
  },
  {
    slug: 'steiger-595',
    model: 'Steiger 595',
    ratedHp: 595,
    maxHp: 656,
    displacementL: 12.9,
    transmission: 'PowerDrive',
    configuration: 'Wheeled, Quadtrac, Scraper',
    url: 'https://www.caseih.com/en-us/unitedstates/products/tractors/steiger-series/steiger-595',
    externalId: 'case-ih-steiger-595-current-us',
  },
  {
    slug: 'steiger-645',
    model: 'Steiger 645',
    ratedHp: 645,
    maxHp: 699,
    displacementL: 12.9,
    transmission: 'PowerDrive',
    configuration: 'Wheeled, Quadtrac, Scraper',
    url: 'https://www.caseih.com/en-us/unitedstates/products/tractors/steiger-series/steiger-645',
    externalId: 'case-ih-steiger-645-current-us',
  },
  {
    slug: 'steiger-715',
    model: 'Steiger 715',
    ratedHp: 715,
    maxHp: 778,
    transmission: 'PowerDrive',
    configuration: 'Quadtrac',
    url: 'https://www.caseih.com/en-us/unitedstates/products/tractors/steiger-series/steiger-715',
    externalId: 'case-ih-steiger-715-current-us',
  },
  {
    slug: 'steiger-785',
    model: 'Steiger 785',
    ratedHp: 785,
    maxHp: 853,
    configuration: 'Quadtrac',
    url: 'https://www.caseih.com/en-us/unitedstates/products/tractors/steiger-series/steiger-785',
    externalId: 'case-ih-steiger-785-current-us',
  },
];

const definitions = [
  ['Machine Configuration', 'configuration.drive', 'Drive configuration', 'text', null, 2],
  ['Engine', 'engine.make', 'Engine manufacturer', 'text', null, 1],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 2],
  ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 3],
  ['Engine', 'engine.maximum_power', 'Maximum engine power', 'decimal', 'hp', 4],
  ['Transmission', 'transmission.standard', 'Transmission', 'text', null, 10],
] as const;

async function selectId(
  connection: Parameters<DbMigration['apply']>[0],
  sql: string,
  params: unknown[] = [],
) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Case IH Steiger migration dependency.');
  return Number(rows[0].id);
}

async function ensureSource(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
    [externalId],
  );
  if (rows[0]) return Number(rows[0].id);

  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId, url, externalId, title],
  );
  return Number(result.insertId);
}

async function upsertSpec(
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
    [
      machineId,
      versionId,
      definitionId,
      typeof value === 'string' ? value : null,
      typeof value === 'number' ? value : null,
      unit,
      sourceRecordId,
    ],
  );
}

export const caseIHSteigerCurrentSpecsMigration: DbMigration = {
  id: '20260828_231_case_ih_steiger_current_specs',
  description:
    'Add current US Case IH Steiger 425-785 verified engine power, configuration and transmission specifications',
  async apply(connection) {
    const manufacturerId = await selectId(
      connection,
      `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`,
    );
    const equipmentTypeId = await selectId(
      connection,
      `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`,
    );

    await connection.query(
      `INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug)
       VALUES (?,?,'Steiger Series','steiger-series')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await selectId(
      connection,
      `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='steiger-series' LIMIT 1`,
      [manufacturerId, equipmentTypeId],
    );

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Case IH','caseih.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const familyId = await ensureSource(
      connection,
      sourceId,
      FAMILY_EXTERNAL_ID,
      FAMILY_URL,
      'Case IH US current Steiger Series 425-785 lineup and engine family',
    );

    const definitionIds = new Map<string, number>();
    for (const [section, key, label, valueType, canonicalUnit, displayOrder] of definitions) {
      await connection.query(
        `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        [section, key, label, valueType, canonicalUnit, displayOrder],
      );
      definitionIds.set(
        key,
        await selectId(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]),
      );
    }
    const def = (key: string) => {
      const id = definitionIds.get(key);
      if (!id) throw new Error(`Missing Steiger spec ${key}`);
      return id;
    };

    for (const model of models) {
      const modelSourceId = await ensureSource(
        connection,
        sourceId,
        model.externalId,
        model.url,
        `Case IH US ${model.model} official current product specifications`,
      );

      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES (?,?,?,?,?,'Current US Case IH Steiger high-horsepower tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await selectId(
        connection,
        `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,
        [manufacturerId, equipmentTypeId, model.slug],
      );

      const notes =
        model.slug === 'steiger-785'
          ? 'The current US product page verifies 785 HP, 853 maximum engine HP and Quadtrac configuration. Exact engine displacement and transmission are intentionally omitted until directly exposed by a current US model source.'
          : model.slug === 'steiger-715'
            ? 'The current US product page verifies 715 HP, 778 maximum engine HP, PowerDrive and Quadtrac configuration. Exact engine displacement is intentionally omitted until directly exposed by a current US model source.'
            : 'Current values are from the individual Case IH US product page; engine manufacturer is supported by the current US Steiger family page.';

      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION_SLUG, model.configuration, modelSourceId, notes],
      );
      const versionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, VERSION_SLUG],
      );

      await upsertSpec(
        connection,
        machineId,
        versionId,
        def('configuration.drive'),
        modelSourceId,
        model.configuration,
      );
      await upsertSpec(
        connection,
        machineId,
        versionId,
        def('engine.make'),
        familyId,
        'FPT Industrial',
      );
      await upsertSpec(
        connection,
        machineId,
        versionId,
        def('engine.rated_power'),
        modelSourceId,
        model.ratedHp,
        'hp',
      );
      await upsertSpec(
        connection,
        machineId,
        versionId,
        def('engine.maximum_power'),
        modelSourceId,
        model.maxHp,
        'hp',
      );

      if (model.displacementL !== undefined) {
        await upsertSpec(
          connection,
          machineId,
          versionId,
          def('engine.displacement'),
          modelSourceId,
          model.displacementL,
          'L',
        );
      }
      if (model.transmission) {
        await upsertSpec(
          connection,
          machineId,
          versionId,
          def('transmission.standard'),
          modelSourceId,
          model.transmission,
        );
      }
    }
  },
};
