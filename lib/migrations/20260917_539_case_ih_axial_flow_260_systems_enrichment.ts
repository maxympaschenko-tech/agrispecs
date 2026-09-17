import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/harvesting/axial-flow-260-series';
const MODEL_SLUGS = ['axial-flow-7260', 'axial-flow-8260', 'axial-flow-9260'] as const;

async function selectId(
  connection: Parameters<DbMigration['apply']>[0],
  sql: string,
  params: unknown[] = [],
) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH Axial-Flow 260 enrichment dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
) {
  const externalId = 'case-ih-axial-flow-260-us-current-2026-09-systems-enrichment';
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
    [externalId],
  );
  if (rows[0]) return Number(rows[0].id);

  const rawReference = {
    captured: '2026-09-17',
    market: 'United States',
    family: 'Axial-Flow 260 Series',
    technology: {
      displays: 'Pro 1200 dual displays',
      harvestAutomation: 'Harvest Command',
      guidance: 'AccuGuide, AccuSync and RowGuide Pro',
    },
    drivetrain: 'Two-speed electric shift ground drive with closed-loop speed sensing and economy mode; optional differential lock',
    feederMaximumLiftCapacityLb: 13500,
    threshing: 'AFX single rotor',
    cleaning: {
      system: 'Cross Flow fan with Self-Leveling Cleaning System and Tri-Sweep tailings processor',
      maximumSlopePercentEachWay: 12,
    },
    activeTrac: {
      availability: 'Available four-roller hydraulic suspended track system',
      flotationImprovementPercentVsFixedTrack: 14,
    },
    note: 'Current Case IH US Axial-Flow 260 Series family page captured 2026-09-17.',
  };

  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [
      sourceId,
      FAMILY_URL,
      externalId,
      'Case IH US Axial-Flow 260 Series current technology and harvesting-system specifications',
      JSON.stringify(rawReference),
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

export const caseIHAxialFlow260SystemsEnrichmentMigration: DbMigration = {
  id: '20260917_539_case_ih_axial_flow_260_systems_enrichment',
  description: 'Enrich current US Case IH Axial-Flow 7260, 8260 and 9260 with official technology, feeder, threshing, cleaning and track-system data',
  async apply(connection) {
    const sourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`,
    );
    const sourceRecordId = await ensureSourceRecord(connection, sourceId);

    const definitionIds = new Map<string, number>();
    const definitions: Array<[string, string, string, string, string | null, number]> = [
      ['Precision Technology', 'technology.display_system', 'Display system', 'text', null, 10],
      ['Precision Technology', 'technology.harvest_automation', 'Harvest automation', 'text', null, 20],
      ['Precision Technology', 'technology.guidance_features', 'Guidance and fleet features', 'text', null, 30],
      ['Transmission', 'transmission.ground_drive', 'Ground drive transmission', 'text', null, 20],
      ['Feeding', 'feeding.maximum_lift_capacity', 'Maximum feeder lift capacity', 'decimal', 'lb', 30],
      ['Threshing & Separating', 'threshing.rotor_system', 'Rotor system', 'text', null, 20],
      ['Cleaning System', 'cleaning.system', 'Cleaning system', 'text', null, 10],
      ['Cleaning System', 'cleaning.maximum_slope_percent', 'Self-leveling slope capacity', 'decimal', '%', 20],
      ['Cleaning System', 'cleaning.tailings_processor', 'Tailings processor', 'text', null, 30],
      ['Undercarriage', 'undercarriage.track_option', 'Track system option', 'text', null, 10],
      ['Undercarriage', 'undercarriage.track_floatation_gain', 'Track flotation improvement', 'decimal', '%', 20],
    ];
    for (const definition of definitions) {
      definitionIds.set(definition[1], await ensureDefinition(connection, definition));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing Axial-Flow 260 enrichment spec definition ${key}`);
      return value;
    };

    for (const slug of MODEL_SLUGS) {
      const machineId = await selectId(
        connection,
        `SELECT m.id
         FROM machines m
         INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id
         WHERE mf.slug='case-ih' AND m.slug=?
         LIMIT 1`,
        [slug],
      );
      const versionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, VERSION],
      );

      await putSpec(connection, machineId, versionId, def('technology.display_system'), sourceRecordId, 'Pro 1200 dual displays');
      await putSpec(connection, machineId, versionId, def('technology.harvest_automation'), sourceRecordId, 'Harvest Command');
      await putSpec(connection, machineId, versionId, def('technology.guidance_features'), sourceRecordId, 'AccuGuide, AccuSync and RowGuide Pro');
      await putSpec(
        connection,
        machineId,
        versionId,
        def('transmission.ground_drive'),
        sourceRecordId,
        'Two-speed electric shift ground drive with closed-loop speed sensing and economy mode; optional differential lock',
      );
      await putSpec(connection, machineId, versionId, def('feeding.maximum_lift_capacity'), sourceRecordId, 13500, 'lb');
      await putSpec(connection, machineId, versionId, def('threshing.rotor_system'), sourceRecordId, 'AFX single rotor');
      await putSpec(
        connection,
        machineId,
        versionId,
        def('cleaning.system'),
        sourceRecordId,
        'Cross Flow fan with Self-Leveling Cleaning System',
      );
      await putSpec(connection, machineId, versionId, def('cleaning.maximum_slope_percent'), sourceRecordId, 12, '%');
      await putSpec(connection, machineId, versionId, def('cleaning.tailings_processor'), sourceRecordId, 'Tri-Sweep tailings processor');
      await putSpec(
        connection,
        machineId,
        versionId,
        def('undercarriage.track_option'),
        sourceRecordId,
        'ActiveTrac four-roller hydraulic suspended track system available',
      );
      await putSpec(connection, machineId, versionId, def('undercarriage.track_floatation_gain'), sourceRecordId, 14, '%');
    }
  },
};
