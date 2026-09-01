import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Series = 'RA100' | 'RA200';
type Seed = {
  slug: string;
  model: string;
  series: Series;
  transportLength: string;
  workingLengthMax: string;
  transportWidth: string;
  transportHeightMax: string;
  minimumWorkingWidth: string;
  maximumWorkingWidth: string;
  typicalWeightLb: number;
  minimumTractorHp: number;
  notes: string;
};

const VERSION = 'united-states-current-2026-09';
const LIVE_URL = 'https://www.kubotausa.com/equipment-series/rakes';
const FULL_LINE_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';

const models: Seed[] = [
  { slug: 'ra108cr', model: 'RA108CR', series: 'RA100', transportLength: `21' 2"`, workingLengthMax: `21' 6"`, transportWidth: `9' 4"`, transportHeightMax: `8' 5"`, minimumWorkingWidth: `15' 8"`, maximumWorkingWidth: `16' 8"`, typicalWeightLb: 1460, minimumTractorHp: 30, notes: 'Current Kubota USA live Rakes page publishes 30 hp. Dimensions and typical weight use the 2026 full-line Wheel Rakes table.' },
  { slug: 'ra110cr', model: 'RA110CR', series: 'RA100', transportLength: `21' 2"`, workingLengthMax: `21' 6"`, transportWidth: `9' 6"`, transportHeightMax: `8' 9"`, minimumWorkingWidth: `18' 4"`, maximumWorkingWidth: `20' 4"`, typicalWeightLb: 1640, minimumTractorHp: 40, notes: 'Current Kubota USA live Rakes page publishes 40 hp. Dimensions and typical weight use the 2026 full-line Wheel Rakes table.' },
  { slug: 'ra210cr', model: 'RA210CR', series: 'RA200', transportLength: `24' 10"`, workingLengthMax: `25' 4"`, transportWidth: `9' 2"`, transportHeightMax: `9' 7"`, minimumWorkingWidth: `18'`, maximumWorkingWidth: `21'`, typicalWeightLb: 1790, minimumTractorHp: 40, notes: 'Current Kubota USA live Rakes page publishes 40 hp. The RA200 Series is kept separate because Kubota gives it a longer chassis and multi-point windrow adjustments.' },
  { slug: 'ra212cr', model: 'RA212CR', series: 'RA200', transportLength: `24' 10"`, workingLengthMax: `25' 4"`, transportWidth: `9' 3"`, transportHeightMax: `9' 11"`, minimumWorkingWidth: `21'`, maximumWorkingWidth: `25'`, typicalWeightLb: 1970, minimumTractorHp: 50, notes: 'Current Kubota USA live Rakes page publishes 50 hp. Dimensions and typical weight use the 2026 full-line Wheel Rakes table.' },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Machine Configuration','kubota.wheel_rake.series','Kubota wheel rake series','text',null,3],
  ['Rake Performance','kubota.wheel_rake.minimum_working_width','Minimum working width','text',null,10],
  ['Rake Performance','kubota.wheel_rake.maximum_working_width','Maximum working width','text',null,20],
  ['Rake Performance','kubota.wheel_rake.working_length_max','Maximum working length','text',null,30],
  ['Dimensions & Weight','kubota.wheel_rake.transport_length','Transport length','text',null,10],
  ['Dimensions & Weight','kubota.wheel_rake.transport_width','Transport width','text',null,20],
  ['Dimensions & Weight','kubota.wheel_rake.transport_height_max','Maximum transport height','text',null,30],
  ['Dimensions & Weight','kubota.wheel_rake.typical_weight','Typical weight without options','decimal','lb',40],
  ['Hydraulics','kubota.wheel_rake.hydraulic_circuit','Hydraulic circuit requirement','text',null,10],
  ['Hydraulics','kubota.wheel_rake.hydraulic_power','Hydraulic power requirement','text',null,20],
  ['Attachment to Tractor','kubota.wheel_rake.minimum_tractor_hp','Minimum tractor horsepower','decimal','hp',10],
  ['Rake Operation','kubota.wheel_rake.suspension','Rake wheel suspension','text',null,10],
  ['Rake Operation','kubota.wheel_rake.drawbar_adjustment','Drawbar adjustment','text',null,20],
];

async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('Kubota wheel rake migration dependency missing');return Number(r[0].id);}
async function source(c:Parameters<DbMigration['apply']>[0]){const[r]=await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);if(r[0])return Number(r[0].id);const[x]=await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Kubota','kubotausa.com','manufacturer','official')`);return Number(x.insertId);}
async function record(c:Parameters<DbMigration['apply']>[0],sid:number,url:string,externalId:string,title:string,raw:unknown){const[r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);if(r[0])return Number(r[0].id);const[x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,url,externalId,title,JSON.stringify(raw)]);return Number(x.insertId);}
async function put(c:Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,rid:number,value:string|number,unit:string|null=null){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,rid]);}

export const kubotaCurrentWheelRakesMigration:DbMigration={
  id:'20260901_576_kubota_current_wheel_rakes',description:'Add current Kubota USA RA100 and RA200 carted wheel rakes from live lineup and 2026 catalog',
  async apply(c){
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Wheel Rake','wheel-rake') ON DUPLICATE KEY UPDATE name=VALUES(name)`);await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Kubota','kubota') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`),et=await id(c,`SELECT id FROM equipment_types WHERE slug='wheel-rake' LIMIT 1`),sid=await source(c);
    const live=await record(c,sid,LIVE_URL,'kubota-wheel-rakes-live-current-2026-09','Kubota USA current RA carted wheel rake lineup',{captured:'2026-09-01',models:models.map(m=>({model:m.model,hp:m.minimumTractorHp}))});
    const catalog=await record(c,sid,FULL_LINE_URL,'kubota-2026-full-line-wheel-rakes','Kubota USA 2026 Full Product Line - Wheel Rakes',{captured:'2026-09-01',pages:'56-57'});
    const seriesIds=new Map<Series,number>();for(const series of ['RA100','RA200'] as Series[]){const slug=`kubota-${series.toLowerCase()}-wheel-rakes`;await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et,`Kubota ${series} Series`,slug]);seriesIds.set(series,await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,slug]));}
    const ids=new Map<string,number>();for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));}const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing Kubota wheel rake definition ${k}`);return v;};
    for(const m of models){const series=seriesIds.get(m.series);if(!series)throw new Error(`Missing Kubota wheel rake series ${m.series}`);await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Kubota USA carted wheel rake','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.model,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current Kubota USA carted wheel rake',TRUE,?,?) ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,[mid,VERSION,live,m.notes]);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);
      const catalogValues:Array<[string,string|number,string|null]>=[['kubota.wheel_rake.series',m.series,null],['kubota.wheel_rake.minimum_working_width',m.minimumWorkingWidth,null],['kubota.wheel_rake.maximum_working_width',m.maximumWorkingWidth,null],['kubota.wheel_rake.working_length_max',m.workingLengthMax,null],['kubota.wheel_rake.transport_length',m.transportLength,null],['kubota.wheel_rake.transport_width',m.transportWidth,null],['kubota.wheel_rake.transport_height_max',m.transportHeightMax,null],['kubota.wheel_rake.typical_weight',m.typicalWeightLb,'lb'],['kubota.wheel_rake.hydraulic_circuit','Closed-center or open-center, one remote',null],['kubota.wheel_rake.hydraulic_power','1,880 psi / 10 gpm',null]];
      await put(c,mid,vid,def('configuration.type'),live,'Wheel rake');await put(c,mid,vid,def('configuration.market_scope'),live,'United States current lineup');await put(c,mid,vid,def('kubota.wheel_rake.minimum_tractor_hp'),live,m.minimumTractorHp,'hp');await put(c,mid,vid,def('kubota.wheel_rake.suspension'),live,'Individual rake wheel suspension');await put(c,mid,vid,def('kubota.wheel_rake.drawbar_adjustment'),live,'Adjustable for 12 tractor drawbar heights');for(const[k,v,u]of catalogValues)await put(c,mid,vid,def(k),catalog,v,u);
    }
  }
};