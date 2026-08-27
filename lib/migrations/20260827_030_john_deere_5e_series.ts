import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type ModelData = {
  slug: string;
  model: string;
  hp: number;
  ptoHp: number;
  rpm: number;
  displacement: number;
  cylinders: number;
  engine: string;
  aspiration: string;
  fuelTankL: number;
  defTankL?: number;
  transmission?: string;
  transmissionOption?: string;
  drive?: string;
  hyd?: [number, number, number];
  batteryCca: number;
  alternatorA: number;
  versionSlug: string;
  configuration: string;
  sourceGroup: 'three-cylinder' | 'four-cylinder';
};

const models: ModelData[] = [
  { slug: '5045e', model: '5045E', hp: 50, ptoHp: 37, rpm: 2100, displacement: 2.9, cylinders: 3, engine: 'John Deere PowerTech diesel', aspiration: 'Turbocharged', fuelTankL: 74, hyd: [68.9, 25.7, 43.1], batteryCca: 623, alternatorA: 40, versionSlug: 'north-america-my2018-my2023', configuration: 'North America utility tractor specification', sourceGroup: 'three-cylinder' },
  { slug: '5055e', model: '5055E', hp: 59, ptoHp: 41, rpm: 2100, displacement: 2.9, cylinders: 3, engine: 'John Deere PowerTech diesel', aspiration: 'Turbocharged', fuelTankL: 74, transmission: '9F/3R SyncShuttle', transmissionOption: '12F/12R PowrReverser - 540/540E', hyd: [68.9, 25.7, 43.1], batteryCca: 623, alternatorA: 40, versionSlug: 'north-america-my2018-my2023', configuration: 'North America utility tractor specification', sourceGroup: 'three-cylinder' },
  { slug: '5065e', model: '5065E', hp: 67, ptoHp: 49, rpm: 2100, displacement: 2.9, cylinders: 3, engine: 'John Deere PowerTech diesel', aspiration: 'Turbocharged', fuelTankL: 74, transmission: '9F/3R SyncShuttle', transmissionOption: '12F/12R PowrReverser - 540/540E', hyd: [68.9, 25.7, 43.1], batteryCca: 623, alternatorA: 40, versionSlug: 'north-america-my2018-my2023', configuration: 'North America utility tractor specification', sourceGroup: 'three-cylinder' },
  { slug: '5075e', model: '5075E', hp: 73, ptoHp: 57, rpm: 2100, displacement: 2.9, cylinders: 3, engine: 'John Deere PowerTech diesel', aspiration: 'Turbocharged', fuelTankL: 74, transmission: '9F/3R SyncShuttle', transmissionOption: '12F/12R PowrReverser - 540/540E', hyd: [68.9, 25.7, 43.1], batteryCca: 623, alternatorA: 40, versionSlug: 'north-america-my2018-my2023', configuration: 'North America utility tractor specification', sourceGroup: 'three-cylinder' },
  { slug: '5090e', model: '5090E', hp: 90, ptoHp: 75, rpm: 2400, displacement: 4.5, cylinders: 4, engine: 'John Deere PowerTech PWL diesel', aspiration: 'Turbocharged', fuelTankL: 113.6, defTankL: 9.5, transmission: '12F/12R PowrReverser - 540/540E', transmissionOption: '24F/12R PowrReverser - 540/540E', drive: 'MFWD (4WD)', batteryCca: 950, alternatorA: 90, versionSlug: 'north-america-pricebook-2022-01-01', configuration: 'Cab utility tractor base specification', sourceGroup: 'four-cylinder' },
  { slug: '5100e', model: '5100E', hp: 100, ptoHp: 85, rpm: 2400, displacement: 4.5, cylinders: 4, engine: 'John Deere PowerTech PWL diesel', aspiration: 'Turbocharged', fuelTankL: 113.6, defTankL: 9.5, transmission: '12F/12R PowrReverser - 540/540E', transmissionOption: '24F/12R PowrReverser - 540/540E', drive: 'MFWD (4WD)', batteryCca: 950, alternatorA: 90, versionSlug: 'north-america-pricebook-2022-01-01', configuration: 'Cab utility tractor base specification', sourceGroup: 'four-cylinder' },
];

const sources = {
  'three-cylinder': {
    externalId: 'john-deere-5045e-5075e-pricebook-2022-01-01',
    url: 'https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/agricultural/Tractors_5045E_5055E_5065E_5075E_Jan2022.pdf',
    title: 'John Deere 5045E, 5055E, 5065E and 5075E Utility Tractors Price Book - 1 January 2022',
  },
  'four-cylinder': {
    externalId: 'john-deere-5090e-5090el-5100e-pricebook-2022-01-01',
    url: 'https://www.deere.com/assets/pdfs/region-4/industries/government-and-military-sales/contracts/price-pages/agricultural/Tractors_5090E_5090EL_5100E_Jan2022.pdf',
    title: 'John Deere 5090E, 5090EL and 5100E Utility Tractors Price Book - 1 January 2022',
  },
} as const;

const definitions = [
  ['Machine Configuration', 'drive.type', 'Drive type', 'text', null, 10],
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
  ['Hydraulics', 'hydraulics.system_type', 'Hydraulic system', 'text', null, 5],
  ['Hydraulics', 'hydraulics.total_flow', 'Maximum total flow', 'decimal', 'L/min', 10],
  ['Hydraulics', 'hydraulics.steering_pump_flow', 'Steering pump flow', 'decimal', 'L/min', 20],
  ['Hydraulics', 'hydraulics.implement_pump_flow', 'Implement pump flow', 'decimal', 'L/min', 30],
  ['Capacities', 'capacities.fuel_tank', 'Fuel tank', 'decimal', 'L', 10],
  ['Capacities', 'capacities.def_tank', 'DEF tank', 'decimal', 'L', 20],
  ['Steering & Brakes', 'steering.type', 'Steering', 'text', null, 10],
  ['Steering & Brakes', 'brakes.type', 'Brakes', 'text', null, 20],
  ['Electrical', 'electrical.system_voltage', 'Electrical system', 'integer', 'V', 10],
  ['Electrical', 'electrical.alternator', 'Alternator', 'integer', 'A', 20],
  ['Electrical', 'electrical.battery_cca', 'Battery', 'integer', 'CCA', 30],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during 5E migration.');
  return Number(rows[0].id);
}

async function upsertSpec(connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null = null) {
  await connection.query(
    `INSERT INTO machine_specs (machine_id, machine_version_id, spec_definition_id, value_text, value_number, unit, source_record_id, confidence)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text), value_number=VALUES(value_number), unit=VALUES(unit), source_record_id=VALUES(source_record_id), confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const johnDeere5ESeries2022Migration: DbMigration = {
  id: '20260827_030_john_deere_5e_series_2022',
  description: 'Add official 2022 North America specifications for six John Deere 5E utility tractors',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types (name, slug) VALUES ('Tractor', 'tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers (name, slug) VALUES ('John Deere', 'john-deere') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name, domain, source_type, authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    const sourceRecordIds = new Map<string, number>();
    for (const [group, source] of Object.entries(sources)) {
      const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [source.externalId]);
      let id = existing[0]?.id ? Number(existing[0].id) : 0;
      if (!id) {
        const [result] = await connection.query<ResultSetHeader>(
          `INSERT INTO source_records (source_id, url, external_id, title, published_date) VALUES (?, ?, ?, ?, '2022-01-01')`,
          [sourceId, source.url, source.externalId, source.title],
        );
        id = Number(result.insertId);
      }
      sourceRecordIds.set(group, id);
    }

    const definitionIds = new Map<string, number>();
    for (const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions) {
      await connection.query(
        `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order) VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section), label=VALUES(label), value_type=VALUES(value_type), canonical_unit=VALUES(canonical_unit), display_order=VALUES(display_order)`,
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
      const sourceRecordId = sourceRecordIds.get(model.sourceGroup);
      if (!sourceRecordId) throw new Error(`Missing source record for ${model.sourceGroup}`);

      await connection.query(
        `INSERT INTO machines (manufacturer_id,equipment_type_id,model_name,slug,data_status) VALUES (?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name)`,
        [manufacturerId,equipmentTypeId,model.model,model.slug],
      );
      const machineId = await selectId(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId,equipmentTypeId,model.slug]);

      await connection.query(
        `INSERT INTO machine_versions (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States',?,FALSE,?,?)
         ON DUPLICATE KEY UPDATE market_code=VALUES(market_code), market_name=VALUES(market_name), configuration=VALUES(configuration), source_record_id=VALUES(source_record_id), notes=VALUES(notes)`,
        [machineId,model.versionSlug,model.configuration,sourceRecordId,'Historical North America specification preserved from the official John Deere price book dated 1 January 2022.'],
      );
      const versionId = await selectId(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId,model.versionSlug]);

      await upsertSpec(connection,machineId,versionId,getDef('engine.family'),sourceRecordId,model.engine);
      await upsertSpec(connection,machineId,versionId,getDef('engine.cylinders'),sourceRecordId,model.cylinders);
      await upsertSpec(connection,machineId,versionId,getDef('engine.rated_power'),sourceRecordId,model.hp,'hp');
      await upsertSpec(connection,machineId,versionId,getDef('engine.displacement'),sourceRecordId,model.displacement,'L');
      await upsertSpec(connection,machineId,versionId,getDef('engine.rated_speed'),sourceRecordId,model.rpm,'rpm');
      await upsertSpec(connection,machineId,versionId,getDef('engine.aspiration'),sourceRecordId,model.aspiration);
      await upsertSpec(connection,machineId,versionId,getDef('engine.emissions'),sourceRecordId,'EPA Final Tier 4 compliant');
      await upsertSpec(connection,machineId,versionId,getDef('pto.rated_power'),sourceRecordId,model.ptoHp,'hp');
      await upsertSpec(connection,machineId,versionId,getDef('capacities.fuel_tank'),sourceRecordId,model.fuelTankL,'L');
      if (model.defTankL !== undefined) await upsertSpec(connection,machineId,versionId,getDef('capacities.def_tank'),sourceRecordId,model.defTankL,'L');
      if (model.transmission) await upsertSpec(connection,machineId,versionId,getDef('transmission.standard'),sourceRecordId,model.transmission);
      if (model.transmissionOption) await upsertSpec(connection,machineId,versionId,getDef('transmission.optional'),sourceRecordId,model.transmissionOption);
      if (model.drive) await upsertSpec(connection,machineId,versionId,getDef('drive.type'),sourceRecordId,model.drive);
      if (model.hyd) {
        await upsertSpec(connection,machineId,versionId,getDef('hydraulics.system_type'),sourceRecordId,'Open center');
        await upsertSpec(connection,machineId,versionId,getDef('hydraulics.total_flow'),sourceRecordId,model.hyd[0],'L/min');
        await upsertSpec(connection,machineId,versionId,getDef('hydraulics.steering_pump_flow'),sourceRecordId,model.hyd[1],'L/min');
        await upsertSpec(connection,machineId,versionId,getDef('hydraulics.implement_pump_flow'),sourceRecordId,model.hyd[2],'L/min');
        await upsertSpec(connection,machineId,versionId,getDef('steering.type'),sourceRecordId,'Hydrostatic power steering');
        await upsertSpec(connection,machineId,versionId,getDef('brakes.type'),sourceRecordId,'Hydraulically actuated wet disk brakes');
      }
      await upsertSpec(connection,machineId,versionId,getDef('electrical.system_voltage'),sourceRecordId,12,'V');
      await upsertSpec(connection,machineId,versionId,getDef('electrical.alternator'),sourceRecordId,model.alternatorA,'A');
      await upsertSpec(connection,machineId,versionId,getDef('electrical.battery_cca'),sourceRecordId,model.batteryCca,'CCA');

      await connection.query(`UPDATE machines SET data_status='partial' WHERE id=?`, [machineId]);
    }
  },
};
