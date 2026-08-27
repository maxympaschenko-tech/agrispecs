import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

const PRICEBOOK_URL = 'https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/agricultural/TRACTORS_6000s_05May2026.pdf';
const FAMILY_URL = 'https://www.deere.com/en/tractors/utility-tractors/6-family-utility-tractors/';
const PRICEBOOK_EXTERNAL_ID = 'john-deere-6000s-pricebook-2026-05-05';
const FAMILY_EXTERNAL_ID = 'john-deere-us-6r-family-current-2026-08';
const VERSION_SLUG = 'united-states-current-2026-08';

type IdRow = RowDataPacket & { id: number };

type ModelData = {
  slug: string;
  model: string;
  engineModel: string;
  displacementL: number;
  cylinders: number;
  ratedHp: number;
  maxHp: number;
  ratedWithIpmHp?: number;
  maxWithIpmHp?: number;
  defTankL: number;
  ptoHp?: number;
  standardTransmission?: string;
  optionalTransmission?: string;
  pumpStandard?: number;
  pumpOptional?: number;
  ratedRpm?: number;
  aspiration?: string;
  emissions?: string;
};

const models: ModelData[] = [
  { slug: '6r-110', model: '6R 110', engineModel: 'John Deere PowerTech PSS', displacementL: 4.53, cylinders: 4, ratedHp: 110, maxHp: 121, ratedWithIpmHp: 130, maxWithIpmHp: 135, defTankL: 13, ptoHp: 83, standardTransmission: 'John Deere AutoPowr/IVT 25 mph (40 km/h)', optionalTransmission: 'AutoPowr/IVT 31 mph (50 km/h); 24-speed AutoQuad Plus ECO 25 mph (40 km/h) or 31 mph (50 km/h)', pumpStandard: 114 },
  { slug: '6r-120', model: '6R 120', engineModel: 'John Deere PowerTech PSS', displacementL: 4.5, cylinders: 4, ratedHp: 120, maxHp: 130, ratedWithIpmHp: 138, maxWithIpmHp: 143, defTankL: 13, ptoHp: 91, standardTransmission: 'John Deere AutoPowr/IVT 25 mph (40 km/h)', optionalTransmission: 'AutoPowr/IVT 31 mph (50 km/h); 24-speed AutoQuad Plus ECO 25 mph (40 km/h) or 31 mph (50 km/h)', pumpStandard: 114, pumpOptional: 155, ratedRpm: 2100, aspiration: 'Dual turbochargers, wastegate turbo with fixed geometry turbo in series', emissions: 'Final Tier 4' },
  { slug: '6r-130', model: '6R 130', engineModel: 'John Deere PowerTech PSS', displacementL: 4.53, cylinders: 4, ratedHp: 130, maxHp: 143, ratedWithIpmHp: 150, maxWithIpmHp: 156, defTankL: 13, ptoHp: 101, standardTransmission: 'John Deere AutoPowr/IVT 25 mph (40 km/h)', optionalTransmission: 'AutoPowr/IVT 31 mph (50 km/h); 24-speed AutoQuad Plus ECO 25 mph (40 km/h) or 31 mph (50 km/h)', pumpStandard: 114, pumpOptional: 155 },
  { slug: '6r-140', model: '6R 140', engineModel: 'John Deere PowerTech PSS', displacementL: 4.53, cylinders: 4, ratedHp: 140, maxHp: 154, ratedWithIpmHp: 160, maxWithIpmHp: 166, defTankL: 13, ptoHp: 110, standardTransmission: 'John Deere AutoPowr/IVT 25 mph (40 km/h)', optionalTransmission: 'AutoPowr/IVT 31 mph (50 km/h); 24-speed AutoQuad Plus ECO 25 mph (40 km/h) or 31 mph (50 km/h)', pumpStandard: 114, pumpOptional: 155 },
  { slug: '6r-150', model: '6R 150', engineModel: 'John Deere PowerTech PSS', displacementL: 4.5, cylinders: 4, ratedHp: 148, maxHp: 163, ratedWithIpmHp: 168, maxWithIpmHp: 174, defTankL: 13, ptoHp: 119, standardTransmission: 'John Deere AutoPowr/IVT 25 mph (40 km/h)', optionalTransmission: 'John Deere AutoPowr/IVT 31 mph (50 km/h)', pumpStandard: 114, pumpOptional: 155, ratedRpm: 2100, aspiration: 'Dual turbochargers, wastegate turbo with fixed geometry turbo in series', emissions: 'Final Tier 4' },
  { slug: '6r-175', model: '6R 175', engineModel: 'John Deere PowerTech PVS', displacementL: 6.788, cylinders: 6, ratedHp: 175, maxHp: 193, ratedWithIpmHp: 215, maxWithIpmHp: 223, defTankL: 20 },
  { slug: '6r-195', model: '6R 195', engineModel: 'John Deere PowerTech PVS', displacementL: 6.788, cylinders: 6, ratedHp: 195, maxHp: 215, ratedWithIpmHp: 235, maxWithIpmHp: 244, defTankL: 20 },
];

const definitions = [
  ['Engine', 'engine.model', 'Engine model', 'text', null, 5],
  ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 10],
  ['Engine', 'engine.maximum_power', 'Maximum engine power', 'decimal', 'hp', 15],
  ['Engine', 'engine.rated_power_ipm', 'Rated engine power with IPM', 'decimal', 'hp', 17],
  ['Engine', 'engine.maximum_power_ipm', 'Maximum engine power with IPM', 'decimal', 'hp', 18],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 20],
  ['Engine', 'engine.cylinders', 'Cylinders', 'integer', null, 25],
  ['Engine', 'engine.rated_speed', 'Rated engine speed', 'integer', 'rpm', 30],
  ['Engine', 'engine.aspiration', 'Aspiration', 'text', null, 40],
  ['Engine', 'engine.emissions', 'Emissions', 'text', null, 50],
  ['Transmission', 'transmission.standard', 'Standard transmission', 'text', null, 10],
  ['Transmission', 'transmission.optional', 'Transmission options', 'text', null, 20],
  ['PTO', 'pto.rated_power', 'PTO power', 'decimal', 'hp', 10],
  ['Hydraulics', 'hydraulics.pump_rated_output', 'Standard pump rated output', 'decimal', 'L/min', 10],
  ['Hydraulics', 'hydraulics.pump_optional_output', 'Optional pump rated output', 'decimal', 'L/min', 20],
  ['Capacities', 'capacities.def_tank', 'DEF tank capacity', 'decimal', 'L', 20],
  ['Electrical', 'electrical.battery_system', 'Battery', 'text', null, 10],
  ['Electrical', 'electrical.alternator', 'Alternator', 'text', null, 20],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during 6R migration.');
  return Number(rows[0].id);
}

async function upsertSpec(connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null = null) {
  await connection.query(
    `INSERT INTO machine_specs (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES (?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId,versionId,definitionId,typeof value === 'string' ? value : null,typeof value === 'number' ? value : null,unit,sourceRecordId],
  );
}

export const johnDeere6RSeriesCurrentMigration: DbMigration = {
  id: '20260827_060_john_deere_6r_series_current',
  description: 'Add official current US specifications for seven priority John Deere 6R tractors',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types (name,slug) VALUES ('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers (name,slug) VALUES ('John Deere','john-deere') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    async function ensureSourceRecord(externalId: string, url: string, title: string, publishedDate: string | null) {
      const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,[externalId]);
      if (existing[0]?.id) return Number(existing[0].id);
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
        [sourceId,url,externalId,title,publishedDate],
      );
      return Number(result.insertId);
    }

    const pricebookRecordId = await ensureSourceRecord(PRICEBOOK_EXTERNAL_ID,PRICEBOOK_URL,'John Deere 6000 Series North America price book - 5 May 2026','2026-05-05');
    const familyRecordId = await ensureSourceRecord(FAMILY_EXTERNAL_ID,FAMILY_URL,'John Deere US 6 Series Tractors - current 6R comparison catalog',null);

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
         VALUES (?,?,'US','United States','Current US / 2026 North America specification',TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code=VALUES(market_code),market_name=VALUES(market_name),configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,VERSION_SLUG,pricebookRecordId,'Engine and electrical data use the 5 May 2026 Deere price book. US comparison-page values are used for PTO, transmission and hydraulics when available.'],
      );
      const versionId = await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,VERSION_SLUG]);

      await upsertSpec(connection,machineId,versionId,getDef('engine.model'),pricebookRecordId,model.engineModel);
      await upsertSpec(connection,machineId,versionId,getDef('engine.rated_power'),pricebookRecordId,model.ratedHp,'hp');
      await upsertSpec(connection,machineId,versionId,getDef('engine.maximum_power'),pricebookRecordId,model.maxHp,'hp');
      if (model.ratedWithIpmHp !== undefined) await upsertSpec(connection,machineId,versionId,getDef('engine.rated_power_ipm'),pricebookRecordId,model.ratedWithIpmHp,'hp');
      if (model.maxWithIpmHp !== undefined) await upsertSpec(connection,machineId,versionId,getDef('engine.maximum_power_ipm'),pricebookRecordId,model.maxWithIpmHp,'hp');
      await upsertSpec(connection,machineId,versionId,getDef('engine.displacement'),pricebookRecordId,model.displacementL,'L');
      await upsertSpec(connection,machineId,versionId,getDef('engine.cylinders'),pricebookRecordId,model.cylinders);
      await upsertSpec(connection,machineId,versionId,getDef('capacities.def_tank'),pricebookRecordId,model.defTankL,'L');
      await upsertSpec(connection,machineId,versionId,getDef('electrical.battery_system'),pricebookRecordId,'12 V / 174 A');
      await upsertSpec(connection,machineId,versionId,getDef('electrical.alternator'),pricebookRecordId,'14 V / 250 A');

      if (model.ratedRpm !== undefined) await upsertSpec(connection,machineId,versionId,getDef('engine.rated_speed'),familyRecordId,model.ratedRpm,'rpm');
      if (model.aspiration) await upsertSpec(connection,machineId,versionId,getDef('engine.aspiration'),familyRecordId,model.aspiration);
      if (model.emissions) await upsertSpec(connection,machineId,versionId,getDef('engine.emissions'),familyRecordId,model.emissions);
      if (model.ptoHp !== undefined) await upsertSpec(connection,machineId,versionId,getDef('pto.rated_power'),familyRecordId,model.ptoHp,'hp');
      if (model.standardTransmission) await upsertSpec(connection,machineId,versionId,getDef('transmission.standard'),familyRecordId,model.standardTransmission);
      if (model.optionalTransmission) await upsertSpec(connection,machineId,versionId,getDef('transmission.optional'),familyRecordId,model.optionalTransmission);
      if (model.pumpStandard !== undefined) await upsertSpec(connection,machineId,versionId,getDef('hydraulics.pump_rated_output'),familyRecordId,model.pumpStandard,'L/min');
      if (model.pumpOptional !== undefined) await upsertSpec(connection,machineId,versionId,getDef('hydraulics.pump_optional_output'),familyRecordId,model.pumpOptional,'L/min');

      await connection.query(`UPDATE machines SET data_status='partial' WHERE id=?`,[machineId]);
    }
  },
};
