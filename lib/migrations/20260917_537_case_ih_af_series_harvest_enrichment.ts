import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/harvesting/af-series';

const models = [
  { slug: 'af9', separatorType: 'AFXL single rotor' },
  { slug: 'af10', separatorType: 'AFXL single rotor' },
  { slug: 'af11', separatorType: 'AFXL2 dual rotor' },
] as const;

async function selectId(
  connection: Parameters<DbMigration['apply']>[0],
  sql: string,
  params: unknown[] = [],
) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH AF Series enrichment dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
) {
  const externalId = 'case-ih-af-series-us-current-2026-09-harvest-enrichment';
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
    [externalId],
  );
  if (rows[0]) return Number(rows[0].id);

  const rawReference = {
    captured: '2026-09-17',
    market: 'United States',
    family: 'AF Series',
    rotorTechnology: {
      af9: 'AFXL single rotor',
      af10: 'AFXL single rotor',
      af11: 'AFXL2 dual rotor',
    },
    cleaningSystem: 'Cross Flow Plus four-sieve cleaning system',
    maximumSlopeCompensationDegrees: 13,
    cleanGrainElevatorCapacity: '8,000 or 10,000 bu/hr',
    note: 'Current Case IH US AF Series family page captured 2026-09-17.',
  };

  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [
      sourceId,
      FAMILY_URL,
      externalId,
      'Case IH US AF Series current harvesting-system specifications',
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
  unit: string | null,
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

export const caseIHAFSeriesHarvestEnrichmentMigration: DbMigration = {
  id: '20260917_537_case_ih_af_series_harvest_enrichment',
  description: 'Enrich current US Case IH AF9, AF10 and AF11 with official rotor, cleaning and grain-elevator specifications',
  async apply(connection) {
    const sourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`,
    );
    const sourceRecordId = await ensureSourceRecord(connection, sourceId);

    const separatorDefinitionId = await ensureDefinition(connection, [
      'Threshing & Separating',
      'threshing.separator_type',
      'Separator / rotor system',
      'text',
      null,
      10,
    ]);
    const cleaningSystemDefinitionId = await ensureDefinition(connection, [
      'Cleaning System',
      'cleaning.system',
      'Cleaning system',
      'text',
      null,
      10,
    ]);
    const slopeDefinitionId = await ensureDefinition(connection, [
      'Cleaning System',
      'cleaning.maximum_slope_compensation',
      'Maximum slope compensation',
      'decimal',
      'degrees',
      20,
    ]);
    const elevatorDefinitionId = await ensureDefinition(connection, [
      'Grain Handling',
      'grain.clean_grain_elevator_capacity',
      'Clean grain elevator capacity',
      'text',
      null,
      30,
    ]);

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

      await putSpec(connection, machineId, versionId, separatorDefinitionId, sourceRecordId, model.separatorType, null);
      await putSpec(
        connection,
        machineId,
        versionId,
        cleaningSystemDefinitionId,
        sourceRecordId,
        'Cross Flow Plus four-sieve cleaning system',
        null,
      );
      await putSpec(connection, machineId, versionId, slopeDefinitionId, sourceRecordId, 13, 'degrees');
      await putSpec(
        connection,
        machineId,
        versionId,
        elevatorDefinitionId,
        sourceRecordId,
        '8,000 or 10,000 bu/hr',
        null,
      );
    }
  },
};
