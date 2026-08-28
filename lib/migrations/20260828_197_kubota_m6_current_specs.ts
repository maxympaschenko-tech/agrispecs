import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSlug='m6-101'|'m6-111'|'m6-131'|'m6-141';
type VersionSeed={
  modelName:'M6-101'|'M6-111'|'M6-131'|'M6-141';
  modelSlug:ModelSlug;
  slug:string;
  configuration:string;
  engineModel:'V3800-TI-CRS'|'V6108-TI-CRS';
  displacement:number;
  ratedRpm:number;
  grossPower:number;
  netPower:number;
  ptoPower:number;
  maxSpeed:number;
  hydraulicFlow:number;
  wheelbase:number;
  width:number;
  length:number;
  height:number;
  weight:number;
};

const CURRENT_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const CURRENT_EXTERNAL_ID='kubota-2026-full-line-m6-current-specs';
const ACTIVE_URL='https://www.kubotausa.com/special-offer/m5-m6-series-tractors';
const ACTIVE_EXTERNAL_ID='kubota-m6-current-offer-2026-08';

const versions:VersionSeed[]=[
  {modelName:'M6-101',modelSlug:'m6-101',slug:'us-current-dtc-f-cab-4wd',configuration:'M6-101-1 DTC-F, 4WD Grand X Cab, Intelli-Shift',engineModel:'V3800-TI-CRS',displacement:230,ratedRpm:2600,grossPower:104.5,netPower:97.1,ptoPower:82,maxSpeed:20.72,hydraulicFlow:18.7,wheelbase:95.9,width:82.7,length:165.4,height:109.8,weight:9601},
  {modelName:'M6-111',modelSlug:'m6-111',slug:'us-current-dtc-f-cab-4wd',configuration:'M6-111-1 DTC-F, 4WD Grand X Cab, Intelli-Shift',engineModel:'V3800-TI-CRS',displacement:230,ratedRpm:2600,grossPower:114.1,netPower:106.8,ptoPower:92,maxSpeed:20.72,hydraulicFlow:18.7,wheelbase:95.9,width:82.7,length:165.4,height:111.8,weight:9788},
  {modelName:'M6-131',modelSlug:'m6-131',slug:'us-current-dtc-f-cab-4wd',configuration:'M6-131-1 DTC-F, 4WD Grand X Cab, Intelli-Shift',engineModel:'V6108-TI-CRS',displacement:374,ratedRpm:2200,grossPower:131.6,netPower:123.2,ptoPower:104,maxSpeed:22.73,hydraulicFlow:20.4,wheelbase:105.9,width:85.8,length:171.7,height:113.2,weight:10945},
  {modelName:'M6-141',modelSlug:'m6-141',slug:'us-current-dtc-f-cab-4wd',configuration:'M6-141-1 DTC-F, 4WD Grand X Cab, Intelli-Shift, standard front axle',engineModel:'V6108-TI-CRS',displacement:374,ratedRpm:2200,grossPower:141.4,netPower:133,ptoPower:114,maxSpeed:22.73,hydraulicFlow:20.4,wheelbase:105.9,width:85.8,length:171.7,height:113.2,weight:10945},
  {modelName:'M6-141',modelSlug:'m6-141',slug:'us-current-dtsc-f-suspended-cab-4wd',configuration:'M6-141-1 DTSC-F, 4WD Grand X Cab, Intelli-Shift, front suspended axle',engineModel:'V6108-TI-CRS',displacement:374,ratedRpm:2200,grossPower:141.4,netPower:133,ptoPower:114,maxSpeed:22.73,hydraulicFlow:20.4,wheelbase:105.5,width:85.8,length:171.3,height:113.2,weight:11387},
];

const definitions=[
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement_cuin','Displacement','decimal','cu in',5],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',6],
  ['Engine','engine.net_power','Net engine power','decimal','hp',7],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',8],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','transmission.main_shift','Main gear shift','text',null,20],
  ['Transmission','transmission.range_shift','Range gear shift','text',null,30],
  ['Transmission','transmission.shuttle','Shuttle shift','text',null,40],
  ['Transmission','transmission.max_speed','Maximum traveling speed','decimal','mph',50],
  ['Transmission','transmission.clutch','Main clutch','text',null,60],
  ['Transmission','drivetrain.type','Driveline','text',null,70],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Hydraulics','hydraulics.main_pump_capacity','Hydraulic pump capacity','decimal','gpm',10],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,20],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',30],
  ['Hydraulics','hydraulics.remote_valves','Rear remote valves','text',null,40],
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','decimal','US gal',10],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width at minimum tread','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',30],
  ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',40],
  ['Dimensions & Weight','weight.tractor','Tractor weight with standard tire','decimal','lb',50],
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M6 migration dependency.');
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

export const kubotaM6CurrentSpecsMigration:DbMigration={
  id:'20260828_197_kubota_m6_current_specs',
  description:'Add current 2026 US Kubota M6-101-1, M6-111-1, M6-131-1 and M6-141-1 specification sets including the M6-141 suspended-front-axle variant',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await connection.query(`INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,'M6 Series','m6-series') ON DUPLICATE KEY UPDATE name='M6 Series'`,[manufacturerId,equipmentTypeId]);
    const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='m6-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const currentSourceId=await ensureSourceRecord(connection,sourceId,CURRENT_URL,CURRENT_EXTERNAL_ID,'Kubota USA 2026 Full Product Line - current M6 Series specifications');
    const activeSourceId=await ensureSourceRecord(connection,sourceId,ACTIVE_URL,ACTIVE_EXTERNAL_ID,'Kubota USA current M5 & M6 Series offer - active M6 lineup through September 2026');

    const definitionIds=new Map<string,number>();
    for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){
      await connection.query(`INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,[section,key,label,valueType,canonicalUnit,displayOrder]);
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def=(key:string)=>{const id=definitionIds.get(key);if(!id)throw new Error(`Missing M6 spec definition ${key}`);return id;};

    const machineIds=new Map<ModelSlug,number>();
    for(const model of [{name:'M6-101',slug:'m6-101'},{name:'M6-111',slug:'m6-111'},{name:'M6-131',slug:'m6-131'},{name:'M6-141',slug:'m6-141'}] as const){
      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES (?,?,?,?,?,'Current Kubota USA M6 Series utility agricultural tractor; current product-line revision uses the -1 designation','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,equipmentTypeId,seriesId,model.name,model.slug],
      );
      machineIds.set(model.slug,await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.slug]));
    }

    for(const version of versions){
      const machineId=machineIds.get(version.modelSlug);
      if(!machineId) throw new Error(`Missing M6 machine ${version.modelSlug}`);
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,version.slug,version.configuration,activeSourceId,'Current US M6 -1 revision. Specifications use Kubota USA 2026 Full Product Line data; M6-141 suspended-front-axle dimensions are stored as a separate version rather than mixed into the standard-axle record.'],
      );
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,version.slug]);
      const values:Array<[string,string|number,string|null]>=[
        ['configuration.station','Grand X Cab',null],['engine.make','Kubota',null],['engine.model',version.engineModel,null],['engine.type','Common Rail direct-injection liquid-cooled diesel, 4-cylinder turbocharged with intercooler',null],['engine.cylinders',4,null],['engine.displacement_cuin',version.displacement,'cu in'],['engine.gross_power',version.grossPower,'hp'],['engine.net_power',version.netPower,'hp'],['engine.rated_speed',version.ratedRpm,'rpm'],
        ['pto.rated_power',version.ptoPower,'hp'],['transmission.standard','Intelli-Shift 24F/24R; 32F/32R with optional creep',null],['transmission.main_shift','8-speed power shift',null],['transmission.range_shift','3-speed mechanical high/mid/low range',null],['transmission.shuttle','Microprocessor-controlled electro-hydraulic shuttle',null],['transmission.max_speed',version.maxSpeed,'mph'],['transmission.clutch','Multiple wet disc',null],['drivetrain.type','4WD',null],
        ['pto.rear_description','540 / 1000 rpm',null],['hydraulics.main_pump_capacity',version.hydraulicFlow,'gpm'],['hitch.category','Category II',null],['hitch.lift_capacity_24in',6834,'lb'],['hydraulics.remote_valves','2 standard mechanical rear remotes; 3rd and 4th optional with built-in flow control',null],['capacities.fuel_tank_variants',50.2,'US gal'],
        ['dimensions.wheelbase',version.wheelbase,'in'],['dimensions.overall_width',version.width,'in'],['dimensions.overall_length',version.length,'in'],['dimensions.overall_height',version.height,'in'],['weight.tractor',version.weight,'lb'],
      ];
      for(const [key,value,unit] of values) await upsertSpec(connection,machineId,versionId,def(key),currentSourceId,value,unit);
    }
  },
};
