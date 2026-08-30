import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  station: 'ROPS' | 'Cab';
  engineMake: 'MHI' | 'Yanmar';
  engineType: string;
  grossHp: number;
  ptoHp: number;
  ratedRpm: number;
  displacementL: number;
  fuelL: number;
  alternator: string;
  transmission: string;
  implementGpm: number;
  steeringGpm: number;
  totalGpm: number;
  lengthIn: number;
  widthIn: number;
  wheelbaseIn: number;
  heightIn: number;
  weightLb: number;
};

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://lstractorusa.com/series/new-mt2e/';

const models: Seed[] = [
  {
    slug: 'mt226e', name: 'MT226E', url: 'https://lstractorusa.com/tractor/new-mt226e/', station: 'ROPS',
    engineMake: 'MHI', engineType: '3-cylinder, liquid-cooled, naturally aspirated IDI diesel', grossHp: 24.6, ptoHp: 19.2,
    ratedRpm: 2500, displacementL: 1.317, fuelL: 40.1, alternator: '12 V / 50 A', transmission: 'Synchro Shuttle; 12F / 12R',
    implementGpm: 7.9, steeringGpm: 4.6, totalGpm: 12.5, lengthIn: 119, widthIn: 66, wheelbaseIn: 66, heightIn: 95, weightLb: 2985,
  },
  {
    slug: 'mt226he', name: 'MT226HE', url: 'https://lstractorusa.com/tractor/new-mt226he/', station: 'ROPS',
    engineMake: 'MHI', engineType: '3-cylinder, liquid-cooled, naturally aspirated IDI diesel', grossHp: 24.6, ptoHp: 17.1,
    ratedRpm: 2500, displacementL: 1.317, fuelL: 40.1, alternator: '12 V / 50 A', transmission: 'HST; 3 ranges',
    implementGpm: 7.1, steeringGpm: 4.6, totalGpm: 11.7, lengthIn: 119, widthIn: 66, wheelbaseIn: 66, heightIn: 95, weightLb: 3007,
  },
  {
    slug: 'mt226hec', name: 'MT226HEC', url: 'https://lstractorusa.com/tractor/new-mt226hec/', station: 'Cab',
    engineMake: 'Yanmar', engineType: '3-cylinder, liquid-cooled, naturally aspirated IDI diesel', grossHp: 24.4, ptoHp: 19.0,
    ratedRpm: 2400, displacementL: 1.642, fuelL: 43.2, alternator: '12 V / 55 A', transmission: 'HST; 3 ranges',
    implementGpm: 6.1, steeringGpm: 4.6, totalGpm: 10.7, lengthIn: 125, widthIn: 66, wheelbaseIn: 69, heightIn: 90, weightLb: 3609,
  },
  {
    slug: 'mt232e', name: 'MT232E', url: 'https://lstractorusa.com/tractor/new-mt232e/', station: 'ROPS',
    engineMake: 'Yanmar', engineType: '3-cylinder, liquid-cooled, naturally aspirated IDI diesel', grossHp: 31.7, ptoHp: 28.5,
    ratedRpm: 2600, displacementL: 1.642, fuelL: 40.1, alternator: '12 V / 55 A', transmission: 'Synchro Shuttle; 12F / 12R',
    implementGpm: 7.4, steeringGpm: 5.0, totalGpm: 12.4, lengthIn: 125, widthIn: 66, wheelbaseIn: 69, heightIn: 95, weightLb: 3166,
  },
  {
    slug: 'mt232he', name: 'MT232HE', url: 'https://lstractorusa.com/tractor/new-mt232he/', station: 'ROPS',
    engineMake: 'Yanmar', engineType: '3-cylinder, liquid-cooled, naturally aspirated IDI diesel', grossHp: 31.7, ptoHp: 26.2,
    ratedRpm: 2600, displacementL: 1.642, fuelL: 40.1, alternator: '12 V / 55 A', transmission: 'HST; 3 ranges',
    implementGpm: 6.7, steeringGpm: 5.0, totalGpm: 11.7, lengthIn: 125, widthIn: 66, wheelbaseIn: 69, heightIn: 95, weightLb: 3210,
  },
  {
    slug: 'mt232hec', name: 'MT232HEC', url: 'https://lstractorusa.com/tractor/new-mt232hec/', station: 'Cab',
    engineMake: 'Yanmar', engineType: '3-cylinder, liquid-cooled, naturally aspirated IDI diesel', grossHp: 31.7, ptoHp: 26.2,
    ratedRpm: 2600, displacementL: 1.642, fuelL: 43.2, alternator: '12 V / 55 A', transmission: 'HST; 3 ranges',
    implementGpm: 6.7, steeringGpm: 5.0, totalGpm: 11.7, lengthIn: 125, widthIn: 66, wheelbaseIn: 69, heightIn: 90, weightLb: 3677,
  },
  {
    slug: 'mt242e', name: 'MT242E', url: 'https://lstractorusa.com/tractor/new-mt242e/', station: 'ROPS',
    engineMake: 'Yanmar', engineType: '4-cylinder, liquid-cooled, naturally aspirated CRDI diesel', grossHp: 42.5, ptoHp: 35.4,
    ratedRpm: 2600, displacementL: 2.189, fuelL: 40.1, alternator: '12 V / 55 A', transmission: 'Synchro Shuttle; 12F / 12R',
    implementGpm: 7.4, steeringGpm: 5.0, totalGpm: 12.4, lengthIn: 125, widthIn: 66, wheelbaseIn: 74, heightIn: 95, weightLb: 3250,
  },
  {
    slug: 'mt242he', name: 'MT242HE', url: 'https://lstractorusa.com/tractor/new-mt242he/', station: 'ROPS',
    engineMake: 'Yanmar', engineType: '4-cylinder, liquid-cooled, naturally aspirated CRDI diesel', grossHp: 42.5, ptoHp: 34.8,
    ratedRpm: 2600, displacementL: 2.189, fuelL: 40.1, alternator: '12 V / 55 A', transmission: 'HST; 3 ranges',
    implementGpm: 6.7, steeringGpm: 5.0, totalGpm: 11.7, lengthIn: 125, widthIn: 66, wheelbaseIn: 74, heightIn: 95, weightLb: 3294,
  },
  {
    slug: 'mt242hec', name: 'MT242HEC', url: 'https://lstractorusa.com/tractor/new-mt242hec/', station: 'Cab',
    engineMake: 'Yanmar', engineType: '4-cylinder, liquid-cooled, naturally aspirated CRDI diesel', grossHp: 42.5, ptoHp: 34.8,
    ratedRpm: 2600, displacementL: 2.189, fuelL: 40.1, alternator: '12 V / 55 A', transmission: 'HST; 3 ranges',
    implementGpm: 6.7, steeringGpm: 5.0, totalGpm: 11.7, lengthIn: 125, widthIn: 66, wheelbaseIn: 74, heightIn: 90, weightLb: 3761,
  },
];

const definitions: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.station','Operator station','text',null,1],
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.displacement','Engine displacement','decimal','L',6],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',8],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.type','PTO type','text',null,15],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Hydraulics','hydraulics.main_pump_capacity','Implement hydraulic pump capacity','decimal','gpm',10],
  ['Hydraulics','hydraulics.power_steering_pump_capacity','Power-steering pump capacity','decimal','gpm',20],
  ['Hydraulics','hydraulics.total_flow','Total hydraulic flow','decimal','gpm',30],
  ['Hydraulics','hitch.category','3-point hitch category','text',null,40],
  ['Hydraulics','hitch.lift_capacity','3-point hitch lift capacity at hitch end','decimal','lb',50],
  ['Capacities','capacities.fuel_tank','Fuel tank capacity','decimal','L',10],
  ['Electrical','electrical.alternator','Alternator','text',null,10],
  ['Dimensions & Weight','dimensions.overall_length','Overall length','decimal','in',10],
  ['Dimensions & Weight','dimensions.overall_width','Overall width','decimal','in',20],
  ['Dimensions & Weight','dimensions.overall_height','Overall height','decimal','in',30],
  ['Dimensions & Weight','dimensions.wheelbase','Wheelbase','decimal','in',40],
  ['Dimensions & Weight','dimensions.unladen_weight','Tractor weight without ballast','decimal','lb',70],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('LS Tractor New MT2E migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  c: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown,
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
  c: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number,
  value: string | number, unit: string | null,
) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const lsTractorNewMt2eCurrentUsMigration: DbMigration = {
  id: '20260830_372_ls_tractor_new_mt2e_current_us',
  description: 'Add nine current US LS Tractor New MT2E compact tractor configurations',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'LS New MT2E Series','ls-new-mt2e-series')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='ls-new-mt2e-series' LIMIT 1`, [manufacturerId]);

    await ensureSourceRecord(c, sourceId, 'ls-tractor-new-mt2e-current-us-lineup-2026-08', SERIES_URL, 'LS Tractor USA current New MT2E Series lineup', {
      market: 'United States', captured: '2026-08-30', models: models.map((m) => m.name),
      sourcePolicy: 'The manufacturer explicitly separates New MT2E from Previous MT2E. This migration stores only the current New MT2E generation and does not copy prior-generation MT235/MT240 values into these records.',
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
      const sourceRecordId = await ensureSourceRecord(c, sourceId, `ls-tractor-${m.slug}-new-current-us-2026-08`, m.url, `LS Tractor ${m.name} current US specifications`, {
        market: 'United States', captured: '2026-08-30', generation: 'New MT2E',
        normalization: { displacement: 'Source cu in normalized to liters', fuel: 'Source US gallons normalized to liters' },
        notes: 'The source field labeled “Model (Tier 4)” contains only MHI or YANMAR rather than a specific engine model number. It is therefore stored as engine manufacturer, not engine.model.',
      });

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US LS Tractor New MT2E compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, m.name, m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,'Current LS Tractor USA New MT2E model-specific specification record.')
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, `${m.station}; ${m.transmission}`, sourceRecordId],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const cylinders = m.slug.startsWith('mt242') ? 4 : 3;
      const values: Array<[string,string|number,string|null]> = [
        ['configuration.station',m.station,null],
        ['engine.make',m.engineMake,null],
        ['engine.type',m.engineType,null],
        ['engine.cylinders',cylinders,null],
        ['engine.displacement',m.displacementL,'L'],
        ['engine.gross_power',m.grossHp,'hp'],
        ['engine.rated_speed',m.ratedRpm,'rpm'],
        ['transmission.standard',m.transmission,null],
        ['pto.rated_power',m.ptoHp,'hp'],
        ['pto.type','Independent',null],
        ['pto.rear_description','Standard 540 rpm',null],
        ['hydraulics.main_pump_capacity',m.implementGpm,'gpm'],
        ['hydraulics.power_steering_pump_capacity',m.steeringGpm,'gpm'],
        ['hydraulics.total_flow',m.totalGpm,'gpm'],
        ['hitch.category','Category I',null],
        ['hitch.lift_capacity',1808,'lb'],
        ['capacities.fuel_tank',m.fuelL,'L'],
        ['electrical.alternator',m.alternator,null],
        ['dimensions.overall_length',m.lengthIn,'in'],
        ['dimensions.overall_width',m.widthIn,'in'],
        ['dimensions.overall_height',m.heightIn,'in'],
        ['dimensions.wheelbase',m.wheelbaseIn,'in'],
        ['dimensions.unladen_weight',m.weightLb,'lb'],
      ];

      for (const [key, value, unit] of values) {
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing LS Tractor New MT2E spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, sourceRecordId, value, unit);
      }
    }
  },
};
