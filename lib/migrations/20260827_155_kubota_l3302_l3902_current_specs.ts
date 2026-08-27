import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type ModelSeed = {
  modelName: 'L3302' | 'L3902';
  slug: 'l3302' | 'l3902';
  grossPower: number;
  netPower: number;
  gearPtoPower: number;
  hstPtoPower: number;
  gearPtoEngineRpm: number;
  hstPtoEngineRpm: number;
  gearWeight: number;
  hstWeight: number;
};

const SOURCE_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/l02-specs.pdf?sfvrsn=b38325da_2';
const SOURCE_EXTERNAL_ID = 'kubota-l02-l3302-l3902-current-spec-sheet-2026-08';

const models: ModelSeed[] = [
  {
    modelName: 'L3302', slug: 'l3302', grossPower: 33.0, netPower: 31.8,
    gearPtoPower: 28.0, hstPtoPower: 26.1, gearPtoEngineRpm: 2430, hstPtoEngineRpm: 2470,
    gearWeight: 2833, hstWeight: 2899,
  },
  {
    modelName: 'L3902', slug: 'l3902', grossPower: 37.5, netPower: 36.3,
    gearPtoPower: 32.1, hstPtoPower: 30.3, gearPtoEngineRpm: 2425, hstPtoEngineRpm: 2470,
    gearWeight: 2866, hstWeight: 2899,
  },
];

const definitions = [
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.type','Engine type','text',null,2],
  ['Engine','engine.cylinders','Cylinders','integer',null,3],
  ['Engine','engine.bore_stroke','Bore × stroke','text',null,4],
  ['Engine','engine.displacement_cuin','Displacement','decimal','cu in',5],
  ['Engine','engine.displacement_cc','Displacement','decimal','cm3',6],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',7],
  ['Engine','engine.net_power','Net engine power','decimal','hp',8],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','drivetrain.type','Driveline','text',null,20],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Hydraulics','hydraulics.main_pump_capacity','Main hydraulic pump capacity','decimal','gpm',10],
  ['Hydraulics','hydraulics.power_steering_pump_capacity','Power-steering pump capacity','decimal','gpm',20],
  ['Hydraulics','hydraulics.control_system','Hydraulic lift control','text',null,30],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Hydraulics','hitch.lift_capacity_at_points','3-point lift capacity at lift points','decimal','lb',45],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',50],
  ['Hydraulics','hydraulics.system_pressure','Hydraulic system pressure','text',null,60],
  ['Steering & Brakes','steering.type','Steering','text',null,10],
  ['Steering & Brakes','brakes.type','Brake type','text',null,20],
  ['Electrical','electrical.battery','Battery','text',null,10],
  ['Electrical','electrical.alternator_options','Alternator','text',null,20],
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','text',null,10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length without 3-point','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width at minimum tread','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_height','Overall height with foldable ROPS','decimal','in',30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.ground_clearance','Minimum ground clearance','decimal','in',50],
  ['Dimensions & Weight','dimensions.turning_radius','Minimum turning radius with brake, 4WD disengaged','decimal','ft',60],
  ['Dimensions & Weight','weight.tractor','Tractor weight with ROPS','decimal','lb',70],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota L3302/L3902 migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number) {
  const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [SOURCE_EXTERNAL_ID]);
  if (existing[0]) return Number(existing[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId, SOURCE_URL, SOURCE_EXTERNAL_ID, 'Kubota USA L02 Series current specification sheet - L3302 and L3902'],
  );
  return Number(result.insertId);
}

async function upsertSpec(
  connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number,
  definitionId: number, sourceRecordId: number, value: string | number, unit: string | null = null,
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

export const kubotaL3302L3902CurrentSpecsMigration: DbMigration = {
  id: '20260827_155_kubota_l3302_l3902_current_specs',
  description: 'Add current official Kubota USA L3302 and L3902 gear/HST specification sets from the latest L02 spec sheet',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId = await selectId(connection, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const seriesId = await selectId(connection, `
      SELECT id FROM machine_series
      WHERE manufacturer_id=? AND equipment_type_id=? AND slug='standard-l02-series' LIMIT 1
    `, [manufacturerId, equipmentTypeId]);

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }
    const sourceRecordId = await ensureSourceRecord(connection, sourceId);

    const definitionIds = new Map<string, number>();
    for (const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions) {
      await connection.query(
        `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),
           canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        [section,key,label,valueType,canonicalUnit,displayOrder],
      );
      definitionIds.set(key, await selectId(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]));
    }
    const def = (key: string) => {
      const id = definitionIds.get(key);
      if (!id) throw new Error(`Missing L02 spec definition ${key}`);
      return id;
    };

    for (const model of models) {
      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES (?,?,?,?,?,'Current Kubota USA Standard L02 Series compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),
           data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,equipmentTypeId,seriesId,model.modelName,model.slug],
      );
      const machineId = await selectId(
        connection,
        `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,
        [manufacturerId,equipmentTypeId,model.slug],
      );

      const versions = [
        {
          slug: 'us-current-gear-4wd',
          configuration: `${model.modelName}DT 4WD gear-drive transmission`,
          transmission: 'Gear shift with synchronized shuttle, 8 forward / 8 reverse',
          ptoPower: model.gearPtoPower,
          ptoEngineRpm: model.gearPtoEngineRpm,
          battery: '12 V, reserve capacity 110 min, CCA 580 A',
          weight: model.gearWeight,
        },
        {
          slug: 'us-current-hst-4wd',
          configuration: `${model.modelName}HST 4WD hydrostatic transmission`,
          transmission: 'Hydrostatic transmission, 3 range speed',
          ptoPower: model.hstPtoPower,
          ptoEngineRpm: model.hstPtoEngineRpm,
          battery: '12 V, reserve capacity 120 min, CCA 600 A',
          weight: model.hstWeight,
        },
      ] as const;

      for (const version of versions) {
        await connection.query(
          `INSERT INTO machine_versions
            (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
           VALUES (?,?,'US','United States',?,TRUE,?,?)
           ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),
             is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
          [machineId,version.slug,version.configuration,sourceRecordId,
            'Current Kubota USA L02 specification sheet. Gear and HST values are kept as separate current versions.'],
        );
        const versionId = await selectId(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId,version.slug]);

        const values: Array<[string,string|number,string|null]> = [
          ['engine.make','Kubota',null],
          ['engine.type','Direct injection, vertical, water-cooled 4-cycle diesel',null],
          ['engine.cylinders',3,null],
          ['engine.bore_stroke','3.4 × 4.0 in (87 × 102.4 mm)',null],
          ['engine.displacement_cuin',111.4,'cu in'],
          ['engine.displacement_cc',1826,'cm3'],
          ['engine.gross_power',model.grossPower,'hp'],
          ['engine.net_power',model.netPower,'hp'],
          ['engine.rated_speed',2700,'rpm'],
          ['transmission.standard',version.transmission,null],
          ['drivetrain.type','4WD',null],
          ['pto.rated_power',version.ptoPower,'hp'],
          ['pto.rear_description',`540 rpm at ${version.ptoEngineRpm} engine rpm`,null],
          ['hydraulics.main_pump_capacity',6.8,'gpm'],
          ['hydraulics.power_steering_pump_capacity',4.1,'gpm'],
          ['hydraulics.control_system','Position control',null],
          ['hitch.category','SAE Category I',null],
          ['hitch.lift_capacity_at_points',1985,'lb'],
          ['hitch.lift_capacity_24in',1433,'lb'],
          ['hydraulics.system_pressure','165 kgf/cm² (16.2 MPa)',null],
          ['steering.type','Integral type power steering',null],
          ['brakes.type','Mechanical wet disc',null],
          ['electrical.battery',version.battery,null],
          ['electrical.alternator_options','12 V, 45 A',null],
          ['capacities.fuel_tank_variants','11.1 US gal (42 L)',null],
          ['dimensions.overall_length',108.7,'in'],
          ['dimensions.overall_width',55.1,'in'],
          ['dimensions.overall_height',91.7,'in'],
          ['dimensions.wheelbase',63.4,'in'],
          ['dimensions.ground_clearance',13.4,'in'],
          ['dimensions.turning_radius',8.2,'ft'],
          ['weight.tractor',version.weight,'lb'],
        ];
        for (const [key,value,unit] of values) {
          await upsertSpec(connection,machineId,versionId,def(key),sourceRecordId,value,unit);
        }
      }
    }
  },
};
