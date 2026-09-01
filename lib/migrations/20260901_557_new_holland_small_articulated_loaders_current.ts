import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug:string; model:string; hp?:number; batteryKwh?:number; weightLb:number; widthIn:number; heightIn:number; boom:'Standard'|'Telescopic Reach'; powertrain:'Diesel'|'Electric' };

const VERSION='north-america-current-2026-09';
const URL='https://construction.newholland.com/en/northamerica/products/light-construction-equipment/small-articulated-loaders';
const models:Seed[]=[
  {slug:'ml12',model:'ML12',hp:25,weightLb:2425,widthIn:36.2,heightIn:81.1,boom:'Standard',powertrain:'Diesel'},
  {slug:'ml12-telescopic',model:'ML12 Telescopic',hp:25,weightLb:2646,widthIn:36.2,heightIn:81.1,boom:'Telescopic Reach',powertrain:'Diesel'},
  {slug:'ml15',model:'ML15',hp:26,weightLb:3362,widthIn:43.3,heightIn:87.8,boom:'Standard',powertrain:'Diesel'},
  {slug:'ml22x',model:'ML22X',batteryKwh:24.9,weightLb:4850,widthIn:48.4,heightIn:90.6,boom:'Standard',powertrain:'Electric'},
  {slug:'ml23',model:'ML23',hp:26,weightLb:5181,widthIn:48.4,heightIn:90.6,boom:'Standard',powertrain:'Diesel'},
  {slug:'ml27',model:'ML27',hp:50,weightLb:5732,widthIn:60,heightIn:92.1,boom:'Standard',powertrain:'Diesel'},
  {slug:'ml27-telescopic',model:'ML27 Telescopic',hp:50,weightLb:5732,widthIn:60,heightIn:92.1,boom:'Telescopic Reach',powertrain:'Diesel'},
  {slug:'ml35-telescopic',model:'ML35 Telescopic',hp:65,weightLb:8818,widthIn:52.8,heightIn:89.6,boom:'Telescopic Reach',powertrain:'Diesel'},
  {slug:'ml50-telescopic',model:'ML50 Telescopic',hp:74,weightLb:11464,widthIn:57.5,heightIn:99.3,boom:'Telescopic Reach',powertrain:'Diesel'},
];

const defs:Array<[string,string,string,string,string|null,number]>=[
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Engine','small_articulated_loader.engine_power','Published horsepower','decimal','hp',10],
  ['Electrical','small_articulated_loader.battery_capacity','Battery capacity','decimal','kWh',10],
  ['Loader Performance','small_articulated_loader.boom_configuration','Boom configuration','text',null,10],
  ['Loader Performance','small_articulated_loader.powertrain','Powertrain','text',null,20],
  ['Dimensions & Weight','small_articulated_loader.operating_weight','Operating weight','decimal','lb',10],
  ['Dimensions & Weight','small_articulated_loader.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','small_articulated_loader.overall_height','Overall height','decimal','in',30],
];

async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('New Holland small articulated loader migration dependency missing');return Number(r[0].id);}
async function source(c:Parameters<DbMigration['apply']>[0]){const[r]=await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland Construction' AND domain='construction.newholland.com' ORDER BY id LIMIT 1`);if(r[0])return Number(r[0].id);const[x]=await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland Construction','construction.newholland.com','manufacturer','official')`);return Number(x.insertId);}
async function record(c:Parameters<DbMigration['apply']>[0],sid:number){const externalId='new-holland-small-articulated-loaders-na-current-2026-09';const[r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);if(r[0])return Number(r[0].id);const[x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,URL,externalId,'New Holland small articulated loaders current North America model table',JSON.stringify({captured:'2026-09-01',market:'North America / United States site',equipmentType:'Small Articulated Loader',models,notes:'Structured family model cards are used for horsepower or battery capacity, operating weight, overall width and height. Telescopic variants remain separate machines. Individual marketing prose is not allowed to override the family technical-card values.'})]);return Number(x.insertId);}
async function put(c:Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,rid:number,value:string|number,unit:string|null=null){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,rid]);}

export const newHollandSmallArticulatedLoadersCurrentMigration:DbMigration={
  id:'20260901_557_new_holland_small_articulated_loaders_current',
  description:'Add current New Holland North America small articulated loaders',
  async apply(c){
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Small Articulated Loader','small-articulated-loader') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`),et=await id(c,`SELECT id FROM equipment_types WHERE slug='small-articulated-loader' LIMIT 1`),sid=await source(c),rid=await record(c,sid);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'New Holland Small Articulated Loaders','new-holland-small-articulated-loaders') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='new-holland-small-articulated-loaders' LIMIT 1`,[mf,et]);
    const ids=new Map<string,number>();for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));}const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing New Holland SAL definition ${k}`);return v;};
    for(const m of models){await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current New Holland Construction North America small articulated loader','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.model,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','Current New Holland Construction family technical-card specification',TRUE,?,'Current North America family table captured 2026-09-01. Telescopic variants remain separate models; ML22X keeps battery capacity without invented horsepower. Family technical-card values are preferred over inconsistent marketing prose.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,[mid,VERSION,rid]);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);await put(c,mid,vid,def('configuration.type'),rid,'Small articulated loader');await put(c,mid,vid,def('configuration.market_scope'),rid,'North America / United States current catalog');await put(c,mid,vid,def('small_articulated_loader.boom_configuration'),rid,m.boom);await put(c,mid,vid,def('small_articulated_loader.powertrain'),rid,m.powertrain);await put(c,mid,vid,def('small_articulated_loader.operating_weight'),rid,m.weightLb,'lb');await put(c,mid,vid,def('small_articulated_loader.overall_width'),rid,m.widthIn,'in');await put(c,mid,vid,def('small_articulated_loader.overall_height'),rid,m.heightIn,'in');if(m.hp!==undefined)await put(c,mid,vid,def('small_articulated_loader.engine_power'),rid,m.hp,'hp');if(m.batteryKwh!==undefined)await put(c,mid,vid,def('small_articulated_loader.battery_capacity'),rid,m.batteryKwh,'kWh');}
  },
};
