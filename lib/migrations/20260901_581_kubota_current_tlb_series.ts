import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id:number };
type Seed = { slug:string; model:string };

const VERSION='united-states-current-2026-09';
const LIVE_URL='https://www.kubotausa.com/equipment-series/tlb-series';
const models:Seed[]=[
  {slug:'b26',model:'B26'},
  {slug:'l47',model:'L47'},
  {slug:'m62',model:'M62'},
];
const defs:Array<[string,string,string,string,string|null,number]>=[
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Machine Configuration','kubota.tlb.series','Kubota TLB series','text',null,3],
  ['Drivetrain','kubota.tlb.drive','Drive system','text',null,10],
  ['PTO','kubota.tlb.pto','PTO system','text',null,10],
  ['Hydraulics & Hitch','kubota.tlb.three_point_hitch_capability','3-point hitch capability','text',null,10],
  ['Structure','kubota.tlb.main_frame','Main frame','text',null,10],
  ['Visibility','kubota.tlb.hood_design','Hood / boom design','text',null,10],
  ['Lighting','kubota.tlb.work_lights','Work lighting','text',null,10],
];

async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('Kubota TLB migration dependency missing');return Number(r[0].id);}
async function source(c:Parameters<DbMigration['apply']>[0]){const[r]=await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);if(r[0])return Number(r[0].id);const[x]=await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Kubota','kubotausa.com','manufacturer','official')`);return Number(x.insertId);}
async function record(c:Parameters<DbMigration['apply']>[0],sid:number){const externalId='kubota-tlb-live-current-2026-09';const[r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);if(r[0])return Number(r[0].id);const raw={captured:'2026-09-01',models:models.map(m=>m.model),familyFeatures:{drive:'Standard 4WD with front-axle differential lock',pto:'Independent PTO',hitch:'3-point hitch capability',frame:'Loader/backhoe performance-matched integrated reinforced main frame',visibility:'Slanted boom and hood',lighting:'Canopy/ROPS headlights and rear work lights'}};const[x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,LIVE_URL,externalId,'Kubota USA current TLB Series lineup and family features',JSON.stringify(raw)]);return Number(x.insertId);}
async function put(c:Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,rid:number,value:string|number,unit:string|null=null){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,rid]);}

export const kubotaCurrentTlbSeriesMigration:DbMigration={
  id:'20260901_581_kubota_current_tlb_series',
  description:'Add current Kubota USA B26, L47 and M62 Tractor Loader Backhoe lineup from the live TLB Series page',
  async apply(c){
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor Loader Backhoe','tractor-loader-backhoe') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Kubota','kubota') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`),et=await id(c,`SELECT id FROM equipment_types WHERE slug='tractor-loader-backhoe' LIMIT 1`),sid=await source(c),rid=await record(c,sid);
    const seriesSlug='kubota-tlb-series';await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Kubota TLB Series',?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et,seriesSlug]);const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,seriesSlug]);
    const ids=new Map<string,number>();for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));}const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing Kubota TLB definition ${k}`);return v;};
    for(const m of models){await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Kubota USA Tractor Loader Backhoe','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.model,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Integrated tractor-loader-backhoe',TRUE,?,?) ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,[mid,VERSION,rid,'Current Kubota USA TLB model confirmed on the live lineup. This first current layer intentionally stores only live family-level features; model-specific engine, loader and backhoe geometry is left for a separately verified provenance layer rather than copied from a PDF that could not be screenshot-validated in this session.']);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);const vals:Array<[string,string|number,string|null]>=[['configuration.type','Tractor Loader Backhoe',null],['configuration.market_scope','United States current lineup',null],['kubota.tlb.series','TLB Series',null],['kubota.tlb.drive','Standard 4WD with front-axle differential lock',null],['kubota.tlb.pto','Independent PTO',null],['kubota.tlb.three_point_hitch_capability','3-point hitch capability for implement use',null],['kubota.tlb.main_frame','Reinforced integrated main frame performance-matched to loader and backhoe',null],['kubota.tlb.hood_design','Slanted boom and hood for improved visibility',null],['kubota.tlb.work_lights','Canopy/ROPS lighting with rear work lights for backhoe or 3-point-hitch work',null]];for(const[k,v,u]of vals)await put(c,mid,vid,def(k),rid,v,u);}
  }
};