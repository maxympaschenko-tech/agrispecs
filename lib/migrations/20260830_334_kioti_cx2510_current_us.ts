import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  station: 'ROPS' | 'Cab';
  engineModel: string;
  transmission: string;
  ptoPowerHp: number;
  lengthIn?: number;
  widthIn: number;
  heightIn: number;
  wheelbaseIn: number;
  clearanceIn: number;
  turningRadiusFt: number;
  weightLb: number;
  note?: string;
};

const VERSION = 'united-states-current-2026-08';
const LINEUP_URL = 'https://www.kioti.com/products/tractors/cx';
const models: Seed[] = [
  {
    slug: 'cx2510', name: 'CX2510', url: 'https://www.kioti.com/products/tractors/cx/cx2510', station: 'ROPS',
    engineModel: '3A165LWH-U2', transmission: 'Manual', ptoPowerHp: 19.3,
    lengthIn: 109.08, widthIn: 49.4, heightIn: 82.8, wheelbaseIn: 59.8, clearanceIn: 13.4, turningRadiusFt: 9, weightLb: 2308,
  },
  {
    slug: 'cx2510h', name: 'CX2510H', url: 'https://www.kioti.com/products/tractors/cx/cx2510h', station: 'ROPS',
    engineModel: '3A165LWH-U2', transmission: 'Hydrostatic', ptoPowerHp: 19.3,
    lengthIn: 109.08, widthIn: 49.4, heightIn: 82.8, wheelbaseIn: 59.8, clearanceIn: 13.4, turningRadiusFt: 9, weightLb: 2308,
    note: 'The current US page clearly labels the transmission Hydrostatic but also exposes internally inconsistent shuttle/main-gear rows. Only the unambiguous transmission label is stored.',
  },
  {
    slug: 'cx2510h-cab', name: 'CX2510H Cab', url: 'https://www.kioti.com/products/tractors/cx/cx2510hcb', station: 'Cab',
    engineModel: '3A165LWH-U3', transmission: 'Hydrostatic', ptoPowerHp: 18.8,
    widthIn: 49.4, heightIn: 86.6, wheelbaseIn: 59.8, clearanceIn: 13.4, turningRadiusFt: 9, weightLb: 2804,
    note: 'The current US page has a malformed Length with Hitch value of 11 in paired with 2,820 mm. The length field is intentionally omitted rather than corrected by inference.',
  },
];

const definitions: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.model','Engine model','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,2],
  ['Engine','engine.power','Engine power','decimal','hp',4],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
  ['Engine','engine.power_speed','Engine speed at published power','integer','rpm',8],
  ['Transmission','transmission.options','Transmission','text',null,10],
  ['PTO','pto.type','PTO type','text',null,5],
  ['PTO','pto.power','PTO power','decimal','hp',10],
  ['PTO','pto.speeds','PTO speeds','text',null,20],
  ['Hydraulics','hydraulics.main_pump_flow','Hydraulic pump capacity','decimal','US gal/min',10],
  ['Hydraulics','hydraulics.lift_capacity','Hydraulics lift capacity','decimal','lb',20],
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
  if (!rows[0]) throw new Error('KIOTI CX2510 migration dependency missing');
  return Number(rows[0].id);
}

async function source(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(raw)],
  );
  return Number(inserted.insertId);
}

async function put(c: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const kiotiCx2510CurrentUsMigration: DbMigration = {
  id: '20260830_334_kioti_cx2510_current_us',
  description: 'Add three current US KIOTI CX2510-family compact tractors from official KIOTI US model pages',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='kioti' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='KIOTI' AND domain='kioti.com' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'KIOTI CX2510 Family','kioti-cx2510')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='kioti-cx2510' LIMIT 1`, [manufacturerId]);
    await source(c, sourceId, 'kioti-cx2510-current-us-lineup-2026-08', LINEUP_URL, 'KIOTI US current CX Series lineup', {
      market: 'United States', captured: '2026-08-30', models: models.map((model) => model.name),
    });

    const definitionIds = new Map<string, number>();
    for (const row of definitions) {
      await c.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),display_order=VALUES(display_order)`,
        row,
      );
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    for (const model of models) {
      const sourceRecordId = await source(c, sourceId, `kioti-${model.slug}-current-us-2026-08`, model.url, `KIOTI US ${model.name} current specifications`, {
        market: 'United States', captured: '2026-08-30', model, note: model.note || null,
      });
      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US KIOTI CX compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.name, model.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, `${model.station}; ${model.transmission}`, sourceRecordId, model.note || 'Current KIOTI US model-specific specification record.'],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      const values: Array<[string,string|number|undefined,string|null]> = [
        ['configuration.station', model.station, null],
        ['engine.model', model.engineModel, null],
        ['engine.make', 'KIOTI', null],
        ['engine.power', 24.5, 'hp'],
        ['engine.displacement', 1.647, 'L'],
        ['engine.power_speed', 2600, 'rpm'],
        ['transmission.options', model.transmission, null],
        ['pto.type', 'Transmission', null],
        ['pto.power', model.ptoPowerHp, 'hp'],
        ['pto.speeds', 'Rear 540 rpm; mid 2,000 rpm', null],
        ['hydraulics.main_pump_flow', 11.3, 'US gal/min'],
        ['hydraulics.lift_capacity', 1203, 'lb'],
        ['hitch.rear_max_lift_capacity', 1203, 'lb'],
        ['capacities.fuel_tank', 25, 'L'],
        ['dimensions.overall_length', model.lengthIn, 'in'],
        ['dimensions.overall_width', model.widthIn, 'in'],
        ['dimensions.overall_height', model.heightIn, 'in'],
        ['dimensions.wheelbase', model.wheelbaseIn, 'in'],
        ['dimensions.ground_clearance', model.clearanceIn, 'in'],
        ['dimensions.turning_radius', model.turningRadiusFt, 'ft'],
        ['dimensions.unladen_weight', model.weightLb, 'lb'],
      ];
      for (const [key, value, unit] of values) {
        if (value === undefined) continue;
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing KIOTI CX2510 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, sourceRecordId, value, unit);
      }
    }
  },
};
