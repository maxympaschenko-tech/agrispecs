import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string; name: string; grossHp: number; ratedHp: number; transmission: string; speeds: string;
  fuelGal: number; hitchLb: number; wheelbaseIn: number; lengthIn: number; heightIn: number; widthIn: number;
  weightLb: number; maxWeightLb: number; rearTire: string; note?: string;
};

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://deutz-fahramerica.com/tractors/4-series-home/';
const SPEC_URL = 'https://deutz-fahramerica.com/wp-content/uploads/4065_4080_5080D-Keyline_brochure_spec_pages.pdf';
const models: Seed[] = [
  { slug:'4065', name:'4065', grossHp:65, ratedHp:65, transmission:'Mechanical synchronized shuttle', speeds:'F12 x R12; 4 gears x 3 ranges', fuelGal:14.5, hitchLb:3525, wheelbaseIn:76.8, lengthIn:138.3, heightIn:97.3, widthIn:72.5, weightLb:5500, maxWeightLb:10550, rearTire:'420/70 R30', note:'Current America product page rounds hitch capacity to 3,500 lb while the America model spec sheet publishes 3,525 lb; the model-specific spec-sheet value is retained.' },
  { slug:'4080-gs', name:'4080 GS', grossHp:80, ratedHp:75, transmission:'Power Shuttle with sensitivity adjustment and Comfort Clutch', speeds:'F15 x R15; 5 gears x 3 ranges', fuelGal:19.8, hitchLb:5500, wheelbaseIn:82.6, lengthIn:152, heightIn:97.3, widthIn:72.5, weightLb:6600, maxWeightLb:11450, rearTire:'420/70 R30', note:'Current America HTML publishes up to 13.2 gpm implement flow while the model spec-sheet extraction publishes 12.6 gpm. Exact hydraulic-flow value is intentionally omitted until the source revision is reconciled.' },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.type','Engine type','text',null,2],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','emissions.standard','Emissions standard','text',null,5],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
  ['Engine','engine.rated_power','Rated engine power','decimal','hp',7],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',8],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','transmission.speeds','Transmission speeds / ranges','text',null,20],
  ['Transmission','steering.type','Steering','text',null,40],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Hydraulics','hydraulics.system_type','Hydraulic system','text',null,5],
  ['Hydraulics','hitch.lift_capacity','3-point hitch lift capacity','decimal','lb',50],
  ['Hydraulics','hydraulics.remote_valves','Remote valves','text',null,60],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','gal',10],
  ['Dimensions & Weight','dimensions.overall_length','Maximum length','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Standard width','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_height','Height at roll bar','decimal','in',30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.unladen_weight','Base shipping weight','decimal','lb',70],
  ['Dimensions & Weight','dimensions.max_permissible_weight','Maximum permissible weight','decimal','lb',80],
  ['Tires','tires.rear','Published rear tires','text',null,20],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql:string, p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('Deutz-Fahr 4 Series migration dependency missing');return Number(r[0].id)}
async function source(c: Parameters<DbMigration['apply']>[0], sid:number,eid:string,url:string,title:string,raw:unknown){const[r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[eid]);if(r[0])return Number(r[0].id);const[i]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,url,eid,title,JSON.stringify(raw)]);return Number(i.insertId)}
async function put(c: Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,srid:number,v:string|number,u:string|null){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof v==='string'?v:null,typeof v==='number'?v:null,u,srid])}

export const deutzFahr4SeriesCurrentUsMigration: DbMigration = {
  id:'20260830_413_deutz_fahr_4_series_current_us',
  description:'Introduce Deutz-Fahr America with current US 4065 and 4080 GS 4 Series tractors',
  async apply(c){
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('DEUTZ-FAHR','deutz-fahr') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='deutz-fahr' LIMIT 1`),et=await id(c,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const [srows]=await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Deutz-Fahr America' AND domain='deutz-fahramerica.com' LIMIT 1`);let sid=srows[0]?.id?Number(srows[0].id):0;if(!sid){const[i]=await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Deutz-Fahr America','deutz-fahramerica.com','manufacturer','official')`);sid=Number(i.insertId)}
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'DEUTZ-FAHR 4 Series','deutz-fahr-4-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='deutz-fahr-4-series' LIMIT 1`,[mf]);
    const seriesSr=await source(c,sid,'deutz-fahr-america-4-series-current-us-2026-08',SERIES_URL,'Deutz-Fahr America current 4 Series lineup',{market:'United States',captured:'2026-08-30',models:['4065','4080 GS'],officialSpecSheet:SPEC_URL,sourcePolicy:'US-specific Deutz-Fahr America sources are primary; European/Canadian Stage V configurations are not copied into US records.',hydraulicConflict:'Current America HTML and spec-sheet extraction differ slightly on exact implement-flow values. Hydraulic system type and remote-valve count are retained, exact flow is deferred.'});
    const d=new Map<string,number>();for(const row of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,row);d.set(row[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[row[1]]))}
    for(const m of models){const sr=await source(c,sid,`deutz-fahr-america-${m.slug}-current-us-2026-08`,SPEC_URL,`Deutz-Fahr America ${m.name} current US specifications`,{market:'United States',captured:'2026-08-30',model:m.name,note:m.note??null,seriesPage:SERIES_URL});await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US Deutz-Fahr America 4 Series utility tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.name,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,[mf,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,'Current Deutz-Fahr America 4 Series open-station configuration.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[mid,VERSION,`ROPS; ${m.transmission}; ${m.speeds}`,sr||seriesSr]);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);const vals:Array<[string,string|number,string|null]>=[['configuration.station','ROPS',null],['engine.make','FARMotion',null],['engine.type','Turbocharged 3-cylinder diesel',null],['engine.cylinders',3,null],['emissions.standard','Stage 4 / Tier 4',null],['engine.displacement',2.9,'L'],['engine.rated_power',m.ratedHp,'hp'],['engine.gross_power',m.grossHp,'hp'],['engine.rated_speed',2200,'rpm'],['transmission.standard',m.transmission,null],['transmission.speeds',m.speeds,null],['steering.type','Hydrostatic steering with dedicated pump',null],['pto.rear_description','540 rpm',null],['hydraulics.system_type','Open center',null],['hitch.lift_capacity',m.hitchLb,'lb'],['hydraulics.remote_valves','2 rear remote valves standard',null],['capacities.fuel_tank',m.fuelGal,'gal'],['dimensions.overall_length',m.lengthIn,'in'],['dimensions.overall_width',m.widthIn,'in'],['dimensions.overall_height',m.heightIn,'in'],['dimensions.wheelbase',m.wheelbaseIn,'in'],['dimensions.unladen_weight',m.weightLb,'lb'],['dimensions.max_permissible_weight',m.maxWeightLb,'lb'],['tires.rear',m.rearTire,null]];for(const[k,v,u]of vals){const did=d.get(k);if(!did)throw new Error(`Missing Deutz-Fahr 4 Series spec ${k}`);await put(c,mid,vid,did,sr||seriesSr,v,u)}}
  }
};
