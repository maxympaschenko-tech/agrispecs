import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/m60-brochure---final-%281%29-compressed.pdf?sfvrsn=a3740294_4';
const SOURCE_EXTERNAL_ID = 'kubota-m60-current-brochure-2026-08';

const definitions = [
  ['Hydraulics','hydraulics.three_point_pump_capacity','3-point hydraulic pump capacity','decimal','L/min',10],
  ['Hydraulics','hydraulics.control_system','Hydraulic control system','text',null,20],
  ['Hydraulics','hydraulics.remote_valves','Standard remote valves','text',null,30],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',50],
  ['Steering & Brakes','brakes.type','Brake type','text',null,20],
  ['Machine Configuration','drivetrain.4wd_clutch','4WD clutch type','text',null,30],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota M7060 current hydraulic migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
) {
  const [existing] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
    [SOURCE_EXTERNAL_ID],
  );
  if (existing[0]) return Number(existing[0].id);

  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title)
     VALUES (?,?,?,?)`,
    [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA M60 Series current brochure - M7060 specifications'],
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
    `INSERT INTO machine_specs
      (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES (?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE
       value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),
       source_record_id=VALUES(source_record_id),confidence='official'`,
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

export const kubotaM7060CurrentHydraulicsPtoCorrectionMigration: DbMigration = {
  id: '20260827_135_kubota_m7060_current_hydraulics_pto_correction',
  description: 'Use the newest Kubota USA M60 brochure for M7060 PTO power and add configuration-specific hydraulic, hitch and brake specifications',
  async apply(connection) {
    const machineId = await selectId(connection, `
      SELECT m.id FROM machines m
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='kubota' AND m.slug='m7060' LIMIT 1
    `);

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level)
         VALUES ('Kubota','kubotausa.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }
    const sourceRecordId = await ensureSourceRecord(connection,sourceId);

    const definitionIds = new Map<string,number>();
    for (const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions) {
      await connection.query(
        `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),
           canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        [section,key,label,valueType,canonicalUnit,displayOrder],
      );
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def = (key: string) => {
      const id = definitionIds.get(key);
      if (!id) throw new Error(`Missing Kubota M7060 definition ${key}`);
      return id;
    };

    const ptoDefinitionId = await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key='pto.rated_power' LIMIT 1`);

    const version8 = await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug='us-current-8f8r' LIMIT 1`,[machineId]);
    const version12 = await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug='us-current-12f12r' LIMIT 1`,[machineId]);

    // Newest Kubota USA M60 brochure supersedes the older current spec sheet for PTO output.
    await upsertSpec(connection,machineId,version8,ptoDefinitionId,sourceRecordId,62,'hp');
    await upsertSpec(connection,machineId,version12,ptoDefinitionId,sourceRecordId,60,'hp');

    for (const [versionId,pumpFlow,brakes,fourWdClutch] of [
      [version8,41.6,'Mechanically operated wet disc','Mechanical on-the-go'],
      [version12,61.5,'Hydraulically operated wet disc','Electro-hydraulic on-the-go'],
    ] as const) {
      await upsertSpec(connection,machineId,versionId,def('hydraulics.three_point_pump_capacity'),sourceRecordId,pumpFlow,'L/min');
      await upsertSpec(connection,machineId,versionId,def('hydraulics.control_system'),sourceRecordId,'Position, draft (top-link sensing) and mixed control');
      await upsertSpec(connection,machineId,versionId,def('hydraulics.remote_valves'),sourceRecordId,'1 standard; 2nd, 3rd and flow-control valve optional');
      await upsertSpec(connection,machineId,versionId,def('hitch.category'),sourceRecordId,'Category I / II');
      await upsertSpec(connection,machineId,versionId,def('hitch.lift_capacity_24in'),sourceRecordId,3307,'lb');
      await upsertSpec(connection,machineId,versionId,def('brakes.type'),sourceRecordId,brakes);
      await upsertSpec(connection,machineId,versionId,def('drivetrain.4wd_clutch'),sourceRecordId,fourWdClutch);
    }
  },
};
