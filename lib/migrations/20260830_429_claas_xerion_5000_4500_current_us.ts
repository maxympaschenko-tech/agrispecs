import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; name: string; cab: string; ratedHp: number; maxHp: number };
const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://www.claas.com/en-us/agricultural-machinery/tractors/xerion-5000-4500';
const TECH_BROCHURE = 'https://www.claas.com/caas/v1/media/68138/data/114d6b540d7b9ec457149dc25b0692fd';
const models: Seed[] = [
  { slug: 'xerion-5000-trac', name: 'XERION 5000 TRAC', cab: 'Fixed cab', ratedHp: 509, maxHp: 530 },
  { slug: 'xerion-4500-trac', name: 'XERION 4500 TRAC', cab: 'Fixed cab', ratedHp: 480, maxHp: 490 },
  { slug: 'xerion-5000-trac-vc', name: 'XERION 5000 TRAC VC', cab: 'Rotating cab', ratedHp: 509, maxHp: 530 },
  { slug: 'xerion-4500-trac-vc', name: 'XERION 4500 TRAC VC', cab: 'Rotating cab', ratedHp: 480, maxHp: 490 },
];
const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Cab','cab.configuration','Cab configuration','text',null,5],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
  ['Engine','engine.rated_power','Rated engine power','decimal','hp',7],
  ['Engine','engine.gross_power','Maximum engine power','decimal','hp',8],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','transmission.speeds','Transmission speed range','text',null,20],
  ['Hydraulics','hydraulics.max_flow','Maximum optional hydraulic flow','decimal','gpm',30],
  ['Dimensions & Weight','dimensions.overall_width','Minimum overall width','decimal','in',20],
];
async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('CLAAS XERION 5000-4500 migration dependency missing');return Number(r[0].id)}
async function source(c:Parameters<DbMigration['apply']>[0],sid:number,eid:string,url:string,title:string,raw:unknown){const[r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[eid]);if(r[0])return Number(r[0].id);const[i]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,url,eid,title,JSON.stringify(raw)]);return Number(i.insertId)}
async function put(c:Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,srid:number,v:string|number,u:string|null){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof v==='string'?v:null,typeof v==='number'?v:null,u,srid])}
export const claasXerion50004500CurrentUsMigration:DbMigration={
  id:'20260830_429_claas_xerion_5000_4500_current_us',description:'Add four current US CLAAS XERION 5000/4500 TRAC and TRAC VC configurations',
  async apply(c){
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='claas' LIMIT 1`),et=await id(c,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`),sid=await id(c,`SELECT id FROM sources WHERE name='CLAAS North America' AND domain='claas.com' LIMIT 1`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'CLAAS XERION 5000-4500','claas-xerion-5000-4500') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='claas-xerion-5000-4500' LIMIT 1`,[mf]);
    const seriesSr=await source(c,sid,'claas-xerion-5000-4500-current-us-2026-08',SERIES_URL,'CLAAS current US XERION 5000-4500 lineup',{market:'United States',captured:'2026-08-30',currentCards:models.map(m=>m.name),currentUsPage:{versions:{TRAC:'fixed cab',TRAC_VC:'rotating cab'},transmission:'CMATIC CV transmission',minOverallWidthIn:100,maxSeriesPowerHp:530,maxHydraulicFlowGpm:111,steering:'two steered axles with five steering programs'},technicalBrochure:TECH_BROCHURE,technicalMapping:{'5000':{engine:'Mercedes-Benz 6-cylinder 12.8 L',ratedHp:509,maxHp:530},'4500':{engine:'Mercedes-Benz 6-cylinder 12.8 L',ratedHp:480,maxHp:490}},brochurePolicy:'Technical brochure is used for stable engine architecture/output values matching current US model names. Current US page is primary for current card selection, cab variants, width and up-to hydraulic-flow statement. Local emissions, fuel, hitch, tire and weight fields are not inferred from other regions.'});
    const d=new Map<string,number>();for(const row of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,row);d.set(row[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[row[1]]))}
    for(const m of models){const sr=await source(c,sid,`claas-${m.slug}-current-us-2026-08`,SERIES_URL,`CLAAS ${m.name} current US configuration`,{market:'United States',captured:'2026-08-30',model:m.name,cab:m.cab,ratedHp:m.ratedHp,maxHp:m.maxHp});await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US CLAAS XERION 5000-4500 tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.name,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,[mf,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,'Current CLAAS US XERION TRAC/TRAC VC configuration.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[mid,VERSION,`${m.cab}; four equal-sized wheels; CMATIC continuously variable transmission`,sr||seriesSr]);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);const vals:Array<[string,string|number,string|null]>=[['configuration.station','Cab',null],['cab.configuration',m.cab,null],['engine.make','Mercedes-Benz',null],['engine.cylinders',6,null],['engine.displacement',12.8,'L'],['engine.rated_power',m.ratedHp,'hp'],['engine.gross_power',m.maxHp,'hp'],['transmission.standard','CMATIC continuously variable transmission',null],['transmission.speeds','Continuously variable',null],['hydraulics.max_flow',111,'gpm'],['dimensions.overall_width',100,'in']];for(const[k,v,u]of vals){const did=d.get(k);if(!did)throw new Error(`Missing CLAAS XERION 5000-4500 spec ${k}`);await put(c,mid,vid,did,sr||seriesSr,v,u)}}
  }
};
