import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  station: 'ROPS' | 'Cab';
  powerHp: number;
  fuelL: number;
  transmission: string;
  engineModel?: string;
  displacementL?: number;
  rpm?: number;
  aspiration?: string;
  ptoType?: string;
  ptoPowerHp?: number;
  ptoSpeeds?: string;
  pumpGpm?: number;
  hydraulicLiftLb?: number;
  hitchLiftLb?: number;
  hitchCategory?: string;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  wheelbaseIn?: number;
  clearanceIn?: number;
  turningRadiusFt?: number;
  weightLb?: number;
  note?: string;
};

const VERSION = 'united-states-current-2026-08';
const LINEUP_URL = 'https://www.kioti.com/products/tractors/ck';
const models: Seed[] = [
  {
    slug: 'ck2640', name: 'CK2640', url: 'https://www.kioti.com/products/tractors/ck/ck2640', station: 'ROPS',
    powerHp: 24.5, fuelL: 34, transmission: 'Manual; 9x3 manual transmission', engineModel: '3A165LWM-U4', displacementL: 1.647,
    ptoType: 'Live', ptoPowerHp: 19.5, pumpGpm: 11.3, hydraulicLiftLb: 1631, hitchLiftLb: 1631, hitchCategory: 'Category 1',
    lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9, clearanceIn: 13.4, weightLb: 2634.5,
    note: 'The current Full Specs wheelbase row publishes 66.70 in paired with 1,670 mm, and the turning-radius row publishes 57.10 ft paired with 2,450 m. Both internally inconsistent fields are omitted. Marketing copy says 2,429 lb lift while Full Specs publishes 1,631 lb; the detailed Full Specs value is stored.',
  },
  {
    slug: 'ck2640h', name: 'CK2640H', url: 'https://www.kioti.com/products/tractors/ck/ck2640h', station: 'ROPS',
    powerHp: 24.5, fuelL: 34, transmission: 'Hydrostatic; 3-range', engineModel: '3A165LWM-U4', displacementL: 1.647,
    ptoType: 'Live', ptoPowerHp: 18.7, ptoSpeeds: 'Rear 540 rpm; mid 2,000 rpm optional', pumpGpm: 10.5,
    hydraulicLiftLb: 1631, hitchLiftLb: 1631, hitchCategory: 'Category 1', lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9,
    wheelbaseIn: 65.7, clearanceIn: 13.4, weightLb: 2689.6,
    note: 'The current Full Specs turning-radius row publishes 57.10 ft paired with 2,450 m and is omitted as malformed.',
  },
  {
    slug: 'ck3540', name: 'CK3540', url: 'https://www.kioti.com/products/tractors/ck/ck3540', station: 'ROPS',
    powerHp: 35, fuelL: 34, transmission: 'Manual; 9x3 manual transmission', engineModel: '3H-TM4A', displacementL: 1.826, rpm: 2600,
    ptoType: 'Live', ptoPowerHp: 31, pumpGpm: 11.3, hydraulicLiftLb: 1631, hitchLiftLb: 1631, hitchCategory: 'Category 1',
    lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9, wheelbaseIn: 65.7, clearanceIn: 13.4, weightLb: 2689.6,
    note: 'The current Full Specs turning-radius row publishes 57.10 in paired with 2,450 mm, an internally inconsistent conversion, so turning radius is omitted.',
  },
  {
    slug: 'ck3540h', name: 'CK3540H', url: 'https://www.kioti.com/products/tractors/ck/ck3540h', station: 'ROPS',
    powerHp: 35, fuelL: 34, transmission: 'Hydrostatic; 3-range', engineModel: '3H-TH4A', displacementL: 1.826, rpm: 2600, aspiration: 'Intercooler',
    ptoType: 'Live', ptoPowerHp: 28.9, ptoSpeeds: 'Rear 540 rpm; mid 2,000 rpm optional', pumpGpm: 11.3,
    hydraulicLiftLb: 1631, hitchLiftLb: 1631, hitchCategory: 'Category 1', lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9,
    wheelbaseIn: 65.7, clearanceIn: 13.4, weightLb: 2733.7,
    note: 'The current Full Specs turning-radius conversion is internally inconsistent and is omitted.',
  },
  {
    slug: 'ck4040', name: 'CK4040', url: 'https://www.kioti.com/products/tractors/ck/ck4040', station: 'ROPS',
    powerHp: 39.5, fuelL: 34, transmission: 'Manual; 9x3 manual transmission', engineModel: '3H-TM4A', displacementL: 1.826, rpm: 2600,
    ptoType: 'Live', ptoPowerHp: 34.8, ptoSpeeds: 'Rear 540 rpm; mid 2,000 rpm optional', pumpGpm: 11.3,
    hydraulicLiftLb: 1631, hitchLiftLb: 1631, hitchCategory: 'Category 1', lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9,
    wheelbaseIn: 65.7, clearanceIn: 13.4,
    note: 'Current marketing copy says 2,429 lb lift, while Full Specs publishes 1,631 lb; the detailed Full Specs value is stored. The turning-radius inch/mm pair is internally inconsistent and is omitted. The current Full Specs dimensions section does not publish tractor weight, so no weight is inferred.',
  },
  {
    slug: 'ck4040h', name: 'CK4040H', url: 'https://www.kioti.com/products/tractors/ck/ck4040h', station: 'ROPS',
    powerHp: 39.5, fuelL: 34, transmission: 'Hydrostatic; 3-range', engineModel: '3H-TH4A', displacementL: 1.826, aspiration: 'Intercooler',
    ptoType: 'Live', ptoPowerHp: 33.3, ptoSpeeds: 'Rear 540 rpm; mid 2,000 rpm optional', pumpGpm: 11.3,
    hydraulicLiftLb: 1631, hitchLiftLb: 1631, hitchCategory: 'Category 1', lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9,
    wheelbaseIn: 65.7, clearanceIn: 13.4, weightLb: 2733.7,
    note: 'The current Full Specs turning-radius row publishes an internally inconsistent inch/mm pair and is omitted.',
  },
  {
    slug: 'ck2640seh', name: 'CK2640SEH', url: 'https://www.kioti.com/products/tractors/ck/ck2640seh/build', station: 'ROPS',
    powerHp: 24.5, fuelL: 34, transmission: 'Hydrostatic', hitchCategory: 'Category 1',
    note: 'The current US Build & Price page explicitly confirms 24.5 hp, hydrostatic transmission, Category 1 three-point hitch and KL4040 availability. The dedicated US Full Specs page was not reliably retrievable, so deeper values are deliberately not copied from Canada or neighboring configurations.',
  },
  {
    slug: 'ck2640sehc', name: 'CK2640SEHC', url: 'https://www.kioti.com/products/tractors/ck/ck2640sehc', station: 'Cab',
    powerHp: 24.5, fuelL: 34, transmission: 'Hydrostatic; 3-range', engineModel: '3A165LWH-U1', displacementL: 1.647, rpm: 2600,
    ptoType: 'Independent', ptoPowerHp: 18.7, ptoSpeeds: 'Rear 540 rpm; mid 2,000 rpm optional', pumpGpm: 10.5,
    hydraulicLiftLb: 2101, hitchLiftLb: 2101, hitchCategory: 'Category 1', lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9,
    wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.958,
    note: 'The current Full Specs weight row publishes 3,921.10 lb paired with 1,325 kg, an impossible conversion, so tractor weight is omitted. The turning radius 107.50 in / 2,730 mm is normalized to 8.958 ft.',
  },
  {
    slug: 'ck3540se', name: 'CK3540SE', url: 'https://www.kioti.com/products/tractors/ck/ck3540se', station: 'ROPS',
    powerHp: 35, fuelL: 34, transmission: 'Manual', engineModel: '3H-TM4B', displacementL: 1.826, rpm: 2600,
    ptoType: 'Independent', ptoPowerHp: 31, ptoSpeeds: 'Rear 540 rpm; mid 2,000 rpm optional', pumpGpm: 11.3,
    hydraulicLiftLb: 2101, hitchLiftLb: 2101, hitchCategory: 'Category 1', lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9,
    wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.958, weightLb: 3038,
    note: 'The current Full Specs page labels Transmission as Manual but Shuttle as Hydrostatic while also showing 12F/12R. Only the unambiguous Manual transmission label is stored; contradictory shuttle/gear details are omitted.',
  },
  {
    slug: 'ck3540seh', name: 'CK3540SEH', url: 'https://www.kioti.com/products/tractors/ck/ck3540seh', station: 'ROPS',
    powerHp: 35, fuelL: 34, transmission: 'Hydrostatic; 3-range', engineModel: '3H-TH4B', displacementL: 1.826, aspiration: 'Water-Cooled (Forced Circulation)',
    ptoType: 'Independent', ptoPowerHp: 29, ptoSpeeds: 'Rear 540 rpm; mid 2,000 rpm optional', pumpGpm: 11.3,
    hydraulicLiftLb: 2101, hitchLiftLb: 2101, hitchCategory: 'Category 1', lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9,
    wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.958, weightLb: 2921,
  },
  {
    slug: 'ck3540sehc', name: 'CK3540SEHC', url: 'https://www.kioti.com/products/tractors/ck/ck3540sehc', station: 'Cab',
    powerHp: 35, fuelL: 34, transmission: 'Hydrostatic; 3-range', engineModel: '3H-TH4B', displacementL: 1.826, aspiration: 'Water-Cooled (Forced Circulation)',
    ptoType: 'Independent', ptoPowerHp: 29, ptoSpeeds: 'Rear 540 rpm; mid 2,000 rpm optional', pumpGpm: 11.3,
    hydraulicLiftLb: 2101, hitchLiftLb: 2101, hitchCategory: 'Category 1', lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9,
    wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.958, weightLb: 3397.3,
  },
  {
    slug: 'ck4040se', name: 'CK4040SE', url: 'https://www.kioti.com/products/tractors/ck/ck4040se/build', station: 'ROPS',
    powerHp: 39.5, fuelL: 34, transmission: 'Manual', hitchCategory: 'Category 1',
    note: 'The current US lineup explicitly publishes 39.50 hp and Manual transmission. The current US Build & Price page confirms the CK4040SE configuration, Category 1 three-point hitch and KL4040 availability, but the dedicated Full Specs page was not reliably retrievable. Deeper values are therefore omitted rather than inferred from CK4020SE or neighboring CK40 models.',
  },
  {
    slug: 'ck4040seh', name: 'CK4040SEH', url: 'https://www.kioti.com/products/tractors/ck/ck4040seh', station: 'ROPS',
    powerHp: 39.5, fuelL: 34, transmission: 'Hydrostatic; 3-range', engineModel: '3H-TH4B', displacementL: 1.826, aspiration: 'Water-Cooled (Forced Circulation)',
    ptoType: 'Independent', ptoPowerHp: 33.3, ptoSpeeds: 'Rear 540 rpm; mid 2,000 rpm optional', pumpGpm: 11.3,
    hydraulicLiftLb: 2101, hitchLiftLb: 2101, hitchCategory: 'Category 1', lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9,
    wheelbaseIn: 65.7, clearanceIn: 13.4,
    note: 'The current Full Specs turning-radius row publishes 107.50 in paired with 2,370 mm and the weight row publishes 107.50 lb paired with 2,730 kg. Both malformed fields are omitted.',
  },
  {
    slug: 'ck4040sehc', name: 'CK4040SEHC', url: 'https://www.kioti.com/products/tractors/ck/ck4040sehc', station: 'Cab',
    powerHp: 39.5, fuelL: 34, transmission: 'Hydrostatic; 3-range', engineModel: '3H-TH4B', displacementL: 1.826, aspiration: 'Water-Cooled (Forced Circulation)',
    ptoType: 'Independent', ptoPowerHp: 33.3, ptoSpeeds: 'Rear 540 rpm; mid 2,000 rpm optional', pumpGpm: 11.3,
    hydraulicLiftLb: 2101, hitchLiftLb: 2101, hitchCategory: 'Category 1', lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9,
    wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.958,
    note: 'The current Full Specs weight row publishes 107.50 lb paired with 2,730 kg and is omitted as malformed. The turning radius 107.50 in / 2,730 mm is normalized to 8.958 ft.',
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
  if (!rows[0]) throw new Error('KIOTI CK40 migration dependency missing');
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

export const kiotiCk40CurrentUsMigration: DbMigration = {
  id: '20260830_346_kioti_ck40_current_us',
  description: 'Add fourteen current US KIOTI CK40 Series compact tractor configurations from official US lineup, Build & Price and Full Specs pages',
  async apply(c) {
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='kioti' LIMIT 1`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sid = await id(c, `SELECT id FROM sources WHERE name='KIOTI' AND domain='kioti.com' LIMIT 1`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'KIOTI CK40 Series','kioti-ck40') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et]);
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='kioti-ck40' LIMIT 1`, [mf]);
    await source(c, sid, 'kioti-ck40-current-us-lineup-2026-08', LINEUP_URL, 'KIOTI US current CK Series lineup including CK40 generation', {
      market: 'United States', captured: '2026-08-30', generation: 'CK40', models: models.map((m) => ({ name: m.name, powerHp: m.powerHp, transmission: m.transmission })),
    });

    const defs = new Map<string, number>();
    for (const row of definitions) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, row);
      defs.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    for (const m of models) {
      const sr = await source(c, sid, `kioti-${m.slug}-current-us-2026-08`, m.url, `KIOTI US ${m.name} current specifications`, {
        market: 'United States', captured: '2026-08-30', generation: 'CK40', model: m, note: m.note || null,
      });
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US KIOTI CK40 compact tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [mf, et, seriesId, m.name, m.slug]);
      const mi = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [mf, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mi, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,?) ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [mi, VERSION, `${m.station}; ${m.transmission}`, sr, m.note || 'Current KIOTI US CK40 model-specific specification record.']);
      const vi = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [mi, VERSION]);
      const values: Array<[string,string|number|undefined,string|null]> = [
        ['configuration.station',m.station,null], ['engine.model',m.engineModel,null], ['engine.make','KIOTI',null],
        ['engine.power',m.powerHp,'hp'], ['engine.displacement',m.displacementL,'L'], ['engine.power_speed',m.rpm,'rpm'], ['engine.aspiration',m.aspiration,null],
        ['transmission.options',m.transmission,null], ['pto.type',m.ptoType,null], ['pto.power',m.ptoPowerHp,'hp'], ['pto.speeds',m.ptoSpeeds,null],
        ['hydraulics.main_pump_flow',m.pumpGpm,'US gal/min'], ['hydraulics.lift_capacity',m.hydraulicLiftLb,'lb'], ['hitch.category',m.hitchCategory,null],
        ['hitch.rear_max_lift_capacity',m.hitchLiftLb,'lb'], ['capacities.fuel_tank',m.fuelL,'L'], ['dimensions.overall_length',m.lengthIn,'in'],
        ['dimensions.overall_width',m.widthIn,'in'], ['dimensions.overall_height',m.heightIn,'in'], ['dimensions.wheelbase',m.wheelbaseIn,'in'],
        ['dimensions.ground_clearance',m.clearanceIn,'in'], ['dimensions.turning_radius',m.turningRadiusFt,'ft'], ['dimensions.unladen_weight',m.weightLb,'lb'],
      ];
      for (const [key, value, unit] of values) {
        if (value === undefined) continue;
        const di = defs.get(key);
        if (!di) throw new Error(`Missing KIOTI CK40 spec definition ${key}`);
        await put(c, mi, vi, di, sr, value, unit);
      }
    }
  },
};
