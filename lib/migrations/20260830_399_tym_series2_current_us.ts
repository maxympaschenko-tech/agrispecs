import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  baseModel: string;
  url: string;
  engineMake: string;
  engineModel: string;
  grossHp: number;
  ratedRpm: number;
  displacementL: number;
  transmission: string;
  speeds: string;
  hitchLiftLb: number;
  rearPto: string;
  fuelL: number;
  lengthIn: number;
  widthIn: number;
  wheelbaseIn: number;
  heightIn: number;
  clearanceIn: number;
  weightLb: number;
  agTires?: string;
};

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://tym.world/en-us/products/tractors/series-2';

const models: Seed[] = [
  {
    slug: '2400r', name: '2400R', baseModel: '2400', url: 'https://tym.world/en-us/products/tractors/series-2/2400/2400r',
    engineMake: 'TYM', engineModel: 'T1100N2', grossHp: 24, ratedRpm: 2850, displacementL: 1.175,
    transmission: 'Manual', speeds: 'F6 x R2', hitchLiftLb: 1499, rearPto: '540 / 1000 rpm', fuelL: 23,
    lengthIn: 120.3, widthIn: 44.2, wheelbaseIn: 59.1, heightIn: 87.3, clearanceIn: 12.1, weightLb: 1792,
    agTires: '6-12 / 9.5-16',
  },
  {
    slug: '2400h', name: '2400H', baseModel: '2400', url: 'https://tym.world/en-us/products/tractors/series-2/2400/2400h',
    engineMake: 'TYM', engineModel: 'T1100N2', grossHp: 24, ratedRpm: 2850, displacementL: 1.175,
    transmission: 'HST', speeds: '2 ranges', hitchLiftLb: 1499, rearPto: '540 / 1000 rpm', fuelL: 23,
    lengthIn: 120.3, widthIn: 44.2, wheelbaseIn: 59.1, heightIn: 87.3, clearanceIn: 12.1, weightLb: 1829,
    agTires: '6-12 / 9.5-16',
  },
  {
    slug: '2610', name: '2610', baseModel: '2610', url: 'https://tym.world/en-us/products/tractors/series-2/2610',
    engineMake: 'TYM', engineModel: 'T1100N2', grossHp: 24, ratedRpm: 2850, displacementL: 1.175,
    transmission: 'HST', speeds: '3 ranges', hitchLiftLb: 1499, rearPto: '540 / 1000 rpm', fuelL: 23,
    lengthIn: 122.9, widthIn: 53.8, wheelbaseIn: 65.7, heightIn: 91.5, clearanceIn: 15.1, weightLb: 2106,
    agTires: '7-16 / 11.2-20',
  },
  {
    slug: 't264', name: 'T264', baseModel: 'T264', url: 'https://tym.world/en-us/products/tractors/series-2/t264',
    engineMake: 'TYM', engineModel: 'T1100N2', grossHp: 24, ratedRpm: 2800, displacementL: 1.175,
    transmission: 'HST', speeds: 'Infinite 2-range', hitchLiftLb: 1534, rearPto: '540 rpm', fuelL: 25,
    lengthIn: 107.8, widthIn: 52.8, wheelbaseIn: 58.3, heightIn: 89.8, clearanceIn: 7.7, weightLb: 1881,
  },
  {
    slug: 't2025p', name: 'T2025P', baseModel: 'T2025P', url: 'https://tym.world/en-us/products/tractors/series-2/t2025p',
    engineMake: 'Yanmar', engineModel: '3TNV80F-NXDKTFX', grossHp: 24.7, ratedRpm: 3000, displacementL: 1.267,
    transmission: 'HST', speeds: '2 ranges', hitchLiftLb: 1550, rearPto: '540 rpm', fuelL: 32,
    lengthIn: 105.11, widthIn: 56.29, wheelbaseIn: 61.02, heightIn: 85.94, clearanceIn: 10.23, weightLb: 2206.8,
  },
  {
    slug: 't25', name: 'T25', baseModel: 'T25', url: 'https://tym.world/en-us/products/tractors/series-2/t25-na',
    engineMake: 'Yanmar', engineModel: '3TNV80F', grossHp: 24.7, ratedRpm: 3000, displacementL: 1.267,
    transmission: 'HST', speeds: 'Infinite 2-range', hitchLiftLb: 1551.2, rearPto: '540 rpm', fuelL: 25,
    lengthIn: 102.8, widthIn: 50, wheelbaseIn: 61, heightIn: 91.3, clearanceIn: 10.2, weightLb: 2046,
    agTires: '6-12 / 9.5-20',
  },
];

const definitions: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,3],
  ['Engine','engine.emissions_note','Engine emissions note','text',null,5],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',8],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','transmission.speeds','Transmission speeds / ranges','text',null,20],
  ['Transmission','drivetrain.type','Driveline','text',null,30],
  ['Transmission','steering.type','Steering','text',null,40],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Hydraulics','hitch.lift_capacity','3-point hitch lift capacity','decimal','lb',50],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','L',10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length with 3-point hitch','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_height','Height to top of ROPS','decimal','in',30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.ground_clearance','Minimum ground clearance','decimal','in',50],
  ['Dimensions & Weight','dimensions.unladen_weight','Weight with ROPS','decimal','lb',70],
  ['Tires','tires.ag','R1 agricultural tires front / rear','text',null,10],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('TYM Series 2 migration dependency missing');
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

export const tymSeries2CurrentUsMigration: DbMigration = {
  id: '20260830_399_tym_series2_current_us',
  description: 'Add six current US TYM Series 2 configurations including separate 2400R and 2400H records',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='tym' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='TYM' AND domain='tym.world' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug)
       VALUES(?,?,'TYM Series 2','tym-series-2')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='tym-series-2' LIMIT 1`, [manufacturerId]);

    await ensureSource(c, sourceId, 'tym-series2-current-us-2026-08', SERIES_URL, 'TYM USA current Series 2 sub-compact tractor lineup', {
      market: 'United States',
      captured: '2026-08-30',
      currentCards: ['2400', '2610', 'T264', 'T2025P', 'T25'],
      normalizedConfigurations: models.map((m) => m.name),
      identityPolicy: 'The 2400 product has two explicitly published technical configurations, 2400R manual F6xR2 and 2400H 2-range HST, including different ROPS weights. They are stored as separate machine records rather than a blended 2400 row.',
      lifecycleNote: 'T2025P is marked NEW on the current US Series 2 page; T25 remains simultaneously listed in the current US lineup, so both are retained as current until TYM removes or supersedes one in the US catalog.',
    });

    const definitionIds = new Map<string, number>();
    for (const row of definitions) {
      await c.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        row,
      );
      definitionIds.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    for (const m of models) {
      const sourceRecordId = await ensureSource(c, sourceId, `tym-${m.slug}-current-us-2026-08`, m.url, `TYM ${m.name} current US specifications`, {
        market: 'United States',
        captured: '2026-08-30',
        baseModel: m.baseModel,
        normalization: {
          displacement: 'TYM publishes cc and cubic-inch values; cc normalized to liters.',
          fuel: 'TYM publishes US gallons and liters; liters retained.',
        },
        sourcePolicy: 'Only values explicitly present in the current US technical tables or unambiguous current model feature copy are normalized. Missing tire rows are not inferred from neighboring models.',
      });

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US TYM Series 2 sub-compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, m.name, m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,'Current TYM USA Series 2 configuration from the live US product/technical specification pages.')
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, `ROPS; ${m.transmission}; ${m.speeds}`, sourceRecordId],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string, string | number, string | null]> = [
        ['configuration.station', 'ROPS', null],
        ['engine.make', m.engineMake, null],
        ['engine.model', m.engineModel, null],
        ['engine.emissions_note', m.engineMake === 'TYM' ? 'Current TYM US feature copy describes the TYM engine as Tier 4 / eco-friendly' : 'Current TYM US product page uses a Yanmar diesel engine', null],
        ['engine.displacement', m.displacementL, 'L'],
        ['engine.gross_power', m.grossHp, 'hp'],
        ['engine.rated_speed', m.ratedRpm, 'rpm'],
        ['transmission.standard', m.transmission, null],
        ['transmission.speeds', m.speeds, null],
        ['drivetrain.type', '4WD', null],
        ['steering.type', 'Power steering', null],
        ['pto.rear_description', m.rearPto, null],
        ['hitch.lift_capacity', m.hitchLiftLb, 'lb'],
        ['capacities.fuel_tank', m.fuelL, 'L'],
        ['dimensions.overall_length', m.lengthIn, 'in'],
        ['dimensions.overall_width', m.widthIn, 'in'],
        ['dimensions.overall_height', m.heightIn, 'in'],
        ['dimensions.wheelbase', m.wheelbaseIn, 'in'],
        ['dimensions.ground_clearance', m.clearanceIn, 'in'],
        ['dimensions.unladen_weight', m.weightLb, 'lb'],
      ];
      if (m.agTires) values.push(['tires.ag', m.agTires, null]);

      for (const [key, value, unit] of values) {
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing TYM Series 2 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, sourceRecordId, value, unit);
      }
    }
  },
};
