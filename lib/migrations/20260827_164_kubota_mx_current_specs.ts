import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id:number };

type ModelSlug='mx4900'|'mx5400'|'mx6000';
type VersionSeed={
  slug:string;
  configuration:string;
  transmission:string;
  drivetrain:string;
  grossPower:number;
  netPower:number;
  ptoPower:number;
};
type ModelSeed={modelName:string;slug:ModelSlug;versions:VersionSeed[]};

const CURRENT_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const CURRENT_EXTERNAL_ID='kubota-2026-full-line-mx-series-current';
const SPEC_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/mx-brochure-update.pdf?sfvrsn=9a06b760_4';
const SPEC_EXTERNAL_ID='kubota-mx-series-current-spec-brochure-2026-02';

const models:ModelSeed[]=[
  {
    modelName:'MX4900',slug:'mx4900',versions:[
      {slug:'us-current-gear-4wd',configuration:'MX4900 DT/DTC 4WD gear-drive, ROPS or cab',transmission:'Partially synchronized gear drive (3rd & 4th), synchronized shuttle, 8 forward / 8 reverse',drivetrain:'4WD',grossPower:50.3,netPower:47.7,ptoPower:41.3},
      {slug:'us-current-hst-4wd',configuration:'MX4900 HST/HSTC 4WD hydrostatic, ROPS or cab',transmission:'Hydrostatic pedal operation, 3 range speed',drivetrain:'4WD',grossPower:51.8,netPower:48.5,ptoPower:41.3},
    ],
  },
  {
    modelName:'MX5400',slug:'mx5400',versions:[
      {slug:'us-current-gear-2wd',configuration:'MX5400F 2WD gear-drive ROPS',transmission:'Partially synchronized gear drive (3rd & 4th), synchronized shuttle, 8 forward / 8 reverse',drivetrain:'2WD',grossPower:55.5,netPower:53.0,ptoPower:46.5},
      {slug:'us-current-gear-4wd',configuration:'MX5400 DT/DTC 4WD gear-drive, ROPS or cab',transmission:'Partially synchronized gear drive (3rd & 4th), synchronized shuttle, 8 forward / 8 reverse',drivetrain:'4WD',grossPower:55.5,netPower:53.0,ptoPower:46.5},
      {slug:'us-current-hst-4wd',configuration:'MX5400 HST/HSTC 4WD hydrostatic, ROPS or cab',transmission:'Hydrostatic pedal operation, 3 range speed',drivetrain:'4WD',grossPower:57.0,netPower:53.8,ptoPower:46.5},
    ],
  },
  {
    modelName:'MX6000',slug:'mx6000',versions:[
      {slug:'us-current-hst-4wd',configuration:'MX6000 HST/HSTC 4WD hydrostatic, ROPS or cab',transmission:'Hydrostatic pedal operation, 3 range speed',drivetrain:'4WD',grossPower:63.4,netPower:59.5,ptoPower:51.8},
    ],
  },
];

const definitions=[
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.aspiration','Aspiration','text',null,5],
  ['Engine','engine.displacement_cuin','Displacement','decimal','cu in',6],
  ['Engine','engine.displacement_cc','Displacement','decimal','cm3',7],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',8],
  ['Engine','engine.net_power','Net engine power','decimal','hp',9],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',10],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','drivetrain.type','Driveline','text',null,20],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Hydraulics','hydraulics.main_pump_capacity','Main hydraulic pump capacity','decimal','gpm',10],
  ['Hydraulics','hydraulics.power_steering_pump_capacity','Power-steering pump capacity','decimal','gpm',20],
  ['Hydraulics','hydraulics.control_system','Hydraulic lift control','text',null,30],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',50],
  ['Hydraulics','hydraulics.remote_valves','Remote valves','text',null,60],
  ['Steering & Brakes','steering.type','Steering','text',null,10],
  ['Steering & Brakes','brakes.type','Brake type','text',null,20],
  ['Electrical','electrical.alternator_options','Alternator','text',null,10],
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','text',null,10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.ground_clearance','Minimum ground clearance','decimal','in',50],
  ['Dimensions & Weight','weight.tractor_variants','Tractor weight','text',null,70],
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota MX Series migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,url:string,externalId:string,title:string){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,url,externalId,title]);
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

export const kubotaMXCurrentSpecsMigration:DbMigration={
  id:'20260827_164_kubota_mx_current_specs',
  description:'Add current official Kubota USA MX4900, MX5400 and MX6000 specification variants',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await connection.query(`INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,'MX Series','mx-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[manufacturerId,equipmentTypeId]);
    const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='mx-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const currentSourceId=await ensureSourceRecord(connection,sourceId,CURRENT_URL,CURRENT_EXTERNAL_ID,'Kubota USA 2026 Full Product Line - current MX Series lineup');
    const specSourceId=await ensureSourceRecord(connection,sourceId,SPEC_URL,SPEC_EXTERNAL_ID,'Kubota USA MX Series current specification brochure');

    const definitionIds=new Map<string,number>();
    for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){
      await connection.query(`INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,[section,key,label,valueType,canonicalUnit,displayOrder]);
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def=(key:string)=>{const id=definitionIds.get(key);if(!id)throw new Error(`Missing MX spec definition ${key}`);return id;};

    for(const model of models){
      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES (?,?,?,?,?,'Current Kubota USA MX Series compact utility tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,equipmentTypeId,seriesId,model.modelName,model.slug],
      );
      const machineId=await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.slug]);

      for(const version of model.versions){
        await connection.query(
          `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
           VALUES (?,?,'US','United States',?,TRUE,?,?)
           ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
          [machineId,version.slug,version.configuration,currentSourceId,'Kubota USA 2026 Full Product Line confirms this current MX configuration; numerical values are sourced from the current MX specification brochure.'],
        );
        const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,version.slug]);
        const weightText=model.slug==='mx4900'?'ROPS: 3474 lb; cab: 4268 lb':'ROPS: 3734 lb; cab: 4268 lb';
        const values:Array<[string,string|number,string|null]>=[
          ['engine.make','Kubota',null],['engine.model','V2403CR-T',null],['engine.type','Liquid-cooled diesel, Common Rail System, direct injection',null],['engine.cylinders',4,null],['engine.aspiration','Turbocharged',null],
          ['engine.displacement_cuin',148.6,'cu in'],['engine.displacement_cc',2434,'cm3'],['engine.gross_power',version.grossPower,'hp'],['engine.net_power',version.netPower,'hp'],['engine.rated_speed',2700,'rpm'],
          ['transmission.standard',version.transmission,null],['drivetrain.type',version.drivetrain,null],['pto.rated_power',version.ptoPower,'hp'],['pto.rear_description','Live independent hydraulic PTO with PTO brake and wet clutch, 540 rpm',null],
          ['hydraulics.main_pump_capacity',9.5,'gpm'],['hydraulics.power_steering_pump_capacity',4.9,'gpm'],['hydraulics.control_system','Position control standard; draft control optional',null],['hitch.category','Category I & II',null],['hitch.lift_capacity_24in',2310,'lb'],['hydraulics.remote_valves','Maximum 3 optional',null],
          ['steering.type','Hydrostatic power steering',null],['brakes.type','Mechanical wet disc',null],['electrical.alternator_options','ROPS: 45 A; cab: 60 A',null],['capacities.fuel_tank_variants','ROPS: 13.5 US gal (51 L); cab: 11.9 US gal (45 L)',null],
          ['dimensions.overall_width',69.7,'in'],['dimensions.wheelbase',74.6,'in'],['dimensions.ground_clearance',15.2,'in'],['weight.tractor_variants',weightText,null],
        ];
        for(const [key,value,unit] of values) await upsertSpec(connection,machineId,versionId,def(key),specSourceId,value,unit);
      }
    }
  },
};
