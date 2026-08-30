import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  baseModel: string;
  url: string;
  source: 'model' | 'platform';
  station: 'ROPS' | 'Cab';
  transmission: string;
  powerHp?: number;
  grossHp?: number;
  ptoHp: number;
  engineModel?: string;
  displacementL?: number;
  ratedRpm?: number;
  cylinders?: number;
  weightLb: number;
  hitchLiftLb: number;
  travelMph?: number;
  reverseMph?: number;
  fuelL?: number;
  totalFlowGpm?: number;
  steeringFlowGpm?: number;
  implementFlowGpm?: number;
  rearPto?: string;
  midPto?: string;
  widthIn?: number;
  groundClearanceIn?: number;
  turningRadiusFt?: number;
  wheelbaseIn?: number;
  note?: string;
};

const VERSION = 'united-states-current-2026-08';
const PLATFORM_URL = 'https://www.bobcat.com/na/en/equipment/tractors/compact-tractors/4000-platform-compact-tractors';

const models: Seed[] = [
  {
    slug: 'ct4045-hst', name: 'CT4045 HST', baseModel: 'CT4045', source: 'model', station: 'ROPS',
    url: `${PLATFORM_URL}/ct4045`, transmission: '3-Range HST', grossHp: 44.9, ptoHp: 32.8,
    engineModel: '3FT-TL4', displacementL: 1.819, ratedRpm: 2750, cylinders: 3,
    weightLb: 3745, hitchLiftLb: 2716, travelMph: 18.5, reverseMph: 12.9, fuelL: 48.1,
    totalFlowGpm: 16.5, steeringFlowGpm: 6.9, implementFlowGpm: 9.6,
    rearPto: '540 rpm', midPto: '2,119 rpm', widthIn: 69.8, groundClearanceIn: 15.3, turningRadiusFt: 8.6, wheelbaseIn: 71.2,
  },
  {
    slug: 'ct4045-sst', name: 'CT4045 SST', baseModel: 'CT4045', source: 'platform', station: 'ROPS',
    url: PLATFORM_URL, transmission: 'Manual synchro shuttle (8F / 8R)', powerHp: 44.9, ptoHp: 41.6,
    weightLb: 3745, hitchLiftLb: 2716,
    note: 'Current US 4000 Platform page explicitly publishes CT4045 manual synchro shuttle availability and 41.6 PTO hp. The current model detail table exposes HST-specific technical rows, so HST-only engine, hydraulic and dimensional values are intentionally not copied into the SST record.',
  },
  {
    slug: 'ct4050-sst', name: 'CT4050 SST', baseModel: 'CT4050', source: 'model', station: 'ROPS',
    url: `${PLATFORM_URL}/ct4050`, transmission: 'Manual 8x8 synchro', powerHp: 50.3, ptoHp: 45.6,
    weightLb: 3745, hitchLiftLb: 2716, travelMph: 17.5, reverseMph: 17, fuelL: 45.0,
    totalFlowGpm: 14.1, steeringFlowGpm: 4.5, implementFlowGpm: 9.6,
    rearPto: '540 rpm', widthIn: 70.3, groundClearanceIn: 15.3, turningRadiusFt: 8.6, wheelbaseIn: 71.2,
    note: 'Current US CT4050 detail page currently exposes the manual 8x8 synchro configuration and does not publish an engine-model/displacement block for that selected configuration. Missing engine rows are not inferred.',
  },
  {
    slug: 'ct4050-hst', name: 'CT4050 HST', baseModel: 'CT4050', source: 'platform', station: 'ROPS',
    url: PLATFORM_URL, transmission: '3-Range HST', powerHp: 50.3, ptoHp: 39.3,
    weightLb: 3745, hitchLiftLb: 2716,
    note: 'Current US 4000 Platform page explicitly publishes CT4050 hydrostatic availability and 39.3 PTO hp. The current model detail table presently exposes the manual configuration, so manual-only technical rows are intentionally not copied into the HST record.',
  },
  {
    slug: 'ct4058-hst', name: 'CT4058 HST', baseModel: 'CT4058', source: 'model', station: 'ROPS',
    url: `${PLATFORM_URL}/ct4058`, transmission: '3-Range HST', grossHp: 57.7, ptoHp: 45.1,
    engineModel: '3FT-THL4-U', displacementL: 1.819, ratedRpm: 2750, cylinders: 3,
    weightLb: 3745, hitchLiftLb: 2716, travelMph: 18.5, reverseMph: 12.5, fuelL: 45.0,
    totalFlowGpm: 16.5, steeringFlowGpm: 6.9, implementFlowGpm: 9.6,
    rearPto: '540 rpm', midPto: '2,119 rpm', widthIn: 69.8, groundClearanceIn: 15.3, turningRadiusFt: 8.6, wheelbaseIn: 71.2,
    note: 'Bobcat also lists CT4058 on a generic non-current index, but the direct US CT4058 page is active with current pricing and the current 4000 Platform page includes CT4058 in the live lineup. The direct current product and platform pages are treated as the stronger current-market evidence.',
  },
  {
    slug: 'ct4545-hst-cab', name: 'CT4545 HST Cab', baseModel: 'CT4545', source: 'model', station: 'Cab',
    url: `${PLATFORM_URL}/ct4545`, transmission: '3-Range HST', grossHp: 44.9, ptoHp: 32.8,
    engineModel: '3HT-TM4B', displacementL: 1.819, ratedRpm: 2750, cylinders: 3,
    weightLb: 4300, hitchLiftLb: 2716, travelMph: 16.3, reverseMph: 15.9, fuelL: 45.0,
    totalFlowGpm: 16.5, steeringFlowGpm: 6.9, implementFlowGpm: 9.6,
    rearPto: '540 rpm', midPto: '2,119 rpm', widthIn: 70.3, groundClearanceIn: 15.3, turningRadiusFt: 8.58, wheelbaseIn: 71,
  },
  {
    slug: 'ct4558-hst-cab', name: 'CT4558 HST Cab', baseModel: 'CT4558', source: 'model', station: 'Cab',
    url: `${PLATFORM_URL}/ct4558`, transmission: '3-Range HST', grossHp: 57.7, ptoHp: 45.1,
    engineModel: '3HT-TH4C', displacementL: 1.819, ratedRpm: 2750, cylinders: 3,
    weightLb: 4300, hitchLiftLb: 2716, travelMph: 18, reverseMph: 12.6, fuelL: 45.0,
    totalFlowGpm: 16.5, steeringFlowGpm: 6.9, implementFlowGpm: 9.6,
    rearPto: '540 rpm', midPto: '2,119 rpm', widthIn: 70.3, groundClearanceIn: 15.3, turningRadiusFt: 8.58, wheelbaseIn: 71,
  },
];

const definitions: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
  ['Engine','engine.power','Published engine power','decimal','hp',7],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',8],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','drivetrain.type','Driveline','text',null,20],
  ['Transmission','transmission.max_forward_speed','Maximum forward speed','decimal','mph',30],
  ['Transmission','transmission.max_reverse_speed','Maximum reverse speed','decimal','mph',40],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['PTO','pto.mid_description','Mid PTO','text',null,30],
  ['Hydraulics','hydraulics.total_flow','Total hydraulic flow','decimal','gpm',5],
  ['Hydraulics','hydraulics.power_steering_pump_capacity','Power-steering pump capacity','decimal','gpm',10],
  ['Hydraulics','hydraulics.main_pump_capacity','Implement hydraulic pump capacity','decimal','gpm',20],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',50],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','L',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.ground_clearance','Ground clearance','decimal','in',50],
  ['Dimensions & Weight','dimensions.turning_radius','Turning radius','decimal','ft',60],
  ['Dimensions & Weight','dimensions.unladen_weight','Operating weight','decimal','lb',70],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Bobcat 4000 Platform migration dependency missing');
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

export const bobcat4000CurrentUsMigration: DbMigration = {
  id: '20260830_361_bobcat_4000_current_us',
  description: 'Add seven current US Bobcat 4000 Platform compact tractor configurations',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='bobcat' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Bobcat' AND domain='bobcat.com' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Bobcat 4000 Platform','bobcat-4000-platform')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='bobcat-4000-platform' LIMIT 1`, [manufacturerId]);

    const platformSourceId = await ensureSource(c, sourceId, 'bobcat-4000-platform-current-us-2026-08', PLATFORM_URL, 'Bobcat current US 4000 Platform compact tractor lineup', {
      market: 'United States', captured: '2026-08-30',
      configurations: models.map((m) => m.name),
      excluded: ['CT4055 - explicitly marked Non-Current Model by Bobcat and replaced by current CT4050'],
      notes: 'Current platform page confirms CT4045 and CT4050 manual/HST options, CT4058 HST, CT4545 cab HST and CT4558 cab HST. Direct model pages are used where they expose the selected configuration-specific table.',
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

    const modelSourceIds = new Map<string, number>();
    for (const m of models) {
      let sourceRecordId = platformSourceId;
      if (m.source === 'model') {
        const sourceKey = `bobcat-${m.baseModel.toLowerCase()}-current-us-2026-08`;
        sourceRecordId = modelSourceIds.get(sourceKey) || 0;
        if (!sourceRecordId) {
          sourceRecordId = await ensureSource(c, sourceId, sourceKey, m.url, `Bobcat ${m.baseModel} current US specifications`, {
            market: 'United States', captured: '2026-08-30', baseModel: m.baseModel,
            notes: 'Current Bobcat North America model-specific specification table. Source cubic-inch displacement and US-gallon fuel values are normalized to liters; source turning-radius inches are converted to feet where applicable.',
          });
          modelSourceIds.set(sourceKey, sourceRecordId);
        }
      }

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US Bobcat 4000 Platform compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, m.name, m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, `${m.station}; ${m.transmission}`, sourceRecordId, m.note || 'Current Bobcat North America 4000 Platform specification record.'],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string,string|number|undefined,string|null]> = [
        ['configuration.station',m.station,null], ['engine.model',m.engineModel,null], ['engine.cylinders',m.cylinders,null],
        ['engine.displacement',m.displacementL,'L'], ['engine.power',m.powerHp,'hp'], ['engine.gross_power',m.grossHp,'hp'], ['engine.rated_speed',m.ratedRpm,'rpm'],
        ['transmission.standard',m.transmission,null], ['drivetrain.type','4WD',null],
        ['transmission.max_forward_speed',m.travelMph,'mph'], ['transmission.max_reverse_speed',m.reverseMph,'mph'],
        ['pto.rated_power',m.ptoHp,'hp'], ['pto.rear_description',m.rearPto,null], ['pto.mid_description',m.midPto,null],
        ['hydraulics.total_flow',m.totalFlowGpm,'gpm'], ['hydraulics.power_steering_pump_capacity',m.steeringFlowGpm,'gpm'], ['hydraulics.main_pump_capacity',m.implementFlowGpm,'gpm'],
        ['hitch.category','Category 1',null], ['hitch.lift_capacity_24in',m.hitchLiftLb,'lb'], ['capacities.fuel_tank',m.fuelL,'L'],
        ['dimensions.overall_width',m.widthIn,'in'], ['dimensions.wheelbase',m.wheelbaseIn,'in'], ['dimensions.ground_clearance',m.groundClearanceIn,'in'],
        ['dimensions.turning_radius',m.turningRadiusFt,'ft'], ['dimensions.unladen_weight',m.weightLb,'lb'],
      ];
      for (const [key, value, unit] of values) {
        if (value === undefined) continue;
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing Bobcat 4000 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, sourceRecordId, value, unit);
      }
    }
  },
};
