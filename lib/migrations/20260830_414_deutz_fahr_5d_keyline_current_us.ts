import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  ratedHp: number;
  grossHp: number;
  torqueLbFt: number;
  torqueRpm: number;
  fuelGal: number;
  note?: string;
};

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://deutz-fahramerica.com/tractors/5d-keyline/';
const LEGACY_SPEC_URL = 'https://deutz-fahramerica.com/wp-content/uploads/5080D-Keyline_spec-sheet.pdf';
const GS_SPEC_URL = 'https://deutz-fahramerica.com/wp-content/uploads/4065_4080_5080D-Keyline_brochure_spec_pages.pdf';

const models: Seed[] = [
  {
    slug: '5080d', name: '5080D', ratedHp: 75, grossHp: 80, torqueLbFt: 252, torqueRpm: 1500, fuelGal: 19.8,
    note: 'Current US 5D Keyline page explicitly lists 5080D and describes a 15x15 mechanical synchronized shuttle. Separate US spec sheets also document a 5080D GS Power Shuttle variant; that GS variant is preserved in provenance but is not marked current here because it is not a separate current lineup card.',
  },
  {
    slug: '5100d', name: '5100D', ratedHp: 97, grossHp: 102, torqueLbFt: 307, torqueRpm: 1400, fuelGal: 23.7,
    note: 'Current US 5D Keyline lineup explicitly lists 5100D. Only fields clearly published in the current model comparison/series text are normalized; older multi-model Stage IIIB brochure values are not copied into this current US record.',
  },
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
  ['Engine','engine.max_torque','Maximum torque','decimal','lb-ft',10],
  ['Engine','engine.max_torque_speed','Maximum torque speed','integer','rpm',11],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','transmission.speeds','Transmission speeds / ranges','text',null,20],
  ['Transmission','drivetrain.type','Driveline','text',null,30],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Hydraulics','hydraulics.system_type','Hydraulic system','text',null,5],
  ['Hydraulics','hydraulics.main_pump_capacity','Implement hydraulic pump capacity','decimal','gpm',20],
  ['Hydraulics','hitch.lift_capacity','3-point hitch lift capacity','decimal','lb',50],
  ['Hydraulics','hydraulics.remote_valves','Remote valves','text',null,60],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','gal',10],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.unladen_weight','Base weight','decimal','lb',70],
  ['Dimensions & Weight','dimensions.max_permissible_weight','Maximum permissible weight','decimal','lb',80],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql:string, p:unknown[]=[]){
  const [r]=await c.query<IdRow[]>(sql,p); if(!r[0]) throw new Error('Deutz-Fahr 5D Keyline migration dependency missing'); return Number(r[0].id);
}
async function source(c: Parameters<DbMigration['apply']>[0], sid:number,eid:string,url:string,title:string,raw:unknown){
  const [r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[eid]);
  if(r[0]) return Number(r[0].id);
  const [i]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,url,eid,title,JSON.stringify(raw)]);
  return Number(i.insertId);
}
async function put(c: Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,srid:number,v:string|number,u:string|null){
  await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof v==='string'?v:null,typeof v==='number'?v:null,u,srid]);
}

export const deutzFahr5dKeylineCurrentUsMigration: DbMigration = {
  id:'20260830_414_deutz_fahr_5d_keyline_current_us',
  description:'Add current US Deutz-Fahr America 5D Keyline 5080D and 5100D while preserving 5080D GS source ambiguity',
  async apply(c){
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='deutz-fahr' LIMIT 1`);
    const et=await id(c,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sid=await id(c,`SELECT id FROM sources WHERE name='Deutz-Fahr America' AND domain='deutz-fahramerica.com' LIMIT 1`);

    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'DEUTZ-FAHR 5D Keyline','deutz-fahr-5d-keyline') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='deutz-fahr-5d-keyline' LIMIT 1`,[mf]);

    const seriesSr=await source(c,sid,'deutz-fahr-america-5d-keyline-current-us-2026-08',SERIES_URL,'Deutz-Fahr America current 5D Keyline lineup',{
      market:'United States',captured:'2026-08-30',currentModels:['5080D','5100D'],
      currentPageShared:{engine:'FARMotion 2.9 L 3-cylinder',emissions:'Tier 4; no SCR; no DPF',transmission:'Mechanical synchronized shuttle',speeds:'15 x 15 for 5080D; current series text describes the same 5D architecture',pto:'540 rpm',hydraulics:'up to 13.2 gpm',hitch:'up to 5,500 lb',wheelbaseIn:82.6,baseWeightLb:6800,maxPermissibleWeightLb:10500},
      sourceConflict:'US documentation also contains a 5080D GS Keyline Power Shuttle variant and varying hydraulic figures (12.6 vs 13.2 gpm). Current lineup cards are 5080D and 5100D, so GS is not marked current. Current live page value 13.2 gpm is used for current 5D records; differing PDF values remain provenance.',
      legacySpec:LEGACY_SPEC_URL,gsSpec:GS_SPEC_URL,
    });

    const d=new Map<string,number>();
    for(const row of defs){
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,row);
      d.set(row[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[row[1]]));
    }

    for(const m of models){
      const sr=await source(c,sid,`deutz-fahr-america-${m.slug}-current-us-2026-08`,SERIES_URL,`Deutz-Fahr America ${m.name} current US specifications`,{market:'United States',captured:'2026-08-30',model:m.name,note:m.note??null});
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US Deutz-Fahr America 5D Keyline utility tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,series,m.name,m.slug]);
      const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,[mf,m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Cab; mechanical synchronized shuttle; 15 x 15',TRUE,?,'Current Deutz-Fahr America 5D Keyline configuration from the live US lineup page.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[mid,VERSION,sr||seriesSr]);
      const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);
      const vals:Array<[string,string|number,string|null]>=[
        ['configuration.station','Cab',null],['engine.make','FARMotion',null],['engine.type','Turbocharged 3-cylinder diesel',null],['engine.cylinders',3,null],['emissions.standard','Tier 4; no SCR; no DPF',null],['engine.displacement',2.9,'L'],['engine.rated_power',m.ratedHp,'hp'],['engine.gross_power',m.grossHp,'hp'],['engine.rated_speed',2200,'rpm'],['engine.max_torque',m.torqueLbFt,'lb-ft'],['engine.max_torque_speed',m.torqueRpm,'rpm'],['transmission.standard','Mechanical synchronized shuttle',null],['transmission.speeds','F15 x R15; 5-speed synchronized main gearbox x 3 ranges with creeper',null],['drivetrain.type','4WD',null],['pto.rear_description','540 rpm',null],['hydraulics.system_type','Open center',null],['hydraulics.main_pump_capacity',13.2,'gpm'],['hitch.lift_capacity',5500,'lb'],['hydraulics.remote_valves','2 rear remote valves standard',null],['capacities.fuel_tank',m.fuelGal,'gal'],['dimensions.wheelbase',82.6,'in'],['dimensions.unladen_weight',6800,'lb'],['dimensions.max_permissible_weight',10500,'lb']
      ];
      for(const[k,v,u]of vals){const did=d.get(k);if(!did)throw new Error(`Missing Deutz-Fahr 5D Keyline spec ${k}`);await put(c,mid,vid,did,sr||seriesSr,v,u)}
    }
  }
};
