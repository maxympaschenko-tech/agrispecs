import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type ModelSeed = {
  slug: string;
  model: string;
  maxHp: number;
  ratedHp?: number;
  ptoHp?: number;
  displacementL: number;
  cylinders: number;
  transmission?: string;
  maxTorqueFtLb?: number;
  rearLiftLb?: number;
  emissions?: string;
};

type SeriesSeed = {
  slug: string;
  name: string;
  url: string;
  externalId: string;
  marketNote: string;
  models: ModelSeed[];
};

const VERSION = 'united-states-current-2026-08';

const seriesSeeds: SeriesSeed[] = [
  {
    slug: 'mf-4700',
    name: 'MF 4700 Series',
    url: 'https://www.masseyferguson.com/en_us/products/tractors/utility/mf-4700.html',
    externalId: 'massey-ferguson-mf-4700-current-us-2026-08',
    marketNote: 'Current US Massey Ferguson MF 4700 utility tractor',
    models: [
      { slug: 'mf-4707', model: 'MF 4707', maxHp: 75, ratedHp: 70, ptoHp: 60, displacementL: 3.3, cylinders: 3, transmission: '12F x 12R Power-Shuttle or Dyna-2 24 x 24' },
      { slug: 'mf-4709', model: 'MF 4709', maxHp: 95, ratedHp: 90, ptoHp: 77, displacementL: 3.3, cylinders: 3, transmission: '12F x 12R Power-Shuttle or Dyna-2 24 x 24' },
      { slug: 'mf-4710', model: 'MF 4710', maxHp: 100, ratedHp: 99, ptoHp: 87, displacementL: 3.3, cylinders: 3, transmission: '12F x 12R Power-Shuttle or Dyna-2 24 x 24' },
    ],
  },
  {
    slug: 'mf-6700-global',
    name: 'MF 6700 Global Series',
    url: 'https://www.masseyferguson.com/en_us/products/tractors/mid-range/mf-6700.html',
    externalId: 'massey-ferguson-mf-6700-global-current-us-2026-08',
    marketNote: 'Current US Massey Ferguson MF 6700 Global mid-range tractor',
    models: [
      { slug: 'mf-6712', model: 'MF 6712', maxHp: 120, ratedHp: 115, displacementL: 4.4, cylinders: 4, transmission: '12F x 12R, 2-range Power-Shuttle', emissions: 'Tier 4 Final' },
      { slug: 'mf-6713', model: 'MF 6713', maxHp: 130, ratedHp: 125, displacementL: 4.4, cylinders: 4, transmission: '12F x 12R, 2-range Power-Shuttle', emissions: 'Tier 4 Final' },
    ],
  },
  {
    slug: 'mf-5s',
    name: 'MF 5S Series',
    url: 'https://www.masseyferguson.com/en_us/products/tractors/mid-range/mf-5s.html',
    externalId: 'massey-ferguson-mf-5s-current-us-2026-08',
    marketNote: 'Current US Massey Ferguson MF 5S mid-range tractor',
    models: [
      { slug: 'mf-5s-115', model: 'MF 5S.115', maxHp: 115, displacementL: 4.4, cylinders: 4, transmission: 'Dyna-6 or Dyna-VT', maxTorqueFtLb: 460, rearLiftLb: 10300, emissions: 'Tier 4 Final' },
      { slug: 'mf-5s-135', model: 'MF 5S.135', maxHp: 135, displacementL: 4.4, cylinders: 4, transmission: 'Dyna-6 or Dyna-VT', maxTorqueFtLb: 540, rearLiftLb: 10300, emissions: 'Tier 4 Final' },
      { slug: 'mf-5s-145', model: 'MF 5S.145', maxHp: 145, displacementL: 4.4, cylinders: 4, transmission: 'Dyna-6 or Dyna-VT', maxTorqueFtLb: 550, rearLiftLb: 10300, emissions: 'Tier 4 Final' },
    ],
  },
  {
    slug: 'mf-6s',
    name: 'MF 6S Series',
    url: 'https://www.masseyferguson.com/en_us/products/tractors/high-horse-power/mf-6s.html',
    externalId: 'massey-ferguson-mf-6s-current-us-2026-08',
    marketNote: 'Current US Massey Ferguson MF 6S high-horsepower tractor',
    models: [
      { slug: 'mf-6s-145', model: 'MF 6S.145', maxHp: 145, displacementL: 4.9, cylinders: 4, transmission: 'Dyna-VT or Dyna-6', maxTorqueFtLb: 516, rearLiftLb: 21164, emissions: 'Tier 4 Final' },
      { slug: 'mf-6s-155', model: 'MF 6S.155', maxHp: 155, displacementL: 4.9, cylinders: 4, transmission: 'Dyna-VT or Dyna-6', maxTorqueFtLb: 553, rearLiftLb: 21164, emissions: 'Tier 4 Final' },
      { slug: 'mf-6s-165', model: 'MF 6S.165', maxHp: 165, displacementL: 4.9, cylinders: 4, transmission: 'Dyna-VT or Dyna-6', maxTorqueFtLb: 590, rearLiftLb: 21164, emissions: 'Tier 4 Final' },
      { slug: 'mf-6s-180', model: 'MF 6S.180', maxHp: 180, displacementL: 4.9, cylinders: 4, transmission: 'Dyna-VT or Dyna-6', maxTorqueFtLb: 620, rearLiftLb: 21164, emissions: 'Tier 4 Final' },
    ],
  },
  {
    slug: 'mf-7s',
    name: 'MF 7S Series',
    url: 'https://www.masseyferguson.com/en_us/products/tractors/high-horse-power/mf-7s.html',
    externalId: 'massey-ferguson-mf-7s-current-us-2026-08',
    marketNote: 'Current US Massey Ferguson MF 7S high-horsepower tractor',
    models: [
      { slug: 'mf-7s-155', model: 'MF 7S.155', maxHp: 155, displacementL: 6.6, cylinders: 6, transmission: 'Dyna-VT or Dyna-6', maxTorqueFtLb: 553, rearLiftLb: 21164 },
      { slug: 'mf-7s-165', model: 'MF 7S.165', maxHp: 165, displacementL: 6.6, cylinders: 6, transmission: 'Dyna-VT or Dyna-6', maxTorqueFtLb: 590, rearLiftLb: 21164 },
      { slug: 'mf-7s-180', model: 'MF 7S.180', maxHp: 180, displacementL: 6.6, cylinders: 6, transmission: 'Dyna-VT or Dyna-6', maxTorqueFtLb: 634, rearLiftLb: 21164 },
      { slug: 'mf-7s-190', model: 'MF 7S.190', maxHp: 190, displacementL: 6.6, cylinders: 6, transmission: 'Dyna-VT', maxTorqueFtLb: 682, rearLiftLb: 21164 },
      { slug: 'mf-7s-210', model: 'MF 7S.210', maxHp: 210, displacementL: 6.6, cylinders: 6, transmission: 'Dyna-VT', maxTorqueFtLb: 682, rearLiftLb: 21164 },
    ],
  },
  {
    slug: 'mf-8s',
    name: 'MF 8S Series',
    url: 'https://www.masseyferguson.com/en_us/products/tractors/high-horse-power/mf-8s.html',
    externalId: 'massey-ferguson-mf-8s-current-us-2026-08',
    marketNote: 'Current US Massey Ferguson MF 8S high-horsepower tractor',
    models: [
      { slug: 'mf-8s-205', model: 'MF 8S.205', maxHp: 205, displacementL: 7.4, cylinders: 6, maxTorqueFtLb: 707.3, rearLiftLb: 22000, emissions: 'Tier 4 Final' },
      { slug: 'mf-8s-225', model: 'MF 8S.225', maxHp: 225, displacementL: 7.4, cylinders: 6, maxTorqueFtLb: 737.5, rearLiftLb: 22000, emissions: 'Tier 4 Final' },
      { slug: 'mf-8s-245', model: 'MF 8S.245', maxHp: 245, displacementL: 7.4, cylinders: 6, maxTorqueFtLb: 811.3, rearLiftLb: 22000, emissions: 'Tier 4 Final' },
      { slug: 'mf-8s-265', model: 'MF 8S.265', maxHp: 265, displacementL: 7.4, cylinders: 6, maxTorqueFtLb: 885, rearLiftLb: 22000, emissions: 'Tier 4 Final' },
      { slug: 'mf-8s-285', model: 'MF 8S.285', maxHp: 285, displacementL: 7.4, cylinders: 6, maxTorqueFtLb: 929.3, rearLiftLb: 22000, emissions: 'Tier 4 Final' },
      { slug: 'mf-8s-305', model: 'MF 8S.305', maxHp: 305, displacementL: 7.4, cylinders: 6, maxTorqueFtLb: 944, rearLiftLb: 22000, emissions: 'Tier 4 Final' },
    ],
  },
];

const definitions = [
  ['Engine', 'engine.make', 'Engine manufacturer', 'text', null, 1],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 2],
  ['Engine', 'engine.cylinders', 'Engine cylinders', 'integer', null, 3],
  ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 4],
  ['Engine', 'engine.maximum_power', 'Maximum engine power', 'decimal', 'hp', 5],
  ['Engine', 'engine.maximum_torque', 'Maximum engine torque', 'decimal', 'ft-lb', 6],
  ['Engine', 'engine.emissions', 'Emissions standard', 'text', null, 7],
  ['PTO', 'pto.rated_power', 'PTO power', 'decimal', 'hp', 10],
  ['Transmission', 'transmission.options', 'Transmission options', 'text', null, 10],
  ['Hydraulics', 'hitch.rear_max_lift_capacity', 'Maximum rear hitch lift capacity', 'decimal', 'lb', 20],
] as const;

async function selectId(
  connection: Parameters<DbMigration['apply']>[0],
  sql: string,
  params: unknown[] = [],
) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Massey Ferguson migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  rawReference: unknown,
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
    [externalId],
  );
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

async function upsertSpec(
  connection: Parameters<DbMigration['apply']>[0],
  machineId: number,
  versionId: number,
  definitionId: number,
  sourceRecordId: number,
  value: string | number,
  unit: string | null = null,
) {
  await connection.query(
    `INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES (?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const masseyFergusonCurrentUsCoreMigration: DbMigration = {
  id: '20260829_300_massey_ferguson_current_us_core',
  description: 'Add 23 current US Massey Ferguson tractors from official 4700, 6700 Global, 5S, 6S, 7S and 8S product pages',
  async apply(connection) {
    await connection.query(
      `INSERT INTO equipment_types (name,slug) VALUES ('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
    );
    await connection.query(
      `INSERT INTO manufacturers (name,slug) VALUES ('Massey Ferguson','massey-ferguson') ON DUPLICATE KEY UPDATE name=VALUES(name)`,
    );

    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='massey-ferguson' LIMIT 1`);
    const equipmentTypeId = await selectId(connection, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Massey Ferguson' AND domain='masseyferguson.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Massey Ferguson','masseyferguson.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const definitionIds = new Map<string, number>();
    for (const [section, key, label, valueType, canonicalUnit, displayOrder] of definitions) {
      await connection.query(
        `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        [section, key, label, valueType, canonicalUnit, displayOrder],
      );
      definitionIds.set(key, await selectId(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing Massey Ferguson spec definition: ${key}`);
      return value;
    };

    for (const series of seriesSeeds) {
      await connection.query(
        `INSERT INTO machine_series (manufacturer_id,equipment_type_id,name,slug)
         VALUES (?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [manufacturerId, equipmentTypeId, series.name, series.slug],
      );
      const seriesId = await selectId(
        connection,
        `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,
        [manufacturerId, equipmentTypeId, series.slug],
      );

      const sourceRecordId = await ensureSourceRecord(
        connection,
        sourceId,
        series.externalId,
        series.url,
        `Massey Ferguson US ${series.name} official current specifications`,
        { market: 'United States', captured: '2026-08-29', models: series.models },
      );

      for (const model of series.models) {
        await connection.query(
          `INSERT INTO machines (manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
           VALUES (?,?,?,?,?,?,'partial')
           ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
          [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug, series.marketNote],
        );
        const machineId = await selectId(
          connection,
          `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,
          [manufacturerId, equipmentTypeId, model.slug],
        );

        await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
        await connection.query(
          `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
           VALUES (?,?,'US','United States','Current US manufacturer-listed configuration',TRUE,?,'Current US Massey Ferguson model. Only values explicitly published by the linked official US product page are included; configuration-specific values not stated by the manufacturer are intentionally omitted.')
           ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
          [machineId, VERSION, sourceRecordId],
        );
        const versionId = await selectId(
          connection,
          `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
          [machineId, VERSION],
        );

        const values: Array<[string, string | number, string | null]> = [
          ['engine.make', 'AGCO Power', null],
          ['engine.displacement', model.displacementL, 'L'],
          ['engine.cylinders', model.cylinders, null],
          ['engine.maximum_power', model.maxHp, 'hp'],
        ];
        if (model.ratedHp !== undefined) values.push(['engine.rated_power', model.ratedHp, 'hp']);
        if (model.ptoHp !== undefined) values.push(['pto.rated_power', model.ptoHp, 'hp']);
        if (model.transmission) values.push(['transmission.options', model.transmission, null]);
        if (model.maxTorqueFtLb !== undefined) values.push(['engine.maximum_torque', model.maxTorqueFtLb, 'ft-lb']);
        if (model.rearLiftLb !== undefined) values.push(['hitch.rear_max_lift_capacity', model.rearLiftLb, 'lb']);
        if (model.emissions) values.push(['engine.emissions', model.emissions, null]);

        for (const [key, value, unit] of values) {
          await upsertSpec(connection, machineId, versionId, def(key), sourceRecordId, value, unit);
        }
      }
    }
  },
};
