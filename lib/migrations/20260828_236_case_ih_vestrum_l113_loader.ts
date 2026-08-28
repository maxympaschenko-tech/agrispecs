import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
const models=[
  {slug:'vestrum-100',externalId:'case-ih-vestrum-100-current-us'},
  {slug:'vestrum-110',externalId:'case-ih-vestrum-110-current-us'},
  {slug:'vestrum-120',externalId:'case-ih-vestrum-120-current-us'},
  {slug:'vestrum-130',externalId:'case-ih-vestrum-130-current-us'},
] as const;
const LOADER_URL='https://www.caseih.com/en-us/unitedstates/products/loaders-attachments/l11-series-loaders/l113-vestrum';
const LOADER_EXTERNAL_ID='case-ih-vestrum-l113-loader-current';
async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){const [rows]=await connection.query<IdRow[]>(sql,params);if(!rows[0])throw new Error('Missing Case IH Vestrum loader migration dependency.');return Number(rows[0].id);}
async function ensureSource(connection:Parameters<DbMigration['apply']>[0],sourceId:number){const [rows]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[LOADER_EXTERNAL_ID]);if(rows[0])return Number(rows[0].id);const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,[sourceId,LOADER_URL,LOADER_EXTERNAL_ID,'Case IH US L113 for Vestrum Series official loader specifications',JSON.stringify({loader:'L113',series:'Vestrum',maxLiftLb:3505,maxHeightIn:143,boomBreakoutLb:3682})]);return Number(result.insertId);}

export const caseIHVestrumL113LoaderMigration:DbMigration={
  id:'20260828_236_case_ih_vestrum_l113_loader',
  description:'Add official Case IH L113 loader and source-backed fitments for current Vestrum 100/110/120/130 tractors',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;if(!sourceId){const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Case IH','caseih.com','manufacturer','official')`);sourceId=Number(result.insertId);}
    const loaderSourceId=await ensureSource(connection,sourceId);
    await connection.query(`INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES (?,'front-loader','L113','l113-vestrum','3,505 lb max lift capacity; 3,682 lb boom breakout force','143 in max height','Case IH L113 for Vestrum Series','verified') ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,[manufacturerId]);
    const attachmentId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug='l113-vestrum' LIMIT 1`,[manufacturerId]);
    for(const model of models){const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug=? LIMIT 1`,[model.slug]);const [modelSources]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[model.externalId]);const fitmentSourceId=modelSources[0]?.id?Number(modelSources[0].id):loaderSourceId;await connection.query(`INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES (?,?,'Official Case IH Vestrum model and series pages identify the L113 as a compatible loader.',?,'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,[machineId,attachmentId,fitmentSourceId]);}
  }
};
