import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  baseModel: string;
  url: string;
  station: 'ROPS' | 'Cab';
  transmission: string;
  grossHp: number;
  netHp?: number;
  ptoHp: number;
  engineModel?: string;
  displacementCi?: number;
  ratedRpm?: number;
  cylinders?: number;
  weightLb: number;
  hitchLiftLb: number;
  travelMph?: number;
  reverseMph?: number;
  fuelGal?: number;
  totalFlowGpm?: number;
  steeringFlowGpm?: number;
  implementFlowGpm?: number;
  widthIn?: number;
  groundClearanceIn?: number;
  turningRadiusFt?: number;
  wheelbaseIn?: number;
  lengthIn?: number;
  heightIn?: number;
  note?: string;
};

const VERSION = 'united-states-current-2026-08';
const PLATFORM_URL = 'https://www.bobcat.com/na/en/equipment/tractors/compact-tractors/2000-platform-compact-tractors';

const models: Seed[] = [
  {
    slug: 'ct2025-hst', name: 'CT2025 HST', baseModel: 'CT2025',
    url: 'https://www.bobcat.com/na/en/equipment/tractors/compact-tractors/2000-platform-compact-tractors/ct2025', station: 'ROPS',
    transmission: 'Infinite, 3 Range Hydrostatic', grossHp: 24.5, ptoHp: 21.8, engineModel: '3A165LWH', displacementCi: 100, ratedRpm: 2400, cylinders: 3,
    weightLb: 2634, hitchLiftLb: 1631, travelMph: 9.4, reverseMph: 6.5, fuelGal: 9, totalFlowGpm: 11.4, steeringFlowGpm: 4.5, implementFlowGpm: 6.9,
    widthIn: 62.4, groundClearanceIn: 11.7, turningRadiusFt: 9, wheelbaseIn: 66,
  },
  {
    slug: 'ct2025-mst', name: 'CT2025 MST', baseModel: 'CT2025',
    url: 'https://www.bobcat.com/na/en/equipment/tractors/compact-tractors/2000-platform-compact-tractors/ct2025', station: 'ROPS',
    transmission: 'Manual (9x3)', grossHp: 24.5, ptoHp: 22.2, engineModel: '3A165LWM', displacementCi: 100, ratedRpm: 2400, cylinders: 3,
    weightLb: 2634, hitchLiftLb: 1631, travelMph: 9.2, reverseMph: 6, fuelGal: 9, totalFlowGpm: 11.4, steeringFlowGpm: 4.5, implementFlowGpm: 6.9,
    widthIn: 62.4, groundClearanceIn: 11.7, turningRadiusFt: 9, wheelbaseIn: 66,
  },
  {
    slug: 'ct2035-hst', name: 'CT2035 HST', baseModel: 'CT2035',
    url: 'https://www.bobcat.com/na/en/equipment/tractors/compact-tractors/2000-platform-compact-tractors/ct2035', station: 'ROPS',
    transmission: 'Infinite, 3 Range Hydrostatic', grossHp: 34.9, ptoHp: 29.4, engineModel: '3H-TH4A', displacementCi: 111, ratedRpm: 2600, cylinders: 3,
    weightLb: 3005, hitchLiftLb: 1631, travelMph: 14, reverseMph: 9.7, fuelGal: 9, totalFlowGpm: 11.4, steeringFlowGpm: 4.5, implementFlowGpm: 6.9,
    widthIn: 62.4, groundClearanceIn: 11.7, turningRadiusFt: 8.4, wheelbaseIn: 66,
  },
  {
    slug: 'ct2035-mst', name: 'CT2035 MST', baseModel: 'CT2035',
    url: PLATFORM_URL, station: 'ROPS', transmission: 'Manual-shift transmission', grossHp: 34.9, ptoHp: 30.8,
    weightLb: 3005, hitchLiftLb: 1631,
    note: 'Current US 2000 Platform page explicitly publishes manual-shift availability and 30.8 PTO hp for CT2035. HST-only engine and dimensional rows from the model detail page are intentionally not copied into the MST record.',
  },
  {
    slug: 'ct2040-hst', name: 'CT2040 HST', baseModel: 'CT2040',
    url: 'https://www.bobcat.com/na/en/equipment/tractors/compact-tractors/2000-platform-compact-tractors/ct2040', station: 'ROPS',
    transmission: 'Infinite, 3 Range Hydrostatic', grossHp: 39.6, ptoHp: 31.9, engineModel: '3H-TH4A', displacementCi: 111, ratedRpm: 2600, cylinders: 3,
    weightLb: 3005, hitchLiftLb: 1631, travelMph: 14, reverseMph: 9.7, fuelGal: 9, totalFlowGpm: 11.4, steeringFlowGpm: 4.5, implementFlowGpm: 6.9,
    widthIn: 62.4, groundClearanceIn: 11.7, turningRadiusFt: 8.4, wheelbaseIn: 66,
  },
  {
    slug: 'ct2040-mst', name: 'CT2040 MST', baseModel: 'CT2040',
    url: PLATFORM_URL, station: 'ROPS', transmission: 'Manual-shift transmission', grossHp: 39.6, ptoHp: 34.9,
    weightLb: 3005, hitchLiftLb: 1631,
    note: 'Current US 2000 Platform page explicitly publishes manual-shift availability and 34.9 PTO hp for CT2040. HST-only engine and dimensional rows are not copied into this MST record.',
  },
  {
    slug: 'ct2535-hst-cab', name: 'CT2535 HST Cab', baseModel: 'CT2535',
    url: 'https://www.bobcat.com/na/en/equipment/tractors/compact-tractors/2000-platform-compact-tractors/ct2535', station: 'Cab',
    transmission: 'Infinite, 3 Range Hydrostatic', grossHp: 34.9, ptoHp: 29.4, engineModel: '3F-TM(H)4', displacementCi: 111, ratedRpm: 2600, cylinders: 3,
    weightLb: 3585, hitchLiftLb: 1631, travelMph: 14, reverseMph: 9.7, fuelGal: 9, totalFlowGpm: 11.4, steeringFlowGpm: 4.5, implementFlowGpm: 6.9,
    lengthIn: 120.9, widthIn: 63, heightIn: 91, groundClearanceIn: 12.3, turningRadiusFt: 8.9, wheelbaseIn: 66,
  },
  {
    slug: 'ct2540-hst-cab', name: 'CT2540 HST Cab', baseModel: 'CT2540',
    url: 'https://www.bobcat.com/na/en/equipment/tractors/compact-tractors/2000-platform-compact-tractors/ct2540', station: 'Cab',
    transmission: 'Infinite, 3 Range Hydrostatic', grossHp: 39.6, netHp: 37.6, ptoHp: 31.9, engineModel: '3F-TM(H)4', displacementCi: 111, ratedRpm: 2600, cylinders: 3,
    weightLb: 3585, hitchLiftLb: 1631, travelMph: 14, reverseMph: 9.7, fuelGal: 9, totalFlowGpm: 11.4, steeringFlowGpm: 4.5, implementFlowGpm: 6.9,
    lengthIn: 120.9, widthIn: 63, heightIn: 91, groundClearanceIn: 12.3, turningRadiusFt: 8.9, wheelbaseIn: 66,
    note: 'Current US CT2540 page distinguishes 37.6 hp in its key/engine Horsepower field from 39.6 Gross HP. Both are retained separately instead of collapsing them into one power label.',
  },
];

const definitions: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement_cubic_inches','Engine displacement','decimal','cu in',6],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',8],
  ['Engine','engine.net_power','Net / published engine horsepower','decimal','hp',9],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',10],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','drivetrain.type','Driveline','text',null,20],
  ['Transmission','transmission.max_forward_speed','Maximum forward speed','decimal','mph',30],
  ['Transmission','transmission.max_reverse_speed','Maximum reverse speed','decimal','mph',40],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Hydraulics','hydraulics.total_flow','Total hydraulic flow','decimal','US gal/min',10],
  ['Hydraulics','hydraulics.steering_flow','Steering hydraulic flow','decimal','US gal/min',20],
  ['Hydraulics','hydraulics.implement_flow','Implement hydraulic flow','decimal','US gal/min',30],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',50],
  ['Capacities','capacities.fuel_tank_gallons','Fuel tank capacity','decimal','US gal',10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.ground_clearance','Ground clearance','decimal','in',50],
  ['Dimensions & Weight','dimensions.turning_radius','Turning radius','decimal','ft',60],
  ['Dimensions & Weight','dimensions.unladen_weight','Operating weight','decimal','lb',70],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Bobcat 2000 Platform migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
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

export const bobcat2000CurrentUsMigration: DbMigration = {
  id: '20260830_360_bobcat_2000_current_us',
  description: 'Introduce Bobcat with eight current US 2000 Platform compact tractor transmission configurations',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Bobcat','bobcat') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='bobcat' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);

    let [sourceRows] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Bobcat' AND domain='bobcat.com' LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [inserted] = await c.query<ResultSetHeader>(
        `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Bobcat','bobcat.com','manufacturer','official')`,
      );
      sourceId = Number(inserted.insertId);
    }

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Bobcat 2000 Platform','bobcat-2000-platform')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='bobcat-2000-platform' LIMIT 1`, [manufacturerId]);

    await ensureSource(c, sourceId, 'bobcat-2000-platform-current-us-2026-08', PLATFORM_URL, 'Bobcat current US 2000 Platform compact tractor lineup', {
      market: 'United States', captured: '2026-08-30',
      baseModels: ['CT2025', 'CT2035', 'CT2040', 'CT2535', 'CT2540'],
      configurations: models.map((model) => model.name),
      sourcePolicy: 'Current Bobcat North America model pages are used for detailed HST/cab rows. Platform-level current data are used for manual configurations when the model detail page exposes only HST-specific detailed values.',
    });

    const definitionIds = new Map<string, number>();
    for (const row of definitions) {
      await c.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        row,
      );
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    for (const model of models) {
      const sourceRecordId = await ensureSource(c, sourceId, `bobcat-${model.slug}-current-us-2026-08`, model.url, `Bobcat US ${model.name} current specifications`, {
        market: 'United States', captured: '2026-08-30', model,
        note: model.note || null,
      });

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US Bobcat 2000 Platform tractor configuration','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.name, model.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, `${model.station}; ${model.transmission}`, sourceRecordId, model.note || `Current Bobcat US ${model.baseModel} transmission configuration.`],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string,string|number|undefined,string|null]> = [
        ['configuration.station', model.station, null], ['engine.make', 'Bobcat', null], ['engine.model', model.engineModel, null],
        ['engine.cylinders', model.cylinders, null], ['engine.displacement_cubic_inches', model.displacementCi, 'cu in'],
        ['engine.gross_power', model.grossHp, 'hp'], ['engine.net_power', model.netHp, 'hp'], ['engine.rated_speed', model.ratedRpm, 'rpm'],
        ['transmission.standard', model.transmission, null], ['drivetrain.type', '4WD', null],
        ['transmission.max_forward_speed', model.travelMph, 'mph'], ['transmission.max_reverse_speed', model.reverseMph, 'mph'],
        ['pto.rated_power', model.ptoHp, 'hp'], ['pto.rear_description', '540 rpm rear PTO', null],
        ['hydraulics.total_flow', model.totalFlowGpm, 'US gal/min'], ['hydraulics.steering_flow', model.steeringFlowGpm, 'US gal/min'], ['hydraulics.implement_flow', model.implementFlowGpm, 'US gal/min'],
        ['hitch.category', 'Category 1', null], ['hitch.lift_capacity_24in', model.hitchLiftLb, 'lb'],
        ['capacities.fuel_tank_gallons', model.fuelGal, 'US gal'],
        ['dimensions.overall_length', model.lengthIn, 'in'], ['dimensions.overall_width', model.widthIn, 'in'], ['dimensions.overall_height', model.heightIn, 'in'],
        ['dimensions.wheelbase', model.wheelbaseIn, 'in'], ['dimensions.ground_clearance', model.groundClearanceIn, 'in'], ['dimensions.turning_radius', model.turningRadiusFt, 'ft'],
        ['dimensions.unladen_weight', model.weightLb, 'lb'],
      ];
      for (const [key, value, unit] of values) {
        if (value === undefined) continue;
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing Bobcat 2000 Platform spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, sourceRecordId, value, unit);
      }
    }
  },
};
