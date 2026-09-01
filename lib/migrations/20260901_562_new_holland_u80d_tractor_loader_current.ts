import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const VERSION = 'north-america-current-2026-09';
const URL = 'https://construction.newholland.com/en/northamerica/products/light-construction-equipment/tractor-loaders/u80d';

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Engine','tractor_loader.gross_power','Gross engine power','decimal','hp',10],
  ['Engine','tractor_loader.emissions','Emissions standard','text',null,20],
  ['Loader Performance','tractor_loader.full_height_lift_long_lip','Lift capacity to full height — long lip bucket','decimal','lb',10],
  ['Loader Performance','tractor_loader.full_height_lift_4in1','Lift capacity to full height — 4-in-1 bucket','decimal','lb',20],
  ['Loader Performance','tractor_loader.breakout_force_4in1','4-in-1 bucket breakout force','text',null,30],
  ['Loader Performance','tractor_loader.dump_reach','Reach at maximum dump height','text',null,40],
  ['Hydraulics','tractor_loader.hitch_max_lift','3-point hitch maximum lift force','decimal','lb',10],
  ['Hydraulics','tractor_loader.hitch_lift_low','3-point hitch lift at lowest position','decimal','lb',20],
  ['Hydraulics','tractor_loader.hitch_lift_high','3-point hitch lift at highest position','decimal','lb',30],
  ['PTO','tractor_loader.pto','PTO','text',null,10],
  ['Transmission','tractor_loader.transmission','Transmission','text',null,10],
  ['Travel','tractor_loader.forward_speed_range','Published forward speed range','text',null,10],
  ['Dimensions & Weight','tractor_loader.operating_weight','Operating weight','decimal','lb',10],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) { const [r] = await c.query<IdRow[]>(sql,p); if (!r[0]) throw new Error('New Holland U80D migration dependency missing'); return Number(r[0].id); }
async function source(c: Parameters<DbMigration['apply']>[0]) { const [r] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland Construction' AND domain='construction.newholland.com' ORDER BY id LIMIT 1`); if (r[0]) return Number(r[0].id); const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland Construction','construction.newholland.com','manufacturer','official')`); return Number(x.insertId); }
async function record(c: Parameters<DbMigration['apply']>[0], sid:number) { const externalId='new-holland-u80d-tractor-loader-na-current-2026-09'; const [r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]); if(r[0]) return Number(r[0].id); const raw={captured:'2026-09-01',market:'North America / United States site',equipmentType:'Tractor Loader',model:'U80D',grossHp:74,operatingWeightLb:10916,hitchMaxLiftLb:3501,fullHeightLift:{longLipBucketLb:6503,fourInOneBucketLb:6537},breakoutForce:'up to 10,325 lb with 4-in-1 bucket',dumpReach:'2 ft 2 in (0.66 m)',hitchLift:{lowestLb:2500,highestLb:2984},pto:'Optional 540 rpm',transmission:'4-speed synchromesh with power shuttle, 4 forward / 4 reverse',publishedForwardSpeedRange:'3.5 mph in first to 21.3 mph in fourth with PTO-ready configuration',emissions:'Tier 4 Final, PM-Cat system'}; const [x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,URL,externalId,'New Holland U80D current North America tractor loader specifications',JSON.stringify(raw)]); return Number(x.insertId); }
async function put(c: Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,rid:number,value:string|number,unit:string|null=null){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,rid]);}

export const newHollandU80dTractorLoaderCurrentMigration: DbMigration = {
  id:'20260901_562_new_holland_u80d_tractor_loader_current',
  description:'Add current New Holland U80D North America tractor loader',
  async apply(c){
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor Loader','tractor-loader') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`),et=await id(c,`SELECT id FROM equipment_types WHERE slug='tractor-loader' LIMIT 1`),sid=await source(c),rid=await record(c,sid);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'D Series Tractor Loaders','d-series-tractor-loaders') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='d-series-tractor-loaders' LIMIT 1`,[mf,et]);
    const ids=new Map<string,number>(); for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));} const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing New Holland U80D definition ${k}`);return v;};
    await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,'U80D','u80d','Current New Holland Construction North America Tractor Loader. Kept outside the farm tractor catalog because New Holland defines Tractor Loaders as a separate construction-equipment type.','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series]);
    const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug='u80d' LIMIT 1`,[mf,et]); await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);
    await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','Current New Holland U80D direct product-page specification',TRUE,?,'Current North America product page captured 2026-09-01. Manufacturer categorizes U80D as Tractor Loader rather than agricultural Tractor; loader, hitch and optional PTO values remain attached to this equipment type.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,[mid,VERSION,rid]);
    const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);
    await put(c,mid,vid,def('configuration.type'),rid,'Tractor loader');await put(c,mid,vid,def('configuration.market_scope'),rid,'North America / United States current catalog');await put(c,mid,vid,def('tractor_loader.gross_power'),rid,74,'hp');await put(c,mid,vid,def('tractor_loader.emissions'),rid,'Tier 4 Final, PM-Cat system');await put(c,mid,vid,def('tractor_loader.full_height_lift_long_lip'),rid,6503,'lb');await put(c,mid,vid,def('tractor_loader.full_height_lift_4in1'),rid,6537,'lb');await put(c,mid,vid,def('tractor_loader.breakout_force_4in1'),rid,'up to 10,325 lb');await put(c,mid,vid,def('tractor_loader.dump_reach'),rid,'2 ft 2 in (0.66 m)');await put(c,mid,vid,def('tractor_loader.hitch_max_lift'),rid,3501,'lb');await put(c,mid,vid,def('tractor_loader.hitch_lift_low'),rid,2500,'lb');await put(c,mid,vid,def('tractor_loader.hitch_lift_high'),rid,2984,'lb');await put(c,mid,vid,def('tractor_loader.pto'),rid,'Optional 540 rpm');await put(c,mid,vid,def('tractor_loader.transmission'),rid,'4-speed synchromesh with power shuttle, 4 forward / 4 reverse');await put(c,mid,vid,def('tractor_loader.forward_speed_range'),rid,'3.5 mph in first to 21.3 mph in fourth in PTO-ready configuration');await put(c,mid,vid,def('tractor_loader.operating_weight'),rid,10916,'lb');
  },
};
