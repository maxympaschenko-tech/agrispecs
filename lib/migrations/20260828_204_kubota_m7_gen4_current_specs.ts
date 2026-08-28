import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSlug='m7-134'|'m7-154'|'m7-174';
type Grade='Deluxe'|'Premium'|'Premium KVT';
type VersionSeed={modelName:'M7-134'|'M7-154'|'M7-174';modelSlug:ModelSlug;grade:Grade;slug:string;grossPower:number;boostPower:number;ptoPower:number};

const CURRENT_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const CURRENT_EXTERNAL_ID='kubota-2026-full-line-m7-gen4-current-specs';

// The 2026 Full Product Line explicitly lists M7-134 only in Deluxe grade,
// while M7-154 and M7-174 remain available in Deluxe, Premium and Premium KVT.
// Earlier M7-4 brochures showed all three grades for M7-134; those older grade
// combinations are intentionally not marked current here.
const versions:VersionSeed[]=[
  {modelName:'M7-134',modelSlug:'m7-134',grade:'Deluxe',slug:'us-current-deluxe',grossPower:128,boostPower:20,ptoPower:100},
  {modelName:'M7-154',modelSlug:'m7-154',grade:'Deluxe',slug:'us-current-deluxe',grossPower:148,boostPower:20,ptoPower:120},
  {modelName:'M7-154',modelSlug:'m7-154',grade:'Premium',slug:'us-current-premium',grossPower:148,boostPower:20,ptoPower:120},
  {modelName:'M7-154',modelSlug:'m7-154',grade:'Premium KVT',slug:'us-current-premium-kvt',grossPower:148,boostPower:20,ptoPower:120},
  {modelName:'M7-174',modelSlug:'m7-174',grade:'Deluxe',slug:'us-current-deluxe',grossPower:168,boostPower:5,ptoPower:140},
  {modelName:'M7-174',modelSlug:'m7-174',grade:'Premium',slug:'us-current-premium',grossPower:168,boostPower:5,ptoPower:140},
  {modelName:'M7-174',modelSlug:'m7-174',grade:'Premium KVT',slug:'us-current-premium-kvt',grossPower:168,boostPower:5,ptoPower:140},
];

const definitions=[
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement_cuin','Displacement','decimal','cu in',5],
  ['Engine','engine.gross_power','Maximum engine power','decimal','hp',6],
  ['Engine','engine.boost_power','PTO boost power','decimal','hp',7],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',8],
  ['PTO','pto.rated_power','Rated PTO power','decimal','hp',10],
  ['Transmission','transmission.type','Transmission type','text',null,10],
  ['Transmission','transmission.main_shift','Main gear shift','text',null,20],
  ['Transmission','transmission.range_shift','Range gear shift','text',null,30],
  ['Transmission','transmission.standard','Transmission speeds','text',null,40],
  ['Transmission','transmission.shuttle','Shuttle shift','text',null,50],
  ['Transmission','transmission.clutch','Main clutch','text',null,60],
  ['Hydraulics','hydraulics.system','Hydraulic system','text',null,10],
  ['Hydraulics','hydraulics.main_pump_capacity','Hydraulic pump capacity','decimal','gpm',20],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,30],
  ['Hydraulics','hydraulics.control_system','3-point control system','text',null,40],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',50],
  ['Hydraulics','hydraulics.remote_valves','Rear remote valves','text',null,60],
  ['PTO','pto.rear_description','Rear PTO speeds','text',null,20],
  ['PTO','pto.front_description','Front PTO speed','text',null,30],
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','decimal','US gal',10],
  ['Capacities','capacities.def_tank','DEF tank capacity','decimal','US gal',20],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_width_variants','Overall width','text',null,30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','weight.tractor','Shipping weight','decimal','lb',50],
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M7 Gen 4 migration dependency.');
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

export const kubotaM7Gen4CurrentSpecsMigration:DbMigration={
  id:'20260828_204_kubota_m7_gen4_current_specs',
  description:'Add the current 2026 US Kubota M7 Gen 4 lineup with seven grade-specific versions and source-backed specifications',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await connection.query(`INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,'M7 Generation 4 Series','m7-gen4-series') ON DUPLICATE KEY UPDATE name='M7 Generation 4 Series'`,[manufacturerId,equipmentTypeId]);
    const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='m7-gen4-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const currentSourceId=await ensureSourceRecord(connection,sourceId,CURRENT_URL,CURRENT_EXTERNAL_ID,'Kubota USA 2026 Full Product Line - M7 Generation 4 current lineup and specifications');

    const definitionIds=new Map<string,number>();
    for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){
      await connection.query(`INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,[section,key,label,valueType,canonicalUnit,displayOrder]);
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def=(key:string)=>{const id=definitionIds.get(key);if(!id)throw new Error(`Missing M7 Gen 4 spec definition ${key}`);return id;};

    const machineIds=new Map<ModelSlug,number>();
    for(const model of [{name:'M7-134',slug:'m7-134'},{name:'M7-154',slug:'m7-154'},{name:'M7-174',slug:'m7-174'}] as const){
      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES (?,?,?,?,?,'Current Kubota USA M7 Generation 4 agricultural tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,equipmentTypeId,seriesId,model.name,model.slug],
      );
      machineIds.set(model.slug,await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.slug]));
    }

    for(const version of versions){
      const machineId=machineIds.get(version.modelSlug);
      if(!machineId) throw new Error(`Missing M7 Gen 4 machine ${version.modelSlug}`);
      const isKvt=version.grade==='Premium KVT';
      const isDeluxe=version.grade==='Deluxe';
      const configuration=`${version.modelName} ${version.grade}, 4WD cab, ${isKvt?'Kubota Variable Transmission':'30F/15R semi-powershift'}`;
      const availabilityNote=version.modelSlug==='m7-134'
        ? 'Kubota USA 2026 Full Product Line lists M7-134 only in Deluxe grade. Earlier M7-4 literature also showed Premium and Premium KVT, but those older combinations are not treated as current here.'
        : 'Current US M7 Generation 4 grade confirmed by Kubota USA 2026 Full Product Line.';
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,version.slug,configuration,currentSourceId,availabilityNote],
      );
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,version.slug]);
      const values:Array<[string,string|number,string|null]>=[
        ['configuration.station',`${version.grade} Cab`,null],
        ['engine.make','Kubota',null],['engine.model','V6108-CR Tier 4 Final',null],['engine.type','Direct injection, intercooled turbocharged, water-cooled 4-cycle diesel',null],['engine.cylinders',4,null],['engine.displacement_cuin',374,'cu in'],['engine.gross_power',version.grossPower,'hp'],['engine.boost_power',version.boostPower,'hp'],['engine.rated_speed',2100,'rpm'],
        ['pto.rated_power',version.ptoPower,'hp'],
        ['transmission.type',isKvt?'CVT':'Semi-Powershift',null],['transmission.main_shift',isKvt?'CVT':'6-speed Powershift',null],['transmission.range_shift',isKvt?'CVT':'5-speed synchronized (GST)',null],['transmission.standard',isKvt?'Continuously variable KVT':'F30/R15; F54/R27 with optional creep',null],['transmission.shuttle','Electro-hydraulic shuttle',null],['transmission.clutch','Hydraulic multi-plate wet disc',null],
        ['hydraulics.system','Closed center load sensing (CCLS)',null],['hydraulics.main_pump_capacity',29,'gpm'],['hitch.category','Category 3 / 3N telescopic lower link',null],['hydraulics.control_system','Electronic draft control / lower-link sensing',null],['hitch.lift_capacity_24in',11797,'lb'],['hydraulics.remote_valves',isDeluxe?'3 standard, up to 4 mechanical valves':'4 standard, up to 5 electronic valves',null],
        ['pto.rear_description','540 / 540E / 1000 / 1000E rpm',null],['pto.front_description','1000 rpm optional front PTO',null],
        ['capacities.fuel_tank_variants',87,'US gal'],['capacities.def_tank',10,'US gal'],
        ['dimensions.overall_length',188,'in'],['dimensions.overall_height',121.7,'in'],['dimensions.overall_width_variants',isDeluxe?'98.4 or 110 in depending rear axle configuration':'110 in',null],['dimensions.wheelbase',107,'in'],['weight.tractor',14456,'lb'],
      ];
      for(const [key,value,unit] of values) await upsertSpec(connection,machineId,versionId,def(key),currentSourceId,value,unit);
    }
  },
};