import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Series = 'BV4000' | 'BV5000';
type Seed = {
  slug: string;
  model: string;
  series: Series;
  configuration: string;
  nominalBaleSize: string;
  minimumTractorHp: number;
};

const VERSION = 'united-states-current-2026-09';
const LIVE_URL = 'https://www.kubotausa.com/equipment-series/balers';

const models: Seed[] = [
  { slug: 'bv4160', model: 'BV4160', series: 'BV4000', configuration: 'PREM / PREMNET 4x5', nominalBaleSize: '4 x 5 ft', minimumTractorHp: 40 },
  { slug: 'bv4180', model: 'BV4180', series: 'BV4000', configuration: 'PREM / PREMNET 4x6', nominalBaleSize: '4 x 6 ft', minimumTractorHp: 40 },
  { slug: 'bv4580', model: 'BV4580', series: 'BV4000', configuration: 'PREM / PREMNET 5x6', nominalBaleSize: '5 x 6 ft', minimumTractorHp: 70 },
  { slug: 'bv5160', model: 'BV5160', series: 'BV5000', configuration: '4x5', nominalBaleSize: '4 x 5 ft', minimumTractorHp: 75 },
  { slug: 'bv5160rn', model: 'BV5160RN', series: 'BV5000', configuration: '4x5', nominalBaleSize: '4 x 5 ft', minimumTractorHp: 75 },
  { slug: 'bv5200', model: 'BV5200', series: 'BV5000', configuration: '4x6', nominalBaleSize: '4 x 6 ft', minimumTractorHp: 70 },
  { slug: 'bv5200rn', model: 'BV5200RN', series: 'BV5000', configuration: '4x6', nominalBaleSize: '4 x 6 ft', minimumTractorHp: 70 },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Machine Configuration','kubota.round_baler.series','Kubota round baler series','text',null,3],
  ['Bale Chamber','kubota.round_baler.nominal_bale_size','Nominal bale size','text',null,10],
  ['Attachment to Tractor','kubota.round_baler.minimum_tractor_hp','Minimum tractor horsepower','decimal','hp',10],
  ['Bale Formation','kubota.round_baler.density_system','Density system','text',null,10],
  ['Binding','kubota.round_baler.binding_system','Binding system','text',null,10],
  ['Crop Capability','kubota.round_baler.silage_capability','Silage capability','text',null,10],
  ['Controls','kubota.round_baler.control_terminal_family','Control terminal family','text',null,10],
  ['Crop Intake','kubota.round_baler.intake_family','Crop intake family','text',null,10],
  ['Crop Intake','kubota.round_baler.drop_floor','Hydraulic drop floor','text',null,20],
];

async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('Kubota round baler migration dependency missing');return Number(r[0].id);}
async function source(c:Parameters<DbMigration['apply']>[0]){const[r]=await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);if(r[0])return Number(r[0].id);const[x]=await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Kubota','kubotausa.com','manufacturer','official')`);return Number(x.insertId);}
async function record(c:Parameters<DbMigration['apply']>[0],sid:number){const externalId='kubota-round-balers-live-current-2026-09';const[r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);if(r[0])return Number(r[0].id);const raw={captured:'2026-09-01',models:models.map(m=>({model:m.model,configuration:m.configuration,hp:m.minimumTractorHp})),familyFeatures:{density:'Intelligent Density 3-D',binding:'PowerBind net wrap',silage:'All current Kubota round balers described as silage capable',bv4000Control:'Focus III',bv5000Control:'ISOGO',bv4000Intake:'Fork feeder',bv5000DropFloor:'Hydraulic drop floor'}};const[x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,LIVE_URL,externalId,'Kubota USA current Round Balers lineup and live specifications',JSON.stringify(raw)]);return Number(x.insertId);}
async function put(c:Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,rid:number,value:string|number,unit:string|null=null){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,rid]);}

export const kubotaCurrentRoundBalersMigration: DbMigration = {
  id:'20260901_577_kubota_current_round_balers',
  description:'Add the current Kubota USA BV4000 and BV5000 round baler lineup from the live manufacturer page',
  async apply(c){
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Round Baler','round-baler') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Kubota','kubota') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`),et=await id(c,`SELECT id FROM equipment_types WHERE slug='round-baler' LIMIT 1`),sid=await source(c),rid=await record(c,sid);
    const seriesIds=new Map<Series,number>();
    for(const series of ['BV4000','BV5000'] as Series[]){const slug=`kubota-${series.toLowerCase()}-round-balers`;await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et,`Kubota ${series} Series`,slug]);seriesIds.set(series,await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,slug]));}
    const ids=new Map<string,number>();for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));}const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing Kubota round baler definition ${k}`);return v;};
    for(const m of models){const series=seriesIds.get(m.series);if(!series)throw new Error(`Missing Kubota round baler series ${m.series}`);await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Kubota USA round baler','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.model,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,?) ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,[mid,VERSION,m.configuration,rid,'Current Kubota USA live model card and family feature set captured 2026-09-01. Only values explicitly exposed on the live page are assigned; optional SuperCut details are not inferred onto base model cards.']);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);
      await put(c,mid,vid,def('configuration.type'),rid,'Round baler');await put(c,mid,vid,def('configuration.market_scope'),rid,'United States current lineup');await put(c,mid,vid,def('kubota.round_baler.series'),rid,m.series);await put(c,mid,vid,def('kubota.round_baler.nominal_bale_size'),rid,m.nominalBaleSize);await put(c,mid,vid,def('kubota.round_baler.minimum_tractor_hp'),rid,m.minimumTractorHp,'hp');await put(c,mid,vid,def('kubota.round_baler.density_system'),rid,'Intelligent Density 3-D');await put(c,mid,vid,def('kubota.round_baler.binding_system'),rid,'PowerBind net wrap');await put(c,mid,vid,def('kubota.round_baler.silage_capability'),rid,'Silage capable');
      if(m.series==='BV4000'){await put(c,mid,vid,def('kubota.round_baler.control_terminal_family'),rid,'Focus III');await put(c,mid,vid,def('kubota.round_baler.intake_family'),rid,'Fork feeder system');}
      if(m.series==='BV5000'){await put(c,mid,vid,def('kubota.round_baler.control_terminal_family'),rid,'ISOGO');await put(c,mid,vid,def('kubota.round_baler.drop_floor'),rid,'Hydraulic drop floor');}
    }
  }
};