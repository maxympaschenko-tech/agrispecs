import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  engineModel: string;
  grossHp: number;
  ptoHp: number;
  note?: string;
};

const VERSION = 'united-states-current-2026-08';
const PLATFORM_URL = 'https://www.bobcat.com/na/en/equipment/tractors/sub-compact-tractors/1000-platform-sub-compact-tractors';

const models: Seed[] = [
  {
    slug: 'ct1021-hst', name: 'CT1021 HST', url: `${PLATFORM_URL}/ct1021`, engineModel: '3C100LWH-U2', grossHp: 21, ptoHp: 16.3,
    note: 'The current 1000 Platform marketing card contains inconsistent CT1021 rounded values (21.1 hp / 16.7 PTO hp, while its comparison table also shows 21.2 / 16.3). The current model-specific Engine and Performance tables explicitly publish Gross HP 21 and PTO HP 16.3, which are retained as the more detailed first-party values.',
  },
  {
    slug: 'ct1025-hst', name: 'CT1025 HST', url: `${PLATFORM_URL}/ct1025`, engineModel: '3C100LFH-U1', grossHp: 24.5, ptoHp: 18.8,
  },
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
  if (!rows[0]) throw new Error('Bobcat 1000 Platform migration dependency missing');
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

export const bobcat1000CurrentUsMigration: DbMigration = {
  id: '20260830_363_bobcat_1000_current_us',
  description: 'Add current US Bobcat CT1021 and CT1025 1000 Platform sub-compact tractors',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='bobcat' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Bobcat' AND domain='bobcat.com' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Bobcat 1000 Platform','bobcat-1000-platform')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='bobcat-1000-platform' LIMIT 1`, [manufacturerId]);

    await ensureSource(c, sourceId, 'bobcat-1000-platform-current-us-2026-08', PLATFORM_URL, 'Bobcat current US 1000 Platform sub-compact tractor lineup', {
      market: 'United States', captured: '2026-08-30', models: ['CT1021','CT1025'],
      notes: 'Current Bobcat North America 1000 Platform page confirms two open-station 2-range HST sub-compact models. Model-specific specification tables are used for technical values when platform marketing summaries conflict.',
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
      const base = m.slug.replace('-hst','');
      const sourceRecordId = await ensureSource(c, sourceId, `bobcat-${base}-current-us-2026-08`, m.url, `Bobcat ${base.toUpperCase()} current US specifications`, {
        market: 'United States', captured: '2026-08-30',
        notes: m.note || 'Current Bobcat North America model-specific specification table. Source 62 cubic-inch displacement is normalized to 1.016 L and 6.7 US gal fuel capacity to 25.4 L for the shared catalog schema.',
      });

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US Bobcat 1000 Platform sub-compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, m.name, m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Open ROPS; 2-range HST',TRUE,?,?)
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId, m.note || 'Current Bobcat North America model-specific specification record.'],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string,string|number,string|null]> = [
        ['configuration.station','ROPS',null], ['engine.model',m.engineModel,null], ['engine.cylinders',3,null], ['engine.displacement',1.016,'L'],
        ['engine.gross_power',m.grossHp,'hp'], ['engine.rated_speed',3200,'rpm'], ['transmission.standard','Infinite, 2 Range Hydrostatic',null], ['drivetrain.type','4WD',null],
        ['transmission.max_forward_speed',11.1,'mph'], ['transmission.max_reverse_speed',7.6,'mph'],
        ['pto.rated_power',m.ptoHp,'hp'], ['pto.rear_description','540 rpm',null], ['pto.mid_description','2,200 rpm',null],
        ['hydraulics.total_flow',7.2,'gpm'], ['hitch.category','Limited Category 1',null], ['hitch.lift_capacity_24in',700,'lb'], ['capacities.fuel_tank',25.4,'L'],
        ['dimensions.overall_length',99.3,'in'], ['dimensions.overall_width',45.7,'in'], ['dimensions.overall_height',87.6,'in'],
        ['dimensions.wheelbase',55.1,'in'], ['dimensions.ground_clearance',6.3,'in'], ['dimensions.turning_radius',8.4,'ft'], ['dimensions.unladen_weight',1521,'lb'],
      ];
      for (const [key, value, unit] of values) {
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing Bobcat 1000 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, sourceRecordId, value, unit);
      }
    }
  },
};
