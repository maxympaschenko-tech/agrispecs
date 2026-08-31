import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; model: string; netHp: number; weightLb: number; geometry: 'Radial' | 'Vertical' };
const VERSION = 'united-states-current-2026-08';
const URL = 'https://www.caseih.com/en-us/unitedstates/products/skid-steers-track-loaders/b-series-skid-steer-loaders';
const models: Seed[] = [
  { slug: 'sr160b', model: 'SR160B', netHp: 57, weightLb: 5645, geometry: 'Radial' },
  { slug: 'sr175b', model: 'SR175B', netHp: 64, weightLb: 6270, geometry: 'Radial' },
  { slug: 'sv185b', model: 'SV185B', netHp: 57, weightLb: 6570, geometry: 'Vertical' },
  { slug: 'sr210b', model: 'SR210B', netHp: 68, weightLb: 6970, geometry: 'Radial' },
  { slug: 'sr240b', model: 'SR240B', netHp: 68, weightLb: 7400, geometry: 'Radial' },
  { slug: 'sr270b', model: 'SR270B', netHp: 84, weightLb: 8117, geometry: 'Radial' },
  { slug: 'sv280b', model: 'SV280B', netHp: 68, weightLb: 8000, geometry: 'Vertical' },
  { slug: 'sv340b', model: 'SV340B', netHp: 84, weightLb: 9100, geometry: 'Vertical' },
];
const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Machine Configuration','case.brand_context','Brand context','text',null,3],
  ['Engine','skid_steer.net_engine_power','Net engine power','decimal','hp',10],
  ['Loader Performance','skid_steer.lift_geometry','Loader lift geometry','text',null,10],
  ['Dimensions & Weight','skid_steer.operating_weight','Operating weight','decimal','lb',10],
];
async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) { const [r] = await c.query<IdRow[]>(sql,p); if (!r[0]) throw new Error('CASE skid steer migration dependency missing'); return Number(r[0].id); }
async function source(c: Parameters<DbMigration['apply']>[0]) { const [r] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`); if (r[0]) return Number(r[0].id); const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`); return Number(x.insertId); }
async function record(c: Parameters<DbMigration['apply']>[0], sid: number) { const externalId='case-b-series-skid-steers-us-current-2026-08'; const [r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]); if(r[0]) return Number(r[0].id); const [x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,URL,externalId,'CASE B Series skid steer loaders current United States model table',JSON.stringify({captured:'2026-08-31',market:'United States',manufacturerBrand:'CASE Construction Equipment',equipmentType:'Skid Steer Loader',models})]); return Number(x.insertId); }
async function put(c: Parameters<DbMigration['apply']>[0], mid:number, vid:number, did:number, rid:number, value:string|number, unit:string|null=null) { await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,rid]); }
export const caseBSeriesSkidSteersCurrentMigration: DbMigration = {
  id:'20260831_537_case_b_series_skid_steers_current', description:'Add current United States CASE B Series skid steer loaders', async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Skid Steer Loader','skid-steer-loader') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('CASE','case') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='case' LIMIT 1`), et=await id(c,`SELECT id FROM equipment_types WHERE slug='skid-steer-loader' LIMIT 1`), sid=await source(c), rid=await record(c,sid);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'B Series Skid Steer Loaders','b-series-skid-steer-loaders') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='b-series-skid-steer-loaders' LIMIT 1`,[mf,et]);
    const ids=new Map<string,number>(); for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));}
    const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing CASE skid steer definition ${k}`);return v;};
    for(const m of models){await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current CASE B Series skid steer model listed on official United States CNH product page','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.model,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','B Series current US model-table specification',TRUE,?,'Source is the official Case IH United States product page for CASE-branded B Series compact equipment. Values are stored exactly as net engine power, operating weight and loader geometry shown in that table.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[mid,VERSION,rid]);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);await put(c,mid,vid,def('configuration.type'),rid,'Skid steer loader');await put(c,mid,vid,def('configuration.market_scope'),rid,'United States current catalog');await put(c,mid,vid,def('case.brand_context'),rid,'CASE Construction Equipment B Series');await put(c,mid,vid,def('skid_steer.net_engine_power'),rid,m.netHp,'hp');await put(c,mid,vid,def('skid_steer.lift_geometry'),rid,m.geometry);await put(c,mid,vid,def('skid_steer.operating_weight'),rid,m.weightLb,'lb');}
  }
};
