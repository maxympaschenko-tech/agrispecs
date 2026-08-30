import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  grossHp: number;
  ptoHp: number;
  engineModel: string;
  displacementL: number;
  weightLb: number;
};

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://lstractorusa.com/series/MT1/';

const models: Seed[] = [
  {
    slug: 'mt122',
    name: 'MT122',
    url: 'https://lstractorusa.com/tractor/mt122/',
    grossHp: 21.5,
    ptoHp: 15.0,
    engineModel: 'Yanmar 3TNV76F',
    displacementL: 1.114,
    weightLb: 1433,
  },
  {
    slug: 'mt125',
    name: 'MT125',
    url: 'https://lstractorusa.com/tractor/mt125/',
    grossHp: 24.7,
    ptoHp: 17.2,
    engineModel: 'Yanmar 3TNV80F',
    displacementL: 1.267,
    weightLb: 1444,
  },
];

const definitions: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',8],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['Transmission','drivetrain.type','Driveline','text',null,20],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.type','PTO type','text',null,15],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['PTO','pto.mid_description','Mid PTO','text',null,30],
  ['Hydraulics','hydraulics.main_pump_capacity','Implement hydraulic pump capacity','decimal','gpm',10],
  ['Hydraulics','hydraulics.power_steering_pump_capacity','Power-steering pump capacity','decimal','gpm',20],
  ['Hydraulics','hydraulics.total_flow','Total hydraulic flow','decimal','gpm',30],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Hydraulics','hitch.lift_capacity','3-point hitch lift capacity at hitch end','decimal','lb',50],
  ['Hydraulics','hitch.lift_capacity_24in','3-point hitch lift capacity at 24 in. behind lift point','decimal','lb',60],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','L',10],
  ['Electrical','electrical.alternator','Alternator','text',null,10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_height','Overall height to ROPS','decimal','in',30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.unladen_weight','Tractor weight without ballast','decimal','lb',70],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor MT1 migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  c: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  raw: unknown,
) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(raw)],
  );
  return Number(inserted.insertId);
}

async function put(
  c: Parameters<DbMigration['apply']>[0],
  machineId: number,
  versionId: number,
  definitionId: number,
  sourceRecordId: number,
  value: string | number,
  unit: string | null,
) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const lsTractorMt1CurrentUsMigration: DbMigration = {
  id: '20260830_370_ls_tractor_mt1_current_us',
  description: 'Introduce LS Tractor with current US MT122 and MT125 MT1 sub-compact tractors',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('LS Tractor','ls-tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);

    let [sourceRows] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [inserted] = await c.query<ResultSetHeader>(
        `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('LS Tractor','lstractorusa.com','manufacturer','official')`,
      );
      sourceId = Number(inserted.insertId);
    }

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'LS MT1 Series','ls-mt1-series')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ls-mt1-series' LIMIT 1`, [manufacturerId]);

    await ensureSourceRecord(c, sourceId, 'ls-tractor-mt1-current-us-lineup-2026-08', SERIES_URL, 'LS Tractor USA current MT1 Series lineup', {
      market: 'United States',
      captured: '2026-08-30',
      models: models.map((m) => m.name),
      sourcePolicy: 'Current LS Tractor USA MT1 series page establishes the active MT122 and MT125 lineup. Model-specific current pages provide detailed specifications.',
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
      const sourceRecordId = await ensureSourceRecord(c, sourceId, `ls-tractor-${m.slug}-current-us-2026-08`, m.url, `LS Tractor ${m.name} current US specifications`, {
        market: 'United States',
        captured: '2026-08-30',
        sourcePowerLabel: 'Engine HP (Gross)',
        sourceDisplacementUnit: 'cu in',
        sourceFuelUnit: 'US gal',
        normalization: m.slug === 'mt122'
          ? { displacement: '68.0 cu in -> 1.114 L', fuel: '6.6 US gal -> 25.0 L' }
          : { displacement: '77.3 cu in -> 1.267 L', fuel: '6.6 US gal -> 25.0 L' },
        notes: 'The detailed specification table publishes Mid PTO = 2500 rpm, while marketing copy on the same page mentions 2000 rpm. The detailed specification table takes precedence. Marketing-copy typos are not propagated.',
      });

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US LS Tractor MT1 sub-compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, m.name, m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','ROPS; 4WD; 2-range HST',TRUE,?,'Current LS Tractor USA model-specific specification record.')
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string,string|number,string|null]> = [
        ['configuration.station','ROPS',null],
        ['engine.make','Yanmar',null],
        ['engine.model',m.engineModel,null],
        ['engine.type','3-cylinder, indirect-injection, water-cooled diesel',null],
        ['engine.cylinders',3,null],
        ['engine.displacement',m.displacementL,'L'],
        ['engine.gross_power',m.grossHp,'hp'],
        ['engine.rated_speed',3000,'rpm'],
        ['transmission.standard','Hydrostatic Drive; 2 ranges',null],
        ['drivetrain.type','4WD (front-wheel mechanical assist)',null],
        ['pto.rated_power',m.ptoHp,'hp'],
        ['pto.type','Independent',null],
        ['pto.rear_description','Standard 540 rpm',null],
        ['pto.mid_description','Standard 2500 rpm',null],
        ['hydraulics.main_pump_capacity',4.6,'gpm'],
        ['hydraulics.power_steering_pump_capacity',2.1,'gpm'],
        ['hydraulics.total_flow',6.7,'gpm'],
        ['hitch.category','Category I',null],
        ['hitch.lift_capacity',992,'lb'],
        ['hitch.lift_capacity_24in',728,'lb'],
        ['capacities.fuel_tank',25.0,'L'],
        ['electrical.alternator','12 V / 40 A',null],
        ['dimensions.overall_length',97,'in'],
        ['dimensions.overall_width',47,'in'],
        ['dimensions.overall_height',87,'in'],
        ['dimensions.wheelbase',56,'in'],
        ['dimensions.unladen_weight',m.weightLb,'lb'],
      ];

      for (const [key, value, unit] of values) {
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing LS Tractor MT1 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, sourceRecordId, value, unit);
      }
    }
  },
};
