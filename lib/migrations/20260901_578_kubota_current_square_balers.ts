import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug:string; model:string; baleSection:string; minimumHp:number };

const VERSION='united-states-current-2026-09';
const LIVE_URL='https://www.kubotausa.com/equipment-series/ssb-series';
const RELEASE_URL='https://www.kubotausa.com/dual-chambers-deliver-double-duty-kubota-launches-high-capacity-small-square-baler-series';
const models:Seed[]=[
  {slug:'ssb2012',model:'SSB2012',baleSection:'12.25 x 18 in',minimumHp:100},
  {slug:'ssb2014',model:'SSB2014',baleSection:'14 x 18 in',minimumHp:100},
];
const defs:Array<[string,string,string,string,string|null,number]>=[
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Machine Configuration','kubota.square_baler.series','Kubota square baler series','text',null,3],
  ['Bale Chamber','kubota.square_baler.bale_cross_section','Bale cross section','text',null,10],
  ['Bale Chamber','kubota.square_baler.chamber_design','Bale chamber design','text',null,20],
  ['Bale Chamber','kubota.square_baler.plunger_rate','Plunger rate','decimal','strokes/min',30],
  ['Attachment to Tractor','kubota.square_baler.minimum_tractor_hp','Minimum tractor horsepower','decimal','hp',10],
  ['Attachment to Tractor','kubota.square_baler.recommended_tractor_hp','Recommended tractor horsepower','decimal','hp',20],
  ['PTO','kubota.square_baler.pto_requirement','PTO requirement','text',null,10],
  ['Binding','kubota.square_baler.knotter','Knotter system','text',null,10],
  ['Binding','kubota.square_baler.twine_capacity','Twine capacity','text',null,20],
  ['Controls','kubota.square_baler.isobus','ISOBUS compatibility','text',null,10],
  ['Controls','kubota.square_baler.monitoring','Operator monitoring','text',null,20],
  ['Crop Intake','kubota.square_baler.pickup','Pickup','text',null,10],
];
async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('Kubota square baler migration dependency missing');return Number(r[0].id);}
async function source(c:Parameters<DbMigration['apply']>[0]){const[r]=await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);if(r[0])return Number(r[0].id);const[x]=await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Kubota','kubotausa.com','manufacturer','official')`);return Number(x.insertId);}
async function record(c:Parameters<DbMigration['apply']>[0],sid:number,url:string,externalId:string,title:string,raw:unknown){const[r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);if(r[0])return Number(r[0].id);const[x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,url,externalId,title,JSON.stringify(raw)]);return Number(x.insertId);}
async function put(c:Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,rid:number,value:string|number,unit:string|null=null){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,rid]);}

export const kubotaCurrentSquareBalersMigration:DbMigration={
  id:'20260901_578_kubota_current_square_balers',description:'Add current 2026 Kubota USA SSB2012 and SSB2014 high-capacity small square balers',
  async apply(c){
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Square Baler','square-baler') ON DUPLICATE KEY UPDATE name=VALUES(name)`);await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Kubota','kubota') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`),et=await id(c,`SELECT id FROM equipment_types WHERE slug='square-baler' LIMIT 1`),sid=await source(c);
    const live=await record(c,sid,LIVE_URL,'kubota-ssb-live-current-2026-09','Kubota USA current SSB Series square balers',{captured:'2026-09-01',models:models.map(m=>({model:m.model,hp:m.minimumHp})),features:['independent dual chambers','Rasspe 6003 knotters','hydraulic bale density control','wide pickup','20 standard twine spools or 16 large spools']});
    const release=await record(c,sid,RELEASE_URL,'kubota-ssb-launch-2026-02-11','Kubota USA SSB Series launch release, February 11 2026',{published:'2026-02-11',availability:'Spring 2026',plungerRate:100,minimumHp:100,recommendedHp:120,pto:'1000-spline PTO tractors',isobus:'Full ISOBUS compatibility standard',models:[{model:'SSB2012',bale:'12.25 x 18 in'},{model:'SSB2014',bale:'14 x 18 in'}]});
    const seriesSlug='kubota-ssb-series-square-balers';await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Kubota SSB Series',?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et,seriesSlug]);const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,seriesSlug]);
    const ids=new Map<string,number>();for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));}const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing Kubota square baler definition ${k}`);return v;};
    for(const m of models){await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Kubota USA high-capacity small square baler introduced for Spring 2026','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.model,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','High-capacity small square baler',TRUE,?,?) ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,[mid,VERSION,live,'Current Kubota USA SSB model card confirmed live after Spring 2026 launch. Launch release supplies bale cross-section, plunger rate, PTO and tractor-power guidance; live page supplies current lineup and family feature descriptions.']);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);
      const liveVals:Array<[string,string|number,string|null]>=[['configuration.type','Square baler',null],['configuration.market_scope','United States current lineup',null],['kubota.square_baler.series','SSB Series',null],['kubota.square_baler.minimum_tractor_hp',m.minimumHp,'hp'],['kubota.square_baler.chamber_design','Independent dual chambers',null],['kubota.square_baler.knotter','Rasspe 6003 single knotters',null],['kubota.square_baler.twine_capacity','20 standard twine spools (5 per knotter) or 16 large twine spools (4 per knotter)',null],['kubota.square_baler.monitoring','Real-time flake length, flake counters, bale length, hydraulic bale density control, adjustable target flake length and onboard diagnostics',null],['kubota.square_baler.pickup','Wide pickup',null]];for(const[k,v,u]of liveVals)await put(c,mid,vid,def(k),live,v,u);
      const releaseVals:Array<[string,string|number,string|null]>=[['kubota.square_baler.bale_cross_section',m.baleSection,null],['kubota.square_baler.plunger_rate',100,'strokes/min'],['kubota.square_baler.recommended_tractor_hp',120,'hp'],['kubota.square_baler.pto_requirement','1000-spline PTO tractor',null],['kubota.square_baler.isobus','Full ISOBUS compatibility standard; optional Tellus GO terminal for non-ISOBUS tractors',null]];for(const[k,v,u]of releaseVals)await put(c,mid,vid,def(k),release,v,u);
    }
  }
};