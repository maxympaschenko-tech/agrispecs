import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

const SOURCE_URL = 'https://www.deere.com/en/tractors/utility-tractors/6-family-utility-tractors/';
const SOURCE_EXTERNAL_ID = 'john-deere-us-6m-family-current-2026-08';
const VERSION_SLUG = 'united-states-current-2026-08';

type IdRow = RowDataPacket & { id: number };

type ModelData = {
  slug: string;
  model: string;
  ratedHp: number;
  maxHp: number;
  ptoHp: number;
  standardTransmission: string;
  optionalTransmission: string;
  pumpStandard: number;
  pumpOptional: number;
  exactEngine?: {
    displacementL: number;
    cylinders: number;
    ratedRpm: number;
    engineModel: string;
    aspiration: string;
  };
};

const commonTransmission = {
  standard: 'John Deere 24-speed PowrQuad Plus, 25 mph (40 km/h)',
  optional: '16-speed PowrQuad Plus 19 mph (30 km/h); 24-speed AutoQuad Plus 25/31 mph (40/50 km/h); 24-speed CommandQuad Plus 25/31 mph (40/50 km/h); AutoPowr/IVT 25/31 mph (40/50 km/h)',
};

const models: ModelData[] = [
  { slug: '6m-95', model: '6M 95', ratedHp: 95, maxHp: 105, ptoHp: 70, standardTransmission: commonTransmission.standard, optionalTransmission: commonTransmission.optional, pumpStandard: 80, pumpOptional: 114 },
  { slug: '6m-105', model: '6M 105', ratedHp: 105, maxHp: 116, ptoHp: 79, standardTransmission: commonTransmission.standard, optionalTransmission: commonTransmission.optional, pumpStandard: 80, pumpOptional: 114 },
  { slug: '6m-115', model: '6M 115', ratedHp: 115, maxHp: 126, ptoHp: 88, standardTransmission: commonTransmission.standard, optionalTransmission: commonTransmission.optional, pumpStandard: 80, pumpOptional: 114, exactEngine: { displacementL: 4.5, cylinders: 4, ratedRpm: 2100, engineModel: 'John Deere PowerTech EWL', aspiration: 'Turbocharged, wastegate turbocharger with air-to-air aftercooling and cooled exhaust gas recirculation' } },
  { slug: '6m-125', model: '6M 125', ratedHp: 125, maxHp: 138, ptoHp: 97, standardTransmission: commonTransmission.standard, optionalTransmission: commonTransmission.optional, pumpStandard: 80, pumpOptional: 114, exactEngine: { displacementL: 4.5, cylinders: 4, ratedRpm: 2100, engineModel: 'John Deere PowerTech EWL', aspiration: 'Turbocharged, wastegate turbocharger with air-to-air aftercooling and cooled exhaust gas recirculation' } },
  { slug: '6m-130', model: '6M 130', ratedHp: 130, maxHp: 143, ptoHp: 100, standardTransmission: commonTransmission.standard, optionalTransmission: commonTransmission.optional, pumpStandard: 80, pumpOptional: 114 },
  { slug: '6m-140', model: '6M 140', ratedHp: 140, maxHp: 154, ptoHp: 111, standardTransmission: commonTransmission.standard, optionalTransmission: commonTransmission.optional, pumpStandard: 80, pumpOptional: 114, exactEngine: { displacementL: 4.5, cylinders: 4, ratedRpm: 2100, engineModel: 'John Deere PowerTech PSS', aspiration: 'Dual turbochargers, variable geometry turbo with fixed geometry turbo in series' } },
  { slug: '6m-150', model: '6M 150', ratedHp: 150, maxHp: 165, ptoHp: 120, standardTransmission: 'AutoPowr/IVT, 25 mph (40 km/h)', optionalTransmission: 'AutoPowr/IVT, 31 mph (50 km/h)', pumpStandard: 114, pumpOptional: 155 },
];

const definitions = [
  ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 10],
  ['Engine', 'engine.maximum_power', 'Maximum engine power', 'decimal', 'hp', 15],
  ['Engine', 'engine.model', 'Engine model', 'text', null, 5],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 20],
  ['Engine', 'engine.cylinders', 'Cylinders', 'integer', null, 25],
  ['Engine', 'engine.rated_speed', 'Rated engine speed', 'integer', 'rpm', 30],
  ['Engine', 'engine.aspiration', 'Aspiration', 'text', null, 40],
  ['Engine', 'engine.emissions', 'Emissions', 'text', null, 50],
  ['Engine', 'engine.ipm_boost', 'Intelligent Power Management', 'text', null, 60],
  ['Transmission', 'transmission.standard', 'Standard transmission', 'text', null, 10],
  ['Transmission', 'transmission.optional', 'Transmission options', 'text', null, 20],
  ['PTO', 'pto.rated_power', 'PTO power', 'decimal', 'hp', 10],
  ['Hydraulics', 'hydraulics.pump_rated_output', 'Standard pump rated output', 'decimal', 'L/min', 10],
  ['Hydraulics', 'hydraulics.pump_optional_output', 'Optional pump rated output', 'decimal', 'L/min', 20],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during 6M migration.');
  return Number(rows[0].id);
}

async function upsertSpec(connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null = null) {
  await connection.query(
    `INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES (?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text), value_number=VALUES(value_number), unit=VALUES(unit), source_record_id=VALUES(source_record_id), confidence='official'`,
    [machineId,versionId,definitionId,typeof value === 'string' ? value : null,typeof value === 'number' ? value : null,unit,sourceRecordId],
  );
}

export const johnDeere6MSeriesCurrentMigration: DbMigration = {
  id: '20260827_050_john_deere_6m_series_current',
  description: 'Add current official US specifications for seven priority John Deere 6M tractors',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types (name,slug) VALUES ('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers (name,slug) VALUES ('John Deere','john-deere') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    const [existingRecord] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [SOURCE_EXTERNAL_ID]);
    let sourceRecordId = existingRecord[0]?.id ? Number(existingRecord[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'John Deere US 6 Series Utility Tractors - current 6M comparison catalog'],
      );
      sourceRecordId = Number(result.insertId);
    }

    const definitionIds = new Map<string,number>();
    for (const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions) {
      await connection.query(
        `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        [section,key,label,valueType,canonicalUnit,displayOrder],
      );
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }

    const manufacturerId = await selectId(connection,`SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await selectId(connection,`SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const getDef = (key: string) => {
      const id = definitionIds.get(key);
      if (!id) throw new Error(`Missing spec definition: ${key}`);
      return id;
    };

    for (const model of models) {
      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,model_name,slug,data_status) VALUES (?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name)`,
        [manufacturerId,equipmentTypeId,model.model,model.slug],
      );
      const machineId = await selectId(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.slug]);
      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States','Current US catalog specification',TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code=VALUES(market_code),market_name=VALUES(market_name),configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,VERSION_SLUG,sourceRecordId,'Current John Deere US 6M comparison catalog captured in August 2026. Exact product-page fields are used only where separately confirmed.'],
      );
      const versionId = await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,VERSION_SLUG]);

      await upsertSpec(connection,machineId,versionId,getDef('engine.rated_power'),sourceRecordId,model.ratedHp,'hp');
      await upsertSpec(connection,machineId,versionId,getDef('engine.maximum_power'),sourceRecordId,model.maxHp,'hp');
      await upsertSpec(connection,machineId,versionId,getDef('engine.ipm_boost'),sourceRecordId,'Up to 20 hp additional power in transport or non-stationary PTO applications');
      await upsertSpec(connection,machineId,versionId,getDef('transmission.standard'),sourceRecordId,model.standardTransmission);
      await upsertSpec(connection,machineId,versionId,getDef('transmission.optional'),sourceRecordId,model.optionalTransmission);
      await upsertSpec(connection,machineId,versionId,getDef('pto.rated_power'),sourceRecordId,model.ptoHp,'hp');
      await upsertSpec(connection,machineId,versionId,getDef('hydraulics.pump_rated_output'),sourceRecordId,model.pumpStandard,'L/min');
      await upsertSpec(connection,machineId,versionId,getDef('hydraulics.pump_optional_output'),sourceRecordId,model.pumpOptional,'L/min');

      if (model.exactEngine) {
        await upsertSpec(connection,machineId,versionId,getDef('engine.model'),sourceRecordId,model.exactEngine.engineModel);
        await upsertSpec(connection,machineId,versionId,getDef('engine.displacement'),sourceRecordId,model.exactEngine.displacementL,'L');
        await upsertSpec(connection,machineId,versionId,getDef('engine.cylinders'),sourceRecordId,model.exactEngine.cylinders);
        await upsertSpec(connection,machineId,versionId,getDef('engine.rated_speed'),sourceRecordId,model.exactEngine.ratedRpm,'rpm');
        await upsertSpec(connection,machineId,versionId,getDef('engine.aspiration'),sourceRecordId,model.exactEngine.aspiration);
        await upsertSpec(connection,machineId,versionId,getDef('engine.emissions'),sourceRecordId,'Final Tier 4');
      }

      await connection.query(`UPDATE machines SET data_status='partial' WHERE id=?`,[machineId]);
    }
  },
};
