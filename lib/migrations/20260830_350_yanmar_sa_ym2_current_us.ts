import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  series: 'SA' | 'YM2';
  grossHp: number;
  ratedRpm?: number;
  engineModel?: string;
  displacementL?: number;
  cylinders?: number;
  aspiration?: string;
  transmission: string;
  driveline: string;
  ptoPowerHp?: number;
  ptoType?: string;
  rearPto?: string;
  midPto?: string;
  steeringPumpGpm?: number;
  implementPumpGpm?: number;
  hitchCategory?: string;
  hitchLift24Lb?: number;
  fuelL?: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  wheelbaseIn?: number;
  clearanceIn?: number;
  weightLb?: number;
  battery?: string;
  alternator?: string;
  note?: string;
};

const VERSION = 'united-states-current-2026-08';
const LINEUP_URL = 'https://www.yanmartractor.com/products/tractors/';
const SA_BROCHURE_URL = 'https://www.yanmartractor.com/webres/File/YT22-234-YMR%20SA-Series_brochure_No%20Remote-111422%20web.pdf';
const YM2_SHEET_URL = 'https://www.yanmartractor.com/webres/File/tractors/YM/2025%20YAN_YM2%20Sale%20Sheet%20update.pdf';

const models: Seed[] = [
  {
    slug: 'sa223', name: 'SA223', url: 'https://www.yanmartractor.com/products/tractors/sa-series/sa223/', series: 'SA',
    grossHp: 21.5, ratedRpm: 3200, engineModel: '3TNM74F', displacementL: 0.993, cylinders: 3, aspiration: 'Naturally aspirated',
    transmission: 'Hydrostatic transmission', driveline: 'Selectable 2WD / 4WD', ptoPowerHp: 15.6,
    ptoType: 'Independent mid and rear PTO', rearPto: '554 rpm at 3,200 engine rpm', midPto: '2,057 rpm at 3,200 engine rpm',
    steeringPumpGpm: 3.7, implementPumpGpm: 4.3, hitchCategory: 'Limited Category 1', hitchLift24Lb: 660,
    fuelL: 23, lengthIn: 102.1, widthIn: 47.3, heightIn: 82.3, wheelbaseIn: 57.9, clearanceIn: 6.4, weightLb: 1537,
    battery: '540 CCA', alternator: '40 A',
  },
  {
    slug: 'sa223-kuro', name: 'SA223 KURO', url: 'https://www.yanmartractor.com/products/tractors/sa-series/sa223-kuro/', series: 'SA',
    grossHp: 21.5, ratedRpm: 3200, cylinders: 3,
    transmission: 'Hydrostatic transmission', driveline: 'Selectable drive', ptoPowerHp: 15.6,
    ptoType: 'Hydraulic clutch', rearPto: '540 rpm', hitchCategory: 'Limited Category 1', fuelL: 23,
    clearanceIn: 6.4, weightLb: 1537,
    note: 'Current SA223 KURO page is used for the special-edition record. Dimensions and deeper SA223 brochure fields are not copied where the KURO page does not publish them, because its hybrid tire package can change geometry.',
  },
  {
    slug: 'sa325', name: 'SA325', url: 'https://www.yanmartractor.com/products/tractors/sa-series/sa325/', series: 'SA',
    grossHp: 23.9, ratedRpm: 3200, engineModel: '3TNV80F', displacementL: 1.266, cylinders: 3, aspiration: 'Naturally aspirated',
    transmission: 'Hydrostatic transmission, dual range speeds', driveline: 'Selectable 2WD / 4WD', ptoPowerHp: 18.1,
    ptoType: 'Independent mid and rear PTO', rearPto: '554 rpm at 3,200 engine rpm', midPto: '2,057 rpm at 3,200 engine rpm',
    steeringPumpGpm: 3.7, implementPumpGpm: 4.3, hitchCategory: 'Limited Category 1', hitchLift24Lb: 1209,
    fuelL: 23, lengthIn: 105.8, widthIn: 54.6, heightIn: 85.8, wheelbaseIn: 63, clearanceIn: 8.5, weightLb: 1715,
    battery: '540 CCA', alternator: '40 A',
  },
  {
    slug: 'sa425', name: 'SA425', url: 'https://www.yanmartractor.com/products/tractors/sa-series/sa425/', series: 'SA',
    grossHp: 23.9, ratedRpm: 3200, engineModel: '3TNV80F', displacementL: 1.266, cylinders: 3, aspiration: 'Naturally aspirated',
    transmission: 'Hydrostatic transmission, dual range speeds', driveline: 'Selectable 2WD / 4WD', ptoPowerHp: 18.1,
    ptoType: 'Independent mid and rear PTO', rearPto: '554 rpm at 3,200 engine rpm', midPto: '2,057 rpm at 3,200 engine rpm',
    steeringPumpGpm: 3.7, implementPumpGpm: 4.3, hitchCategory: 'Limited Category 1', hitchLift24Lb: 1209,
    fuelL: 23, lengthIn: 105.8, widthIn: 54.1, heightIn: 87.2, wheelbaseIn: 63, clearanceIn: 9.9, weightLb: 1830,
    battery: '540 CCA', alternator: '40 A',
  },
  {
    slug: 'sa425dhx', name: 'SA425DHX', url: 'https://www.yanmartractor.com/products/tractors/sa-series/sa425dhx/', series: 'SA',
    grossHp: 23.9, ratedRpm: 3200, engineModel: '3TNV80F', displacementL: 1.266, cylinders: 3, aspiration: 'Naturally aspirated',
    transmission: 'Hydrostatic transmission, dual range speeds', driveline: 'Selectable 2WD / 4WD', ptoPowerHp: 18.1,
    ptoType: 'Independent mid and rear PTO', rearPto: '554 rpm at 3,200 engine rpm', midPto: '2,057 rpm at 3,200 engine rpm',
    steeringPumpGpm: 3.7, implementPumpGpm: 4.3, hitchCategory: 'Limited Category 1', hitchLift24Lb: 1209,
    fuelL: 23, lengthIn: 105.8, widthIn: 54.1, heightIn: 87.2, wheelbaseIn: 63, clearanceIn: 9.9, weightLb: 1830,
    battery: '540 CCA', alternator: '40 A',
    note: 'Current model page confirms the SA425DHX configuration; current-linked SA Series brochure publishes the SA425/425DHX shared technical column.',
  },
  {
    slug: 'ym225', name: 'YM225', url: 'https://www.yanmartractor.com/products/tractors/ym2-series/ym225/', series: 'YM2',
    grossHp: 24.4, ratedRpm: 2400, transmission: 'Synchronized Reverser Transmission (SRT), 8F / 8R', driveline: 'Selectable 2WD / 4WD',
    ptoPowerHp: 18.5, ptoType: 'Transmission driven with overrunning clutch', rearPto: '540 rpm at 2,360 engine rpm',
    steeringPumpGpm: 3.8, implementPumpGpm: 6.2, hitchCategory: 'Category 1', hitchLift24Lb: 1609,
    fuelL: 40, clearanceIn: 10.6, weightLb: 2800,
  },
  {
    slug: 'ym232', name: 'YM232', url: 'https://www.yanmartractor.com/products/tractors/ym2-series/ym232/', series: 'YM2',
    grossHp: 31.8, ratedRpm: 2600, transmission: 'Synchronized Reverser Transmission (SRT), 8F / 8R', driveline: 'Selectable 2WD / 4WD',
    ptoPowerHp: 25.5, ptoType: 'Transmission driven with overrunning clutch', rearPto: '540 rpm at 2,360 engine rpm',
    steeringPumpGpm: 4.1, implementPumpGpm: 6.8, hitchCategory: 'Category 1', hitchLift24Lb: 1609,
    fuelL: 40, clearanceIn: 10.6, weightLb: 2866,
  },
  {
    slug: 'ym238', name: 'YM238', url: 'https://www.yanmartractor.com/products/tractors/ym2-series/ym238/', series: 'YM2',
    grossHp: 38.2, ratedRpm: 2600, transmission: 'Synchronized Reverser Transmission (SRT), 8F / 8R', driveline: 'Selectable 2WD / 4WD',
    ptoPowerHp: 31.9, ptoType: 'Transmission driven with overrunning clutch', rearPto: '540 rpm at 2,360 engine rpm',
    steeringPumpGpm: 4.1, implementPumpGpm: 6.8, hitchCategory: 'Category 1', hitchLift24Lb: 1609,
    fuelL: 40, clearanceIn: 10.6, weightLb: 2866,
    note: 'The current YM238 web comparison card incorrectly shows 18.5 PTO hp, matching YM225. Yanmar America’s current-linked 2025 YM2 specification/sales sheet publishes model-specific PTO power of 31.9 hp, which is retained as the more detailed current first-party value.',
  },
];

const definitions: Array<[string,string,string,string,string|null,number]> = [
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',8],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Engine','engine.aspiration','Aspiration','text',null,10],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','drivetrain.type','Driveline','text',null,20],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.type','PTO type','text',null,15],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['PTO','pto.mid_description','Mid PTO','text',null,30],
  ['Hydraulics','hydraulics.power_steering_pump_capacity','Power-steering pump capacity','decimal','gpm',10],
  ['Hydraulics','hydraulics.main_pump_capacity','Implement hydraulic pump capacity','decimal','gpm',20],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Hydraulics','hitch.lift_capacity_24in','3-point lift capacity at 24 in. behind lift point','decimal','lb',50],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','L',10],
  ['Electrical','electrical.battery_system','Battery','text',null,10],
  ['Electrical','electrical.alternator','Alternator','text',null,20],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.ground_clearance','Ground clearance','decimal','in',50],
  ['Dimensions & Weight','dimensions.unladen_weight','Tractor weight','decimal','lb',70],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Yanmar SA/YM2 migration dependency missing');
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

export const yanmarSaYm2CurrentUsMigration: DbMigration = {
  id: '20260830_350_yanmar_sa_ym2_current_us',
  description: 'Introduce Yanmar with eight current US SA and YM2 compact tractors from official Yanmar America current pages and current-linked specification sheets',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Yanmar','yanmar') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='yanmar' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);

    let [sourceRows] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Yanmar' AND domain='yanmartractor.com' LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [inserted] = await c.query<ResultSetHeader>(
        `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Yanmar','yanmartractor.com','manufacturer','official')`,
      );
      sourceId = Number(inserted.insertId);
    }

    await ensureSource(c, sourceId, 'yanmar-current-us-tractor-lineup-2026-08', LINEUP_URL, 'Yanmar America current tractor lineup', {
      market: 'United States', captured: '2026-08-30', models: models.map((m) => m.name),
    });
    const saDeepSourceId = await ensureSource(c, sourceId, 'yanmar-sa-current-linked-specs-2026-08', SA_BROCHURE_URL, 'Yanmar America SA Series current-linked specification brochure', {
      market: 'United States', captured: '2026-08-30',
      sourcePolicy: 'Current individual SA model pages confirm the live models and featured values; Yanmar America’s currently linked SA specification brochure supplies deeper engine, hydraulic, hitch and dimensional rows.',
    });
    const ym2DeepSourceId = await ensureSource(c, sourceId, 'yanmar-ym2-2025-current-spec-sheet-2026-08', YM2_SHEET_URL, 'Yanmar America 2025 YM2 specification/sales sheet', {
      market: 'United States', captured: '2026-08-30',
      sourcePolicy: 'The detailed 2025 Yanmar America YM2 specification sheet is preferred over a conflicting summary card for model-specific PTO power.',
      discrepancy: 'YM238 web card shows 18.5 PTO hp; the detailed 2025 sheet shows 31.9 PTO hp.',
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

    const seriesDefs = [
      { slug: 'yanmar-sa', name: 'Yanmar SA Series', series: 'SA' as const },
      { slug: 'yanmar-ym2', name: 'Yanmar YM2 Series', series: 'YM2' as const },
    ];
    for (const s of seriesDefs) {
      await c.query(
        `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [manufacturerId, equipmentTypeId, s.name, s.slug],
      );
    }

    for (const m of models) {
      const seriesSlug = m.series === 'SA' ? 'yanmar-sa' : 'yanmar-ym2';
      const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, seriesSlug]);
      const modelSourceId = await ensureSource(c, sourceId, `yanmar-${m.slug}-current-us-2026-08`, m.url, `Yanmar America ${m.name} current product page`, {
        market: 'United States', captured: '2026-08-30', model: m,
        note: m.note || null,
      });
      const deepSourceId = m.series === 'SA' && m.slug !== 'sa223-kuro' ? saDeepSourceId : m.series === 'YM2' ? ym2DeepSourceId : modelSourceId;

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US Yanmar tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, m.name, m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, m.transmission, modelSourceId, m.note || 'Current Yanmar America model record; deeper technical rows use a current-linked official specification sheet where available.'],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string,string|number|undefined,string|null]> = [
        ['engine.make','Yanmar',null], ['engine.model',m.engineModel,null], ['engine.cylinders',m.cylinders,null],
        ['engine.displacement',m.displacementL,'L'], ['engine.gross_power',m.grossHp,'hp'], ['engine.rated_speed',m.ratedRpm,'rpm'], ['engine.aspiration',m.aspiration,null],
        ['transmission.standard',m.transmission,null], ['drivetrain.type',m.driveline,null],
        ['pto.rated_power',m.ptoPowerHp,'hp'], ['pto.type',m.ptoType,null], ['pto.rear_description',m.rearPto,null], ['pto.mid_description',m.midPto,null],
        ['hydraulics.power_steering_pump_capacity',m.steeringPumpGpm,'gpm'], ['hydraulics.main_pump_capacity',m.implementPumpGpm,'gpm'],
        ['hitch.category',m.hitchCategory,null], ['hitch.lift_capacity_24in',m.hitchLift24Lb,'lb'],
        ['capacities.fuel_tank',m.fuelL,'L'], ['electrical.battery_system',m.battery,null], ['electrical.alternator',m.alternator,null],
        ['dimensions.overall_length',m.lengthIn,'in'], ['dimensions.overall_width',m.widthIn,'in'], ['dimensions.overall_height',m.heightIn,'in'],
        ['dimensions.wheelbase',m.wheelbaseIn,'in'], ['dimensions.ground_clearance',m.clearanceIn,'in'], ['dimensions.unladen_weight',m.weightLb,'lb'],
      ];
      for (const [key, value, unit] of values) {
        if (value === undefined) continue;
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing Yanmar spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, deepSourceId, value, unit);
      }
    }
  },
};
