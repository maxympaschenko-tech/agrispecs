import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type ModelSeed = {
  slug: string;
  model: string;
  engineMake: string;
  displacementL: number;
  cylinders: number;
  maxHp?: number;
  ratedHp?: number;
  ptoHp?: number;
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
    slug: 'mf-2600-h',
    name: 'MF 2600 H Series',
    url: 'https://www.masseyferguson.com/en_us/products/tractors/utility/mf-2600-h.html',
    externalId: 'massey-ferguson-mf-2600-h-current-us-2026-08',
    marketNote: 'Current US Massey Ferguson MF 2600 H utility tractor',
    models: [
      { slug: 'mf-2604h', model: 'MF 2604H', engineMake: 'Simpsons', displacementL: 2.6, cylinders: 3, ratedHp: 45, ptoHp: 38, transmission: '8 Forward x 2 Reverse Sliding Mesh Gearbox', rearLiftLb: 2204, emissions: 'EPA Tier 4 Final' },
      { slug: 'mf-2605h', model: 'MF 2605H', engineMake: 'Simpsons', displacementL: 2.6, cylinders: 3, ratedHp: 55, ptoHp: 46, transmission: '8 Forward x 2 Reverse or 8 x 8 Synchro-Shuttle', rearLiftLb: 2755, emissions: 'EPA Tier 4 Final' },
      { slug: 'mf-2606h', model: 'MF 2606H', engineMake: 'Simpsons', displacementL: 2.6, cylinders: 3, ratedHp: 65, ptoHp: 55, transmission: '8 x 8 Synchro-Shuttle', rearLiftLb: 2755, emissions: 'EPA Tier 4 Final' },
      { slug: 'mf-2607h', model: 'MF 2607H', engineMake: 'Simpsons', displacementL: 2.6, cylinders: 3, ratedHp: 74, ptoHp: 64, transmission: '8 x 8 Synchro-Shuttle', rearLiftLb: 2755, emissions: 'EPA Tier 4 Final' },
    ],
  },
  {
    slug: 'mf-5700-global',
    name: 'MF 5700 Global Series',
    url: 'https://www.masseyferguson.com/en_us/products/tractors/mid-range/mf-5700.html',
    externalId: 'massey-ferguson-mf-5700-global-current-us-2026-08',
    marketNote: 'Current US Massey Ferguson MF 5700 Global mid-range tractor',
    models: [
      { slug: 'mf-5710', model: 'MF 5710', engineMake: 'AGCO Power', displacementL: 4.4, cylinders: 4, maxHp: 100, ratedHp: 95, transmission: '12 x 12 Power Shuttle' },
      { slug: 'mf-5710-d', model: 'MF 5710 D', engineMake: 'AGCO Power', displacementL: 4.4, cylinders: 4, maxHp: 100, ratedHp: 95, transmission: '16 x 16 Dyna-4 PowerShift' },
      { slug: 'mf-5711', model: 'MF 5711', engineMake: 'AGCO Power', displacementL: 4.4, cylinders: 4, maxHp: 110, ratedHp: 105, transmission: '12 x 12 Power Shuttle' },
    ],
  },
  {
    slug: 'mf-9s',
    name: 'MF 9S Series',
    url: 'https://www.masseyferguson.com/en_us/products/tractors/high-horse-power/mf-9s.html',
    externalId: 'massey-ferguson-mf-9s-current-us-2026-08',
    marketNote: 'Current US Massey Ferguson MF 9S high-horsepower tractor',
    models: [
      { slug: 'mf-9s-310', model: 'MF 9S.310', engineMake: 'AGCO Power', displacementL: 8.4, cylinders: 6, maxHp: 310, transmission: 'Dyna-VT', maxTorqueFtLb: 959 },
      { slug: 'mf-9s-340', model: 'MF 9S.340', engineMake: 'AGCO Power', displacementL: 8.4, cylinders: 6, maxHp: 340, transmission: 'Dyna-VT', maxTorqueFtLb: 1070 },
      { slug: 'mf-9s-370', model: 'MF 9S.370', engineMake: 'AGCO Power', displacementL: 8.4, cylinders: 6, maxHp: 370, transmission: 'Dyna-VT', maxTorqueFtLb: 1180 },
      { slug: 'mf-9s-400', model: 'MF 9S.400', engineMake: 'AGCO Power', displacementL: 8.4, cylinders: 6, maxHp: 400, transmission: 'Dyna-VT', maxTorqueFtLb: 1217 },
      { slug: 'mf-9s-425', model: 'MF 9S.425', engineMake: 'AGCO Power', displacementL: 8.4, cylinders: 6, maxHp: 425, transmission: 'Dyna-VT', maxTorqueFtLb: 1290 },
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
  if (!rows[0]) throw new Error('Missing Massey Ferguson expansion migration dependency.');
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
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
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

export const masseyFergusonUsExpansionMigration: DbMigration = {
  id: '20260829_301_massey_ferguson_us_expansion',
  description: 'Add 12 current US Massey Ferguson tractors from the 2600 H, 5700 Global and 9S product pages',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='massey-ferguson' LIMIT 1`);
    const equipmentTypeId = await selectId(connection, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='Massey Ferguson' AND domain='masseyferguson.com' ORDER BY id LIMIT 1`,
    );

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
      if (!value) throw new Error(`Missing Massey Ferguson expansion spec definition: ${key}`);
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
           VALUES (?,?,'US','United States','Current US manufacturer-listed configuration',TRUE,?,'Current US Massey Ferguson model. Only unambiguous values explicitly published on the linked official US product page are included; alternative PTO ratings and configuration-specific values are omitted where the page does not identify one canonical value.')
           ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
          [machineId, VERSION, sourceRecordId],
        );
        const versionId = await selectId(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

        const values: Array<[string, string | number, string | null]> = [
          ['engine.make', model.engineMake, null],
          ['engine.displacement', model.displacementL, 'L'],
          ['engine.cylinders', model.cylinders, null],
        ];
        if (model.maxHp !== undefined) values.push(['engine.maximum_power', model.maxHp, 'hp']);
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
