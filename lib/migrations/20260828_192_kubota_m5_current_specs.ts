import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSlug='m5-091'|'m5-111';
type VersionSeed={
  modelName:'M5-091'|'M5-111';
  modelSlug:ModelSlug;
  slug:string;
  configuration:string;
  station:'Open Station'|'Cab';
  drivetrain:'2WD'|'4WD';
  transmission:'F8/R8'|'F12/R12'|'F24/R24';
  maxSpeed:number;
  grossPower:number;
  ptoPower:number;
};

const CURRENT_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const CURRENT_EXTERNAL_ID='kubota-2026-full-line-m5-current-specs';
const ACTIVE_URL='https://www.kubotausa.com/special-offer/m5-m6-series-tractors';
const ACTIVE_EXTERNAL_ID='kubota-m5-current-offer-2026-08';

const versions:VersionSeed[]=[
  {modelName:'M5-091',modelSlug:'m5-091',slug:'us-current-hf-2wd-open',configuration:'M5-091HF 2WD open station, F8/R8',station:'Open Station',drivetrain:'2WD',transmission:'F8/R8',maxSpeed:17.7,grossPower:92.5,ptoPower:76},
  {modelName:'M5-091',modelSlug:'m5-091',slug:'us-current-hfc-2wd-cab',configuration:'M5-091HFC 2WD cab, F8/R8',station:'Cab',drivetrain:'2WD',transmission:'F8/R8',maxSpeed:19.2,grossPower:92.5,ptoPower:76},
  {modelName:'M5-091',modelSlug:'m5-091',slug:'us-current-hd-4wd-open',configuration:'M5-091HD 4WD open station, F8/R8',station:'Open Station',drivetrain:'4WD',transmission:'F8/R8',maxSpeed:17.7,grossPower:92.5,ptoPower:76},
  {modelName:'M5-091',modelSlug:'m5-091',slug:'us-current-hd12-4wd-open',configuration:'M5-091HD12 4WD open station, F12/R12',station:'Open Station',drivetrain:'4WD',transmission:'F12/R12',maxSpeed:22.6,grossPower:92.5,ptoPower:76},
  {modelName:'M5-091',modelSlug:'m5-091',slug:'us-current-hdc-4wd-cab',configuration:'M5-091HDC 4WD cab, F8/R8',station:'Cab',drivetrain:'4WD',transmission:'F8/R8',maxSpeed:19.2,grossPower:92.5,ptoPower:76},
  {modelName:'M5-091',modelSlug:'m5-091',slug:'us-current-hdc12-4wd-cab',configuration:'M5-091HDC12 4WD cab, F12/R12',station:'Cab',drivetrain:'4WD',transmission:'F12/R12',maxSpeed:22.6,grossPower:92.5,ptoPower:76},
  {modelName:'M5-111',modelSlug:'m5-111',slug:'us-current-hf-2wd-open',configuration:'M5-111HF 2WD open station, F8/R8',station:'Open Station',drivetrain:'2WD',transmission:'F8/R8',maxSpeed:18.6,grossPower:105.6,ptoPower:89},
  {modelName:'M5-111',modelSlug:'m5-111',slug:'us-current-hfc-2wd-cab',configuration:'M5-111HFC 2WD cab, F8/R8',station:'Cab',drivetrain:'2WD',transmission:'F8/R8',maxSpeed:20.1,grossPower:105.6,ptoPower:89},
  {modelName:'M5-111',modelSlug:'m5-111',slug:'us-current-hd-4wd-open',configuration:'M5-111HD 4WD open station, F8/R8',station:'Open Station',drivetrain:'4WD',transmission:'F8/R8',maxSpeed:18.6,grossPower:105.6,ptoPower:89},
  {modelName:'M5-111',modelSlug:'m5-111',slug:'us-current-hd12-4wd-open',configuration:'M5-111HD12 4WD open station, F12/R12',station:'Open Station',drivetrain:'4WD',transmission:'F12/R12',maxSpeed:23.6,grossPower:105.6,ptoPower:89},
  {modelName:'M5-111',modelSlug:'m5-111',slug:'us-current-hdc-4wd-cab',configuration:'M5-111HDC 4WD cab, F8/R8',station:'Cab',drivetrain:'4WD',transmission:'F8/R8',maxSpeed:20.1,grossPower:105.6,ptoPower:89},
  {modelName:'M5-111',modelSlug:'m5-111',slug:'us-current-hdc12-4wd-cab',configuration:'M5-111HDC12 4WD cab, F12/R12',station:'Cab',drivetrain:'4WD',transmission:'F12/R12',maxSpeed:23.6,grossPower:105.6,ptoPower:89},
  {modelName:'M5-111',modelSlug:'m5-111',slug:'us-current-hdc24-4wd-cab',configuration:'M5-111HDC24 4WD cab, F24/R24 non-clutch dual-speed transmission',station:'Cab',drivetrain:'4WD',transmission:'F24/R24',maxSpeed:23.4,grossPower:105.6,ptoPower:89},
];

const definitions=[
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement_cuin','Displacement','decimal','cu in',5],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',6],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['Transmission','transmission.standard','Transmission speeds','text',null,10],
  ['Transmission','transmission.shuttle','Shuttle shift','text',null,20],
  ['Transmission','transmission.max_speed','Maximum traveling speed','decimal','mph',30],
  ['Transmission','transmission.clutch','Main clutch','text',null,40],
  ['Transmission','drivetrain.type','Driveline','text',null,50],
  ['PTO','pto.system','PTO type','text',null,20],
  ['PTO','pto.rear_description','Rear PTO speed','text',null,30],
  ['Hydraulics','hydraulics.remote_flow','Rated flow at remote outlets','decimal','gpm',10],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,20],
  ['Hydraulics','hydraulics.control_system','3-point control system','text',null,30],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',40],
  ['Hydraulics','hydraulics.remote_valves','Standard rear remote valves','text',null,50],
  ['Steering & Brakes','steering.type','Steering','text',null,10],
  ['Steering & Brakes','brakes.type','Brake type','text',null,20],
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','decimal','US gal',10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',30],
  ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',40],
  ['Dimensions & Weight','weight.tractor','Tractor weight','decimal','lb',50],
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M5 migration dependency.');
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

export const kubotaM5CurrentSpecsMigration:DbMigration={
  id:'20260828_192_kubota_m5_current_specs',
  description:'Add current 2026 US Kubota M5-091 and M5-111 configuration-specific specification sets across 13 variants',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await connection.query(`INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,'M5 Series','m5-series') ON DUPLICATE KEY UPDATE name='M5 Series'`,[manufacturerId,equipmentTypeId]);
    const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='m5-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const currentSourceId=await ensureSourceRecord(connection,sourceId,CURRENT_URL,CURRENT_EXTERNAL_ID,'Kubota USA 2026 Full Product Line - current M5 Series specifications');
    const activeSourceId=await ensureSourceRecord(connection,sourceId,ACTIVE_URL,ACTIVE_EXTERNAL_ID,'Kubota USA current M5 & M6 Series offer - active M5-091 and M5-111 lineup');

    const definitionIds=new Map<string,number>();
    for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){
      await connection.query(`INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,[section,key,label,valueType,canonicalUnit,displayOrder]);
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def=(key:string)=>{const id=definitionIds.get(key);if(!id)throw new Error(`Missing M5 spec definition ${key}`);return id;};

    const machineIds=new Map<ModelSlug,number>();
    for(const model of [{name:'M5-091',slug:'m5-091'},{name:'M5-111',slug:'m5-111'}] as const){
      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES (?,?,?,?,?,'Current Kubota USA M5 Series utility agricultural tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,equipmentTypeId,seriesId,model.name,model.slug],
      );
      machineIds.set(model.slug,await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.slug]));
    }

    for(const version of versions){
      const machineId=machineIds.get(version.modelSlug);
      if(!machineId) throw new Error(`Missing M5 machine ${version.modelSlug}`);
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,version.slug,version.configuration,activeSourceId,'Current US M5 variant confirmed by Kubota USA 2026 product material and active 2026 sales offer; specification values use the 2026 Full Product Line table.'],
      );
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,version.slug]);
      const is2wd=version.drivetrain==='2WD';
      const isCab=version.station==='Cab';
      const is091=version.modelSlug==='m5-091';
      const twelveOr24=version.transmission!=='F8/R8';
      const length=is2wd?156.5:155.9;
      const width=is091?(is2wd?77.2:78.3):(is2wd?78.3:79.1);
      const wheelbase=is2wd?90:88.6;
      const height=is091?(isCab?100.2:98.9):(isCab?101.2:99.8);
      const weight=is091?(is2wd?(isCab?6482:5732):(isCab?6900:6151)):(is2wd?(isCab?6615:5865):(isCab?7033:6283));
      const ptoSpeed=twelveOr24?'540 / 540E rpm; 540/1000 optional':'540 rpm; 540E optional';
      const liftCapacity=twelveOr24?6063:4630;
      const values:Array<[string,string|number,string|null]>=[
        ['configuration.station',version.station,null],
        ['engine.make','Kubota',null],['engine.model','V3800CR-TIER4',null],['engine.type','4-cylinder turbocharged Common Rail direct-injection diesel with intercooler, DPF, DOC and SCR',null],['engine.cylinders',4,null],['engine.displacement_cuin',230,'cu in'],['engine.gross_power',version.grossPower,'hp'],
        ['pto.rated_power',version.ptoPower,'hp'],
        ['transmission.standard',version.transmission,null],['transmission.shuttle','Electro-hydraulic shuttle',null],['transmission.max_speed',version.maxSpeed,'mph'],['transmission.clutch','Multiple wet disc',null],['drivetrain.type',version.drivetrain,null],
        ['pto.system','Live-independent PTO, electro-hydraulic clutch with brake',null],['pto.rear_description',ptoSpeed,null],
        ['hydraulics.remote_flow',isCab?17.0:15.7,'gpm'],['hitch.category','Category II with telescopic lower-link ends and stabilizers',null],['hydraulics.control_system','Position, draft (top-link sensing) and mixed control',null],['hitch.lift_capacity_24in',liftCapacity,'lb'],['hydraulics.remote_valves','2 standard (maximum 3)',null],
        ['steering.type','Hydrostatic power steering',null],['brakes.type','Hydraulic wet disc',null],['capacities.fuel_tank_variants',27.7,'US gal'],
        ['dimensions.overall_length',length,'in'],['dimensions.overall_width',width,'in'],['dimensions.wheelbase',wheelbase,'in'],['dimensions.overall_height',height,'in'],['weight.tractor',weight,'lb'],
      ];
      for(const [key,value,unit] of values) await upsertSpec(connection,machineId,versionId,def(key),currentSourceId,value,unit);
    }
  },
};
