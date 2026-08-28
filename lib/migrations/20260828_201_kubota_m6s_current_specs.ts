import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type VersionSeed={
  slug:string;
  configuration:string;
  station:'Open Station'|'Cab';
  driveline:'2WD'|'4WD';
  transmission:'F16/R16'|'F32/R32';
  creep:'F24/R24'|'F48/R48';
  pto:string;
  width:number;
  height:number;
  weight:number;
};

const CURRENT_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const CURRENT_EXTERNAL_ID='kubota-2026-full-line-m6s-current-specs';
const ACTIVE_URL='https://www.kubotausa.com/products/tractors/utility/m6S';
const ACTIVE_EXTERNAL_ID='kubota-m6s-current-product-page-2026-08';

const versions:VersionSeed[]=[
  {slug:'us-current-shf-2wd-open',configuration:'M6S-111SHF, 2WD, open station, Swing-Shift',station:'Open Station',driveline:'2WD',transmission:'F16/R16',creep:'F24/R24',pto:'540 rpm; 1000 rpm rear option/configuration-dependent',width:91.5,height:105.1,weight:6834},
  {slug:'us-current-shc-2wd-cab',configuration:'M6S-111SHC, 2WD, cab, Swing-Shift',station:'Cab',driveline:'2WD',transmission:'F16/R16',creep:'F24/R24',pto:'540 rpm; 1000 rpm rear option/configuration-dependent',width:92.5,height:105.5,weight:7341},
  {slug:'us-current-shd-4wd-open',configuration:'M6S-111SHD, 4WD, open station, Swing-Shift',station:'Open Station',driveline:'4WD',transmission:'F16/R16',creep:'F24/R24',pto:'540 rpm; 1000 rpm rear option/configuration-dependent',width:91.5,height:105.1,weight:8466},
  {slug:'us-current-shdc-4wd-cab',configuration:'M6S-111SHDC, 4WD, cab, Swing-Shift',station:'Cab',driveline:'4WD',transmission:'F16/R16',creep:'F24/R24',pto:'540 rpm; 1000 rpm rear option/configuration-dependent',width:92.5,height:105.5,weight:8973},
  {slug:'us-current-sds2-4wd-open',configuration:'M6S-111SDS2, 4WD, open station, Swing-Shift Plus',station:'Open Station',driveline:'4WD',transmission:'F32/R32',creep:'F48/R48',pto:'540 / 1000 rpm',width:91.5,height:105.1,weight:8466},
  {slug:'us-current-sdsc-4wd-cab',configuration:'M6S-111SDSC, 4WD, cab, Swing-Shift Plus',station:'Cab',driveline:'4WD',transmission:'F32/R32',creep:'F48/R48',pto:'540 / 1000 rpm',width:92.5,height:105.5,weight:8973},
];

const definitions=[
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement_cuin','Displacement','decimal','cu in',5],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',6],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',7],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','transmission.creep_option','Creep transmission option','text',null,20],
  ['Transmission','transmission.shuttle','Shuttle shift','text',null,30],
  ['Transmission','transmission.clutch','Main clutch','text',null,40],
  ['Transmission','transmission.max_speed','Maximum traveling speed','decimal','mph',50],
  ['Transmission','drivetrain.type','Driveline','text',null,60],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Hydraulics','hydraulics.system_type','Hydraulic system','text',null,10],
  ['Hydraulics','hydraulics.pump_output_range','Hydraulic flow','text',null,20],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,30],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',40],
  ['Hydraulics','hitch.lift_capacity_24in_optional','Optional 3-point lift capacity at 24 in. behind lift point','decimal','lb',50],
  ['Hydraulics','hydraulics.remote_valves','Rear remote valves','text',null,60],
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','decimal','US gal',10],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',30],
  ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',40],
  ['Dimensions & Weight','weight.tractor','Tractor weight','decimal','lb',50],
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M6S migration dependency.');
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

export const kubotaM6SCurrentSpecsMigration:DbMigration={
  id:'20260828_201_kubota_m6s_current_specs',
  description:'Add current US Kubota M6S-111 SHF, SHC, SHD, SHDC, SDS2 and SDSC configuration-specific specification sets',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await connection.query(`INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,'M6S Series','m6s-series') ON DUPLICATE KEY UPDATE name='M6S Series'`,[manufacturerId,equipmentTypeId]);
    const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='m6s-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);sourceId=Number(result.insertId);}
    const currentSourceId=await ensureSourceRecord(connection,sourceId,CURRENT_URL,CURRENT_EXTERNAL_ID,'Kubota USA 2026 Full Product Line - current M6S Series specification table');
    const activeSourceId=await ensureSourceRecord(connection,sourceId,ACTIVE_URL,ACTIVE_EXTERNAL_ID,'Kubota USA current M6S product page - active M6S-111 lineup');

    const definitionIds=new Map<string,number>();
    for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){
      await connection.query(`INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,[section,key,label,valueType,canonicalUnit,displayOrder]);
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def=(key:string)=>{const id=definitionIds.get(key);if(!id)throw new Error(`Missing M6S spec definition ${key}`);return id;};

    await connection.query(
      `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
       VALUES (?,?,?,?,?,'Current Kubota USA M6S utility agricultural tractor. Exact transmission, driveline and station are stored as machine versions rather than blended into one specification set.','partial')
       ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
      [manufacturerId,equipmentTypeId,seriesId,'M6S-111','m6s-111'],
    );
    const machineId=await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug='m6s-111' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    for(const version of versions){
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,version.slug,version.configuration,activeSourceId,'Current 2026 M6S family configuration. 2026 Full Product Line supplies the SHF/SHC, SHD/SHDC and SDS2/SDSC configuration groups; current Kubota product page independently confirms the active M6S-111 family.'],
      );
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,version.slug]);
      const values:Array<[string,string|number,string|null]>=[
        ['configuration.station',version.station,null],['engine.make','Kubota',null],['engine.model','V3800-TIEF4',null],['engine.type','Direct-injection liquid-cooled 4-cycle diesel, common rail, turbocharged/intercooled, DPF/DOC/SCR',null],['engine.cylinders',4,null],['engine.displacement_cuin',230,'cu in'],['engine.gross_power',114.1,'hp'],['engine.rated_speed',2600,'rpm'],['pto.rated_power',95,'hp'],
        ['transmission.standard',version.transmission,null],['transmission.creep_option',version.creep,null],['transmission.shuttle','Electro-hydraulic',null],['transmission.clutch','Hydraulic wet clutch',null],['transmission.max_speed',23.34,'mph'],['drivetrain.type',version.driveline,null],['pto.rear_description',version.pto,null],
        ['hydraulics.system_type','Open-center; top-link draft sensing',null],['hydraulics.pump_output_range','17.2-17.6 gpm depending on exact configuration/source revision',null],['hitch.category','Category II',null],['hitch.lift_capacity_24in',3858,'lb'],['hitch.lift_capacity_24in_optional',5732,'lb'],['hydraulics.remote_valves','2 standard; 3rd remote and flow-control valve optional',null],['capacities.fuel_tank_variants',46.2,'US gal'],
        ['dimensions.wheelbase',95.9,'in'],['dimensions.overall_width',version.width,'in'],['dimensions.overall_length',163.2,'in'],['dimensions.overall_height',version.height,'in'],['weight.tractor',version.weight,'lb'],
      ];
      for(const [key,value,unit] of values) await upsertSpec(connection,machineId,versionId,def(key),currentSourceId,value,unit);
    }
  },
};
