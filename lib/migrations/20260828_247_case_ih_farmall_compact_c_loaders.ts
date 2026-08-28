import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
const fitments={
  'farmall-compact-35c':['l350a-farmall-compact-c'],
  'farmall-compact-40c':['l350a-farmall-compact-c'],
  'farmall-compact-45c':['l360a-farmall-compact-c'],
  'farmall-compact-50c':['l360a-farmall-compact-c'],
  'farmall-compact-55c':['l360a-farmall-compact-c'],
} as const;
const loaders=[
  {model:'L350A',slug:'l350a-farmall-compact-c',externalId:'case-ih-farmall-compact-c-l350a-current',url:'https://www.caseih.com/en-us/unitedstates/products/tractors/farmall-compact-series/compact-farmall-c-series',lift:'1,540 lb max lift capacity',height:'105 in max height',breakout:'2,640 lb boom breakout force'},
  {model:'L360A',slug:'l360a-farmall-compact-c',externalId:'case-ih-farmall-compact-c-l360a-current',url:'https://www.caseih.com/en-us/unitedstates/products/tractors/farmall-compact-series/compact-farmall-c-series',lift:'1,830 lb max lift capacity',height:'112 in max height',breakout:'3,114 lb boom breakout force'},
] as const;
async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){const [rows]=await connection.query<IdRow[]>(sql,params);if(!rows[0])throw new Error('Missing Case IH Farmall Compact C loader migration dependency.');return Number(rows[0].id);}
async function ensureSource(connection:Parameters<DbMigration['apply']>[0],sourceId:number,loader:typeof loaders[number]){const [rows]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[loader.externalId]);if(rows[0])return Number(rows[0].id);const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,[sourceId,loader.url,loader.externalId,`Case IH US ${loader.model} for Farmall Compact C official compatibility`,JSON.stringify({loader:loader.model,series:'Farmall Compact C',lift:loader.lift,height:loader.height,breakout:loader.breakout})]);return Number(result.insertId);}

export const caseIHFarmallCompactCLoadersMigration:DbMigration={
  id:'20260828_247_case_ih_farmall_compact_c_loaders',
  description:'Add official Case IH L350A/L360A loader fitments for current Farmall Compact C tractors',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;if(!sourceId){const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Case IH','caseih.com','manufacturer','official')`);sourceId=Number(result.insertId);}
    const attachmentIds=new Map<string,number>();for(const loader of loaders){const sourceRecordId=await ensureSource(connection,sourceId,loader);await connection.query(`INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES (?,'front-loader',?,?,?,?,?,'verified') ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,[manufacturerId,loader.model,loader.slug,loader.lift,loader.height,`Case IH ${loader.model} for Farmall Compact C Series; ${loader.breakout}`]);attachmentIds.set(loader.slug,await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug=? LIMIT 1`,[manufacturerId,loader.slug]));for(const [modelSlug,loaderSlugs] of Object.entries(fitments)){if(!loaderSlugs.includes(loader.slug as never))continue;const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='case-ih' AND m.slug=? LIMIT 1`,[modelSlug]);await connection.query(`INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES (?,?,'Official Case IH Farmall Compact C page identifies this loader as compatible with this tractor.',?,'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,[machineId,attachmentIds.get(loader.slug),sourceRecordId]);}}
  }
};
