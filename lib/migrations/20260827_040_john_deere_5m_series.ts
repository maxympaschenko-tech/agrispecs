import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

const SOURCE_URL = 'https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/agricultural/Tractors_5000Ms_05Nov2025.pdf';
const SOURCE_EXTERNAL_ID = 'john-deere-5000m-pricebook-2025-11-05';
const STANDARD_VERSION_SLUG = 'north-america-pricebook-2025-11-05';
const ALDI_VERSION_SLUG = 'north-america-aldi-pricebook-2025-11-05';

type IdRow = RowDataPacket & { id: number };

type ModelData = {
  slug: string;
  model: string;
  hp: number;
  ptoHp: number;
  displacement: number;
  cylinders: number;
  aspiration: string;
  defGal?: number;
  transmission?: string;
  transmissionOption?: string;
  configuration: string;
  versionSlug: string;
  engineRpm?: number;
};

const models: ModelData[] = [
  {
    slug: '5075m', model: '5075M', hp: 75, ptoHp: 57.7, displacement: 2.9, cylinders: 3,
    aspiration: 'Turbocharged',
    configuration: 'North America 5075M utility tractor base specification',
    versionSlug: STANDARD_VERSION_SLUG,
  },
  {
    slug: '5095m', model: '5095M', hp: 95, ptoHp: 80, displacement: 4.5, cylinders: 4,
    aspiration: 'Turbocharged with intercooler', defGal: 3.2,
    configuration: 'North America 5095M utility tractor base specification',
    versionSlug: STANDARD_VERSION_SLUG,
  },
  {
    slug: '5105m', model: '5105M', hp: 105, ptoHp: 90, displacement: 4.5, cylinders: 4,
    aspiration: 'Turbocharged with intercooler', defGal: 3.2,
    configuration: 'North America 5105M utility tractor base specification',
    versionSlug: STANDARD_VERSION_SLUG,
  },
  {
    slug: '5120m', model: '5120M', hp: 120, ptoHp: 105, displacement: 4.5, cylinders: 4,
    aspiration: 'Turbocharged with intercooler', defGal: 3.2,
    configuration: 'North America 5120M utility tractor base specification',
    versionSlug: STANDARD_VERSION_SLUG,
  },
  {
    slug: '5130m', model: '5130M', hp: 130, ptoHp: 115, displacement: 4.5, cylinders: 4,
    aspiration: 'Turbocharged with intercooler', defGal: 3.2,
    configuration: 'North America 5130M utility tractor base specification',
    versionSlug: STANDARD_VERSION_SLUG,
  },
  {
    slug: '5115m', model: '5115M', hp: 115, ptoHp: 100, displacement: 4.5, cylinders: 4,
    aspiration: 'Turbocharged with intercooler', defGal: 3.2, engineRpm: 2200,
    transmission: '16F/16R PowrReverser',
    transmissionOption: '32F/16R PowrReverser Hi-Lo (40 km/h)',
    configuration: 'ALDI 5115M PowrReverser utility tractor specification',
    versionSlug: ALDI_VERSION_SLUG,
  },
  {
    slug: '5125m', model: '5125M', hp: 125, ptoHp: 100, displacement: 4.5, cylinders: 4,
    aspiration: 'Turbocharged with intercooler', defGal: 3.2, engineRpm: 2200,
    transmission: 'PowrQuad PLUS / Powr8',
    configuration: 'ALDI 5125M PowrQuad PLUS/Powr8 utility tractor specification',
    versionSlug: ALDI_VERSION_SLUG,
  },
];

const definitions = [
  ['Engine', 'engine.family', 'Engine', 'text', null, 5],
  ['Engine', 'engine.cylinders', 'Cylinders', 'integer', null, 6],
  ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 10],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 20],
  ['Engine', 'engine.rated_speed', 'Rated engine speed', 'integer', 'rpm', 30],
  ['Engine', 'engine.aspiration', 'Aspiration', 'text', null, 40],
  ['Engine', 'engine.emissions', 'Emissions', 'text', null, 50],
  ['Transmission', 'transmission.standard', 'Transmission', 'text', null, 10],
  ['Transmission', 'transmission.optional', 'Factory transmission option', 'text', null, 20],
  ['PTO', 'pto.rated_power', 'PTO power', 'decimal', 'hp', 10],
  ['PTO', 'pto.rear_description', 'Rear PTO', 'text', null, 20],
  ['Hydraulics', 'hydraulics.system_type', 'Hydraulic system', 'text', null, 5],
  ['Hydraulics', 'hydraulics.total_flow', 'Maximum total flow', 'decimal', 'L/min', 10],
  ['Hydraulics', 'hydraulics.steering_pump_flow', 'Steering pump flow', 'decimal', 'L/min', 20],
  ['Hydraulics', 'hydraulics.implement_pump_flow', 'Implement pump flow', 'decimal', 'L/min', 30],
  ['Capacities', 'capacities.def_tank', 'DEF tank', 'decimal', 'US gal', 20],
  ['Steering & Brakes', 'steering.type', 'Steering', 'text', null, 10],
  ['Steering & Brakes', 'brakes.type', 'Brakes', 'text', null, 20],
  ['Electrical', 'electrical.system_voltage', 'Electrical system', 'integer', 'V', 10],
  ['Electrical', 'electrical.battery_cca', 'Battery', 'integer', 'CCA', 30],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during 5M migration.');
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
    [
      machineId,
      versionId,
      definitionId,
      typeof value === 'string' ? value : null,
      typeof value === 'number' ? value : null,
      unit,
      sourceRecordId,
    ],
  );
}

export const johnDeere5MSeries2025Migration: DbMigration = {
  id: '20260827_040_john_deere_5m_series_2025',
  description: 'Add official November 2025 North America specifications for seven John Deere 5M tractors',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types (name, slug) VALUES ('Tractor', 'tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers (name, slug) VALUES ('John Deere', 'john-deere') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name, domain, source_type, authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [existingRecord] = await connection.query<IdRow[]>(
      `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
      [SOURCE_EXTERNAL_ID],
    );
    let sourceRecordId = existingRecord[0]?.id ? Number(existingRecord[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id, url, external_id, title, published_date)
         VALUES (?, ?, ?, ?, '2025-11-05')`,
        [sourceId, SOURCE_URL, SOURCE_EXTERNAL_ID, 'John Deere 5000M Utility Tractors Price Book - 5 November 2025'],
      );
      sourceRecordId = Number(result.insertId);
    }

    const definitionIds = new Map<string, number>();
    for (const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions) {
      await connection.query(
        `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
           section=VALUES(section), label=VALUES(label), value_type=VALUES(value_type),
           canonical_unit=VALUES(canonical_unit), display_order=VALUES(display_order)`,
        [section,key,label,valueType,canonicalUnit,displayOrder],
      );
      definitionIds.set(key, await selectId(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]));
    }

    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await selectId(connection, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const getDef = (key: string) => {
      const id = definitionIds.get(key);
      if (!id) throw new Error(`Missing spec definition: ${key}`);
      return id;
    };

    for (const model of models) {
      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,model_name,slug,data_status)
         VALUES (?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name)`,
        [manufacturerId,equipmentTypeId,model.model,model.slug],
      );
      const machineId = await selectId(
        connection,
        `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,
        [manufacturerId,equipmentTypeId,model.slug],
      );

      await connection.query(
        `INSERT INTO machine_versions
          (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE
           market_code=VALUES(market_code), market_name=VALUES(market_name),
           configuration=VALUES(configuration), is_current=TRUE,
           source_record_id=VALUES(source_record_id), notes=VALUES(notes)`,
        [
          machineId,
          model.versionSlug,
          model.configuration,
          sourceRecordId,
          'Official North America specification from the John Deere 5000M price book published 5 November 2025. Configuration-specific facts are only stored when explicitly identified by the price book.',
        ],
      );
      const versionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId,model.versionSlug],
      );

      await upsertSpec(connection,machineId,versionId,getDef('engine.family'),sourceRecordId,'John Deere PowerTech diesel');
      await upsertSpec(connection,machineId,versionId,getDef('engine.cylinders'),sourceRecordId,model.cylinders);
      await upsertSpec(connection,machineId,versionId,getDef('engine.rated_power'),sourceRecordId,model.hp,'hp');
      await upsertSpec(connection,machineId,versionId,getDef('engine.displacement'),sourceRecordId,model.displacement,'L');
      if (model.engineRpm !== undefined) {
        await upsertSpec(connection,machineId,versionId,getDef('engine.rated_speed'),sourceRecordId,model.engineRpm,'rpm');
      }
      await upsertSpec(connection,machineId,versionId,getDef('engine.aspiration'),sourceRecordId,model.aspiration);
      await upsertSpec(connection,machineId,versionId,getDef('engine.emissions'),sourceRecordId,'EPA Final Tier 4 compliant');
      if (model.transmission) await upsertSpec(connection,machineId,versionId,getDef('transmission.standard'),sourceRecordId,model.transmission);
      if (model.transmissionOption) await upsertSpec(connection,machineId,versionId,getDef('transmission.optional'),sourceRecordId,model.transmissionOption);

      await upsertSpec(connection,machineId,versionId,getDef('pto.rated_power'),sourceRecordId,model.ptoHp,'hp');
      await upsertSpec(connection,machineId,versionId,getDef('pto.rear_description'),sourceRecordId,'Independent live 540 rpm rear PTO at 2100 engine rpm; economy 540 PTO setting at 1645 engine rpm');
      await upsertSpec(connection,machineId,versionId,getDef('hydraulics.system_type'),sourceRecordId,'Open center');
      await upsertSpec(connection,machineId,versionId,getDef('hydraulics.total_flow'),sourceRecordId,94,'L/min');
      await upsertSpec(connection,machineId,versionId,getDef('hydraulics.steering_pump_flow'),sourceRecordId,24,'L/min');
      await upsertSpec(connection,machineId,versionId,getDef('hydraulics.implement_pump_flow'),sourceRecordId,70,'L/min');
      if (model.defGal !== undefined) {
        await upsertSpec(connection,machineId,versionId,getDef('capacities.def_tank'),sourceRecordId,model.defGal,'US gal');
      }
      await upsertSpec(connection,machineId,versionId,getDef('steering.type'),sourceRecordId,'Hydrostatic power steering');
      await upsertSpec(connection,machineId,versionId,getDef('brakes.type'),sourceRecordId,'Hydraulic wet disk brakes, self-equalizing and self-adjusting');
      await upsertSpec(connection,machineId,versionId,getDef('electrical.system_voltage'),sourceRecordId,12,'V');
      await upsertSpec(connection,machineId,versionId,getDef('electrical.battery_cca'),sourceRecordId,925,'CCA');

      await connection.query(`UPDATE machines SET data_status='partial' WHERE id=?`, [machineId]);
    }
  },
};
