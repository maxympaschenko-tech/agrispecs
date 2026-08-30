import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug:string; name:string; ratedHp:number; peakHp:number; torqueLbFt:number; powerBulgePct:number; torqueRisePct:number };

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://www.versatile-ag.com/NA/pages/product_dt.php';
const SPEC_URL = 'https://www.versatile-ag.com/NA/downloads/specs/Versatile_Specs_DeltaTrack.pdf';
const PRODUCT_GUIDE = 'https://www.versatile-ag.com/NA/downloads/brochure/Versatile_Brochure.pdf';

const models: Seed[] = [
  { slug:'deltatrack-530dt', name:'DeltaTrack 530DT', ratedHp:530, peakHp:583, torqueLbFt:1926, powerBulgePct:10, torqueRisePct:45 },
  { slug:'deltatrack-580dt', name:'DeltaTrack 580DT', ratedHp:580, peakHp:638, torqueLbFt:2026, powerBulgePct:10, torqueRisePct:40 },
  { slug:'deltatrack-620dt', name:'DeltaTrack 620DT', ratedHp:616, peakHp:665, torqueLbFt:2066, powerBulgePct:8, torqueRisePct:34 },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Machine Configuration','configuration.traction','Traction configuration','text',null,2],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,3],
  ['Engine','emissions.standard','Emissions standard','text',null,5],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
  ['Engine','engine.rated_power','Rated engine power','decimal','hp',7],
  ['Engine','engine.gross_power','Peak engine power','decimal','hp',8],
  ['Engine','engine.max_torque','Peak torque','decimal','lb-ft',10],
  ['Engine','engine.power_bulge','Power bulge','decimal','%',11],
  ['Engine','engine.torque_rise','Torque rise','decimal','%',12],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','transmission.speeds','Transmission speeds','text',null,20],
  ['Transmission','transmission.max_forward_speed','Maximum forward speed','decimal','mph',30],
  ['Hydraulics','hydraulics.system_type','Hydraulic system','text',null,5],
  ['Hydraulics','hydraulics.main_pump_capacity','Standard hydraulic flow','decimal','gpm',20],
  ['Hydraulics','hydraulics.max_flow','Optional high-flow capacity','decimal','gpm',30],
  ['Hydraulics','hydraulics.system_pressure','Maximum hydraulic system pressure','decimal','psi',35],
  ['Hydraulics','hydraulics.remote_valves','Hydraulic remote valves','text',null,60],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Hydraulics','hitch.lift_capacity','3-point hitch lift capacity','decimal','lb',50],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','gal',10],
  ['Capacities','capacities.def_tank','DEF tank capacity','decimal','gal',20],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.unladen_weight','Base tractor weight','decimal','lb',70],
  ['Dimensions & Weight','dimensions.recommended_operating_weight','Recommended operating GVW','decimal','lb',75],
  ['Cab','cab.volume','Cab volume','decimal','cu-ft',20],
  ['Cab','cab.glass_area','Cab glass area','decimal','sq-ft',30],
  ['Tracks','tracks.options','Track options','text',null,10],
];

async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('Versatile DeltaTrack migration dependency missing');return Number(r[0].id)}
async function source(c:Parameters<DbMigration['apply']>[0],sid:number,eid:string,url:string,title:string,raw:unknown){const[r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[eid]);if(r[0])return Number(r[0].id);const[i]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,url,eid,title,JSON.stringify(raw)]);return Number(i.insertId)}
async function put(c:Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,srid:number,v:string|number,u:string|null){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof v==='string'?v:null,typeof v==='number'?v:null,u,srid])}

export const versatileDeltaTrackCurrentUsMigration: DbMigration = {
  id:'20260830_435_versatile_deltatrack_current_us',
  description:'Add all three current North America Versatile DeltaTrack tracked tractors',
  async apply(c){
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='versatile' LIMIT 1`),et=await id(c,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`),sid=await id(c,`SELECT id FROM sources WHERE name='Versatile North America' AND domain='versatile-ag.com' LIMIT 1`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Versatile DeltaTrack','versatile-deltatrack') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='versatile-deltatrack' LIMIT 1`,[mf]);
    const seriesSr=await source(c,sid,'versatile-deltatrack-current-na-2026-08',SERIES_URL,'Versatile North America current DeltaTrack lineup',{market:'North America',captured:'2026-08-30',currentModels:models.map(m=>m.name),currentSpecSheet:SPEC_URL,productGuide2026:PRODUCT_GUIDE,shared:{engine:'Cummins X15 Stage V; 14.9 L',transmission:'Caterpillar TA22 powershift; 16F x 4R',hydraulics:'closed-center load sensing; 59 gpm standard / 112 gpm high-flow; six EHR; 2,900 psi',optionalHitch:'Category IV; 15,000 lb',optionalPto:'1000 rpm; 1-3/4 in, 20-spline; PTO and 3-point hitch cannot be combined',fuelGal:462,defGal:24,baseWeightLb:58850,recommendedGvwLb:62000,wheelbaseIn:154,cab:{volumeCuFt:175.5,glassSqFt:85.9},tracks:'Camso 3500 and/or 6500 series depending on configuration; 30 in or 36 in widths'},speedPolicy:'The live current product page publishes road speed up to 20.4 mph (32.8 km/h), while the current technical sheet rounds this to 21 mph (34 km/h). 20.4 mph is normalized as the more precise current page value; the rounded technical-sheet figure remains preserved here.',trackPolicy:'The current technical-sheet PDF extraction does not unambiguously map which Camso track series is standard vs optional for every individual model column. The normalized track field therefore preserves supported current track series/widths without inventing a per-model standard/optional mapping.'});
    const d=new Map<string,number>();for(const row of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,row);d.set(row[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[row[1]]))}
    for(const m of models){const sr=await source(c,sid,`versatile-${m.slug}-current-na-2026-08`,SPEC_URL,`Versatile ${m.name} current North America specifications`,{market:'North America',captured:'2026-08-30',model:m.name,ratedHp:m.ratedHp,peakHp:m.peakHp,peakTorqueLbFt:m.torqueLbFt,powerBulgePct:m.powerBulgePct,torqueRisePct:m.torqueRisePct});await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current North America Versatile DeltaTrack tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.name,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,[mf,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','Cab; four-track DeltaTrack undercarriage; Caterpillar TA22 powershift 16F x 4R',TRUE,?,'Current Versatile North America DeltaTrack configuration.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[mid,VERSION,sr||seriesSr]);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);const vals:Array<[string,string|number,string|null]>=[['configuration.station','Cab',null],['configuration.traction','Four-track DeltaTrack positive-drive undercarriage',null],['engine.make','Cummins',null],['engine.model','X15',null],['emissions.standard','Stage V',null],['engine.displacement',14.9,'L'],['engine.rated_power',m.ratedHp,'hp'],['engine.gross_power',m.peakHp,'hp'],['engine.max_torque',m.torqueLbFt,'lb-ft'],['engine.power_bulge',m.powerBulgePct,'%'],['engine.torque_rise',m.torqueRisePct,'%'],['transmission.standard','Caterpillar TA22 powershift',null],['transmission.speeds','F16 x R4',null],['transmission.max_forward_speed',20.4,'mph'],['hydraulics.system_type','Closed-center load sensing',null],['hydraulics.main_pump_capacity',59,'gpm'],['hydraulics.max_flow',112,'gpm'],['hydraulics.system_pressure',2900,'psi'],['hydraulics.remote_valves','6 EHR',null],['hitch.category','Optional Category IV',null],['hitch.lift_capacity',15000,'lb'],['pto.rear_description','Optional 1000 rpm; 1-3/4 in, 20-spline shaft; cannot be combined with 3-point hitch',null],['capacities.fuel_tank',462,'gal'],['capacities.def_tank',24,'gal'],['dimensions.wheelbase',154,'in'],['dimensions.unladen_weight',58850,'lb'],['dimensions.recommended_operating_weight',62000,'lb'],['cab.volume',175.5,'cu-ft'],['cab.glass_area',85.9,'sq-ft'],['tracks.options','Camso 3500 / 6500 series; 30 in or 36 in widths depending on configuration',null]];for(const[k,v,u]of vals){const did=d.get(k);if(!did)throw new Error(`Missing Versatile DeltaTrack spec ${k}`);await put(c,mid,vid,did,sr||seriesSr,v,u)}}
  }
};
