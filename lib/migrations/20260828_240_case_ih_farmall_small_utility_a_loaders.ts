import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
const fitments={
  'farmall-50a':['l545-farmall-small-utility-a','l555-farmall-small-utility-a'],
  'farmall-55a':['l610-farmall-small-utility-a'],
  'farmall-60a':['l545-farmall-small-utility-a','l555-farmall-small-utility-a'],
  'farmall-65a':['l610-farmall-small-utility-a'],
  'farmall-70a':['l545-farmall-small-utility-a','l555-farmall-small-utility-a'],
  'farmall-75a':['l610-farmall-small-utility-a'],
} as const;
const loaders=[
  {model:'L545',slug:'l545-farmall-small-utility-a',url:'https://www.caseih.com/en-us/unitedstates/products/loaders-attachments/l500-series-loaders/l545',externalId:'case-ih-farmall-small-utility-a-l545-current',lift:'2,205 lb max lift capacity',height:'106 in max height',breakout:'3,131 lb boom breakout force'},
  {model:'L555',slug:'l555-farmall-small-utility-a',url:'https://www.caseih.com/en-us/unitedstates/products/loaders-attachments/l500-series-loaders/l555',externalId:'case-ih-farmall-small-utility-a-l555-current',lift:'2,734 lb max lift capacity',height:'105 in max height',breakout:'3,527 lb boom breakout force'},
  {model:'L610',slug:'l610-farmall-small-utility-a',url:'https://www.caseih.com/en-us/unitedstates/products/loaders-attachments/l600-series-loaders/l610',externalId:'case-ih-farmall-small-utility-a-l610-current',lift:'3,153 lb max lift capacity',height:'120 in max height',breakout:null},
] as const;
async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){const [rows]=await connection.query<IdRow[]>(sql,params);if(!rows[0])throw new Error('Missing Case IH Farmall Small Utility A loader migration dependency.');return Number(rows[0].id);}
async function ensureSource(connection:Parameters<DbMigration['apply']>[0],sourceId:number,loader:typeof loaders[number]){const [rows]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[loader.externalId]);if(rows[0])return Number(rows[0].id);const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,[sourceId,loader.url,loader.externalId,`Case IH US ${loader.model} for Farmall Small Utility A official loader specifications`,JSON.stringify({loader:loader.model,series:'Farmall Small Utility A',maxLift:loader.lift,maxHeight:loader.height,boomBreakout:loader.breakout})]);return Number(result.insertId);}

export const caseIHFarmallSmallUtilityALoadersMigration:DbMigration={
  id:'20260828_240_case_ih_farmall_small_utility_a_loaders',
  description:'Add official Case IH L545/L555/L610 loader fitments for current Farmall Small Utility A 50A/55A/60A/65A/70A/75A tractors',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;if(!sourceId){const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Case IH','caseih.com','manufacturer','official')`);sourceId=Number(result.insertId);}
    const attachmentIds=new Map<string,number>();for(const loader of loaders){const loaderSourceId=await ensureSource(connection,sourceId,loader);await connection.query(`INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES (?,'front-loader',?,?,?,?,?,'verified') ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,[manufacturerId,loader.model,loader.slug,loader.lift,loader.height,`Case IH ${loader.model} for Farmall Small Utility A Series${loader.breakout?`; ${loader.breakout}`:''}`]);attachmentIds.set(loader.slug,await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug=? LIMIT 1`,[manufacturerId,loader.slug]));}
    for(const [modelSlug,loaderSlugs] of Object.entries(fitments)){const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug=? LIMIT 1`,[modelSlug]);for(const loaderSlug of loaderSlugs){const loader=loaders.find(item=>item.slug===loaderSlug)!;const [sourceRows2]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[loader.externalId]);const sourceRecordId=sourceRows2[0]?.id?Number(sourceRows2[0].id):0;await connection.query(`INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES (?,?,'Official Case IH Small Utility A family and model pages identify this loader as compatible with this tractor.',?,'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,[machineId,attachmentIds.get(loaderSlug),sourceRecordId]);}}
  }
};
