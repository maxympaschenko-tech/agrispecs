import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSlug='m8-181'|'m8-201';
type VersionSeed={modelName:'M8-181'|'M8-201';modelSlug:ModelSlug;slug:string;configuration:string;transmissionType:'Semi-Powershift'|'KVT';grossPower:number;ptoPower:number;weight:number};

const CURRENT_URL='https://www.kubotausa.com/equipment-series/m8-series';
const CURRENT_EXTERNAL_ID='kubota-m8-current-product-page-2026-08';
const DETAIL_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/m8-brochureupdate.pdf?sfvrsn=1c788cad_3';
const DETAIL_EXTERNAL_ID='kubota-m8-current-brochure-2026';

const versions:VersionSeed[]=[
  {modelName:'M8-181',modelSlug:'m8-181',slug:'us-current-semi-powershift',configuration:'M8-181, 4WD cab, Semi-Powershift 30F/15R',transmissionType:'Semi-Powershift',grossPower:180,ptoPower:145,weight:17570},
  {modelName:'M8-181',modelSlug:'m8-181',slug:'us-current-kvt',configuration:'M8-181, 4WD cab, Kubota Variable Transmission (KVT/CVT)',transmissionType:'KVT',grossPower:180,ptoPower:145,weight:18498},
  {modelName:'M8-201',modelSlug:'m8-201',slug:'us-current-semi-powershift',configuration:'M8-201, 4WD cab, Semi-Powershift 30F/15R',transmissionType:'Semi-Powershift',grossPower:200,ptoPower:159,weight:17570},
  {modelName:'M8-201',modelSlug:'m8-201',slug:'us-current-kvt',configuration:'M8-201, 4WD cab, Kubota Variable Transmission (KVT/CVT)',transmissionType:'KVT',grossPower:200,ptoPower:159,weight:18498},
];

const definitions=[
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement_l','Displacement','decimal','L',5],
  ['Engine','engine.gross_power','Rated engine power','decimal','hp',6],
  ['Engine','engine.boost_power','Responsive Power Delivery boost','decimal','hp',7],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',8],
  ['PTO','pto.rated_power','Rated PTO power','decimal','hp',10],
  ['Transmission','transmission.type','Transmission type','text',null,10],
  ['Transmission','transmission.standard','Transmission speeds','text',null,20],
  ['Transmission','transmission.shuttle','Shuttle shift','text',null,30],
  ['Transmission','transmission.max_speed','Maximum standard travel speed','decimal','mph',40],
  ['Transmission','transmission.optional_max_speed','Optional maximum travel speed','decimal','mph',50],
  ['Transmission','drivetrain.type','Driveline','text',null,60],
  ['PTO','pto.system','PTO actuation','text',null,20],
  ['PTO','pto.rear_description','Rear PTO','text',null,30],
  ['PTO','pto.front_description','Front PTO','text',null,40],
  ['Hydraulics','hydraulics.system','Hydraulic system','text',null,10],
  ['Hydraulics','hydraulics.steering_flow','Steering/operating flow','decimal','gpm',20],
  ['Hydraulics','hydraulics.main_pump_capacity','Standard implement pump flow','decimal','gpm',30],
  ['Hydraulics','hydraulics.optional_pump_capacity','Optional implement pump flow','decimal','gpm',40],
  ['Hydraulics','hydraulics.max_remote_flow','Maximum flow at one EHR remote','decimal','gpm',50],
  ['Hydraulics','hydraulics.remote_valves','Rear remote valves','text',null,60],
  ['Hydraulics','hydraulics.power_beyond','Power Beyond','text',null,70],
  ['Hydraulics','hitch.category','Rear 3-point hitch category','text',null,80],
  ['Hydraulics','hitch.lift_capacity_24in','Rear 3-point lift capacity at 24 in.','decimal','lb',90],
  ['Hydraulics','hitch.optional_lift_capacity_24in','Optional rear 3-point lift capacity','decimal','lb',100],
  ['Hydraulics','hitch.front_lift_capacity','Optional front 3-point lift capacity at hooks','decimal','lb',110],
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','decimal','US gal',10],
  ['Capacities','capacities.def_tank','DEF tank capacity','decimal','US gal',20],
  ['Axles','axles.front_options','Front axle options','text',null,10],
  ['Axles','axles.rear_bar','Rear bar axle','text',null,20],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',20],
  ['Dimensions & Weight','weight.tractor','Average shipping weight','decimal','lb',30],
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M8 migration dependency.');
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

export const kubotaM8CurrentSpecsMigration:DbMigration={
  id:'20260828_207_kubota_m8_current_specs',
  description:'Add current US Kubota M8-181 and M8-201 Semi-Powershift and KVT specification sets from the current M8 brochure and product page',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await connection.query(`INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,'M8 Series','m8-series') ON DUPLICATE KEY UPDATE name='M8 Series'`,[manufacturerId,equipmentTypeId]);
    const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='m8-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const currentSourceId=await ensureSourceRecord(connection,sourceId,CURRENT_URL,CURRENT_EXTERNAL_ID,'Kubota USA current M8 Series product page - M8-181 and M8-201');
    const detailSourceId=await ensureSourceRecord(connection,sourceId,DETAIL_URL,DETAIL_EXTERNAL_ID,'Kubota USA current M8 Series brochure - detailed M8 specifications');

    const definitionIds=new Map<string,number>();
    for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){
      await connection.query(`INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,[section,key,label,valueType,canonicalUnit,displayOrder]);
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def=(key:string)=>{const id=definitionIds.get(key);if(!id)throw new Error(`Missing M8 spec definition ${key}`);return id;};

    const machineIds=new Map<ModelSlug,number>();
    for(const model of [{name:'M8-181',slug:'m8-181'},{name:'M8-201',slug:'m8-201'}] as const){
      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES (?,?,?,?,?,'Current Kubota USA M8 Series high-horsepower agricultural tractor with Cummins B6.7 power','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,equipmentTypeId,seriesId,model.name,model.slug],
      );
      machineIds.set(model.slug,await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.slug]));
    }

    for(const version of versions){
      const machineId=machineIds.get(version.modelSlug);
      if(!machineId) throw new Error(`Missing M8 machine ${version.modelSlug}`);
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,version.slug,version.configuration,currentSourceId,'Current US M8 configuration. The current Kubota brochure lists both Semi-Powershift and optional KVT; transmission-specific shipping weight is stored per version. Optional 31 mph travel speed requires the suspended front axle.'],
      );
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,version.slug]);
      const isKvt=version.transmissionType==='KVT';
      const values:Array<[string,string|number,string|null]>=[
        ['configuration.station','Cab',null],
        ['engine.make','Cummins',null],['engine.model','B6.7 Tier 4 Final / Stage V',null],['engine.type','6-cylinder 6.7 L turbocharged diesel with DOC, SCR and DPF aftertreatment',null],['engine.cylinders',6,null],['engine.displacement_l',6.7,'L'],['engine.gross_power',version.grossPower,'hp'],['engine.boost_power',25,'hp'],['engine.rated_speed',2100,'rpm'],
        ['pto.rated_power',version.ptoPower,'hp'],
        ['transmission.type',isKvt?'CVT / KVT':'Semi-Powershift',null],['transmission.standard',isKvt?'Continuously variable KVT with infinite forward/reverse speeds':'30F/15R - 6 powershifts x 5 ranges',null],['transmission.shuttle','Electronic shuttle with left-hand lever and right-hand multifunction handle control',null],['transmission.max_speed',24.8,'mph'],['transmission.optional_max_speed',31,'mph'],['drivetrain.type','4WD',null],
        ['pto.system','Electro-hydraulically operated',null],['pto.rear_description','540 / 540E / 1000 / 1000E rpm; 540 6-spline and 1000 21-spline, optional 1000 20-spline',null],['pto.front_description','Optional electro-hydraulic 1000 rpm, 21-spline, clockwise',null],
        ['hydraulics.system','Closed-Center Load Sensing (CCLS)',null],['hydraulics.steering_flow',11.1,'gpm'],['hydraulics.main_pump_capacity',31.7,'gpm'],['hydraulics.optional_pump_capacity',42.2,'gpm'],['hydraulics.max_remote_flow',31.7,'gpm'],['hydraulics.remote_valves','3 electronic rear valves standard; 5 optional',null],['hydraulics.power_beyond','Optional',null],
        ['hitch.category','Category III / IIIN',null],['hitch.lift_capacity_24in',11200,'lb'],['hitch.optional_lift_capacity_24in',13600,'lb'],['hitch.front_lift_capacity',8818,'lb'],
        ['capacities.fuel_tank_variants',99,'US gal'],['capacities.def_tank',9,'US gal'],
        ['axles.front_options','Rigid limited-slip differential standard; suspended full-locking differential optional; rigid full-locking differential optional',null],['axles.rear_bar','4.13 x 98 in bar axle standard; 4.13 x 118 in optional',null],
        ['dimensions.wheelbase',114,'in'],['dimensions.overall_height',128,'in'],['weight.tractor',version.weight,'lb'],
      ];
      for(const [key,value,unit] of values) await upsertSpec(connection,machineId,versionId,def(key),detailSourceId,value,unit);
    }
  },
};