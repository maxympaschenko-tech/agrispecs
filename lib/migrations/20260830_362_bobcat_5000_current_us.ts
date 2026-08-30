import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  grossHp: number;
  ptoHp: number;
  midPtoRpm: number;
};

const VERSION = 'united-states-current-2026-08';
const PLATFORM_URL = 'https://www.bobcat.com/na/en/equipment/tractors/compact-tractors/5000-platform-compact-tractors';

const models: Seed[] = [
  { slug: 'ct5545-hst-cab', name: 'CT5545 HST Cab', url: `${PLATFORM_URL}/ct5545`, grossHp: 45, ptoHp: 33.9, midPtoRpm: 2119 },
  { slug: 'ct5550-hst-cab', name: 'CT5550 HST Cab', url: `${PLATFORM_URL}/ct5550`, grossHp: 50, ptoHp: 38.9, midPtoRpm: 2103 },
  { slug: 'ct5555-hst-cab', name: 'CT5555 HST Cab', url: `${PLATFORM_URL}/ct5555`, grossHp: 55, ptoHp: 43.1, midPtoRpm: 2103 },
  { slug: 'ct5558-hst-cab', name: 'CT5558 HST Cab', url: `${PLATFORM_URL}/ct5558`, grossHp: 57.7, ptoHp: 48.3, midPtoRpm: 2103 },
];

const definitions: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
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
  if (!rows[0]) throw new Error('Bobcat 5000 Platform migration dependency missing');
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

export const bobcat5000CurrentUsMigration: DbMigration = {
  id: '20260830_362_bobcat_5000_current_us',
  description: 'Add four current US Bobcat 5000 Platform cab compact tractors',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='bobcat' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Bobcat' AND domain='bobcat.com' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Bobcat 5000 Platform','bobcat-5000-platform')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='bobcat-5000-platform' LIMIT 1`, [manufacturerId]);

    await ensureSource(c, sourceId, 'bobcat-5000-platform-current-us-2026-08', PLATFORM_URL, 'Bobcat current US 5000 Platform compact tractor lineup', {
      market: 'United States', captured: '2026-08-30',
      models: models.map((m) => m.name),
      notes: 'Current Bobcat North America 5000 Platform page confirms four factory-cab electronic-HST models: CT5545, CT5550, CT5555 and CT5558.',
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

    for (const m of models) {
      const sourceRecordId = await ensureSource(c, sourceId, `bobcat-${m.slug.replace('-hst-cab','')}-current-us-2026-08`, m.url, `Bobcat ${m.name.replace(' HST Cab','')} current US specifications`, {
        market: 'United States', captured: '2026-08-30',
        notes: 'Current Bobcat North America model-specific specification table. Source 111 cubic-inch displacement is normalized to 1.819 L and 14.8 US gal fuel capacity to 56.0 L for the shared catalog schema.',
      });

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US Bobcat 5000 Platform compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, m.name, m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Cab; electronic 3-range HST',TRUE,?,'Current Bobcat North America model-specific specification record.')
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string,string|number,string|null]> = [
        ['configuration.station','Cab',null], ['engine.model','3FT-TH4-U',null], ['engine.cylinders',3,null], ['engine.displacement',1.819,'L'],
        ['engine.gross_power',m.grossHp,'hp'], ['engine.rated_speed',2750,'rpm'],
        ['transmission.standard','Infinite, 3 Range Hydrostatic (electronic control)','',], ['drivetrain.type','4WD',null],
        ['transmission.max_forward_speed',17.5,'mph'], ['transmission.max_reverse_speed',17.5,'mph'],
        ['pto.rated_power',m.ptoHp,'hp'], ['pto.rear_description','540 rpm',null], ['pto.mid_description',`${m.midPtoRpm.toLocaleString('en-US')} rpm`,null],
        ['hydraulics.total_flow',17.8,'gpm'], ['hydraulics.power_steering_pump_capacity',8.2,'gpm'], ['hydraulics.main_pump_capacity',9.6,'gpm'],
        ['hitch.category','Category 1',null], ['hitch.lift_capacity_24in',3177,'lb'], ['capacities.fuel_tank',56.0,'L'],
        ['dimensions.overall_length',139.6,'in'], ['dimensions.overall_width',74.2,'in'], ['dimensions.overall_height',94.2,'in'],
        ['dimensions.wheelbase',75.6,'in'], ['dimensions.ground_clearance',13,'in'], ['dimensions.turning_radius',9.8,'ft'], ['dimensions.unladen_weight',4685,'lb'],
      ];
      for (const [key, value, unit] of values) {
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing Bobcat 5000 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, sourceRecordId, value, unit || null);
      }
    }
  },
};
