import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

const SOURCE_URL = 'https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/agricultural/TRACTORS_1000-4000-CUTS_05May2026.pdf';
const SOURCE_EXTERNAL_ID = 'john-deere-1000-4000-cuts-pricebook-2026-05-05';
const VERSION_SLUG = 'north-america-pricebook-2026-05-05';

type IdRow = RowDataPacket & { id: number };

type ModelData = {
  slug: string;
  model: string;
  hp: number;
  ptoHp: number;
  displacement: number;
  aspiration: string;
  transmission: string;
  transmissionOption?: string;
  hydraulics: string;
  configuration: string;
};

const models: ModelData[] = [
  {
    slug: '4044m', model: '4044M', hp: 43.1, ptoHp: 32.5, displacement: 2.2,
    aspiration: 'Naturally aspirated',
    transmission: 'eHydro, in base price',
    transmissionOption: '12F/12R PowrReverser factory option',
    hydraulics: 'Hydraulics not included in base machine',
    configuration: '4WD 4M base-price configuration',
  },
  {
    slug: '4052m', model: '4052M', hp: 51.5, ptoHp: 39.9, displacement: 2.1,
    aspiration: 'Turbocharged',
    transmission: 'eHydro, in base price',
    transmissionOption: '12F/12R PowrReverser factory option',
    hydraulics: 'Hydraulics not included in base machine',
    configuration: '4WD 4M base-price configuration',
  },
  {
    slug: '4066m', model: '4066M', hp: 65.9, ptoHp: 52, displacement: 2.1,
    aspiration: 'Intercooled turbocharged',
    transmission: 'eHydro, in base price',
    transmissionOption: '12F/12R PowrReverser factory option',
    hydraulics: 'Hydraulics not included in base machine',
    configuration: '4WD 4M base-price configuration',
  },
  {
    slug: '4044r', model: '4044R', hp: 43.1, ptoHp: 32.5, displacement: 2.2,
    aspiration: 'Naturally aspirated',
    transmission: 'HST, 3 range',
    hydraulics: 'Dual mid selective control valve with joystick, float and regenerative function',
    configuration: '4WD 4R HST base specification',
  },
  {
    slug: '4052r', model: '4052R', hp: 51.5, ptoHp: 39.9, displacement: 2.2,
    aspiration: 'Turbocharged',
    transmission: 'HST, 3 range',
    hydraulics: 'Dual mid selective control valve with joystick, float, regenerative function and regenerative lockout',
    configuration: '4WD 4R HST base specification',
  },
  {
    slug: '4066r', model: '4066R', hp: 65.9, ptoHp: 52, displacement: 2.2,
    aspiration: 'Intercooled turbocharged',
    transmission: 'HST, 3 range',
    hydraulics: 'Dual mid selective control valve with joystick, float, regenerative function and regenerative lockout',
    configuration: '4WD 4R HST base specification',
  },
  {
    slug: '4075r', model: '4075R', hp: 74.3, ptoHp: 60, displacement: 2.1,
    aspiration: 'Intercooled turbocharged',
    transmission: 'HST, 3 range',
    hydraulics: 'Dual mid selective control valve with joystick, float, regenerative function and regenerative lockout',
    configuration: '4WD 4R HST base specification',
  },
];

const definitions = [
  ['Machine Configuration', 'drive.type', 'Drive type', 'text', null, 10],
  ['Engine', 'engine.make', 'Engine manufacturer', 'text', null, 5],
  ['Engine', 'engine.cylinders', 'Cylinders', 'integer', null, 6],
  ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 10],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 20],
  ['Engine', 'engine.rated_speed', 'Rated engine speed', 'integer', 'rpm', 30],
  ['Engine', 'engine.aspiration', 'Aspiration', 'text', null, 40],
  ['Engine', 'engine.emissions', 'Emissions', 'text', null, 50],
  ['Transmission', 'transmission.standard', 'Base-price transmission', 'text', null, 10],
  ['Transmission', 'transmission.optional', 'Factory transmission option', 'text', null, 20],
  ['PTO', 'pto.rated_power', 'PTO power', 'decimal', 'hp', 10],
  ['Hydraulics', 'hydraulics.base_configuration', 'Base hydraulic configuration', 'text', null, 10],
  ['Electrical', 'electrical.system_voltage', 'Electrical system', 'integer', 'V', 10],
  ['Electrical', 'electrical.alternator', 'Alternator', 'integer', 'A', 20],
  ['Electrical', 'electrical.battery_cca', 'Battery', 'integer', 'CCA', 30],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during 4 Series migration.');
  return Number(rows[0].id);
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
  const valueText = typeof value === 'string' ? value : null;
  const valueNumber = typeof value === 'number' ? value : null;
  await connection.query(
    `INSERT INTO machine_specs
      (machine_id, machine_version_id, spec_definition_id, value_text, value_number, unit, source_record_id, confidence)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'official')
     ON DUPLICATE KEY UPDATE
       value_text = VALUES(value_text),
       value_number = VALUES(value_number),
       unit = VALUES(unit),
       source_record_id = VALUES(source_record_id),
       confidence = 'official'`,
    [machineId, versionId, definitionId, valueText, valueNumber, unit, sourceRecordId],
  );
}

export const johnDeere4Series2026Migration: DbMigration = {
  id: '20260827_020_john_deere_4_series_2026',
  description: 'Add official May 2026 North America specifications for seven John Deere 4 Series tractors',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types (name, slug) VALUES ('Tractor', 'tractor') ON DUPLICATE KEY UPDATE name = VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers (name, slug) VALUES ('John Deere', 'john-deere') ON DUPLICATE KEY UPDATE name = VALUES(name)`);

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name = 'John Deere' AND domain = 'deere.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name, domain, source_type, authority_level) VALUES ('John Deere', 'deere.com', 'manufacturer', 'official')`,
      );
      sourceId = Number(result.insertId);
    }

    let [recordRows] = await connection.query<IdRow[]>(
      `SELECT id FROM source_records WHERE external_id = ? ORDER BY id LIMIT 1`,
      [SOURCE_EXTERNAL_ID],
    );
    let sourceRecordId = recordRows[0]?.id ? Number(recordRows[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id, url, external_id, title, published_date)
         VALUES (?, ?, ?, ?, '2026-05-05')`,
        [sourceId, SOURCE_URL, SOURCE_EXTERNAL_ID, 'John Deere 1000-4000 Compact Utility Tractors Price Book - 5 May 2026'],
      );
      sourceRecordId = Number(result.insertId);
    }

    const definitionIds = new Map<string, number>();
    for (const [section, key, label, valueType, canonicalUnit, displayOrder] of definitions) {
      await connection.query(
        `INSERT INTO spec_definitions (section, spec_key, label, value_type, canonical_unit, display_order)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE section=VALUES(section), label=VALUES(label), value_type=VALUES(value_type), canonical_unit=VALUES(canonical_unit), display_order=VALUES(display_order)`,
        [section, key, label, valueType, canonicalUnit, displayOrder],
      );
      definitionIds.set(key, await selectId(connection, `SELECT id FROM spec_definitions WHERE spec_key = ? LIMIT 1`, [key]));
    }

    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug = 'john-deere' LIMIT 1`);
    const equipmentTypeId = await selectId(connection, `SELECT id FROM equipment_types WHERE slug = 'tractor' LIMIT 1`);

    for (const model of models) {
      await connection.query(
        `INSERT INTO machines (manufacturer_id, equipment_type_id, model_name, slug, data_status)
         VALUES (?, ?, ?, ?, 'partial')
         ON DUPLICATE KEY UPDATE model_name = VALUES(model_name)`,
        [manufacturerId, equipmentTypeId, model.model, model.slug],
      );
      const machineId = await selectId(
        connection,
        `SELECT id FROM machines WHERE manufacturer_id = ? AND equipment_type_id = ? AND slug = ? LIMIT 1`,
        [manufacturerId, equipmentTypeId, model.slug],
      );

      await connection.query(
        `INSERT INTO machine_versions
          (machine_id, slug, market_code, market_name, configuration, is_current, source_record_id, notes)
         VALUES (?, ?, 'US', 'United States', ?, TRUE, ?, ?)
         ON DUPLICATE KEY UPDATE market_code=VALUES(market_code), market_name=VALUES(market_name), configuration=VALUES(configuration), is_current=TRUE, source_record_id=VALUES(source_record_id), notes=VALUES(notes)`,
        [machineId, VERSION_SLUG, model.configuration, sourceRecordId, 'Official North America configuration from the John Deere compact utility tractor price book published 5 May 2026.'],
      );
      const versionId = await selectId(connection, `SELECT id FROM machine_versions WHERE machine_id = ? AND slug = ? LIMIT 1`, [machineId, VERSION_SLUG]);

      const getDef = (key: string) => {
        const id = definitionIds.get(key);
        if (!id) throw new Error(`Missing spec definition: ${key}`);
        return id;
      };

      await upsertSpec(connection, machineId, versionId, getDef('drive.type'), sourceRecordId, '4WD');
      await upsertSpec(connection, machineId, versionId, getDef('engine.make'), sourceRecordId, 'Yanmar');
      await upsertSpec(connection, machineId, versionId, getDef('engine.cylinders'), sourceRecordId, 4);
      await upsertSpec(connection, machineId, versionId, getDef('engine.rated_power'), sourceRecordId, model.hp, 'hp');
      await upsertSpec(connection, machineId, versionId, getDef('engine.displacement'), sourceRecordId, model.displacement, 'L');
      await upsertSpec(connection, machineId, versionId, getDef('engine.rated_speed'), sourceRecordId, 2600, 'rpm');
      await upsertSpec(connection, machineId, versionId, getDef('engine.aspiration'), sourceRecordId, model.aspiration);
      await upsertSpec(connection, machineId, versionId, getDef('engine.emissions'), sourceRecordId, 'Tier IV EPA emissions certified');
      await upsertSpec(connection, machineId, versionId, getDef('transmission.standard'), sourceRecordId, model.transmission);
      if (model.transmissionOption) await upsertSpec(connection, machineId, versionId, getDef('transmission.optional'), sourceRecordId, model.transmissionOption);
      await upsertSpec(connection, machineId, versionId, getDef('pto.rated_power'), sourceRecordId, model.ptoHp, 'hp');
      await upsertSpec(connection, machineId, versionId, getDef('hydraulics.base_configuration'), sourceRecordId, model.hydraulics);
      await upsertSpec(connection, machineId, versionId, getDef('electrical.system_voltage'), sourceRecordId, 12, 'V');
      await upsertSpec(connection, machineId, versionId, getDef('electrical.alternator'), sourceRecordId, 75, 'A');
      await upsertSpec(connection, machineId, versionId, getDef('electrical.battery_cca'), sourceRecordId, 770, 'CCA');

      await connection.query(`UPDATE machines SET data_status = 'partial' WHERE id = ?`, [machineId]);
    }
  },
};
