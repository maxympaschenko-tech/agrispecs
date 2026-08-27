import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

const SOURCE_URL = 'https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/agricultural/TRACTORS_1000-4000-CUTS_05May2026.pdf';
const SOURCE_EXTERNAL_ID = 'john-deere-1000-4000-cuts-pricebook-2026-05-05';
const VERSION_SLUG = 'north-america-pricebook-2026-05-05';

type ModelData = {
  slug: string;
  model: string;
  hp: number;
  ptoHp?: number;
  rpm: number;
  displacement: number;
  transmission: string;
  hydraulics?: [number, number, number];
  alternator: number;
  batteryCca: number;
  ptoDescription: string;
  emissions?: string;
  aspiration?: string;
  configuration: string;
};

type IdRow = RowDataPacket & { id: number };

const models: ModelData[] = [
  { slug: '3025d', model: '3025D', hp: 24.7, rpm: 2400, displacement: 1.642, transmission: 'Gear transmission, 8F/8R', hydraulics: [32, 19, 13], alternator: 55, batteryCca: 600, ptoDescription: 'Transmission-driven 540 rpm rear PTO; mechanically engaged wet clutch', emissions: 'Tier IV EPA emissions certified', configuration: '4WD gear transmission base specification' },
  { slug: '3035d', model: '3035D', hp: 34.7, rpm: 2800, displacement: 1.642, transmission: 'Gear transmission, 8F/8R', hydraulics: [32, 19, 13], alternator: 55, batteryCca: 600, ptoDescription: 'Transmission-driven 540 rpm rear PTO; mechanically engaged wet clutch', emissions: 'Tier IV EPA emissions certified', configuration: '4WD gear transmission base specification' },
  { slug: '3043d', model: '3043D', hp: 42.2, rpm: 2800, displacement: 1.568, transmission: 'Gear transmission, 8F/8R', hydraulics: [32, 19, 13], alternator: 55, batteryCca: 600, ptoDescription: 'Transmission-driven 540 rpm rear PTO; mechanically engaged wet clutch', emissions: 'Tier IV EPA emissions certified', configuration: '4WD gear transmission base specification' },
  { slug: '3025e', model: '3025E', hp: 24.7, ptoHp: 19.4, rpm: 2500, displacement: 1.642, transmission: 'Hydrostatic (HST), 2 ranges', hydraulics: [35.2, 20.1, 15.1], alternator: 55, batteryCca: 500, ptoDescription: 'Independent 540 rpm rear PTO; electronically engaged wet clutch', emissions: 'Tier IV EPA emissions certified', configuration: '4WD HST base specification' },
  { slug: '3032e', model: '3032E', hp: 31.1, ptoHp: 25, rpm: 2500, displacement: 1.642, transmission: 'Hydrostatic (HST), 2 ranges', hydraulics: [35.2, 20.1, 15.1], alternator: 55, batteryCca: 500, ptoDescription: 'Independent 540 rpm rear PTO; electronically engaged wet clutch', emissions: 'Tier IV EPA emissions certified', configuration: '4WD HST base specification' },
  { slug: '3038e', model: '3038E', hp: 37.3, ptoHp: 30, rpm: 2500, displacement: 1.568, transmission: 'Hydrostatic (HST), 2 ranges', hydraulics: [35.2, 20.1, 15.1], alternator: 55, batteryCca: 500, ptoDescription: 'Independent 540 rpm rear PTO; electronically engaged wet clutch', emissions: 'Tier IV EPA emissions certified', configuration: '4WD HST base specification' },
  { slug: '3033r', model: '3033R', hp: 32.2, ptoHp: 25.5, rpm: 2600, displacement: 1.642, transmission: 'eHydro, 3-range electronically controlled hydrostatic transmission', alternator: 75, batteryCca: 770, ptoDescription: 'Independent 540 rpm rear PTO; electronically engaged with mechanical mid/both/rear selector', emissions: 'Tier IV EPA emissions certified', configuration: '4WD eHydro base specification' },
  { slug: '3039r', model: '3039R', hp: 38.7, ptoHp: 31.1, rpm: 2600, displacement: 1.496, transmission: 'eHydro hydrostatic transmission', alternator: 75, batteryCca: 770, ptoDescription: 'Independent 540 rpm rear PTO; electronically engaged with mechanical mid/both/rear selector', aspiration: 'Turbocharged', configuration: '4WD eHydro base specification' },
  { slug: '3046r', model: '3046R', hp: 45.3, ptoHp: 34.1, rpm: 2600, displacement: 1.496, transmission: 'Hydrostatic (HST) transmission', alternator: 75, batteryCca: 770, ptoDescription: 'Independent 540 rpm rear PTO; electronically engaged with mechanical mid/both/rear selector', aspiration: 'Turbocharged', configuration: '4WD HST base specification' },
];

const definitions = [
  ['Machine Configuration', 'drive.type', 'Drive type', 'text', null, 10],
  ['Engine', 'engine.make', 'Engine manufacturer', 'text', null, 5],
  ['Engine', 'engine.cooling_system', 'Engine cooling', 'text', null, 6],
  ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 10],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 20],
  ['Engine', 'engine.rated_speed', 'Rated engine speed', 'integer', 'rpm', 30],
  ['Engine', 'engine.aspiration', 'Aspiration', 'text', null, 40],
  ['Engine', 'engine.emissions', 'Emissions', 'text', null, 50],
  ['Transmission', 'transmission.standard', 'Transmission', 'text', null, 10],
  ['Hydraulics', 'hydraulics.total_flow', 'Total hydraulic flow', 'decimal', 'L/min', 10],
  ['Hydraulics', 'hydraulics.implement_pump_flow', 'Implement pump flow', 'decimal', 'L/min', 20],
  ['Hydraulics', 'hydraulics.steering_pump_flow', 'Steering pump flow', 'decimal', 'L/min', 30],
  ['PTO', 'pto.rated_power', 'PTO power', 'decimal', 'hp', 10],
  ['PTO', 'pto.rear_description', 'Rear PTO', 'text', null, 20],
  ['Electrical', 'electrical.system_voltage', 'Electrical system', 'integer', 'V', 10],
  ['Electrical', 'electrical.alternator', 'Alternator', 'integer', 'A', 20],
  ['Electrical', 'electrical.battery_cca', 'Battery', 'integer', 'CCA', 30],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during migration.');
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

export const johnDeere3Series2026Migration: DbMigration = {
  id: '20260827_010_john_deere_3_series_2026',
  description: 'Add official May 2026 North America specifications for nine John Deere 3 Series tractors',
  async apply(connection) {
    await connection.query(
      `INSERT INTO equipment_types (name, slug)
       VALUES ('Tractor', 'tractor')
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    );

    await connection.query(
      `INSERT INTO manufacturers (name, slug)
       VALUES ('John Deere', 'john-deere')
       ON DUPLICATE KEY UPDATE name = VALUES(name)`,
    );

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name = 'John Deere' AND domain = 'deere.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name, domain, source_type, authority_level)
         VALUES ('John Deere', 'deere.com', 'manufacturer', 'official')`,
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
         ON DUPLICATE KEY UPDATE
           section = VALUES(section),
           label = VALUES(label),
           value_type = VALUES(value_type),
           canonical_unit = VALUES(canonical_unit),
           display_order = VALUES(display_order)`,
        [section, key, label, valueType, canonicalUnit, displayOrder],
      );
      definitionIds.set(key, await selectId(connection, 'SELECT id FROM spec_definitions WHERE spec_key = ? LIMIT 1', [key]));
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
         ON DUPLICATE KEY UPDATE
           market_code = VALUES(market_code),
           market_name = VALUES(market_name),
           configuration = VALUES(configuration),
           is_current = TRUE,
           source_record_id = VALUES(source_record_id),
           notes = VALUES(notes)`,
        [
          machineId,
          VERSION_SLUG,
          model.configuration,
          sourceRecordId,
          'Official North America configuration from the John Deere compact utility tractor price book published 5 May 2026.',
        ],
      );

      const versionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id = ? AND slug = ? LIMIT 1`,
        [machineId, VERSION_SLUG],
      );

      const getDef = (key: string) => {
        const id = definitionIds.get(key);
        if (!id) throw new Error(`Missing spec definition: ${key}`);
        return id;
      };

      await upsertSpec(connection, machineId, versionId, getDef('drive.type'), sourceRecordId, '4WD');
      await upsertSpec(connection, machineId, versionId, getDef('engine.make'), sourceRecordId, 'Yanmar');
      await upsertSpec(connection, machineId, versionId, getDef('engine.cooling_system'), sourceRecordId, 'Liquid-cooled diesel');
      await upsertSpec(connection, machineId, versionId, getDef('engine.rated_power'), sourceRecordId, model.hp, 'hp');
      await upsertSpec(connection, machineId, versionId, getDef('engine.displacement'), sourceRecordId, model.displacement, 'L');
      await upsertSpec(connection, machineId, versionId, getDef('engine.rated_speed'), sourceRecordId, model.rpm, 'rpm');
      if (model.aspiration) await upsertSpec(connection, machineId, versionId, getDef('engine.aspiration'), sourceRecordId, model.aspiration);
      if (model.emissions) await upsertSpec(connection, machineId, versionId, getDef('engine.emissions'), sourceRecordId, model.emissions);
      await upsertSpec(connection, machineId, versionId, getDef('transmission.standard'), sourceRecordId, model.transmission);

      if (model.hydraulics) {
        await upsertSpec(connection, machineId, versionId, getDef('hydraulics.total_flow'), sourceRecordId, model.hydraulics[0], 'L/min');
        await upsertSpec(connection, machineId, versionId, getDef('hydraulics.implement_pump_flow'), sourceRecordId, model.hydraulics[1], 'L/min');
        await upsertSpec(connection, machineId, versionId, getDef('hydraulics.steering_pump_flow'), sourceRecordId, model.hydraulics[2], 'L/min');
      }

      if (model.ptoHp !== undefined) {
        await upsertSpec(connection, machineId, versionId, getDef('pto.rated_power'), sourceRecordId, model.ptoHp, 'hp');
      }
      await upsertSpec(connection, machineId, versionId, getDef('pto.rear_description'), sourceRecordId, model.ptoDescription);
      await upsertSpec(connection, machineId, versionId, getDef('electrical.system_voltage'), sourceRecordId, 12, 'V');
      await upsertSpec(connection, machineId, versionId, getDef('electrical.alternator'), sourceRecordId, model.alternator, 'A');
      await upsertSpec(connection, machineId, versionId, getDef('electrical.battery_cca'), sourceRecordId, model.batteryCca, 'CCA');

      await connection.query(`UPDATE machines SET data_status = 'partial' WHERE id = ?`, [machineId]);
    }
  },
};
