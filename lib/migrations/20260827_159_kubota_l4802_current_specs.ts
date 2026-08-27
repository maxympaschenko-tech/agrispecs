import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id:number };

type VersionSeed = {
  slug:'us-current-gear-2wd'|'us-current-gear-4wd'|'us-current-hst-4wd';
  configuration:string;
  transmission:string;
  drivetrain:string;
  ptoPower:number;
  ptoEngineRpm:number;
  length:number;
  turningRadius:number;
  weight:number;
};

const DETAIL_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/l02-brochure94d1fc18-71d8-40e0-b75a-1b8f1a52a115.pdf?sfvrsn=f9de9c10_1';
const DETAIL_EXTERNAL_ID='kubota-l02-l4802-current-detail-brochure-2026-08';
const CURRENT_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const CURRENT_EXTERNAL_ID='kubota-2026-full-line-l4802-current';

const versions:VersionSeed[]=[
  {
    slug:'us-current-gear-2wd',
    configuration:'L4802F 2WD gear-drive transmission',
    transmission:'Constant mesh with synchronized shuttle, 8 forward / 8 reverse',
    drivetrain:'2WD',ptoPower:40.5,ptoEngineRpm:2475,length:122.8,turningRadius:8.9,weight:3296,
  },
  {
    slug:'us-current-gear-4wd',
    configuration:'L4802DT 4WD gear-drive transmission',
    transmission:'Constant mesh with synchronized shuttle, 8 forward / 8 reverse',
    drivetrain:'4WD',ptoPower:40.5,ptoEngineRpm:2475,length:120.3,turningRadius:8.5,weight:3428,
  },
  {
    slug:'us-current-hst-4wd',
    configuration:'L4802HST 4WD hydrostatic transmission',
    transmission:'Hydrostatic transmission, 3 range speed',
    drivetrain:'4WD',ptoPower:39.0,ptoEngineRpm:2640,length:120.3,turningRadius:8.5,weight:3549,
  },
];

const definitions=[
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
  ['Electrical','electrical.alternator_options','Alternator','text',null,20],
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','text',null,10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length without 3-point','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width at minimum tread','decimal','in',20],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.ground_clearance','Minimum ground clearance','decimal','in',50],
  ['Dimensions & Weight','dimensions.turning_radius','Minimum turning radius with brake, 4WD disengaged','decimal','ft',60],
  ['Dimensions & Weight','weight.tractor','Tractor weight with ROPS','decimal','lb',70],
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota L4802 migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,url:string,externalId:string,title:string){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId,url,externalId,title],
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

export const kubotaL4802CurrentSpecsMigration:DbMigration={
  id:'20260827_159_kubota_l4802_current_specs',
  description:'Add current official Kubota USA L4802 2WD gear, 4WD gear and 4WD HST specification variants',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='standard-l02-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const detailSourceId=await ensureSourceRecord(connection,sourceId,DETAIL_URL,DETAIL_EXTERNAL_ID,'Kubota USA L02 Series brochure - L4802 detailed specifications');
    const currentSourceId=await ensureSourceRecord(connection,sourceId,CURRENT_URL,CURRENT_EXTERNAL_ID,'Kubota USA 2026 Full Product Line - current L4802 configuration lineup');

    await connection.query(
      `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
       VALUES (?,?,?,'L4802','l4802','Current Kubota USA Standard L02 Series compact tractor','partial')
       ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name='L4802',market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
      [manufacturerId,equipmentTypeId,seriesId],
    );
    const machineId=await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug='l4802' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    const definitionIds=new Map<string,number>();
    for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){
      await connection.query(`INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,[section,key,label,valueType,canonicalUnit,displayOrder]);
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def=(key:string)=>{const id=definitionIds.get(key);if(!id)throw new Error(`Missing L4802 spec definition ${key}`);return id;};

    for(const version of versions){
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,version.slug,version.configuration,currentSourceId,'Kubota USA 2026 full-line brochure confirms this L4802 configuration as current; detailed values are sourced from the official L02 brochure.'],
      );
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,version.slug]);
      const values:Array<[string,string|number,string|null]>=[
        ['engine.make','Kubota',null],['engine.type','Direct injection, vertical, water-cooled 4-cycle diesel',null],['engine.cylinders',4,null],
        ['engine.bore_stroke','3.4 × 4.0 in (87 × 102.4 mm)',null],['engine.displacement_cuin',148.5,'cu in'],['engine.displacement_cc',2434,'cm3'],
        ['engine.gross_power',48.4,'hp'],['engine.net_power',46.0,'hp'],['engine.rated_speed',2600,'rpm'],['transmission.standard',version.transmission,null],
        ['drivetrain.type',version.drivetrain,null],['pto.rated_power',version.ptoPower,'hp'],['pto.rear_description',`540 rpm at ${version.ptoEngineRpm} engine rpm`,null],
        ['hydraulics.main_pump_capacity',7.8,'gpm'],['hydraulics.power_steering_pump_capacity',4.7,'gpm'],['hydraulics.control_system','Position control',null],
        ['hitch.category','SAE Category I',null],['hitch.lift_capacity_at_points',2870,'lb'],['hitch.lift_capacity_24in',2320,'lb'],['hydraulics.system_pressure','2560 psi',null],
        ['steering.type','Hydrostatic power steering',null],['brakes.type','Mechanical wet disc',null],['electrical.alternator_options','12 V, 45 A',null],['capacities.fuel_tank_variants','13.5 US gal (51 L)',null],
        ['dimensions.overall_length',version.length,'in'],['dimensions.overall_width',62.2,'in'],['dimensions.wheelbase',72.6,'in'],['dimensions.ground_clearance',15.2,'in'],['dimensions.turning_radius',version.turningRadius,'ft'],['weight.tractor',version.weight,'lb'],
      ];
      for(const [key,value,unit] of values) await upsertSpec(connection,machineId,versionId,def(key),detailSourceId,value,unit);
    }
  },
};
