import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug:string; model:string; hp:number; weightLb:number; cabHeightIn:number; hingePinHeight:string };

const VERSION='north-america-current-2026-09';
const URL='https://construction.newholland.com/en/northamerica/products/light-construction-equipment/compact-wheel-loaders';
const models:Seed[]=[
  {slug:'w50c-z-bar',model:'W50C Z-Bar',hp:58,weightLb:11111,cabHeightIn:97,hingePinHeight:'10 ft 2 in (3134 mm)'},
  {slug:'w60c',model:'W60C',hp:64,weightLb:11904,cabHeightIn:97,hingePinHeight:'10 ft 4 in (3182 mm)'},
  {slug:'w70c',model:'W70C',hp:74,weightLb:12504,cabHeightIn:103,hingePinHeight:'10 ft 9 in (3290 mm)'},
  {slug:'w70d',model:'W70D',hp:74,weightLb:12547,cabHeightIn:103.4,hingePinHeight:'10 ft 9.5 in (3290 mm)'},
  {slug:'w80c-long-reach',model:'W80C Long Reach',hp:74,weightLb:13432,cabHeightIn:106,hingePinHeight:'12 ft 2 in (3705 mm)'},
  {slug:'w80c-high-speed',model:'W80C High Speed',hp:74,weightLb:13668,cabHeightIn:106,hingePinHeight:'11 ft 1 in (3395 mm)'},
  {slug:'w80d',model:'W80D',hp:74,weightLb:13633,cabHeightIn:105.5,hingePinHeight:'11 ft 1.7 in (3395 mm)'},
  {slug:'w80d-long-reach',model:'W80D Long Reach',hp:74,weightLb:13900,cabHeightIn:105.5,hingePinHeight:'12 ft 1.9 in (3705 mm)'},
  {slug:'w100d',model:'W100D',hp:112,weightLb:19775,cabHeightIn:118.8,hingePinHeight:'12 ft 1 in (3714 mm)'},
];

const defs:Array<[string,string,string,string,string|null,number]>=[
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Engine','compact_wheel_loader.engine_power','Published horsepower','decimal','hp',10],
  ['Loader Performance','compact_wheel_loader.powertrain','Powertrain','text',null,10],
  ['Loader Performance','compact_wheel_loader.hinge_pin_height','Hinge pin height','text',null,20],
  ['Dimensions & Weight','compact_wheel_loader.operating_weight','Operating weight','decimal','lb',10],
  ['Dimensions & Weight','compact_wheel_loader.cab_height','Cab height','decimal','in',20],
];

async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('New Holland compact wheel loader migration dependency missing');return Number(r[0].id);}
async function source(c:Parameters<DbMigration['apply']>[0]){const[r]=await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland Construction' AND domain='construction.newholland.com' ORDER BY id LIMIT 1`);if(r[0])return Number(r[0].id);const[x]=await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland Construction','construction.newholland.com','manufacturer','official')`);return Number(x.insertId);}
async function record(c:Parameters<DbMigration['apply']>[0],sid:number){const externalId='new-holland-compact-wheel-loaders-na-current-2026-09';const[r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);if(r[0])return Number(r[0].id);const[x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,URL,externalId,'New Holland compact wheel loaders current North America model table',JSON.stringify({captured:'2026-09-01',market:'North America / United States site',equipmentType:'Compact Wheel Loader',models,notes:'Current North America family cards publish gross horsepower, operating weight, cab height and hinge pin height. New Holland explicitly positions the range for farm and material-handling work.'})]);return Number(x.insertId);}
async function put(c:Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,rid:number,value:string|number,unit:string|null=null){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,rid]);}

export const newHollandCompactWheelLoadersCurrentMigration:DbMigration={
  id:'20260901_558_new_holland_compact_wheel_loaders_current',
  description:'Add current New Holland North America compact wheel loaders',
  async apply(c){
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Compact Wheel Loader','compact-wheel-loader') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`),et=await id(c,`SELECT id FROM equipment_types WHERE slug='compact-wheel-loader' LIMIT 1`),sid=await source(c),rid=await record(c,sid);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'New Holland Compact Wheel Loaders','new-holland-compact-wheel-loaders') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='new-holland-compact-wheel-loaders' LIMIT 1`,[mf,et]);
    const ids=new Map<string,number>();for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));}const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing New Holland CWL definition ${k}`);return v;};
    for(const m of models){await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current New Holland Construction North America compact wheel loader; official page positions the range for farm and material-handling use','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.model,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','Current New Holland Construction family technical-card specification',TRUE,?,'Current North America model table captured 2026-09-01. Only fields published consistently in the current family cards are stored for every configuration.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,[mid,VERSION,rid]);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);await put(c,mid,vid,def('configuration.type'),rid,'Compact wheel loader');await put(c,mid,vid,def('configuration.market_scope'),rid,'North America / United States current catalog');await put(c,mid,vid,def('compact_wheel_loader.powertrain'),rid,'Diesel');await put(c,mid,vid,def('compact_wheel_loader.engine_power'),rid,m.hp,'hp');await put(c,mid,vid,def('compact_wheel_loader.operating_weight'),rid,m.weightLb,'lb');await put(c,mid,vid,def('compact_wheel_loader.cab_height'),rid,m.cabHeightIn,'in');await put(c,mid,vid,def('compact_wheel_loader.hinge_pin_height'),rid,m.hingePinHeight);}
  },
};
