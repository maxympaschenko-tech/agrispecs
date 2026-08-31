import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug:string; name:string; tires:string; configuration:string; blade:string|null };

const VERSION='united-states-current-2026-08';
const PRODUCT_URL='https://www.monarchtractor.com/mk-v-electric-tractor';
const PURCHASE_URL='https://www.monarchtractor.com/reserve-mkv';
const SPEC_URL='https://www.monarchtractor.com/hubfs/01_MK-V%20Documents/%E2%AD%90%20Monarch_MKV_SpecSheet_v.2024.11.pdf?hsLang=en';

const models:Seed[]=[
  {slug:'mk-v-standard',name:'MK-V Standard',tires:'R1 Ag; current purchase page also offers R14/R4/R3 options',configuration:'Standard agricultural configuration',blade:null},
  {slug:'mk-v-dairy',name:'MK-V Dairy',tires:'R4 Industrial',configuration:'Dairy configuration with feed-push blade',blade:'6 ft blade; 60-degree blade angle'},
];

const defs:Array<[string,string,string,string,string|null,number]>=[
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Machine Configuration','configuration.package','Configuration / package','text',null,2],
  ['Power','power.system','Power system','text',null,1],
  ['Power','engine.gross_power','Peak motor power','decimal','hp',8],
  ['Power','engine.rated_power','Rated motor power','decimal','hp',9],
  ['Power','power.runtime_estimate','Estimated run time','decimal','h',10],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','transmission.speeds','Transmission speeds','text',null,20],
  ['Drive','drive.type','Drive system','text',null,10],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Hydraulics','hydraulics.system_type','Hydraulic system','text',null,5],
  ['Hydraulics','hydraulics.main_pump_capacity','Hydraulic pump rated output','decimal','gpm',20],
  ['Hydraulics','hydraulics.constant_flow_capacity','Constant-flow capacity','decimal','gpm',30],
  ['Hydraulics','hydraulics.remote_valves','Rear remote valves','text',null,60],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Hydraulics','hitch.lift_capacity','3-point hitch lift capacity','decimal','lb',50],
  ['Drawbar','drawbar.towing_capacity','Drawbar towing capacity','decimal','lb',10],
  ['Charging','charging.port','Charge port','text',null,10],
  ['Charging','charging.level','Charging level','text',null,20],
  ['Charging','charging.time_80a','Charging time with 80 A charger','decimal','h',30],
  ['Charging','charging.time_40a','Charging time with 40 A charger','decimal','h',40],
  ['Charging','charging.export_power','Exportable AC power','text',null,50],
  ['Connectivity','connectivity.wifi','Wi-Fi','text',null,10],
  ['Connectivity','connectivity.cellular','Cellular','text',null,20],
  ['Connectivity','connectivity.radio','Radio','text',null,30],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Minimum overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.ground_clearance','Front axle clearance','decimal','in',50],
  ['Dimensions & Weight','dimensions.turning_radius','Turning radius','decimal','ft',60],
  ['Dimensions & Weight','dimensions.unladen_weight','Base weight','decimal','lb',70],
  ['Tires','tires.standard','Tires / configuration','text',null,10],
  ['Attachment','attachment.package','Included package attachment','text',null,10],
];

async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('Monarch MK-V migration dependency missing');return Number(r[0].id)}
async function source(c:Parameters<DbMigration['apply']>[0],sid:number,eid:string,url:string,title:string,raw:unknown){const[r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[eid]);if(r[0])return Number(r[0].id);const[i]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,url,eid,title,JSON.stringify(raw)]);return Number(i.insertId)}
async function put(c:Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,srid:number,v:string|number,u:string|null){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof v==='string'?v:null,typeof v==='number'?v:null,u,srid])}

export const monarchMkvCurrentUsMigration:DbMigration={
 id:'20260831_467_monarch_mkv_current_us',description:'Introduce Monarch Tractor with current US MK-V Standard and Dairy electric tractor configurations',
 async apply(c){
  await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
  await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Monarch Tractor','monarch-tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
  const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='monarch-tractor' LIMIT 1`),et=await id(c,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
  const[r]=await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Monarch Tractor' AND domain='monarchtractor.com' LIMIT 1`);let sid=r[0]?.id?Number(r[0].id):0;if(!sid){const[i]=await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Monarch Tractor','monarchtractor.com','manufacturer','official')`);sid=Number(i.insertId)}
  await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Monarch MK-V','monarch-mk-v') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='monarch-mk-v' LIMIT 1`,[mf]);
  const seriesSr=await source(c,sid,'monarch-mkv-current-us-2026-08',PURCHASE_URL,'Monarch Tractor current MK-V purchase lineup and 2025.7 hardware specifications',{market:'United States',captured:'2026-08-31',productPage:PRODUCT_URL,purchasePage:PURCHASE_URL,currentSpecSheet:SPEC_URL,currentModels:models.map(m=>m.name),shared:{power:'100% electric; 70 hp peak / 40 hp rated',runtime:'estimated 14 h, varies by farm/operation/implement',drive:'4WD',transmission:'push-button, 9F/3R',pto:'40 hp, 540 rpm rear, wet electro-hydraulic',hitch:'CAT I/II, 2,200 lb',drawbar:'5,500 lb towing',hydraulics:'closed center; 19.8 gpm pump / 12.0 gpm constant flow; 2 SCVs + 1 constant-flow circuit',charging:'XLR battery; J1772 Type 1 up to 80 A; AC Level 2; spec sheet 5 h @80A / 10 h @40A',dimensions:'146.7 x min 48.4 x 92.1 in; 85 in wheelbase; 11 in front axle clearance; 8.9 ft turning radius; 5,750 lb base weight',connectivity:'802.11ac dual-band WiFi; 4G LTE ready; LoRa 900 MHz ready'},sourceConflict:'Current purchase/product pages round charging times to 5-6 h (80 A) and 10-12 h (40 A), while current hardware spec sheet v2025.7 publishes 5 h and 10 h. Database stores the spec-sheet values and documents the website range here.',dairy:'Current purchase page offers MK-V Dairy with R4 industrial tires and a 6 ft blade with 60-degree blade angles.'});
  const d=new Map<string,number>();for(const row of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,row);d.set(row[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[row[1]]))}
  for(const m of models){const sr=await source(c,sid,`monarch-${m.slug}-current-us-2026-08`,PURCHASE_URL,`Monarch ${m.name} current US configuration`,{market:'United States',captured:'2026-08-31',model:m.name,tires:m.tires,configuration:m.configuration,includedBlade:m.blade});await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US Monarch MK-V electric tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.name,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,[mf,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,'Current Monarch Tractor MK-V configuration from current purchase page and hardware spec sheet.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[mid,VERSION,m.configuration,sr||seriesSr]);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);const vals:Array<[string,string|number,string|null]>=[['configuration.station','Rigid 4-post ROPS; driver optional / autonomy capable',null],['configuration.package',m.configuration,null],['power.system','100% electric; XLR battery',null],['engine.gross_power',70,'hp'],['engine.rated_power',40,'hp'],['power.runtime_estimate',14,'h'],['transmission.standard','Push Button Transmission',null],['transmission.speeds','9F / 3R',null],['drive.type','4 Wheel Drive',null],['pto.rated_power',40,'hp'],['pto.rear_description','540 rpm rear PTO; wet clutch; electro-hydraulic actuation',null],['hydraulics.system_type','Closed Center',null],['hydraulics.main_pump_capacity',19.8,'gpm'],['hydraulics.constant_flow_capacity',12,'gpm'],['hydraulics.remote_valves','2 SCVs + 1 Constant Flow',null],['hitch.category','CAT I/II',null],['hitch.lift_capacity',2200,'lb'],['drawbar.towing_capacity',5500,'lb'],['charging.port','J1772 Type 1 (up to 80 A)',null],['charging.level','AC Level 2',null],['charging.time_80a',5,'h'],['charging.time_40a',10,'h'],['charging.export_power','220 VAC NEMA L6-30R (18A); 110 VAC NEMA 5-15 (15A)',null],['connectivity.wifi','802.11ac Dual Band',null],['connectivity.cellular','4G (LTE) Ready',null],['connectivity.radio','LoRa 900 MHz ready',null],['dimensions.overall_length',146.7,'in'],['dimensions.overall_width',48.4,'in'],['dimensions.overall_height',92.1,'in'],['dimensions.wheelbase',85,'in'],['dimensions.ground_clearance',11,'in'],['dimensions.turning_radius',8.9,'ft'],['dimensions.unladen_weight',5750,'lb'],['tires.standard',m.tires,null]];if(m.blade)vals.push(['attachment.package',m.blade,null]);for(const[k,v,u]of vals){const did=d.get(k);if(!did)throw new Error(`Missing Monarch MK-V spec ${k}`);await put(c,mid,vid,did,sr||seriesSr,v,u)}}
 }
};
