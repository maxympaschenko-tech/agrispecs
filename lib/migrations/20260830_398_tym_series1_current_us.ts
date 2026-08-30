import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  name: string;
  url: string;
  engineModel: string;
  grossHp: number;
  ratedRpm: number;
  displacementL: number;
  transmission: string;
  speeds: string;
  hitchLiftLb: number;
  fuelL: number;
  lengthIn: number;
  widthIn: number;
  wheelbaseIn: number;
  heightIn: number;
  clearanceIn: number;
  weightLb: number;
  agTires: string;
};

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://tym.world/en-us/products/tractors/series-1';

const models: Seed[] = [
  {
    slug: 't224',
    name: 'T224',
    url: 'https://tym.world/en-us/products/tractors/series-1/t224',
    engineModel: 'Yanmar 3TNV74F',
    grossHp: 21.5,
    ratedRpm: 3200,
    displacementL: 0.993,
    transmission: 'HST',
    speeds: '2 ranges',
    hitchLiftLb: 1100,
    fuelL: 25,
    lengthIn: 94.2,
    widthIn: 44.5,
    wheelbaseIn: 53.1,
    heightIn: 86.6,
    clearanceIn: 8.3,
    weightLb: 1472,
    agTires: 'BAR F 16x6.50-8 / BAR R 24x12.00-12',
  },
  {
    slug: 't254',
    name: 'T254',
    url: 'https://tym.world/en-us/products/tractors/series-1/t254',
    engineModel: 'Yanmar 3TNV80F',
    grossHp: 23.9,
    ratedRpm: 3000,
    displacementL: 1.267,
    transmission: 'HST',
    speeds: 'Infinite 2-range',
    hitchLiftLb: 1214,
    fuelL: 22,
    lengthIn: 100.5,
    widthIn: 45.8,
    wheelbaseIn: 57.5,
    heightIn: 91.3,
    clearanceIn: 9.4,
    weightLb: 1638,
    agTires: '6.0-12 / 9.5-16',
  },
];

const definitions: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.station', 'Operator station', 'text', null, 1],
  ['Engine', 'engine.make', 'Engine manufacturer', 'text', null, 1],
  ['Engine', 'engine.model', 'Engine model', 'text', null, 3],
  ['Engine', 'engine.emissions_note', 'Engine emissions note', 'text', null, 5],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 6],
  ['Engine', 'engine.gross_power', 'Gross engine power', 'decimal', 'hp', 8],
  ['Engine', 'engine.rated_speed', 'Rated engine speed', 'integer', 'rpm', 9],
  ['Transmission', 'transmission.standard', 'Transmission', 'text', null, 10],
  ['Transmission', 'transmission.speeds', 'Transmission speeds / ranges', 'text', null, 20],
  ['Transmission', 'steering.type', 'Steering', 'text', null, 40],
  ['PTO', 'pto.rear_description', 'Rear PTO', 'text', null, 20],
  ['Hydraulics', 'hitch.lift_capacity', '3-point hitch lift capacity', 'decimal', 'lb', 50],
  ['Capacities', 'capacities.fuel_tank', 'Fuel tank capacity', 'decimal', 'L', 10],
  ['Dimensions & Weight', 'dimensions.overall_length', 'Overall length with 3-point hitch', 'decimal', 'in', 10],
  ['Dimensions & Weight', 'dimensions.overall_width', 'Overall width', 'decimal', 'in', 20],
  ['Dimensions & Weight', 'dimensions.overall_height', 'Height to top of ROPS', 'decimal', 'in', 30],
  ['Dimensions & Weight', 'dimensions.wheelbase', 'Wheelbase', 'decimal', 'in', 40],
  ['Dimensions & Weight', 'dimensions.ground_clearance', 'Minimum ground clearance', 'decimal', 'in', 50],
  ['Dimensions & Weight', 'dimensions.unladen_weight', 'Weight with ROPS', 'decimal', 'lb', 70],
  ['Tires', 'tires.ag', 'Published R1 agricultural tires front / rear', 'text', null, 10],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('TYM Series 1 migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(
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

export const tymSeries1CurrentUsMigration: DbMigration = {
  id: '20260830_398_tym_series1_current_us',
  description: 'Introduce TYM with the two current US Series 1 sub-compact tractors T224 and T254',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('TYM','tym') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='tym' LIMIT 1`);
    const equipmentTypeId = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);

    const [sourceRows] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='TYM' AND domain='tym.world' LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [inserted] = await c.query<ResultSetHeader>(
        `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('TYM','tym.world','manufacturer','official')`,
      );
      sourceId = Number(inserted.insertId);
    }

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug)
       VALUES(?,?,'TYM Series 1','tym-series-1')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='tym-series-1' LIMIT 1`, [manufacturerId]);

    await ensureSource(c, sourceId, 'tym-series1-current-us-2026-08', SERIES_URL, 'TYM USA current Series 1 sub-compact tractor lineup', {
      market: 'United States',
      captured: '2026-08-30',
      currentModels: ['T224', 'T254'],
      seriesRange: { engineHp: '21.5 - 23.9', hitchLiftLb: '1100 - 1214' },
      sourcePolicy: 'Current US Series 1 page defines only T224 and T254. The tractor model pages provide the current comparison-table values used here.',
      attachmentPolicy: 'Attachment data is intentionally not inferred from predecessor/alternate names. The current attachment catalog clearly identifies T254 fitment, while T224 filtering currently exposes some legacy T194 labeling; those links are handled separately and conservatively.',
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
        model: m.name,
        normalization: {
          displacement: 'TYM publishes both cubic-inch/cc; cc normalized to liters.',
          fuel: 'TYM publishes US gallons and liters; liters retained.',
        },
        sourceNotes: m.slug === 't224'
          ? 'TYM’s current technical table labels the T224 speed row “2 Range”; current feature copy explicitly identifies the transmission as a 2-range hydrostatic transmission (HST).'
          : 'TYM’s current technical table labels the T254 speed row “Infinite 2-Range”; current feature copy explicitly identifies a 2-range HST.',
      });

      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current US TYM Series 1 sub-compact tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, m.name, m.slug],
      );
      const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States',?,TRUE,?,'Current TYM USA Series 1 configuration from the live US model page.')
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, `ROPS; ${m.transmission}; ${m.speeds}`, sourceRecordId],
      );
      const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      const values: Array<[string, string | number, string | null]> = [
        ['configuration.station', 'ROPS', null],
        ['engine.make', 'Yanmar', null],
        ['engine.model', m.engineModel, null],
        ['engine.emissions_note', 'Current TYM page describes the Yanmar engine as Tier 4 certified', null],
        ['engine.displacement', m.displacementL, 'L'],
        ['engine.gross_power', m.grossHp, 'hp'],
        ['engine.rated_speed', m.ratedRpm, 'rpm'],
        ['transmission.standard', m.transmission, null],
        ['transmission.speeds', m.speeds, null],
        ['steering.type', 'Power steering', null],
        ['pto.rear_description', '540 rpm', null],
        ['hitch.lift_capacity', m.hitchLiftLb, 'lb'],
        ['capacities.fuel_tank', m.fuelL, 'L'],
        ['dimensions.overall_length', m.lengthIn, 'in'],
        ['dimensions.overall_width', m.widthIn, 'in'],
        ['dimensions.overall_height', m.heightIn, 'in'],
        ['dimensions.wheelbase', m.wheelbaseIn, 'in'],
        ['dimensions.ground_clearance', m.clearanceIn, 'in'],
        ['dimensions.unladen_weight', m.weightLb, 'lb'],
        ['tires.ag', m.agTires, null],
      ];

      for (const [key, value, unit] of values) {
        const definitionId = definitionIds.get(key);
        if (!definitionId) throw new Error(`Missing TYM Series 1 spec definition ${key}`);
        await put(c, machineId, versionId, definitionId, sourceRecordId, value, unit);
      }
    }
  },
};
