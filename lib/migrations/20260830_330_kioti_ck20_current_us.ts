import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url?: string;
  powerHp: number;
  engineModel?: string;
  displacementL?: number;
  rpm?: number;
  transmission: string;
  ptoType?: string;
  ptoPowerHp?: number;
  pumpGpm?: number;
  hydraulicLiftLb?: number;
  hitchLiftLb?: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  wheelbaseIn?: number;
  clearanceIn?: number;
  turningRadiusFt?: number;
  weightLb?: number;
  station: 'ROPS' | 'Cab';
  note?: string;
};

const VERSION = 'united-states-current-2026-08';
const LINEUP_URL = 'https://www.kioti.com/products/tractors/ck';

const models: Seed[] = [
  {
    slug: 'ck2620', name: 'CK2620', url: 'https://www.kioti.com/products/tractors/ck/ck2620', powerHp: 24.5,
    engineModel: '3A165LWM-U4', displacementL: 1.647, transmission: 'Manual; 12 forward / 12 reverse',
    ptoType: 'Live', ptoPowerHp: 19.5, pumpGpm: 11.7, hydraulicLiftLb: 1631, hitchLiftLb: 1631,
    lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9, wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.96, weightLb: 2634, station: 'ROPS',
  },
  {
    slug: 'ck2620h', name: 'CK2620H', url: 'https://www.kioti.com/products/tractors/ck/ck2620h', powerHp: 24.5,
    engineModel: '3A165LWM-U4', displacementL: 1.647, transmission: 'Hydrostatic; 3 ranges with infinite speeds',
    ptoType: 'Live', ptoPowerHp: 18.7, pumpGpm: 11.7, hydraulicLiftLb: 1631, hitchLiftLb: 1500,
    widthIn: 54.5, heightIn: 92.9, wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.96, weightLb: 2689, station: 'ROPS',
    note: 'The current US page separately labels hydraulic lift capacity as 1,631 lb and hitch lift capacity as 1,500 lb; both are preserved as separate fields.',
  },
  {
    slug: 'ck2620seh-cab', name: 'CK2620SEH Cab', url: 'https://www.kioti.com/products/tractors/ck/ck2620seh-cab', powerHp: 24.5,
    engineModel: '3A165LWH-U1', displacementL: 1.647, rpm: 2600, transmission: 'Hydrostatic; 3 ranges with infinite speeds',
    ptoType: 'Independent', ptoPowerHp: 18.7, pumpGpm: 11.3, hydraulicLiftLb: 1631, hitchLiftLb: 1631,
    lengthIn: 120.9, widthIn: 54.5, heightIn: 92.52, wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.96, weightLb: 3397, station: 'Cab',
  },
  {
    slug: 'ck3520', name: 'CK3520', url: 'https://www.kioti.com/products/tractors/ck/ck3520', powerHp: 34.9,
    engineModel: '3H-TM4A', displacementL: 1.826, rpm: 2600, transmission: 'Manual; 12 forward / 12 reverse',
    ptoType: 'Live', ptoPowerHp: 30.9, pumpGpm: 11.7, hydraulicLiftLb: 1631, hitchLiftLb: 1631,
    lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9, wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.96, weightLb: 2678, station: 'ROPS',
  },
  {
    slug: 'ck3520h', name: 'CK3520H', url: 'https://www.kioti.com/products/tractors/ck/ck3520h', powerHp: 34.9,
    engineModel: '3H-TM4A', displacementL: 1.826, rpm: 2600, transmission: 'Hydrostatic; 3 ranges with infinite speeds',
    ptoType: 'Live', ptoPowerHp: 28.9, pumpGpm: 11.7, hydraulicLiftLb: 1631, hitchLiftLb: 1631,
    lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9, wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.96, weightLb: 2734, station: 'ROPS',
  },
  {
    slug: 'ck3520se', name: 'CK3520SE', url: 'https://www.kioti.com/products/tractors/ck/ck3520se', powerHp: 34.9,
    engineModel: '3H-TM4B', displacementL: 1.826, rpm: 2600, transmission: 'Manual synchro shuttle; 12 forward / 12 reverse',
    ptoType: 'Independent', ptoPowerHp: 30.9, pumpGpm: 11.3, hydraulicLiftLb: 1631, hitchLiftLb: 1631,
    lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9, wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.96, weightLb: 2906, station: 'ROPS',
  },
  {
    slug: 'ck3520seh', name: 'CK3520SEH', url: 'https://www.kioti.com/products/tractors/ck/ck3520seh', powerHp: 34.9,
    engineModel: '3H-TM4B', displacementL: 1.826, rpm: 2600, transmission: 'Hydrostatic; 3 ranges with infinite speeds',
    ptoType: 'Independent', ptoPowerHp: 30.9, pumpGpm: 11.3, hydraulicLiftLb: 1631, hitchLiftLb: 1500,
    lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9, wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.96, weightLb: 2921, station: 'ROPS',
    note: 'The current US page separately labels hydraulic lift capacity as 1,631 lb and hitch lift capacity as 1,500 lb; both are preserved as separate fields.',
  },
  {
    slug: 'ck3520seh-cab', name: 'CK3520SEH Cab', url: 'https://www.kioti.com/products/tractors/ck/ck3520seh-cab', powerHp: 34.9,
    engineModel: '3H-TM4B', displacementL: 1.826, rpm: 2600, transmission: 'Hydrostatic; 3 ranges with infinite speeds',
    ptoType: 'Independent', ptoPowerHp: 28.9, pumpGpm: 11.3, hydraulicLiftLb: 1631, hitchLiftLb: 1631,
    lengthIn: 120.9, widthIn: 54.5, heightIn: 92.52, wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.96, weightLb: 3397, station: 'Cab',
  },
  {
    slug: 'ck4020', name: 'CK4020', url: 'https://www.kioti.com/products/tractors/ck/ck4020', powerHp: 39.6,
    engineModel: '3H-TM4A', displacementL: 1.826, rpm: 2600, transmission: 'Manual; 12 forward / 12 reverse',
    ptoType: 'Live', ptoPowerHp: 34.8, pumpGpm: 11.7, hydraulicLiftLb: 1631, hitchLiftLb: 1631,
    lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9, wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.96, weightLb: 2679, station: 'ROPS',
  },
  {
    slug: 'ck4020h', name: 'CK4020H', url: 'https://www.kioti.com/products/tractors/ck/ck4020h', powerHp: 39.6,
    engineModel: '3H-TM4A', displacementL: 1.826, rpm: 2600, transmission: 'Hydrostatic; 3 ranges with infinite speeds',
    ptoType: 'Live', ptoPowerHp: 33.3, pumpGpm: 11.7, hydraulicLiftLb: 1631, hitchLiftLb: 1631,
    lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9, wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.96, weightLb: 2734, station: 'ROPS',
  },
  {
    slug: 'ck4020se', name: 'CK4020SE', url: 'https://www.kioti.com/products/tractors/ck/ck4020se', powerHp: 39.6,
    engineModel: '3H-TM4B', displacementL: 1.826, rpm: 2600, transmission: 'Manual synchro shuttle; 12 forward / 12 reverse',
    ptoType: 'Independent', ptoPowerHp: 34.8, pumpGpm: 11.3, hydraulicLiftLb: 1631, hitchLiftLb: 1500,
    widthIn: 54.5, heightIn: 92.9, wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.96, weightLb: 2906, station: 'ROPS',
    note: 'The current US page separately labels hydraulic lift capacity as 1,631 lb and hitch lift capacity as 1,500 lb; both are preserved as separate fields.',
  },
  {
    slug: 'ck4020seh', name: 'CK4020SEH', url: 'https://www.kioti.com/products/tractors/ck/ck4020seh', powerHp: 39.6,
    engineModel: '3H-TM4B', displacementL: 1.826, rpm: 2600, transmission: 'Hydrostatic; 3 ranges with infinite speeds',
    ptoType: 'Independent', ptoPowerHp: 30.9, pumpGpm: 11.3, hydraulicLiftLb: 1631, hitchLiftLb: 1500,
    lengthIn: 120.9, widthIn: 54.5, heightIn: 92.9, wheelbaseIn: 65.7, clearanceIn: 13.4, turningRadiusFt: 8.96, weightLb: 2921, station: 'ROPS',
    note: 'The current US page separately labels hydraulic lift capacity as 1,631 lb and hitch lift capacity as 1,500 lb; both are preserved as separate fields.',
  },
  {
    slug: 'ck4020seh-cab', name: 'CK4020SEH Cab', powerHp: 39.6, transmission: 'Hydrostatic', station: 'Cab',
    note: 'Current US CK lineup confirms this configuration at 39.6 hp and 9 gal fuel capacity. Detailed values are intentionally omitted because a current US model-specific detail page was not confirmed.',
  },
];

const definitions: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.station', 'Operator station', 'text', null, 1],
  ['Engine', 'engine.model', 'Engine model', 'text', null, 1],
  ['Engine', 'engine.make', 'Engine manufacturer', 'text', null, 2],
  ['Engine', 'engine.power', 'Engine power', 'decimal', 'hp', 4],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 6],
  ['Engine', 'engine.power_speed', 'Engine speed at published power', 'integer', 'rpm', 8],
  ['Transmission', 'transmission.options', 'Transmission', 'text', null, 10],
  ['PTO', 'pto.type', 'PTO type', 'text', null, 5],
  ['PTO', 'pto.power', 'PTO power', 'decimal', 'hp', 10],
  ['PTO', 'pto.speeds', 'PTO speeds', 'text', null, 20],
  ['Hydraulics', 'hydraulics.main_pump_flow', 'Hydraulic pump capacity', 'decimal', 'US gal/min', 10],
  ['Hydraulics', 'hydraulics.lift_capacity', 'Hydraulics lift capacity', 'decimal', 'lb', 20],
  ['Hydraulics', 'hitch.rear_max_lift_capacity', 'Hitch lift capacity', 'decimal', 'lb', 25],
  ['Capacities', 'capacities.fuel_tank', 'Fuel tank capacity', 'decimal', 'L', 10],
  ['Dimensions & Weight', 'dimensions.overall_length', 'Length with hitch', 'decimal', 'in', 10],
  ['Dimensions & Weight', 'dimensions.overall_width', 'Overall width', 'decimal', 'in', 20],
  ['Dimensions & Weight', 'dimensions.overall_height', 'Overall height', 'decimal', 'in', 30],
  ['Dimensions & Weight', 'dimensions.wheelbase', 'Wheelbase', 'decimal', 'in', 40],
  ['Dimensions & Weight', 'dimensions.ground_clearance', 'Ground clearance', 'decimal', 'in', 50],
  ['Dimensions & Weight', 'dimensions.turning_radius', 'Turning radius', 'decimal', 'ft', 60],
  ['Dimensions & Weight', 'dimensions.unladen_weight', 'Tractor weight', 'decimal', 'lb', 70],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('KIOTI CK20 migration dependency missing');
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

export const kiotiCk20CurrentUsMigration: DbMigration = {
  id: '20260830_330_kioti_ck20_current_us',
  description: 'Introduce KIOTI with current US CK20 compact tractor configurations and model-specific official specifications',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('KIOTI','kioti') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    let [sourceRows] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='KIOTI' AND domain='kioti.com' LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [inserted] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('KIOTI','kioti.com','manufacturer','official')`);
      sourceId = Number(inserted.insertId);
    }

    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='kioti' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'KIOTI CK20 Family','kioti-ck20')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='kioti-ck20' LIMIT 1`, [manufacturerId]);

    const lineupSource = await ensureSource(
      c, sourceId, 'kioti-ck20-current-us-lineup-2026-08', LINEUP_URL, 'KIOTI US CK current tractor lineup',
      { market: 'United States', captured: '2026-08-30', models: models.map((model) => model.name), note: 'This migration seeds the CK20 family only; newer CK40-family configurations remain separate future work.' },
    );

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
      const modelSource = model.url
        ? await ensureSource(c, sourceId, `kioti-${model.slug}-current-us-2026-08`, model.url, `KIOTI US ${model.name} current specifications`, { market: 'United States', captured: '2026-08-30', model, note: model.note || null })
        : lineupSource;

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US KIOTI CK compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.name, model.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, model.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, `${model.name} ${model.transmission}`, modelSource, model.note || 'Current KIOTI US model-specific specification record.'],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string, string | number | undefined, string | null]> = [
        ['configuration.station', model.station, null],
        ['engine.model', model.engineModel, null],
        ['engine.make', model.engineModel ? 'KIOTI' : undefined, null],
        ['engine.power', model.powerHp, 'hp'],
        ['engine.displacement', model.displacementL, 'L'],
        ['engine.power_speed', model.rpm, 'rpm'],
        ['transmission.options', model.transmission, null],
        ['pto.type', model.ptoType, null],
        ['pto.power', model.ptoPowerHp, 'hp'],
        ['pto.speeds', model.ptoType ? 'Rear 540 rpm; mid 2,000 rpm optional' : undefined, null],
        ['hydraulics.main_pump_flow', model.pumpGpm, 'US gal/min'],
        ['hydraulics.lift_capacity', model.hydraulicLiftLb, 'lb'],
        ['hitch.rear_max_lift_capacity', model.hitchLiftLb, 'lb'],
        ['capacities.fuel_tank', 34, 'L'],
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
        if (!definitionId) throw new Error(`Missing KIOTI CK20 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, modelSource, value, unit);
      }
    }
  },
};
