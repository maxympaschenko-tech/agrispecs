import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug:string; model:string; hp:number; rocLb:number; weightLb:number; geometry:'Radial'|'Vertical' };
const VERSION='united-states-current-2026-08';
const CASE_URL='https://www.casece.com/en-us/northamerica/products/compact-track-loaders';
const CNH_US_URL='https://www.caseih.com/en-us/unitedstates/products/skid-steers-track-loaders/b-series-compact-track-loader';
const models:Seed[]=[
 {slug:'tr270b',model:'TR270B',hp:74,rocLb:2700,weightLb:8270,geometry:'Radial'},
 {slug:'tr310b',model:'TR310B',hp:74,rocLb:3100,weightLb:8880,geometry:'Radial'},
 {slug:'tr340b',model:'TR340B',hp:90,rocLb:3400,weightLb:10000,geometry:'Radial'},
 {slug:'tv370b',model:'TV370B',hp:74,rocLb:3700,weightLb:9630,geometry:'Vertical'},
 {slug:'tv450b',model:'TV450B',hp:90,rocLb:4500,weightLb:10610,geometry:'Vertical'},
 {slug:'tv620b',model:'TV620B',hp:114,rocLb:6200,weightLb:16300,geometry:'Vertical'},
];
const defs:Array<[string,string,string,string,string|null,number]>=[
 ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
 ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
 ['Machine Configuration','case.brand_context','Brand context','text',null,3],
 ['Engine','compact_track_loader.engine_power','Published horsepower','decimal','hp',10],
 ['Loader Performance','compact_track_loader.rated_operating_capacity','Rated operating capacity at 50% tipping load','decimal','lb',10],
 ['Loader Performance','compact_track_loader.lift_geometry','Loader lift geometry','text',null,20],
 ['Dimensions & Weight','compact_track_loader.operating_weight','Operating weight','decimal','lb',10],
];
async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('CASE compact track loader migration dependency missing');return Number(r[0].id);}
async function ensureSource(c:Parameters<DbMigration['apply']>[0],name:string,domain:string){const[r]=await c.query<IdRow[]>(`SELECT id FROM sources WHERE name=? AND domain=? ORDER BY id LIMIT 1`,[name,domain]);if(r[0])return Number(r[0].id);const[x]=await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES(?,?,'manufacturer','official')`,[name,domain]);return Number(x.insertId);}
async function record(c:Parameters<DbMigration['apply']>[0],sid:number,externalId:string,url:string,title:string,raw:unknown){const[r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);if(r[0])return Number(r[0].id);const[x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,url,externalId,title,JSON.stringify(raw)]);return Number(x.insertId);}
async function put(c:Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,rid:number,value:string|number,unit:string|null=null){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,rid]);}
export const caseBSeriesCompactTrackLoadersCurrentMigration:DbMigration={
 id:'20260831_538_case_b_series_compact_track_loaders_current',description:'Add current CASE North America B Series compact track loaders',async apply(c){
  await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Compact Track Loader','compact-track-loader') ON DUPLICATE KEY UPDATE name=VALUES(name)`);await c.query(`INSERT INTO manufacturers(name,slug) VALUES('CASE','case') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
  const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='case' LIMIT 1`),et=await id(c,`SELECT id FROM equipment_types WHERE slug='compact-track-loader' LIMIT 1`);
  const caseSid=await ensureSource(c,'CASE Construction Equipment','casece.com'),cnhSid=await ensureSource(c,'Case IH','caseih.com');
  const performanceRid=await record(c,caseSid,'case-b-series-ctl-na-current-2026-08',CASE_URL,'CASE B Series compact track loaders current North America model table',{captured:'2026-08-31',market:'North America / United States product site',equipmentType:'Compact Track Loader',values:'Horsepower and rated operating capacity at 50% tipping load',models:models.map(({model,hp,rocLb})=>({model,hp,rocLb}))});
  const usTableRid=await record(c,cnhSid,'case-b-series-ctl-caseih-us-current-2026-08',CNH_US_URL,'CASE B Series compact track loaders current United States operating-weight table',{captured:'2026-08-31',market:'United States',equipmentType:'Compact Track Loader',values:'Operating weight and lift geometry',models:models.map(({model,weightLb,geometry})=>({model,weightLb,geometry}))});
  await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'B Series Compact Track Loaders','b-series-compact-track-loaders') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='b-series-compact-track-loaders' LIMIT 1`,[mf,et]);
  const ids=new Map<string,number>();for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));}const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing CASE CTL definition ${k}`);return v;};
  for(const m of models){await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current CASE B Series compact track loader listed on official North America and United States product pages','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.model,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','B Series current North America/US configuration',TRUE,?,'Horsepower and ROC use CASE Construction Equipment North America current product data; operating weight and lift geometry use the current United States CASE B Series table published on the Case IH site.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[mid,VERSION,performanceRid]);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);await put(c,mid,vid,def('configuration.type'),performanceRid,'Compact track loader');await put(c,mid,vid,def('configuration.market_scope'),performanceRid,'United States / North America current catalog');await put(c,mid,vid,def('case.brand_context'),performanceRid,'CASE Construction Equipment B Series');await put(c,mid,vid,def('compact_track_loader.engine_power'),performanceRid,m.hp,'hp');await put(c,mid,vid,def('compact_track_loader.rated_operating_capacity'),performanceRid,m.rocLb,'lb');await put(c,mid,vid,def('compact_track_loader.lift_geometry'),usTableRid,m.geometry);await put(c,mid,vid,def('compact_track_loader.operating_weight'),usTableRid,m.weightLb,'lb');}
 }
};
