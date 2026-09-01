import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id:number };
type Seed = { slug:string; model:string; series:string; configuration:string; notes:string };

const VERSION='united-states-current-2026-09';
const LIVE_URL='https://www.kubotausa.com/equipment-series/wrappers';
const models:Seed[]=[
  {slug:'wr1100',model:'WR1100',series:'WR1100',configuration:'Mounted bale wrapper',notes:'Current Kubota USA live page identifies WR1100 as the mounted/static wrapper for wrapping at the storage site. Live specs are available for this model and are stored directly.'},
  {slug:'wr1400',model:'WR1400',series:'WR1400',configuration:'Trailed turntable bale wrapper',notes:'Current Kubota USA live page identifies WR1400 and publishes a narrow-transport feature with 8 ft 4 in transport width after turning the right-hand wheel inward.'},
  {slug:'wr1600c',model:'WR1600C',series:'WR1600',configuration:'High-capacity bale wrapper',notes:'Current Kubota USA live page identifies WR1600C as a high-capacity DuoWrap machine capable of wrapping one bale while carrying another, with two film applicators.'},
];
const defs:Array<[string,string,string,string,string|null,number]>=[
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Machine Configuration','kubota.bale_wrapper.series','Kubota wrapper series','text',null,3],
  ['Dimensions & Weight','kubota.bale_wrapper.transport_length','Transport length','text',null,10],
  ['Dimensions & Weight','kubota.bale_wrapper.transport_width','Transport width','text',null,20],
  ['Dimensions & Weight','kubota.bale_wrapper.transport_height','Transport height','text',null,30],
  ['Dimensions & Weight','kubota.bale_wrapper.weight','Weight','decimal','lb',40],
  ['Bale Capacity','kubota.bale_wrapper.max_bale_size','Maximum bale size','text',null,10],
  ['Bale Capacity','kubota.bale_wrapper.max_bale_weight','Maximum bale weight','decimal','lb',20],
  ['Wrapping','kubota.bale_wrapper.mounting','Wrapper mounting','text',null,10],
  ['Wrapping','kubota.bale_wrapper.transport_feature','Transport feature','text',null,20],
  ['Wrapping','kubota.bale_wrapper.capacity_feature','Capacity feature','text',null,30],
  ['Wrapping','kubota.bale_wrapper.film_applicators','Film applicators','text',null,40],
];
async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('Kubota wrapper migration dependency missing');return Number(r[0].id);}
async function source(c:Parameters<DbMigration['apply']>[0]){const[r]=await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);if(r[0])return Number(r[0].id);const[x]=await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Kubota','kubotausa.com','manufacturer','official')`);return Number(x.insertId);}
async function record(c:Parameters<DbMigration['apply']>[0],sid:number){const externalId='kubota-wrappers-live-current-2026-09';const[r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);if(r[0])return Number(r[0].id);const raw={captured:'2026-09-01',models:['WR1100','WR1400','WR1600C'],wr1100:{transportLength:'9 ft',transportWidth:'5.25 ft',transportHeight:'69 in',weightLb:1653,maxBaleSize:'47 x 50 in',maxBaleWeightLb:2650,mounted:'Standard'},wr1400:{narrowTransportWidth:'8 ft 4 in'},wr1600c:{capacity:'Wrap one bale while carrying another',filmApplicators:2}};const[x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,LIVE_URL,externalId,'Kubota USA current Wrappers lineup and live specifications',JSON.stringify(raw)]);return Number(x.insertId);}
async function put(c:Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,rid:number,value:string|number,unit:string|null=null){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,rid]);}

export const kubotaCurrentBaleWrappersMigration:DbMigration={
  id:'20260901_579_kubota_current_bale_wrappers',description:'Add current Kubota USA WR1100, WR1400 and WR1600C bale wrappers from the live manufacturer page',
  async apply(c){
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Bale Wrapper','bale-wrapper') ON DUPLICATE KEY UPDATE name=VALUES(name)`);await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Kubota','kubota') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`),et=await id(c,`SELECT id FROM equipment_types WHERE slug='bale-wrapper' LIMIT 1`),sid=await source(c),rid=await record(c,sid);
    const seriesIds=new Map<string,number>();for(const m of models){if(seriesIds.has(m.series))continue;const slug=`kubota-${m.series.toLowerCase()}-wrapper`;await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et,`Kubota ${m.series} Series`,slug]);seriesIds.set(m.series,await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,slug]));}
    const ids=new Map<string,number>();for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));}const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing Kubota wrapper definition ${k}`);return v;};
    for(const m of models){const series=seriesIds.get(m.series);if(!series)throw new Error(`Missing Kubota wrapper series ${m.series}`);await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Kubota USA bale wrapper','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.model,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,?) ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,[mid,VERSION,m.configuration,rid,m.notes]);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);await put(c,mid,vid,def('configuration.type'),rid,'Bale wrapper');await put(c,mid,vid,def('configuration.market_scope'),rid,'United States current lineup');await put(c,mid,vid,def('kubota.bale_wrapper.series'),rid,m.series);
      if(m.model==='WR1100'){await put(c,mid,vid,def('kubota.bale_wrapper.transport_length'),rid,'9 ft');await put(c,mid,vid,def('kubota.bale_wrapper.transport_width'),rid,'5.25 ft (63 in)');await put(c,mid,vid,def('kubota.bale_wrapper.transport_height'),rid,'69 in');await put(c,mid,vid,def('kubota.bale_wrapper.weight'),rid,1653,'lb');await put(c,mid,vid,def('kubota.bale_wrapper.max_bale_size'),rid,'47 x 50 in');await put(c,mid,vid,def('kubota.bale_wrapper.max_bale_weight'),rid,2650,'lb');await put(c,mid,vid,def('kubota.bale_wrapper.mounting'),rid,'Three-point mounted; can be used on rear or front tractor hydraulics or as a static machine with an external power pack');}
      if(m.model==='WR1400')await put(c,mid,vid,def('kubota.bale_wrapper.transport_feature'),rid,'Right-hand wheel can be turned inward to reduce transport width to 8 ft 4 in');
      if(m.model==='WR1600C'){await put(c,mid,vid,def('kubota.bale_wrapper.capacity_feature'),rid,'Can wrap one bale while carrying another');await put(c,mid,vid,def('kubota.bale_wrapper.film_applicators'),rid,'Two film applicators (DuoWrap)');}
    }
  }
};