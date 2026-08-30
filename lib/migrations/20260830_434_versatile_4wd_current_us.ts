import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  engineModel: 'X12' | 'X15';
  displacementL: number;
  ratedHp: number;
  peakHp: number;
  torqueLbFt: number;
  maxSpeedMph: number;
  hydraulicStdGpm: number;
  hydraulicHighGpm: number;
  hitchCategory: string;
  hitchLb: number;
  fuelGal: number;
  baseWeightLb: number;
  wheelbaseIn: number;
  operatingGvwLb: number;
};

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://www.versatile-ag.com/NA/pages/product_4wd.php';
const SPEC_URL = 'https://www.versatile-ag.com/NA/downloads/specs/Versatile_Specs_4WD.pdf';
const PRODUCT_GUIDE = 'https://www.versatile-ag.com/NA/downloads/brochure/Versatile_Brochure.pdf';

const models: Seed[] = [
  { slug:'4wd-405', name:'4WD 405', engineModel:'X12', displacementL:11.8, ratedHp:400, peakHp:450, torqueLbFt:1600, maxSpeedMph:22, hydraulicStdGpm:53, hydraulicHighGpm:106, hitchCategory:'Category IVN / III', hitchLb:13000, fuelGal:250, baseWeightLb:31500, wheelbaseIn:135, operatingGvwLb:40000 },
  { slug:'4wd-430', name:'4WD 430', engineModel:'X12', displacementL:11.8, ratedHp:430, peakHp:475, torqueLbFt:1693, maxSpeedMph:22, hydraulicStdGpm:53, hydraulicHighGpm:106, hitchCategory:'Category IVN / III', hitchLb:13000, fuelGal:250, baseWeightLb:31500, wheelbaseIn:135, operatingGvwLb:43000 },
  { slug:'4wd-460', name:'4WD 460', engineModel:'X12', displacementL:11.8, ratedHp:460, peakHp:512, torqueLbFt:1696, maxSpeedMph:22, hydraulicStdGpm:53, hydraulicHighGpm:106, hitchCategory:'Category IVN / III', hitchLb:13000, fuelGal:250, baseWeightLb:31500, wheelbaseIn:135, operatingGvwLb:46000 },
  { slug:'4wd-530', name:'4WD 530', engineModel:'X15', displacementL:14.9, ratedHp:530, peakHp:583, torqueLbFt:1926, maxSpeedMph:23.5, hydraulicStdGpm:59, hydraulicHighGpm:112, hitchCategory:'Category IV', hitchLb:15000, fuelGal:343, baseWeightLb:42000, wheelbaseIn:154, operatingGvwLb:53000 },
  { slug:'4wd-580', name:'4WD 580', engineModel:'X15', displacementL:14.9, ratedHp:580, peakHp:638, torqueLbFt:2026, maxSpeedMph:23.5, hydraulicStdGpm:59, hydraulicHighGpm:112, hitchCategory:'Category IV', hitchLb:15000, fuelGal:343, baseWeightLb:42000, wheelbaseIn:154, operatingGvwLb:58000 },
  { slug:'4wd-620', name:'4WD 620', engineModel:'X15', displacementL:14.9, ratedHp:616, peakHp:665, torqueLbFt:2066, maxSpeedMph:23.5, hydraulicStdGpm:59, hydraulicHighGpm:112, hitchCategory:'Category IV', hitchLb:15000, fuelGal:343, baseWeightLb:42000, wheelbaseIn:154, operatingGvwLb:62000 },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,3],
  ['Engine','emissions.standard','Emissions standard','text',null,5],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
  ['Engine','engine.rated_power','Rated engine power','decimal','hp',7],
  ['Engine','engine.gross_power','Peak engine power','decimal','hp',8],
  ['Engine','engine.max_torque','Peak torque','decimal','lb-ft',10],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','transmission.speeds','Transmission speeds','text',null,20],
  ['Transmission','transmission.max_forward_speed','Maximum forward speed','decimal','mph',30],
  ['Hydraulics','hydraulics.system_type','Hydraulic system','text',null,5],
  ['Hydraulics','hydraulics.main_pump_capacity','Standard hydraulic flow','decimal','gpm',20],
  ['Hydraulics','hydraulics.max_flow','Optional high-flow capacity','decimal','gpm',30],
  ['Hydraulics','hydraulics.remote_valves','Hydraulic remote valves','text',null,60],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Hydraulics','hitch.lift_capacity','3-point hitch lift capacity','decimal','lb',50],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','gal',10],
  ['Capacities','capacities.def_tank','DEF tank capacity','decimal','gal',20],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.unladen_weight','Base tractor weight','decimal','lb',70],
  ['Dimensions & Weight','dimensions.recommended_operating_weight','Recommended operating GVW','decimal','lb',75],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) {
  const [r] = await c.query<IdRow[]>(sql, p);
  if (!r[0]) throw new Error('Versatile 4WD migration dependency missing');
  return Number(r[0].id);
}
async function source(c: Parameters<DbMigration['apply']>[0], sid: number, eid: string, url: string, title: string, raw: unknown) {
  const [r] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [eid]);
  if (r[0]) return Number(r[0].id);
  const [i] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sid, url, eid, title, JSON.stringify(raw)]);
  return Number(i.insertId);
}
async function put(c: Parameters<DbMigration['apply']>[0], mid: number, vid: number, did: number, srid: number, v: string | number, u: string | null) {
  await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [mid, vid, did, typeof v === 'string' ? v : null, typeof v === 'number' ? v : null, u, srid]);
}

export const versatile4wdCurrentUsMigration: DbMigration = {
  id: '20260830_434_versatile_4wd_current_us',
  description: 'Add the six current North America Versatile 4WD articulated tractors',
  async apply(c) {
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='versatile' LIMIT 1`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sid = await id(c, `SELECT id FROM sources WHERE name='Versatile North America' AND domain='versatile-ag.com' LIMIT 1`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Versatile 4WD','versatile-4wd') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et]);
    const series = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='versatile-4wd' LIMIT 1`, [mf]);
    const seriesSr = await source(c, sid, 'versatile-4wd-current-na-2026-08', SERIES_URL, 'Versatile North America current 4WD lineup', {
      market:'North America', captured:'2026-08-30', currentModels:models.map(m=>m.name), currentSpecSheet:SPEC_URL, productGuide2026:PRODUCT_GUIDE,
      architecture:{'405-460':'Cummins X12 Stage V; Caterpillar TA19; 16F x 4R; 53 gpm standard / 106 gpm optional; 250 gal fuel; 31,500 lb base weight; 135 in wheelbase','530-620':'Cummins X15 Stage V; Caterpillar TA22; 16F x 4R; 59 gpm standard / 112 gpm optional; 343 gal fuel; 42,000 lb base weight; 154 in wheelbase'},
      sourceConflicts:[
        'Current live 4WD page markets smooth-shifting transmissions offering 25 mph, while the current North America technical specification sheet publishes 22 mph for 405/430/460 and 23.5 mph for 530/580/620. Model-specific technical-sheet speeds are normalized.',
        'Current live page says new-for-2026 hydraulic capacity is 59 gpm standard / 112 gpm optional, while the current 2026 technical specification sheet and 2026 Product Guide retain 53/106 gpm for 405-460 and 59/112 gpm for 530-620. Model-group technical-sheet values are normalized.',
        'Current live page gives a generic optional three-point-hitch capacity of 13,152 lb, while the current technical sheet publishes 13,000 lb for 405-460 and 15,000 lb for 530-620. Model-group technical-sheet values are normalized.'
      ],
      normalizationPolicy:'The model-specific current North America technical sheet is primary for speed, hydraulics, hitch, fuel, DEF, weight and wheelbase. The live product page is primary for current lineup and marketing context.'
    });
    const d = new Map<string,number>();
    for (const row of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, row);
      d.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }
    for (const m of models) {
      const sr = await source(c, sid, `versatile-${m.slug}-current-na-2026-08`, SPEC_URL, `Versatile ${m.name} current North America specifications`, { market:'North America',captured:'2026-08-30',model:m.name,ratedHp:m.ratedHp,peakHp:m.peakHp,peakTorqueLbFt:m.torqueLbFt,maxSpeedMph:m.maxSpeedMph,hydraulics:{standardGpm:m.hydraulicStdGpm,optionalGpm:m.hydraulicHighGpm},hitchLb:m.hitchLb,recommendedOperatingGvwLb:m.operatingGvwLb });
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current North America Versatile 4WD articulated tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [mf,et,series,m.name,m.slug]);
      const mid = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [mf,m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mid,VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','Cab; articulated 4WD; Caterpillar full powershift 16F x 4R',TRUE,?,'Current Versatile North America 4WD configuration.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [mid,VERSION,sr||seriesSr]);
      const vid = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [mid,VERSION]);
      const vals:Array<[string,string|number,string|null]> = [
        ['configuration.station','Cab',null],['engine.make','Cummins',null],['engine.model',m.engineModel,null],['emissions.standard','Stage V',null],['engine.displacement',m.displacementL,'L'],['engine.rated_power',m.ratedHp,'hp'],['engine.gross_power',m.peakHp,'hp'],['engine.max_torque',m.torqueLbFt,'lb-ft'],['transmission.standard',m.engineModel==='X12'?'Caterpillar TA19 full powershift':'Caterpillar TA22 full powershift',null],['transmission.speeds','F16 x R4',null],['transmission.max_forward_speed',m.maxSpeedMph,'mph'],['hydraulics.system_type','Closed-center load sensing',null],['hydraulics.main_pump_capacity',m.hydraulicStdGpm,'gpm'],['hydraulics.max_flow',m.hydraulicHighGpm,'gpm'],['hydraulics.remote_valves','6 electrohydraulic remotes',null],['hitch.category',m.hitchCategory,null],['hitch.lift_capacity',m.hitchLb,'lb'],['pto.rear_description','Optional 1000 rpm; 1-3/4 in, 20-spline shaft',null],['capacities.fuel_tank',m.fuelGal,'gal'],['capacities.def_tank',25,'gal'],['dimensions.wheelbase',m.wheelbaseIn,'in'],['dimensions.unladen_weight',m.baseWeightLb,'lb'],['dimensions.recommended_operating_weight',m.operatingGvwLb,'lb']
      ];
      for (const [k,v,u] of vals) { const did=d.get(k); if(!did) throw new Error(`Missing Versatile 4WD spec ${k}`); await put(c,mid,vid,did,sr||seriesSr,v,u); }
    }
  }
};
