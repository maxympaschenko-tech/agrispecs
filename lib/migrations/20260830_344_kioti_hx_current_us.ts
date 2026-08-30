import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  powerHp: number;
  engineModel: string;
  fuelL: number;
  transmission: string;
  ptoPowerHp: number;
  ptoSpeeds: string;
  pumpGpm: number;
  liftLb: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  wheelbaseIn: number;
  clearanceIn: number;
  weightLb: number;
  turningRadiusFt?: number;
  note?: string;
};

const VERSION = 'united-states-current-2026-08';
const LINEUP_URL = 'https://www.kioti.com/products/tractors/hx';
const models: Seed[] = [
  {
    slug: 'hx9010', name: 'HX9010 Cab', url: 'https://www.kioti.com/products/tractors/hx/hx9010',
    powerHp: 90, engineModel: '4J243TA-TP5B', fuelL: 180, transmission: 'Manual: Power Shuttle',
    ptoPowerHp: 70, ptoSpeeds: 'Rear 540 / 540E / 1000', pumpGpm: 32, liftLb: 8002,
    lengthIn: 170.78, widthIn: 88.58, heightIn: 111.93, wheelbaseIn: 94.88, clearanceIn: 18.94,
    weightLb: 10230, turningRadiusFt: 12.69,
    note: 'The current US marketing copy calls HX9010 a 98-horsepower tractor, while the model-specific Full Specs table publishes 90 hp. The detailed Full Specs value is stored and the discrepancy is retained in provenance.',
  },
  {
    slug: 'hx1151', name: 'HX1151 Cab', url: 'https://www.kioti.com/products/tractors/hx/hx1151',
    powerHp: 115.3, engineModel: '4J243TA-TP5B', fuelL: 180, transmission: 'Manual: Power Shuttle',
    ptoPowerHp: 83.9, ptoSpeeds: 'Rear 540 / 540E / 1000', pumpGpm: 32, liftLb: 8002,
    lengthIn: 170.78, widthIn: 88.58, heightIn: 111.93, wheelbaseIn: 94.88, clearanceIn: 18.94,
    weightLb: 10230, turningRadiusFt: 12.69,
    note: 'The current Full Specs table publishes 8,002 lb hydraulic and hitch lift. One metric conversion beside the hydraulic row is inconsistent; the directly published US-pound value is retained.',
  },
  {
    slug: 'hx1302', name: 'HX1302 Cab', url: 'https://www.kioti.com/products/tractors/hx/hx1302',
    powerHp: 130.1, engineModel: '4J243TA', fuelL: 229.8, transmission: 'Power Shuttle with Semi-Powershift',
    ptoPowerHp: 109, ptoSpeeds: 'Rear 540 / 540E / 1000', pumpGpm: 44.1, liftLb: 8492,
    lengthIn: 177.87, widthIn: 89.25, heightIn: 114.41, wheelbaseIn: 102.36, clearanceIn: 19.5,
    weightLb: 11660,
    note: 'The current model-specific page publishes Turning Radius as 165.35 ft paired with 4,200 m, which is internally malformed. Turning radius is deliberately omitted rather than inferred from the neighboring HX1402 row.',
  },
  {
    slug: 'hx1402', name: 'HX1402 Cab', url: 'https://www.kioti.com/products/tractors/hx/hx1402',
    powerHp: 140.1, engineModel: '4J243TA', fuelL: 229.8, transmission: 'Power Shuttle with Semi-Powershift',
    ptoPowerHp: 120, ptoSpeeds: 'Rear 540 / 540E / 1000', pumpGpm: 44.1, liftLb: 8492,
    lengthIn: 177.87, widthIn: 89.25, heightIn: 114.41, wheelbaseIn: 102.36, clearanceIn: 19.5,
    weightLb: 11660, turningRadiusFt: 13.779,
    note: 'The current Full Specs table publishes turning radius with brake as 165.35 in (4,200 mm). The inch value is normalized to 13.779 ft for the shared catalog field.',
  },
];

const definitions: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.model','Engine model','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,2],
  ['Engine','engine.power','Engine power','decimal','hp',4],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
  ['Engine','engine.power_speed','Engine speed at published power','integer','rpm',8],
  ['Engine','engine.aspiration','Aspiration','text',null,10],
  ['Transmission','transmission.options','Transmission','text',null,10],
  ['PTO','pto.type','PTO type','text',null,5],
  ['PTO','pto.power','PTO power','decimal','hp',10],
  ['PTO','pto.speeds','PTO speeds','text',null,20],
  ['Hydraulics','hydraulics.main_pump_flow','Hydraulic pump capacity','decimal','US gal/min',10],
  ['Hydraulics','hydraulics.lift_capacity','Hydraulics lift capacity','decimal','lb',20],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,22],
  ['Hydraulics','hitch.rear_max_lift_capacity','Hitch lift capacity','decimal','lb',25],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','L',10],
  ['Dimensions & Weight','dimensions.overall_length','Length with hitch','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.ground_clearance','Ground clearance','decimal','in',50],
  ['Dimensions & Weight','dimensions.turning_radius','Turning radius','decimal','ft',60],
  ['Dimensions & Weight','dimensions.unladen_weight','Tractor weight','decimal','lb',70],
];

async function id(c: Parameters<DbMigration['apply']>[0], q: string, p: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(q, p);
  if (!rows[0]) throw new Error('KIOTI HX migration dependency missing');
  return Number(rows[0].id);
}
async function source(c: Parameters<DbMigration['apply']>[0], sid: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sid, url, externalId, title, JSON.stringify(raw)],
  );
  return Number(inserted.insertId);
}
async function put(c: Parameters<DbMigration['apply']>[0], mi: number, vi: number, di: number, sr: number, value: string | number, unit: string | null = null) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [mi, vi, di, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sr],
  );
}

export const kiotiHxCurrentUsMigration: DbMigration = {
  id: '20260830_344_kioti_hx_current_us',
  description: 'Add four current US KIOTI HX Series utility tractors from official model-specific Full Specs',
  async apply(c) {
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='kioti' LIMIT 1`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sid = await id(c, `SELECT id FROM sources WHERE name='KIOTI' AND domain='kioti.com' LIMIT 1`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'KIOTI HX Series','kioti-hx') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='kioti-hx' LIMIT 1`, [mf]);
    await source(c, sid, 'kioti-hx-current-us-lineup-2026-08', LINEUP_URL, 'KIOTI US current HX Series lineup', {
      market: 'United States', captured: '2026-08-30', models: models.map((m) => ({ name: m.name, powerHp: m.powerHp, transmission: m.transmission })),
    });
    const defs = new Map<string, number>();
    for (const row of definitions) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, row);
      defs.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }
    for (const m of models) {
      const sr = await source(c, sid, `kioti-${m.slug}-current-us-2026-08`, m.url, `KIOTI US ${m.name} current Full Specs`, {
        market: 'United States', captured: '2026-08-30', model: m, note: m.note || null,
      });
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US KIOTI HX utility tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [mf, et, seriesId, m.name, m.slug]);
      const mi = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [mf, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mi, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,?) ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [mi, VERSION, `Cab; ${m.transmission}`, sr, m.note || 'Current KIOTI US model-specific Full Specs.']);
      const vi = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [mi, VERSION]);
      const values: Array<[string,string|number|undefined,string|null]> = [
        ['configuration.station','Cab',null], ['engine.model',m.engineModel,null], ['engine.make','KIOTI',null],
        ['engine.power',m.powerHp,'hp'], ['engine.displacement',3.833,'L'], ['engine.power_speed',2200,'rpm'],
        ['engine.aspiration','Turbo Charged w/ Air to Air Intercooler',null], ['transmission.options',m.transmission,null],
        ['pto.type','Independent',null], ['pto.power',m.ptoPowerHp,'hp'], ['pto.speeds',m.ptoSpeeds,null],
        ['hydraulics.main_pump_flow',m.pumpGpm,'US gal/min'], ['hydraulics.lift_capacity',m.liftLb,'lb'],
        ['hitch.category','Category 2',null], ['hitch.rear_max_lift_capacity',m.liftLb,'lb'], ['capacities.fuel_tank',m.fuelL,'L'],
        ['dimensions.overall_length',m.lengthIn,'in'], ['dimensions.overall_width',m.widthIn,'in'], ['dimensions.overall_height',m.heightIn,'in'],
        ['dimensions.wheelbase',m.wheelbaseIn,'in'], ['dimensions.ground_clearance',m.clearanceIn,'in'], ['dimensions.turning_radius',m.turningRadiusFt,'ft'],
        ['dimensions.unladen_weight',m.weightLb,'lb'],
      ];
      for (const [key, value, unit] of values) {
        if (value === undefined) continue;
        const di = defs.get(key);
        if (!di) throw new Error(`Missing KIOTI HX spec definition ${key}`);
        await put(c, mi, vi, di, sr, value, unit);
      }
    }
  },
};
