import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/harvesting/axial-flow-160-series';
const models = [
  { slug: 'axial-flow-6160', powerRiseHp: 63, unloadBoostHp: 34 },
  { slug: 'axial-flow-7160', powerRiseHp: 67, unloadBoostHp: 34 },
] as const;

async function selectId(
  connection: Parameters<DbMigration['apply']>[0],
  sql: string,
  params: unknown[] = [],
) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH Axial-Flow 160 enrichment dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
) {
  const externalId = 'case-ih-axial-flow-160-us-current-2026-09-systems-enrichment';
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
    [externalId],
  );
  if (rows[0]) return Number(rows[0].id);

  const rawReference = {
    captured: '2026-09-17',
    market: 'United States',
    family: 'Axial-Flow 160 Series',
    engine: '8.7 L FPT',
    technology: {
      displays: 'Pro 1200 dual displays',
      harvestAutomation: 'Harvest Command',
      precision: 'RowGuide Pro, AccuSync and AccuGuide; Vector Pro receiver available by technology package',
    },
    transmission: 'Two-speed electric shift transmission',
    threshing: 'AFX single rotor',
    cleaningSystem: 'Cross Flow cleaning system',
    cleanGrainCapacityBuPerHour: 5000,
    note: 'Current Case IH US Axial-Flow 160 Series family page captured 2026-09-17.',
  };

  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [
      sourceId,
      FAMILY_URL,
      externalId,
      'Case IH US Axial-Flow 160 Series current engine, technology and harvest-system specifications',
      JSON.stringify(rawReference),
    ],
  );
  return Number(result.insertId);
}

async function ensureModelSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  slug: string,
  powerRiseHp: number,
  unloadBoostHp: number,
) {
  const externalId = `case-ih-${slug}-us-current-2026-09-power-enrichment`;
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
    [externalId],
  );
  if (rows[0]) return Number(rows[0].id);

  const modelName = slug === 'axial-flow-6160' ? 'Axial-Flow 6160' : 'Axial-Flow 7160';
  const url = `${FAMILY_URL}/${slug}`;
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [
      sourceId,
      url,
      externalId,
      `Case IH US ${modelName} current power specifications`,
      JSON.stringify({ captured: '2026-09-17', market: 'United States', model: modelName, powerRiseHp, unloadBoostHp }),
    ],
  );
  return Number(result.insertId);
}

async function ensureDefinition(
  connection: Parameters<DbMigration['apply']>[0],
  definition: [string, string, string, string, string | null, number],
) {
  await connection.query(
    `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order)
     VALUES(?,?,?,?,?,?)
     ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
    definition,
  );
  return selectId(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]);
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
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
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

export const caseIHAxialFlow160SystemsEnrichmentMigration: DbMigration = {
  id: '20260917_540_case_ih_axial_flow_160_systems_enrichment',
  description: 'Enrich current US Case IH Axial-Flow 6160 and 7160 with official power-rise, engine, precision, threshing, cleaning and grain-handling data',
  async apply(connection) {
    const sourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`,
    );
    const familySourceRecordId = await ensureSourceRecord(connection, sourceId);

    const definitionIds = new Map<string, number>();
    const definitions: Array<[string, string, string, string, string | null, number]> = [
      ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 2],
      ['Engine', 'engine.power_rise', 'Power rise', 'decimal', 'hp', 5],
      ['Engine', 'engine.unload_boost', 'Unload boost - Power on Demand', 'decimal', 'hp', 6],
      ['Precision Technology', 'technology.display_system', 'Display system', 'text', null, 10],
      ['Precision Technology', 'technology.harvest_automation', 'Harvest automation', 'text', null, 20],
      ['Precision Technology', 'technology.guidance_features', 'Guidance and precision features', 'text', null, 30],
      ['Transmission', 'transmission.ground_drive', 'Ground drive transmission', 'text', null, 20],
      ['Threshing & Separating', 'threshing.rotor_system', 'Rotor system', 'text', null, 20],
      ['Cleaning System', 'cleaning.system', 'Cleaning system', 'text', null, 10],
      ['Grain Handling', 'grain.clean_grain_elevator_capacity', 'Clean grain elevator capacity', 'text', null, 30],
    ];
    for (const definition of definitions) {
      definitionIds.set(definition[1], await ensureDefinition(connection, definition));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing Axial-Flow 160 enrichment spec definition ${key}`);
      return value;
    };

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT m.id
         FROM machines m
         INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id
         WHERE mf.slug='case-ih' AND m.slug=?
         LIMIT 1`,
        [model.slug],
      );
      const versionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, VERSION],
      );
      const modelSourceRecordId = await ensureModelSourceRecord(
        connection,
        sourceId,
        model.slug,
        model.powerRiseHp,
        model.unloadBoostHp,
      );

      await putSpec(connection, machineId, versionId, def('engine.displacement'), familySourceRecordId, 8.7, 'L');
      await putSpec(connection, machineId, versionId, def('engine.power_rise'), modelSourceRecordId, model.powerRiseHp, 'hp');
      await putSpec(connection, machineId, versionId, def('engine.unload_boost'), modelSourceRecordId, model.unloadBoostHp, 'hp');
      await putSpec(connection, machineId, versionId, def('technology.display_system'), familySourceRecordId, 'Pro 1200 dual displays');
      await putSpec(connection, machineId, versionId, def('technology.harvest_automation'), familySourceRecordId, 'Harvest Command');
      await putSpec(
        connection,
        machineId,
        versionId,
        def('technology.guidance_features'),
        familySourceRecordId,
        'RowGuide Pro, AccuSync and AccuGuide; Vector Pro receiver available by technology package',
      );
      await putSpec(connection, machineId, versionId, def('transmission.ground_drive'), familySourceRecordId, 'Two-speed electric shift transmission');
      await putSpec(connection, machineId, versionId, def('threshing.rotor_system'), familySourceRecordId, 'AFX single rotor');
      await putSpec(connection, machineId, versionId, def('cleaning.system'), familySourceRecordId, 'Cross Flow cleaning system');
      await putSpec(connection, machineId, versionId, def('grain.clean_grain_elevator_capacity'), familySourceRecordId, 'Up to 5,000 bu/hr');
    }
  },
};
