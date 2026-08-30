import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string; name: string; url: string; station: 'ROPS' | 'Cab'; engineMake: string; engineModel: string;
  hp: number; rpm: number; displacementL: number; transmission: string; speeds: string; hitchLb: number; pto: string;
  fuelL: number; lengthIn: number; widthIn: number; wheelbaseIn: number; heightIn?: number; clearanceIn: number;
  weightLb: number; tires: string; note?: string;
};

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://tym.world/en-us/products/tractors/series-5';

const models: Seed[] = [
  {
    slug: 't654', name: 'T654', url: 'https://tym.world/en-us/products/tractors/series-5/t654', station: 'Cab',
    engineMake: 'Deutz', engineModel: 'TCD2.9L4', hp: 67, rpm: 2200, displacementL: 2.9,
    transmission: 'Geared transmission', speeds: 'F24 x R24', hitchLb: 4270, pto: '540 / 750 / 1000 rpm',
    fuelL: 70, lengthIn: 155.6, widthIn: 72.4, wheelbaseIn: 84.6, heightIn: 100.2, clearanceIn: 17.1,
    weightLb: 5555, tires: '9.5R20 / 380/85R28 (14.9R28)',
  },
  {
    slug: 't5068', name: 'T5068', url: 'https://tym.world/en-us/products/tractors/series-5/t5068', station: 'Cab',
    engineMake: 'Deutz', engineModel: 'TCD 2.9', hp: 68, rpm: 2200, displacementL: 2.9,
    transmission: 'Geared transmission', speeds: 'F24 x F24 (current TYM structured-table label)', hitchLb: 4270, pto: '540 / 750 rpm',
    fuelL: 70, lengthIn: 155.6, widthIn: 72.4, wheelbaseIn: 84.7, heightIn: 103, clearanceIn: 17.1,
    weightLb: 5556, tires: '9.5R20 / 10.5/80-18 (current TYM table)',
    note: 'The current T5068 technical table renders “F24 x F24” rather than a conventional forward/reverse label. The source string is retained instead of silently changing the second F to R. Current tire rows are also retained verbatim because the published rear value is unusual for this platform.',
  },
  {
    slug: 't5074', name: 'T5074', url: 'https://tym.world/en-us/products/tractors/series-5/t5074', station: 'ROPS',
    engineMake: 'Yanmar', engineModel: '4TN98CT-7PKTF', hp: 71.5, rpm: 2400, displacementL: 3.319,
    transmission: 'Geared transmission', speeds: 'F12 x R12', hitchLb: 4329, pto: '540 / 750 rpm',
    fuelL: 72, lengthIn: 148.1, widthIn: 81.4, wheelbaseIn: 84.6, clearanceIn: 17.6,
    weightLb: 5463, tires: '11.2-24 / 16.9-30',
    note: 'The current technical comparison table explicitly labels the published 5,463 lb value as Weight with ROPS. Height is omitted because the live table does not expose a clean T5074 height row.',
  },
  {
    slug: 't754', name: 'T754', url: 'https://tym.world/en-us/products/tractors/series-5/t754', station: 'Cab',
    engineMake: 'Deutz', engineModel: 'TCD2.9L4', hp: 74, rpm: 2200, displacementL: 2.9,
    transmission: 'Geared transmission with creep interlock', speeds: 'F16 x R16', hitchLb: 5115, pto: '540 / 750 rpm; 540 / 1000 rpm optional',
    fuelL: 90, lengthIn: 155.7, widthIn: 76.4, wheelbaseIn: 86.1, heightIn: 103.3, clearanceIn: 18.3,
    weightLb: 6052, tires: '280/85R24 / 420/85R30',
  },
  {
    slug: 't5075', name: 'T5075', url: 'https://tym.world/en-us/products/tractors/series-5/t5075', station: 'Cab',
    engineMake: 'Deutz', engineModel: 'TCD 2.9L', hp: 74.3, rpm: 2200, displacementL: 2.925,
    transmission: 'Geared transmission with creep interlock', speeds: 'F16 x R16', hitchLb: 5515, pto: '540 / 750 rpm',
    fuelL: 90, lengthIn: 168.1, widthIn: 92.3, wheelbaseIn: 86.1, heightIn: 104.9, clearanceIn: 18.4,
    weightLb: 6316.2, tires: '280/85R24 / 420/85R30',
    note: 'Current T5075 model page publishes 5,515 lb hitch capacity while the Series 5 header still states a 4,270–5,115 lb series range. The model-specific current value is normalized and the stale series-level range conflict is preserved in provenance.',
  },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,3],
  ['Engine','engine.emissions_note','Engine/emissions note','text',null,4],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',8],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','transmission.speeds','Transmission speeds / ranges','text',null,20],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Hydraulics','hitch.lift_capacity','3-point hitch lift capacity','decimal','lb',50],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','L',10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length with 3-point hitch','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_height','Published ROPS/cab height','decimal','in',30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.ground_clearance','Minimum ground clearance','decimal','in',50],
  ['Dimensions & Weight','dimensions.unladen_weight','Published configuration weight','decimal','lb',70],
  ['Tires','tires.ag','Published agricultural tires front / rear','text',null,10],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) {
  const [r] = await c.query<IdRow[]>(sql, p); if (!r[0]) throw new Error('TYM Series 5 migration dependency missing'); return Number(r[0].id);
}
async function source(c: Parameters<DbMigration['apply']>[0], sid:number, eid:string, url:string, title:string, raw:unknown) {
  const [r] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [eid]); if (r[0]) return Number(r[0].id);
  const [i] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sid,url,eid,title,JSON.stringify(raw)]); return Number(i.insertId);
}
async function put(c: Parameters<DbMigration['apply']>[0], mid:number, vid:number, did:number, srid:number, v:string|number, u:string|null) {
  await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [mid,vid,did,typeof v==='string'?v:null,typeof v==='number'?v:null,u,srid]);
}

export const tymSeries5CurrentUsMigration: DbMigration = {
  id: '20260830_409_tym_series5_current_us',
  description: 'Add five current US TYM Series 5 compact utility tractors with source-conflict provenance',
  async apply(c) {
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='tym' LIMIT 1`), et=await id(c,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`), sid=await id(c,`SELECT id FROM sources WHERE name='TYM' AND domain='tym.world' LIMIT 1`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'TYM Series 5','tym-series-5') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='tym-series-5' LIMIT 1`,[mf]);
    await source(c,sid,'tym-series5-current-us-2026-08',SERIES_URL,'TYM USA current Series 5 lineup',{market:'United States',captured:'2026-08-30',models:models.map(m=>m.name),seriesHeader:{engineHp:'67-75',hitchLiftLb:'4270-5115'},sourceConflict:'Current T5075 model-specific page publishes 5,515 lb hitch capacity, above the current Series 5 header maximum of 5,115 lb. Model-specific data takes precedence.'});
    const d=new Map<string,number>(); for(const row of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,row);d.set(row[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[row[1]]));}
    for(const m of models){const sr=await source(c,sid,`tym-${m.slug}-current-us-2026-08`,m.url,`TYM ${m.name} current US specifications`,{market:'United States',captured:'2026-08-30',note:m.note??null,sourcePolicy:'Current live US model technical specification is primary; ambiguous fields are preserved or omitted rather than silently corrected.'});await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US TYM Series 5 compact utility tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.name,m.slug]);const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,[mf,m.slug]);await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,'Current TYM USA Series 5 configuration from live model technical data.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[mid,VERSION,`${m.station}; ${m.transmission}; ${m.speeds}`,sr]);const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);const vals:Array<[string,string|number,string|null]>=[['configuration.station',m.station,null],['engine.make',m.engineMake,null],['engine.model',m.engineModel,null],['engine.emissions_note','Current TYM Series 5 diesel engine / Tier 4 platform',null],['engine.displacement',m.displacementL,'L'],['engine.gross_power',m.hp,'hp'],['engine.rated_speed',m.rpm,'rpm'],['transmission.standard',m.transmission,null],['transmission.speeds',m.speeds,null],['pto.rear_description',m.pto,null],['hitch.lift_capacity',m.hitchLb,'lb'],['capacities.fuel_tank',m.fuelL,'L'],['dimensions.overall_length',m.lengthIn,'in'],['dimensions.overall_width',m.widthIn,'in'],['dimensions.wheelbase',m.wheelbaseIn,'in'],['dimensions.ground_clearance',m.clearanceIn,'in'],['dimensions.unladen_weight',m.weightLb,'lb'],['tires.ag',m.tires,null]];if(m.heightIn!==undefined)vals.push(['dimensions.overall_height',m.heightIn,'in']);for(const[k,v,u]of vals){const did=d.get(k);if(!did)throw new Error(`Missing TYM Series 5 spec ${k}`);await put(c,mid,vid,did,sr,v,u);}}
  }
};
