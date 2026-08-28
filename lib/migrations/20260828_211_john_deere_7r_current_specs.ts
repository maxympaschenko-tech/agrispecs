import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSeed={slug:string;model:string;displacement:number;engineFamily:string;ratedHp:number;maxHp:number;ptoHp:number;ipmBoost:number};

const PRICEBOOK_URL='https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/agricultural/TRACTORS_7000s-9000s_05May2026.pdf';
const PRICEBOOK_EXTERNAL_ID='john-deere-7r-pricebook-2026-05-05';
const SPEC_URL='https://www.deere.com/assets/pdfs/region-4/products/sprayers/4856100-7r-series-tractor.pdf';
const SPEC_EXTERNAL_ID='john-deere-7r-series-specifications-210-350';
const VERSION_SLUG='united-states-current-2026-08';

const models:ModelSeed[]=[
  {slug:'7r-210',model:'7R 210',displacement:6.8,engineFamily:'MJDXL06.8309 / current 6.8 L PowerTech PSS family',ratedHp:210,maxHp:231,ptoHp:170,ipmBoost:30},
  {slug:'7r-230',model:'7R 230',displacement:6.8,engineFamily:'MJDXL06.8309 / current 6.8 L PowerTech PSS family',ratedHp:230,maxHp:253,ptoHp:189,ipmBoost:30},
  {slug:'7r-250',model:'7R 250',displacement:6.8,engineFamily:'MJDXL06.8309 / current 6.8 L PowerTech PSS family',ratedHp:250,maxHp:275,ptoHp:205,ipmBoost:30},
  {slug:'7r-270',model:'7R 270',displacement:6.8,engineFamily:'MJDXL06.8309',ratedHp:270,maxHp:297,ptoHp:224,ipmBoost:30},
  {slug:'7r-290',model:'7R 290',displacement:9.0,engineFamily:'MJDXL09.0319',ratedHp:290,maxHp:319,ptoHp:242,ipmBoost:30},
  {slug:'7r-310',model:'7R 310',displacement:9.0,engineFamily:'MJDXL09.0319 / current 9.0 L PowerTech PSS family',ratedHp:310,maxHp:341,ptoHp:260,ipmBoost:30},
  {slug:'7r-330',model:'7R 330',displacement:9.0,engineFamily:'MJDXL09.0319 / current 9.0 L PowerTech PSS family',ratedHp:330,maxHp:363,ptoHp:260,ipmBoost:25},
  {slug:'7r-350',model:'7R 350',displacement:9.0,engineFamily:'MJDXL09.0319 / current 9.0 L PowerTech PSS family',ratedHp:350,maxHp:385,ptoHp:260,ipmBoost:25},
];

const definitions=[
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.family','Engine family','text',null,2],
  ['Engine','engine.displacement','Engine displacement','decimal','L',3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.rated_power','Rated engine power (ISO)','decimal','hp',5],
  ['Engine','engine.maximum_power','Maximum engine power (ISO)','decimal','hp',6],
  ['Engine','engine.ipm_boost','Intelligent Power Management boost','decimal','hp',7],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',8],
  ['Engine','engine.emissions','Emissions certification','text',null,9],
  ['PTO','pto.rated_power','Rated PTO power','decimal','hp',10],
  ['Transmission','transmission.standard','Standard transmission','text',null,10],
  ['Transmission','transmission.optional','Transmission options','text',null,20],
  ['Transmission','transmission.max_speed','Maximum optional transport speed','decimal','mph',30],
  ['Hydraulics','hydraulics.pump_rated_output','Standard hydraulic pump output','decimal','gpm',10],
  ['Hydraulics','hydraulics.pump_optional_output','Optional hydraulic pump output','decimal','gpm',20],
  ['Hydraulics','hitch.category','Rear hitch category','text',null,30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',10],
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing John Deere 7R migration dependency.');
  return Number(rows[0].id);
}
async function ensureSource(connection:Parameters<DbMigration['apply']>[0],sourceId:number,externalId:string,url:string,title:string,publishedDate:string|null){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,[externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,[sourceId,url,externalId,title,publishedDate]);
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

export const johnDeere7RCurrentSpecsMigration:DbMigration={
  id:'20260828_211_john_deere_7r_current_specs',
  description:'Add current 2026 US John Deere 7R 210-350 lineup with official power, engine, transmission and hydraulic specifications',
  async apply(connection){
    await connection.query(`INSERT INTO equipment_types (name,slug) VALUES ('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers (name,slug) VALUES ('John Deere','john-deere') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await connection.query(`INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,'7R Series','7r-series') ON DUPLICATE KEY UPDATE name='7R Series'`,[manufacturerId,equipmentTypeId]);
    const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='7r-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const pricebookId=await ensureSource(connection,sourceId,PRICEBOOK_EXTERNAL_ID,PRICEBOOK_URL,'John Deere North America 7000-9000 Series price book - current 7R lineup','2026-05-05');
    const specId=await ensureSource(connection,sourceId,SPEC_EXTERNAL_ID,SPEC_URL,'John Deere 7R Series 210-350 official specification sheet',null);

    const definitionIds=new Map<string,number>();
    for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){
      await connection.query(`INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,[section,key,label,valueType,canonicalUnit,displayOrder]);
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def=(key:string)=>{const id=definitionIds.get(key);if(!id)throw new Error(`Missing 7R spec definition ${key}`);return id;};

    for(const model of models){
      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES (?,?,?,?,?,'Current John Deere North America 7R row-crop tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,equipmentTypeId,seriesId,model.model,model.slug],
      );
      const machineId=await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.slug]);
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States','Current MY2026 North America 7R wheel tractor',TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,VERSION_SLUG,pricebookId,'Current model presence and engine selection are confirmed by the 5 May 2026 Deere North America price book. Published 7R specification-sheet values provide model power, PTO, transmission, hydraulics and wheelbase.'],
      );
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,VERSION_SLUG]);
      const values:Array<[string,string|number,string|null,number]>=[
        ['configuration.station','Cab',null,specId],
        ['engine.make','John Deere',null,pricebookId],['engine.family',model.engineFamily,null,specId],['engine.displacement',model.displacement,'L',pricebookId],['engine.cylinders',6,null,specId],
        ['engine.rated_power',model.ratedHp,'hp',specId],['engine.maximum_power',model.maxHp,'hp',specId],['engine.ipm_boost',model.ipmBoost,'hp',specId],['engine.rated_speed',2100,'rpm',specId],['engine.emissions','Final Tier 4 / current North America compliant engine selection',null,pricebookId],
        ['pto.rated_power',model.ptoHp,'hp',specId],
        ['transmission.standard','John Deere e23 42 km/h (26 mph)',null,specId],['transmission.optional','e23 50 km/h (31 mph); John Deere IVT 0.03-26 mph or 0.03-31 mph',null,specId],['transmission.max_speed',31,'mph',specId],
        ['hydraulics.pump_rated_output',43,'gpm',specId],['hydraulics.pump_optional_output',59,'gpm',specId],['hitch.category','Category 3N/3 with Quik-Coupler; optional hook-end configurations',null,specId],['dimensions.wheelbase',115.2,'in',specId],
      ];
      for(const [key,value,unit,sourceRecordId] of values) await upsertSpec(connection,machineId,versionId,def(key),sourceRecordId,value,unit);
    }
  },
};