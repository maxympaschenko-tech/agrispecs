import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSeed={slug:string;model:string;ratedHp:number;maxHp:number;ptoHp:number;aspiration:string};
const FAMILY_URL='https://www.deere.com/en-us/products-solutions/tractors/row-crop-4wd-tractors/8-series-tractors';
const FAMILY_EXTERNAL_ID='john-deere-8-series-current-family-2026-08';
const SPEC_URL='https://www.deere.com/assets/pdfs/region-4/products/row-crop-tractors/4867854-8-series-tractor.pdf';
const SPEC_EXTERNAL_ID='john-deere-8-series-official-specifications';
const VERSION_SLUG='united-states-current-2026-08';
const models:ModelSeed[]=[
  {slug:'8rt-310',model:'8RT 310',ratedHp:310,maxHp:341,ptoHp:246,aspiration:'Single variable-geometry turbocharger'},
  {slug:'8rt-340',model:'8RT 340',ratedHp:340,maxHp:374,ptoHp:273,aspiration:'Single variable-geometry turbocharger'},
  {slug:'8rt-370',model:'8RT 370',ratedHp:370,maxHp:407,ptoHp:300,aspiration:'Dual turbochargers - variable-geometry plus fixed-geometry in series'},
  {slug:'8rt-410',model:'8RT 410',ratedHp:410,maxHp:443,ptoHp:300,aspiration:'Dual turbochargers - variable-geometry plus fixed-geometry in series'},
];
const definitions=[
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Machine Configuration','configuration.track','Wheel or track configuration','text',null,2],
  ['Machine Configuration','drivetrain.type','Drive type','text',null,3],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.displacement','Engine displacement','decimal','L',3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.aspiration','Aspiration','text',null,5],
  ['Engine','engine.rated_power','Rated engine power (ISO)','decimal','hp',6],
  ['Engine','engine.maximum_power','Maximum engine power (ISO)','decimal','hp',7],
  ['Engine','engine.ipm_boost','Intelligent Power Management boost','decimal','hp',8],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Engine','engine.emissions','Emissions certification','text',null,10],
  ['PTO','pto.rated_power','Rated PTO power','decimal','hp',10],
] as const;
async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){const [rows]=await connection.query<IdRow[]>(sql,params);if(!rows[0])throw new Error('Missing John Deere 8RT migration dependency.');return Number(rows[0].id);}
async function ensureSource(connection:Parameters<DbMigration['apply']>[0],sourceId:number,externalId:string,url:string,title:string){const [rows]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);if(rows[0])return Number(rows[0].id);const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,url,externalId,title]);return Number(result.insertId);}
async function upsertSpec(connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,definitionId:number,sourceId:number,value:string|number,unit:string|null=null){await connection.query(`INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES (?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[machineId,versionId,definitionId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceId]);}

export const johnDeere8RTCurrentSpecsMigration:DbMigration={
  id:'20260828_215_john_deere_8rt_current_specs',
  description:'Add current US John Deere 8RT 310-410 two-track tractors with official JD9 power and PTO specifications',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);const equipmentTypeId=await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await connection.query(`INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug) VALUES (?,?,'8RT Series','8rt-series') ON DUPLICATE KEY UPDATE name='8RT Series'`,[manufacturerId,equipmentTypeId]);const seriesId=await selectId(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='8rt-series' LIMIT 1`,[manufacturerId,equipmentTypeId]);
    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;if(!sourceId){const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);sourceId=Number(result.insertId);}
    const familyId=await ensureSource(connection,sourceId,FAMILY_EXTERNAL_ID,FAMILY_URL,'John Deere US current 8 Series product family');const specId=await ensureSource(connection,sourceId,SPEC_EXTERNAL_ID,SPEC_URL,'John Deere official 8 Series tractor specifications');
    const definitionIds=new Map<string,number>();for(const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions){await connection.query(`INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,[section,key,label,valueType,canonicalUnit,displayOrder]);definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));}const def=(key:string)=>{const id=definitionIds.get(key);if(!id)throw new Error(`Missing 8RT spec ${key}`);return id;};
    for(const model of models){
      await connection.query(`INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES (?,?,?,?,?,'Current John Deere US 8RT two-track tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[manufacturerId,equipmentTypeId,seriesId,model.model,model.slug]);const machineId=await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.slug]);
      await connection.query(`INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES (?,?,'US','United States','Current 8RT two-track tractor - cab',TRUE,?,?) ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[machineId,VERSION_SLUG,familyId,'Current Deere US 8RT lineup is 310-410. Two-track configuration is stored separately from 8R wheel and 8RX four-track families.']);const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,VERSION_SLUG]);
      const values:Array<[string,string|number,string|null,number]>=[['configuration.station','Cab',null,familyId],['configuration.track','2-Track',null,familyId],['drivetrain.type','Tracked',null,familyId],['engine.make','John Deere',null,familyId],['engine.model','JD9',null,familyId],['engine.displacement',9,'L',specId],['engine.cylinders',6,null,specId],['engine.aspiration',model.aspiration,null,specId],['engine.rated_power',model.ratedHp,'hp',specId],['engine.maximum_power',model.maxHp,'hp',specId],['engine.ipm_boost',35,'hp',specId],['engine.rated_speed',2100,'rpm',specId],['engine.emissions','Final Tier 4',null,familyId],['pto.rated_power',model.ptoHp,'hp',specId]];
      for(const [key,value,unit,recordId] of values)await upsertSpec(connection,machineId,versionId,def(key),recordId,value,unit);
    }
  }
};