import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/m60-brochure---final-%281%29-compressed.pdf?sfvrsn=a3740294_4';
const SOURCE_EXTERNAL_ID = 'kubota-m60-current-brochure-m5660su-2026-08';

const definitions = [
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.aspiration','Aspiration','text',null,5],
  ['Engine','engine.displacement','Displacement','decimal','L',6],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',7],
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
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','text',null,10],
  ['Electrical','electrical.alternator_options','Alternator','text',null,10],
  ['Dimensions & Weight','dimensions.overall_length_variants','Overall length','text',null,10],
  ['Dimensions & Weight','dimensions.overall_height_variants','Overall height','text',null,20],
  ['Dimensions & Weight','dimensions.wheelbase_variants','Wheelbase','text',null,30],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',40],
  ['Dimensions & Weight','dimensions.crop_clearance','Crop clearance at front axle','decimal','in',50],
  ['Dimensions & Weight','dimensions.turning_radius_variants','Turning radius without brake','text',null,55],
  ['Dimensions & Weight','weight.tractor_variants','Tractor weight','text',null,60],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql:string, params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M5660SU migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[SOURCE_EXTERNAL_ID]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA M60 Series current brochure - M5660SU'],
  );
  return Number(result.insertId);
}

async function upsertSpec(connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,definitionId:number,sourceRecordId:number,value:string|number,unit:string|null=null){
  await connection.query(
    `INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES (?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId,versionId,definitionId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceRecordId],
  );
}

export const kubotaM5660SUCurrentSpecsMigration:DbMigration={
  id:'20260827_140_kubota_m5660su_current_specs',
  description:'Add current official Kubota USA M5660SU specification, hydraulic and dimension data',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await connection.query(`INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,'M60 Series','m60-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[manufacturerId,equipmentTypeId]);
    const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='m60-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);
    await connection.query(
      `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
       VALUES (?,?,?,'M5660SU','m5660su','Current Kubota USA M60 Series utility tractor','partial')
       ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name='M5660SU',market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
      [manufacturerId,equipmentTypeId,seriesId],
    );
    const machineId=await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug='m5660su' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){ const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`); sourceId=Number(result.insertId); }
    const sourceRecordId=await ensureSourceRecord(connection,sourceId);

    const definitionIds=new Map<string,number>();
    for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){
      await connection.query(`INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,[section,key,label,valueType,canonicalUnit,displayOrder]);
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def=(key:string)=>{const id=definitionIds.get(key);if(!id)throw new Error(`Missing M5660SU definition ${key}`);return id;};

    await connection.query(
      `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
       VALUES (?,'us-current-8f8r','US','United States','M5660SUH 2WD / M5660SUHD 4WD, F8/R8 Hydraulic Shuttle',TRUE,?,?)
       ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
      [machineId,sourceRecordId,'Current Kubota USA M60 Series brochure. 2WD and 4WD dimensional variants are retained explicitly.'],
    );
    const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug='us-current-8f8r' LIMIT 1`,[machineId]);

    const values:[string,string|number,string|null][]=[
      ['engine.make','Kubota',null],['engine.model','V2403-CR-TE4',null],['engine.type','4-cylinder in-line diesel, Common Rail System, direct injection',null],
      ['engine.cylinders',4,null],['engine.aspiration','Turbocharged',null],['engine.displacement',2.434,'L'],['engine.gross_power',58.7,'hp'],['engine.rated_speed',2600,'rpm'],
      ['engine.fuel_system','Common Rail System (CRS), direct injection',null],['transmission.standard','8 forward / 8 reverse fully synchronized Hydraulic Shuttle',null],
      ['pto.rated_power',50,'hp'],['pto.rear_description','540 rpm; 540/540E optional',null],['hydraulics.three_point_pump_capacity',40.2,'L/min'],
      ['hydraulics.control_system','Position control',null],['hydraulics.remote_valves','1 standard; 2nd, 3rd and flow-control valve optional',null],['hitch.category','Category I / II',null],
      ['hitch.lift_capacity_24in',3307,'lb'],['brakes.type','Mechanically operated wet disc',null],['steering.type','Hydrostatic power steering',null],
      ['capacities.fuel_tank_variants','17.7 US gal (67 L)',null],['electrical.alternator_options','45 A',null],
      ['dimensions.overall_length_variants','2WD: 138.7 in (3525 mm); 4WD: 136.0 in (3455 mm)',null],['dimensions.overall_height_variants','Top of ROPS: 95.3 in (2420 mm)',null],
      ['dimensions.wheelbase_variants','2WD: 82.0 in (2085 mm); 4WD: 80.7 in (2050 mm)',null],['dimensions.overall_width',73,'in'],['dimensions.crop_clearance',16.9,'in'],
      ['dimensions.turning_radius_variants','2WD: 11.1 ft (3.4 m); 4WD: 12.8 ft (3.9 m)',null],['weight.tractor_variants','2WD ROPS: 4189 lb (1900 kg); 4WD ROPS: 4387 lb (1990 kg)',null],
    ];
    for(const [key,value,unit] of values) await upsertSpec(connection,machineId,versionId,def(key),sourceRecordId,value,unit);
  },
};
