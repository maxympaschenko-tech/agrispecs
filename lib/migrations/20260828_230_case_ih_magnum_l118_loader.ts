import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
const SOURCE_URL='https://www.caseih.com/en-us/unitedstates/products/tractors/magnum-series';
const SOURCE_EXTERNAL_ID='case-ih-magnum-l118-loader-current';
const modelSlugs=['magnum-200','magnum-220','magnum-240'] as const;
async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){const [rows]=await connection.query<IdRow[]>(sql,params);if(!rows[0])throw new Error('Missing Case IH Magnum L118 dependency.');return Number(rows[0].id);}

export const caseIHMagnumL118LoaderMigration:DbMigration={
  id:'20260828_230_case_ih_magnum_l118_loader',
  description:'Add official Case IH L118 loader compatibility for current Magnum 200, 220 and 240 tractors',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;if(!sourceId){const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Case IH','caseih.com','manufacturer','official')`);sourceId=Number(result.insertId);}
    const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[SOURCE_EXTERNAL_ID]);let sourceRecordId=existing[0]?.id?Number(existing[0].id):0;if(!sourceRecordId){const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,[sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Case IH US Magnum Series - L118 loader compatibility',JSON.stringify({loader:'L118',compatibleRange:'Magnum 180 to 240',currentModels:['Magnum 200','Magnum 220','Magnum 240'],maxLiftCapacityLb:6151,maxHeightIn:162,boomBreakoutForceLb:8620})]);sourceRecordId=Number(result.insertId);}
    await connection.query(`INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES (?,'front-loader','L118','l118',?,?,?,'verified') ON DUPLICATE KEY UPDATE model_name='L118',lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,[manufacturerId,'6,151 lb max lift capacity; 8,620 lb boom breakout force','162 in max height','Case IH L118 loader for Magnum 180-240. Current catalog fitments on Farm Machine Specs are limited to current Magnum 200, 220 and 240.']);const attachmentId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug='l118' LIMIT 1`,[manufacturerId]);
    for(const slug of modelSlugs){const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug=? LIMIT 1`,[slug]);await connection.query(`INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES (?,?,?,?,'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,[machineId,attachmentId,`Case IH current Magnum family page lists L118 for Magnum 180-240; ${slug.replace('magnum-','Magnum ')} is directly within that range.`,sourceRecordId]);}
  }
};