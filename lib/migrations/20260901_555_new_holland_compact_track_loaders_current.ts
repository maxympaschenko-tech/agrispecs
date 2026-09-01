import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; model: string; hp: number; weightLb: number; rocLb: number; lift: 'Radial' | 'Vertical' };

const VERSION = 'north-america-current-2026-09';
const URL = 'https://construction.newholland.com/en/northamerica/products/light-construction-equipment/compact-track-loaders';
const models: Seed[] = [
  { slug: 'c327', model: 'C327', hp: 74, weightLb: 8270, rocLb: 2700, lift: 'Radial' },
  { slug: 'c330', model: 'C330', hp: 67, weightLb: 8380, rocLb: 3000, lift: 'Vertical' },
  { slug: 'c332', model: 'C332', hp: 74, weightLb: 9630, rocLb: 3200, lift: 'Vertical' },
  { slug: 'c337', model: 'C337', hp: 74, weightLb: 9945, rocLb: 3700, lift: 'Vertical' },
  { slug: 'c345', model: 'C345', hp: 90, weightLb: 10610, rocLb: 4500, lift: 'Vertical' },
  { slug: 'c362', model: 'C362', hp: 114, weightLb: 16100, rocLb: 6200, lift: 'Vertical' },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Engine','new_holland.compact_track_loader.gross_power','Gross engine power','decimal','hp',10],
  ['Loader Performance','new_holland.compact_track_loader.rated_operating_capacity','Rated operating capacity at 50% tipping load','decimal','lb',10],
  ['Loader Performance','new_holland.compact_track_loader.lift_type','Lift type','text',null,20],
  ['Dimensions & Weight','new_holland.compact_track_loader.operating_weight','Operating weight','decimal','lb',10],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) { const [r] = await c.query<IdRow[]>(sql,p); if (!r[0]) throw new Error('New Holland compact track loader migration dependency missing'); return Number(r[0].id); }
async function source(c: Parameters<DbMigration['apply']>[0]) { const [r] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland Construction' AND domain='construction.newholland.com' ORDER BY id LIMIT 1`); if (r[0]) return Number(r[0].id); const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland Construction','construction.newholland.com','manufacturer','official')`); return Number(x.insertId); }
async function record(c: Parameters<DbMigration['apply']>[0], sid: number) { const externalId='new-holland-compact-track-loaders-na-current-2026-09'; const [r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]); if(r[0]) return Number(r[0].id); const [x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,URL,externalId,'New Holland current North America compact track loader model table',JSON.stringify({captured:'2026-09-01',market:'North America / United States site',equipmentType:'Compact Track Loader',models,notes:'Official New Holland Construction page publishes gross horsepower, operating weight, ROC at 50% tipping load and lift type for each current model.'})]); return Number(x.insertId); }
async function put(c: Parameters<DbMigration['apply']>[0], mid:number, vid:number, did:number, rid:number, value:string|number, unit:string|null=null) { await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,rid]); }

export const newHollandCompactTrackLoadersCurrentMigration: DbMigration = {
  id:'20260901_555_new_holland_compact_track_loaders_current',
  description:'Add current New Holland North America compact track loaders',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Compact Track Loader','compact-track-loader') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`), et=await id(c,`SELECT id FROM equipment_types WHERE slug='compact-track-loader' LIMIT 1`), sid=await source(c), rid=await record(c,sid);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'New Holland Compact Track Loaders','new-holland-compact-track-loaders') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='new-holland-compact-track-loaders' LIMIT 1`,[mf,et]);
    const ids=new Map<string,number>(); for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));}
    const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing New Holland compact track loader definition ${k}`);return v;};
    for(const m of models){await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current New Holland Construction North America compact track loader','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.model,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','Current New Holland Construction model-table specification',TRUE,?,'Official North America product page captured 2026-09-01. Gross horsepower, operating weight, ROC and lift type are stored exactly as published.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,[mid,VERSION,rid]);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);await put(c,mid,vid,def('configuration.type'),rid,'Compact track loader');await put(c,mid,vid,def('configuration.market_scope'),rid,'North America / United States current catalog');await put(c,mid,vid,def('new_holland.compact_track_loader.gross_power'),rid,m.hp,'hp');await put(c,mid,vid,def('new_holland.compact_track_loader.rated_operating_capacity'),rid,m.rocLb,'lb');await put(c,mid,vid,def('new_holland.compact_track_loader.lift_type'),rid,m.lift);await put(c,mid,vid,def('new_holland.compact_track_loader.operating_weight'),rid,m.weightLb,'lb');}
  },
};
