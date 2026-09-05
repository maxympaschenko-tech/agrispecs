import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Confidence = 'official' | 'high';

type Model = {
  slug: 't5-130' | 't5-140';
  model: 'T5.130' | 'T5.140';
  maxHp: number;
  maxTorqueLbFt: number;
};

const CURRENT_VERSION = 'united-states-current-2026-08';
const OFFICIAL_URL = 'https://agriculture.newholland.com/en-us/nar/products/tractors-telehandlers/t5-series';
const OFFICIAL_EXTERNAL_ID = 'new-holland-t5-130-140-current-us-dimensions-2026-09';
const DEALER_URL = 'https://www.agindustrial.com/product/10';
const DEALER_EXTERNAL_ID = 'ag-industrial-t5-130-140-current-us-detailed-specs-2026-09';

const models: Model[] = [
  { slug: 't5-130', model: 'T5.130', maxHp: 130, maxTorqueLbFt: 450 },
  { slug: 't5-140', model: 'T5.140', maxHp: 140, maxTorqueLbFt: 465 },
];

const definitions: Array<[string, string, string, 'text' | 'integer' | 'decimal', string | null, number]> = [
  ['Engine', 'engine.model', 'Engine model', 'text', null, 2],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 20],
  ['Engine', 'engine.max_power', 'Maximum engine power', 'decimal', 'hp', 11],
  ['Engine', 'engine.max_torque', 'Maximum engine torque', 'decimal', 'lb-ft', 25],
  ['Hydraulics', 'hydraulics.implement_pump_flow', 'Implement pump flow', 'decimal', 'L/min', 10],
  ['Hydraulics', 'hydraulics.service_pump_flow', 'Steering / service pump flow', 'decimal', 'L/min', 20],
  ['Hydraulics', 'hydraulics.rear_remotes', 'Rear remote valves', 'integer', null, 30],
  ['Dimensions & Weight', 'dimensions.overall_height_low_profile', 'Overall height with low-profile roof', 'decimal', 'in', 10],
  ['Dimensions & Weight', 'dimensions.hood_height', 'Overall hood height', 'decimal', 'in', 20],
  ['Dimensions & Weight', 'dimensions.overall_length', 'Overall length', 'decimal', 'in', 30],
  ['Dimensions & Weight', 'dimensions.wheelbase', 'Wheelbase', 'decimal', 'in', 40],
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing current T5.130/T5.140 specification migration dependency.');
  return Number(rows[0].id);
}

async function ensureSource(
  connection: Parameters<DbMigration['apply']>[0],
  name: string,
  domain: string,
  sourceType: 'manufacturer' | 'supplier',
  authorityLevel: 'official' | 'secondary',
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM sources WHERE domain=? ORDER BY CASE WHEN authority_level='official' THEN 0 ELSE 1 END,id LIMIT 1`,
    [domain],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?,?,?,?)`,
    [name, domain, sourceType, authorityLevel],
  );
  return Number(result.insertId);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  rawReference: unknown,
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
    [externalId],
  );
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

async function upsertSpec(
  connection: Parameters<DbMigration['apply']>[0],
  machineId: number,
  versionId: number,
  specKey: string,
  value: string | number,
  unit: string | null,
  sourceRecordId: number,
  confidence: Confidence,
) {
  const definitionId = await selectId(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [specKey]);
  await connection.query(
    `INSERT INTO machine_specs (
      machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence
    ) VALUES (?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE
      value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),
      source_record_id=VALUES(source_record_id),confidence=VALUES(confidence)`,
    [
      machineId,
      versionId,
      definitionId,
      typeof value === 'string' ? value : null,
      typeof value === 'number' ? value : null,
      unit,
      sourceRecordId,
      confidence,
    ],
  );
}

export const newHollandT5130140CurrentSpecsEnrichmentMigration: DbMigration = {
  id: '20260905_636_new_holland_t5_130_140_current_specs',
  description: 'Enrich current US T5.130/T5.140 with official dimensions and source-backed North American engine/hydraulic specifications',
  async apply(connection) {
    for (const definition of definitions) {
      await connection.query(
        `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),
           canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        definition,
      );
    }

    const officialSourceId = await ensureSource(
      connection,
      'New Holland Agriculture',
      'agriculture.newholland.com',
      'manufacturer',
      'official',
    );
    const officialSourceRecordId = await ensureSourceRecord(
      connection,
      officialSourceId,
      OFFICIAL_EXTERNAL_ID,
      OFFICIAL_URL,
      'New Holland North America current T5.130/T5.140 dimensions and transmission scope',
      {
        role: 'Official current North American T5.130/T5.140 configuration and dimensions',
        captured: '2026-09',
        models: ['T5.130', 'T5.140'],
        evidence: {
          transmissions: 'Auto Command CVT and Dynamic Command 24x24 8-step semi-powershift are listed for T5.130 and T5.140.',
          lowProfileOverallHeight: '8 ft 10 in (2.7 m), with 540/65R34 tires and low-profile roof.',
          hoodHeight: '75 in (1.9 m).',
          engineOilIntervalHours: 600,
        },
        confidence: 'official',
        guardrail: 'These dimensional values are applied only to T5.130/T5.140. They are not copied to T5.110/T5.120.',
      },
    );

    const dealerSourceId = await ensureSource(
      connection,
      'AG Industrial',
      'agindustrial.com',
      'supplier',
      'secondary',
    );
    const dealerSourceRecordId = await ensureSourceRecord(
      connection,
      dealerSourceId,
      DEALER_EXTERNAL_ID,
      DEALER_URL,
      'AG Industrial current New Holland T5 North American specification table',
      {
        role: 'Detailed North American current-line specification evidence',
        captured: '2026-09',
        scope: 'Dynamic Command / Auto Command T5.130 and T5.140 table',
        sharedSpecifications: {
          engine: 'FPT NEF4, 273 cu in (4.4 L), 4-cylinder',
          rearRemotes: 4,
          implementPump: '29 US gpm',
          servicePump: '9.6 US gpm',
          overallLength: '173 in',
          wheelbase: '98 in',
        },
        modelSpecifications: {
          'T5.130': { maximumHorsepower: 130, maximumTorque: '450 lb-ft', ptoHorsepower: 102 },
          'T5.140': { maximumHorsepower: 140, maximumTorque: '465 lb-ft', ptoHorsepower: 111 },
        },
        corroboration: 'The model lineup, rated/PTO power and Dynamic/Auto transmission scope match the current New Holland North America T5 page.',
        confidence: 'secondary/high',
        guardrail: 'Detailed dealer-table values are stored as high confidence, not official. No European T5.110/T5.120 Dynamic/Auto values are imported.',
      },
    );

    for (const model of models) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [model.slug],
      );
      const versionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=TRUE LIMIT 1`,
        [machineId, CURRENT_VERSION],
      );

      await upsertSpec(connection, machineId, versionId, 'dimensions.overall_height_low_profile', 106, 'in', officialSourceRecordId, 'official');
      await upsertSpec(connection, machineId, versionId, 'dimensions.hood_height', 75, 'in', officialSourceRecordId, 'official');

      await upsertSpec(connection, machineId, versionId, 'engine.model', 'FPT NEF4', null, dealerSourceRecordId, 'high');
      await upsertSpec(connection, machineId, versionId, 'engine.displacement', 4.4, 'L', dealerSourceRecordId, 'high');
      await upsertSpec(connection, machineId, versionId, 'engine.max_power', model.maxHp, 'hp', dealerSourceRecordId, 'high');
      await upsertSpec(connection, machineId, versionId, 'engine.max_torque', model.maxTorqueLbFt, 'lb-ft', dealerSourceRecordId, 'high');
      await upsertSpec(connection, machineId, versionId, 'hydraulics.implement_pump_flow', 109.8, 'L/min', dealerSourceRecordId, 'high');
      await upsertSpec(connection, machineId, versionId, 'hydraulics.service_pump_flow', 36.3, 'L/min', dealerSourceRecordId, 'high');
      await upsertSpec(connection, machineId, versionId, 'hydraulics.rear_remotes', 4, null, dealerSourceRecordId, 'high');
      await upsertSpec(connection, machineId, versionId, 'dimensions.overall_length', 173, 'in', dealerSourceRecordId, 'high');
      await upsertSpec(connection, machineId, versionId, 'dimensions.wheelbase', 98, 'in', dealerSourceRecordId, 'high');
    }
  },
};
