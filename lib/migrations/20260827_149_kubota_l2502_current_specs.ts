import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type VersionSeed = {
  slug: string;
  configuration: string;
  transmission: string;
  driveline: string;
  ptoPower: number;
  ptoDescription: string;
};

const BROCHURE_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/l02-brochure94d1fc18-71d8-40e0-b75a-1b8f1a52a115.pdf?sfvrsn=f9de9c10_2';
const BROCHURE_EXTERNAL_ID = 'kubota-l02-current-brochure-l2502-2026-08';
const PRODUCT_URL = 'https://www.kubotausa.com/equipment-series/standard-l-series';
const PRODUCT_EXTERNAL_ID = 'kubota-standard-l-series-current-l2502-2026-08';

const versions: VersionSeed[] = [
  {
    slug: 'us-current-gear-2wd',
    configuration: 'L2502F 2WD gear-drive transmission',
    transmission: 'Constant mesh with synchronized shuttle, 8 forward / 8 reverse',
    driveline: '2WD',
    ptoPower: 19.8,
    ptoDescription: 'Rear PTO 540 rpm at 1910 engine rpm; transmission driven with overrunning clutch',
  },
  {
    slug: 'us-current-gear-4wd',
    configuration: 'L2502DT 4WD gear-drive transmission',
    transmission: 'Constant mesh with synchronized shuttle, 8 forward / 8 reverse',
    driveline: '4WD',
    ptoPower: 19.8,
    ptoDescription: 'Rear PTO 540 rpm at 1910 engine rpm; transmission driven with overrunning clutch',
  },
  {
    slug: 'us-current-hst-4wd',
    configuration: 'L2502HST 4WD hydrostatic transmission',
    transmission: 'Hydrostatic transmission, 3 range speed',
    driveline: '4WD',
    ptoPower: 18.4,
    ptoDescription: 'Rear PTO 540 rpm at approximately 2020 engine rpm; live independent PTO with hydraulic clutch',
  },
];

const definitions = [
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement_cuin','Displacement','decimal','cu in',6],
  ['Engine','engine.displacement_cc','Displacement','decimal','cm3',7],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',8],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','drivetrain.type','Driveline','text',null,20],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Hydraulics','hydraulics.main_pump_capacity','Main hydraulic pump capacity','decimal','gpm',10],
  ['Hydraulics','hydraulics.power_steering_pump_capacity','Power-steering pump capacity','decimal','gpm',20],
  ['Hydraulics','hydraulics.control_system','Hydraulic lift control','text',null,30],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',50],
  ['Steering & Brakes','steering.type','Steering','text',null,10],
  ['Steering & Brakes','brakes.type','Brake type','text',null,20],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota L2502 migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
) {
  const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (existing[0]) return Number(existing[0].id);
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
    `INSERT INTO machine_specs
      (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES (?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE
       value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),
       source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const kubotaL2502CurrentSpecsMigration: DbMigration = {
  id: '20260827_149_kubota_l2502_current_specs',
  description: 'Add current official Kubota USA L2502 specification sets for 2WD gear, 4WD gear and 4WD HST configurations',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId = await selectId(connection, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);

    await connection.query(
      `INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug)
       VALUES (?,?,'Standard L02 Series','standard-l02-series')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await selectId(
      connection,
      `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='standard-l02-series' LIMIT 1`,
      [manufacturerId, equipmentTypeId],
    );

    await connection.query(
      `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
       VALUES (?,?,?,'L2502','l2502','Current Kubota USA Standard L02 Series compact tractor','partial')
       ON DUPLICATE KEY UPDATE
         series_id=VALUES(series_id),model_name='L2502',market_notes=VALUES(market_notes),
         data_status=IF(data_status='verified','verified','partial')`,
      [manufacturerId, equipmentTypeId, seriesId],
    );
    const machineId = await selectId(
      connection,
      `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug='l2502' LIMIT 1`,
      [manufacturerId, equipmentTypeId],
    );

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

    const brochureSourceId = await ensureSourceRecord(
      connection,
      sourceId,
      BROCHURE_EXTERNAL_ID,
      BROCHURE_URL,
      'Kubota USA Standard L02 Series current brochure - L2502 specifications',
    );
    await ensureSourceRecord(
      connection,
      sourceId,
      PRODUCT_EXTERNAL_ID,
      PRODUCT_URL,
      'Kubota USA Standard L Series current product page - L2502',
    );

    const definitionIds = new Map<string, number>();
    for (const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions) {
      await connection.query(
        `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),
           canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        [section,key,label,valueType,canonicalUnit,displayOrder],
      );
      definitionIds.set(key, await selectId(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]));
    }
    const def = (key: string) => {
      const id = definitionIds.get(key);
      if (!id) throw new Error(`Missing Kubota L2502 spec definition ${key}`);
      return id;
    };

    for (const version of versions) {
      await connection.query(
        `INSERT INTO machine_versions
          (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE
           market_code='US',market_name='United States',configuration=VALUES(configuration),
           is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [
          machineId,
          version.slug,
          version.configuration,
          brochureSourceId,
          'Current Kubota USA L02 brochure. Configuration-specific PTO and transmission data are stored separately.',
        ],
      );
      const versionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, version.slug],
      );

      const common: Array<[string,string|number,string|null]> = [
        ['engine.make','Kubota',null],
        ['engine.type','Direct injection, vertical, water-cooled 4-cycle diesel',null],
        ['engine.cylinders',3,null],
        ['engine.displacement_cuin',100.5,'cu in'],
        ['engine.displacement_cc',1647,'cm3'],
        ['engine.gross_power',23.3,'hp'],
        ['engine.rated_speed',2200,'rpm'],
        ['hydraulics.main_pump_capacity',5.2,'gpm'],
        ['hydraulics.power_steering_pump_capacity',3.1,'gpm'],
        ['hydraulics.control_system','Position control',null],
        ['hitch.category','SAE Category I',null],
        ['hitch.lift_capacity_24in',1389,'lb'],
        ['steering.type','Integral type power steering',null],
        ['brakes.type','Mechanical wet disc',null],
      ];
      for (const [key,value,unit] of common) {
        await upsertSpec(connection,machineId,versionId,def(key),brochureSourceId,value,unit);
      }

      await upsertSpec(connection,machineId,versionId,def('transmission.standard'),brochureSourceId,version.transmission);
      await upsertSpec(connection,machineId,versionId,def('drivetrain.type'),brochureSourceId,version.driveline);
      await upsertSpec(connection,machineId,versionId,def('pto.rated_power'),brochureSourceId,version.ptoPower,'hp');
      await upsertSpec(connection,machineId,versionId,def('pto.rear_description'),brochureSourceId,version.ptoDescription);
    }
  },
};
