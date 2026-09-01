import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  url: string;
  powertrain: 'Diesel' | 'Electric';
  hp?: number;
  batteryKwh?: number;
  weightLb: number;
  rocLb: number;
  lift: 'Radial';
  marketingRocLb: number;
};

const VERSION = 'north-america-current-2026-09';
const FAMILY_URL = 'https://construction.newholland.com/en-us/northamerica/products/light-construction-equipment/mini-track-loaders';
const models: Seed[] = [
  { slug: 'c314', model: 'C314', url: `${FAMILY_URL}/c314`, powertrain: 'Diesel', hp: 24.8, weightLb: 3536, rocLb: 1416, lift: 'Radial', marketingRocLb: 1000 },
  { slug: 'c314x', model: 'C314X', url: `${FAMILY_URL}/c314x`, powertrain: 'Electric', batteryKwh: 23.5, weightLb: 3886, rocLb: 1405, lift: 'Radial', marketingRocLb: 1034 },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Machine Configuration','mini_track_loader.powertrain','Powertrain','text',null,3],
  ['Engine','mini_track_loader.engine_power','Published horsepower','decimal','hp',10],
  ['Electrical','mini_track_loader.battery_capacity','Gross battery capacity','decimal','kWh',10],
  ['Loader Performance','mini_track_loader.rated_operating_capacity','ROC at 50% tipping load','decimal','lb',10],
  ['Loader Performance','mini_track_loader.lift_type','Lift type','text',null,20],
  ['Loader Performance','mini_track_loader.roc_source_note','ROC source note','text',null,30],
  ['Dimensions & Weight','mini_track_loader.operating_weight','Operating weight','decimal','lb',10],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) { const [r] = await c.query<IdRow[]>(sql,p); if (!r[0]) throw new Error('New Holland mini track loader migration dependency missing'); return Number(r[0].id); }
async function source(c: Parameters<DbMigration['apply']>[0]) { const [r] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland Construction' AND domain='construction.newholland.com' ORDER BY id LIMIT 1`); if (r[0]) return Number(r[0].id); const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland Construction','construction.newholland.com','manufacturer','official')`); return Number(x.insertId); }
async function record(c: Parameters<DbMigration['apply']>[0], sid:number, m:Seed) { const externalId=`new-holland-${m.slug}-mini-track-loader-na-current-2026-09`; const [r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]); if(r[0]) return Number(r[0].id); const [x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,m.url,externalId,`New Holland ${m.model} current North America mini track loader specifications`,JSON.stringify({captured:'2026-09-01',market:'North America / United States site',equipmentType:'Mini Track Loader',model:m,sourceDiscrepancy:{technicalCardRocAt50TipLb:m.rocLb,marketingIntroRatedOperatingCapacityLb:m.marketingRocLb},notes:'The catalog stores the explicitly labeled technical-card ROC @ 50% Tip. Different marketing-copy rated-operating-capacity wording is preserved as a source discrepancy rather than silently substituted.'})]); return Number(x.insertId); }
async function put(c: Parameters<DbMigration['apply']>[0], mid:number, vid:number, did:number, rid:number, value:string|number, unit:string|null=null) { await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,rid]); }

export const newHollandMiniTrackLoadersCurrentMigration: DbMigration = {
  id:'20260901_556_new_holland_mini_track_loaders_current',
  description:'Add current New Holland C314 and C314X mini track loaders with ROC source discrepancy preserved',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Mini Track Loader','mini-track-loader') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`), et=await id(c,`SELECT id FROM equipment_types WHERE slug='mini-track-loader' LIMIT 1`), sid=await source(c);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'New Holland Mini Track Loaders','new-holland-mini-track-loaders') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='new-holland-mini-track-loaders' LIMIT 1`,[mf,et]);
    const ids=new Map<string,number>(); for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));}
    const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing New Holland mini track loader definition ${k}`);return v;};
    for(const m of models){const rid=await record(c,sid,m);await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current New Holland Construction North America mini track loader; technical-card ROC is kept distinct from conflicting marketing-copy ROC','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.model,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America',?,TRUE,?,'Current New Holland Construction product data captured 2026-09-01. ROC stores the technical card value explicitly labeled ROC @ 50% Tip. The different rated-operating-capacity number in marketing copy is retained as a source note, not substituted.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,[mid,VERSION,`${m.powertrain} current narrow/base configuration`,rid]);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);await put(c,mid,vid,def('configuration.type'),rid,'Mini track loader');await put(c,mid,vid,def('configuration.market_scope'),rid,'North America / United States current catalog');await put(c,mid,vid,def('mini_track_loader.powertrain'),rid,m.powertrain);if(m.hp!==undefined)await put(c,mid,vid,def('mini_track_loader.engine_power'),rid,m.hp,'hp');if(m.batteryKwh!==undefined)await put(c,mid,vid,def('mini_track_loader.battery_capacity'),rid,m.batteryKwh,'kWh');await put(c,mid,vid,def('mini_track_loader.rated_operating_capacity'),rid,m.rocLb,'lb');await put(c,mid,vid,def('mini_track_loader.lift_type'),rid,m.lift);await put(c,mid,vid,def('mini_track_loader.roc_source_note'),rid,`Technical card: ${m.rocLb.toLocaleString('en-US')} lb ROC @ 50% Tip; product-page marketing intro separately states ${m.marketingRocLb.toLocaleString('en-US')} lb rated operating capacity.`);await put(c,mid,vid,def('mini_track_loader.operating_weight'),rid,m.weightLb,'lb');}
  },
};
