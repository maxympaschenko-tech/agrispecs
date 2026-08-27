import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const BROCHURE_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/m60-brochure---final-%281%29-compressed.pdf?sfvrsn=a3740294_4';
const BROCHURE_EXTERNAL_ID = 'kubota-m60-current-brochure-m6060-2026-08';
const SPEC_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/m60series_spec.pdf?sfvrsn=4f8ae861_6';
const SPEC_EXTERNAL_ID = 'kubota-m60-current-spec-sheet-m6060-2026-08';

const definitions = [
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.aspiration','Aspiration','text',null,5],
  ['Engine','engine.displacement','Displacement','decimal','L',6],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',7],
  ['Engine','engine.net_power','Net engine power','decimal','hp',8],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Engine','engine.fuel_system','Fuel system','text',null,10],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Hydraulics','hydraulics.three_point_pump_capacity','3-point hydraulic pump capacity','decimal','L/min',10],
  ['Hydraulics','hydraulics.control_system','Hydraulic control system','text',null,20],
  ['Hydraulics','hydraulics.remote_valves','Standard remote valves','text',null,30],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',50],
  ['Steering & Brakes','brakes.type','Brake type','text',null,20],
  ['Steering & Brakes','steering.type','Steering','text',null,10],
  ['Machine Configuration','drivetrain.4wd_clutch','4WD clutch type','text',null,30],
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','text',null,10],
  ['Electrical','electrical.alternator_options','Alternator','text',null,10],
  ['Dimensions & Weight','dimensions.overall_length_variants','Overall length','text',null,10],
  ['Dimensions & Weight','dimensions.overall_height_variants','Overall height','text',null,20],
  ['Dimensions & Weight','dimensions.wheelbase_variants','Wheelbase','text',null,30],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',40],
  ['Dimensions & Weight','dimensions.crop_clearance','Crop clearance at front axle','decimal','in',50],
  ['Dimensions & Weight','weight.tractor_variants','Tractor weight','text',null,60],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota M6060 migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string,
) {
  const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
  if (existing[0]) return Number(existing[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId,url,externalId,title],
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
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),
       source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId,versionId,definitionId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceRecordId],
  );
}

export const kubotaM6060CurrentSpecsMigration: DbMigration = {
  id: '20260827_138_kubota_m6060_current_specs',
  description: 'Add current official Kubota USA M6060 specification, hydraulic and dimension data',
  async apply(connection) {
    const manufacturerId = await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId = await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);

    await connection.query(
      `INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug)
       VALUES (?,?,'M60 Series','m60-series')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,[manufacturerId,equipmentTypeId],
    );
    const seriesId = await selectId(connection,
      `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='m60-series' LIMIT 1`,
      [manufacturerId,equipmentTypeId],
    );

    await connection.query(
      `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
       VALUES (?,?,?,'M6060','m6060','Current Kubota USA M60 Series utility tractor','partial')
       ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name='M6060',market_notes=VALUES(market_notes),
         data_status=IF(data_status='verified','verified','partial')`,
      [manufacturerId,equipmentTypeId,seriesId],
    );
    const machineId = await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug='m6060' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }
    const brochureSourceId = await ensureSourceRecord(connection,sourceId,BROCHURE_EXTERNAL_ID,BROCHURE_URL,'Kubota USA M60 Series current brochure - M6060');
    const specSourceId = await ensureSourceRecord(connection,sourceId,SPEC_EXTERNAL_ID,SPEC_URL,'Kubota USA M60 Series specification sheet - M6060');

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
    const def = (key:string) => { const id=definitionIds.get(key); if(!id) throw new Error(`Missing M6060 definition ${key}`); return id; };

    await connection.query(
      `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
       VALUES (?,'us-current-8f8r','US','United States','M6060 HFC 2WD Cab / HD 4WD ROPS / HDC 4WD Cab, F8/R8 Hydraulic Shuttle',TRUE,?,?)
       ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),
         is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
      [machineId,brochureSourceId,'Current Kubota USA M60 Series configuration. Dimensions and weights are retained as configuration variants where 2WD, 4WD, ROPS and Cab differ.'],
    );
    const versionId = await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug='us-current-8f8r' LIMIT 1`,[machineId]);

    await upsertSpec(connection,machineId,versionId,def('engine.make'),brochureSourceId,'Kubota');
    await upsertSpec(connection,machineId,versionId,def('engine.model'),brochureSourceId,'V3307-CR-TE4');
    await upsertSpec(connection,machineId,versionId,def('engine.type'),brochureSourceId,'4-cylinder in-line diesel, Common Rail System, direct injection');
    await upsertSpec(connection,machineId,versionId,def('engine.cylinders'),brochureSourceId,4);
    await upsertSpec(connection,machineId,versionId,def('engine.aspiration'),brochureSourceId,'Turbocharged');
    await upsertSpec(connection,machineId,versionId,def('engine.displacement'),brochureSourceId,3.331,'L');
    await upsertSpec(connection,machineId,versionId,def('engine.gross_power'),brochureSourceId,66.4,'hp');
    await upsertSpec(connection,machineId,versionId,def('engine.net_power'),specSourceId,63.5,'hp');
    await upsertSpec(connection,machineId,versionId,def('engine.rated_speed'),brochureSourceId,2400,'rpm');
    await upsertSpec(connection,machineId,versionId,def('engine.fuel_system'),brochureSourceId,'Common Rail System (CRS), direct injection');
    await upsertSpec(connection,machineId,versionId,def('transmission.standard'),brochureSourceId,'8 forward / 8 reverse fully synchronized Hydraulic Shuttle');
    await upsertSpec(connection,machineId,versionId,def('pto.rated_power'),brochureSourceId,56,'hp');
    await upsertSpec(connection,machineId,versionId,def('pto.rear_description'),brochureSourceId,'Live-independent PTO; 540 rpm, 540/540E optional');
    await upsertSpec(connection,machineId,versionId,def('hydraulics.three_point_pump_capacity'),brochureSourceId,41.6,'L/min');
    await upsertSpec(connection,machineId,versionId,def('hydraulics.control_system'),brochureSourceId,'Position, draft (top-link sensing) and mixed control');
    await upsertSpec(connection,machineId,versionId,def('hydraulics.remote_valves'),brochureSourceId,'1 standard; 2nd, 3rd and flow-control valve optional');
    await upsertSpec(connection,machineId,versionId,def('hitch.category'),brochureSourceId,'Category I / II');
    await upsertSpec(connection,machineId,versionId,def('hitch.lift_capacity_24in'),brochureSourceId,3307,'lb');
    await upsertSpec(connection,machineId,versionId,def('brakes.type'),brochureSourceId,'Mechanically operated wet disc');
    await upsertSpec(connection,machineId,versionId,def('steering.type'),brochureSourceId,'Hydrostatic power steering');
    await upsertSpec(connection,machineId,versionId,def('drivetrain.4wd_clutch'),brochureSourceId,'Mechanical on-the-go on 4WD configuration');
    await upsertSpec(connection,machineId,versionId,def('capacities.fuel_tank_variants'),brochureSourceId,'ROPS: 18.5 US gal (70 L); Cab: 23.8 US gal (90 L)');
    await upsertSpec(connection,machineId,versionId,def('electrical.alternator_options'),brochureSourceId,'ROPS: 45 A; Cab: 60 A; 100 A optional');
    await upsertSpec(connection,machineId,versionId,def('dimensions.overall_length_variants'),brochureSourceId,'2WD Cab: 142.7 in (3625 mm); 4WD ROPS/Cab: 138.0 in (3505 mm)');
    await upsertSpec(connection,machineId,versionId,def('dimensions.overall_height_variants'),brochureSourceId,'4WD ROPS: 96.9 in (2460 mm); Cab: 100.6 in (2555 mm)');
    await upsertSpec(connection,machineId,versionId,def('dimensions.wheelbase_variants'),brochureSourceId,'2WD Cab: 84.4 in (2145 mm); 4WD: 83.1 in (2110 mm)');
    await upsertSpec(connection,machineId,versionId,def('dimensions.overall_width'),brochureSourceId,73,'in');
    await upsertSpec(connection,machineId,versionId,def('dimensions.crop_clearance'),brochureSourceId,18.1,'in');
    await upsertSpec(connection,machineId,versionId,def('weight.tractor_variants'),brochureSourceId,'4WD ROPS: 5005 lb (2270 kg); 2WD Cab: 5226 lb (2370 kg); 4WD Cab: 5358 lb (2430 kg)');
  },
};
