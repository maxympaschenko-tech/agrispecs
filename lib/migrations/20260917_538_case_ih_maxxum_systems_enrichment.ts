import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/tractors/maxxum-series';
const MODEL_SLUGS = ['maxxum-115', 'maxxum-125', 'maxxum-135', 'maxxum-145', 'maxxum-150'] as const;

async function selectId(
  connection: Parameters<DbMigration['apply']>[0],
  sql: string,
  params: unknown[] = [],
) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH Maxxum enrichment dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
) {
  const externalId = 'case-ih-maxxum-us-current-2026-09-systems-enrichment';
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
    [externalId],
  );
  if (rows[0]) return Number(rows[0].id);

  const rawReference = {
    captured: '2026-09-17',
    market: 'United States',
    family: 'Maxxum 115-150',
    rearPto: '540 and 1,000 rpm standard with reversible shaft',
    frontPto: 'Available',
    hydraulicPumpOptions: {
      activeDrive4: '22.7 US gal/min fixed displacement; 31.9 US gal/min optional PFC',
      activeDrive8: '22.7 US gal/min fixed displacement; 39.6 US gal/min PFC',
      cvxDrive: '39.6 US gal/min PFC',
    },
    rearRemotes: '2 to 4',
    rearHitchLiftCapacity: {
      standardLb: 6900,
      optionalLb: 8945,
    },
    emissionsControl: 'Selective Catalytic Reduction (SCR)',
  };

  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [
      sourceId,
      FAMILY_URL,
      externalId,
      'Case IH US Maxxum current PTO, hydraulic and hitch specifications',
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

export const caseIHMaxxumSystemsEnrichmentMigration: DbMigration = {
  id: '20260917_538_case_ih_maxxum_systems_enrichment',
  description: 'Enrich current US Case IH Maxxum 115-150 with official PTO, hydraulic, hitch and emissions-system data',
  async apply(connection) {
    const sourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`,
    );
    const sourceRecordId = await ensureSourceRecord(connection, sourceId);

    const definitionIds = new Map<string, number>();
    const definitions: Array<[string, string, string, string, string | null, number]> = [
      ['Engine', 'engine.emissions_control', 'Emissions control', 'text', null, 8],
      ['PTO', 'pto.rear_speed_options', 'Rear PTO speed options', 'text', null, 20],
      ['PTO', 'pto.front_availability', 'Front PTO', 'text', null, 30],
      ['Hydraulics', 'hydraulics.implement_pump_options', 'Implement pump options', 'text', null, 11],
      ['Hydraulics', 'hydraulics.rear_remote_count', 'Rear remote valves', 'text', null, 12],
      ['Hydraulics', 'hitch.rear_standard_lift_capacity', 'Standard rear hitch lift capacity', 'decimal', 'lb', 19],
    ];
    for (const definition of definitions) {
      definitionIds.set(definition[1], await ensureDefinition(connection, definition));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing Maxxum enrichment spec definition ${key}`);
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

      await putSpec(connection, machineId, versionId, def('engine.emissions_control'), sourceRecordId, 'Selective Catalytic Reduction (SCR)');
      await putSpec(connection, machineId, versionId, def('pto.rear_speed_options'), sourceRecordId, '540 and 1,000 rpm standard with reversible shaft');
      await putSpec(connection, machineId, versionId, def('pto.front_availability'), sourceRecordId, 'Available');
      await putSpec(
        connection,
        machineId,
        versionId,
        def('hydraulics.implement_pump_options'),
        sourceRecordId,
        'ActiveDrive 4: 22.7 fixed / 31.9 optional PFC; ActiveDrive 8: 22.7 fixed / 39.6 PFC; CVXDrive: 39.6 PFC (US gal/min)',
      );
      await putSpec(connection, machineId, versionId, def('hydraulics.rear_remote_count'), sourceRecordId, '2 to 4');
      await putSpec(connection, machineId, versionId, def('hitch.rear_standard_lift_capacity'), sourceRecordId, 6900, 'lb');
    }
  },
};
