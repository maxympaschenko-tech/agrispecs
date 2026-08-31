import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  feature: string;
  configuration?: string;
  capacityBu?: number;
  primaryTanks?: number;
  fillOptions: string;
};

const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/precision-air-carts';
const P3915_URL = 'https://www.caseih.com/en-us/unitedstates/products/planting-seeding/precision-air-carts/precision-air-3915';

const models: Seed[] = [
  {
    slug: 'precision-air-2355', model: 'Precision Air 2355',
    feature: 'Corrosion-resistant tanks and meters for seed and dry-fertilizer use',
    fillOptions: 'Standard auger or no onboard fill system; conveyor is not offered on the 2355',
  },
  {
    slug: 'precision-air-3445', model: 'Precision Air 3445',
    feature: '24-volt independent meter-drive motors for section rate control',
    fillOptions: 'Deluxe auger or conveyor available; can also be ordered without an onboard fill system',
  },
  {
    slug: 'precision-air-3555', model: 'Precision Air 3555',
    feature: 'Master shut-off allows meter servicing without emptying cart contents',
    fillOptions: 'Deluxe auger or conveyor available; can also be ordered without an onboard fill system',
  },
  {
    slug: 'precision-air-3725', model: 'Precision Air 3725',
    feature: 'Three-tank broad-acre seeding and fertilizer-application cart',
    configuration: 'Tow-behind configuration explicitly described on current US family page',
    primaryTanks: 3,
    fillOptions: 'Deluxe auger or conveyor available; can also be ordered without an onboard fill system',
  },
  {
    slug: 'precision-air-3915', model: 'Precision Air 3915',
    feature: 'High-capacity three-tank broad-acre seeding and fertilizer-application cart',
    configuration: 'Tow-Behind', capacityBu: 915, primaryTanks: 3,
    fillOptions: 'Deluxe Auger, Conveyor or No Onboard Fill System',
  },
  {
    slug: 'precision-air-4465', model: 'Precision Air 4465',
    feature: 'Large tank openings, low-profile lids, heavy-duty interior ladders and over-center lid locks',
    fillOptions: 'Conveyor available; can also be ordered without an onboard fill system',
  },
  {
    slug: 'precision-air-4585', model: 'Precision Air 4585',
    feature: 'Folding stairway, solid handrails and heavy-duty catwalk for tank access',
    fillOptions: 'Deluxe auger or conveyor available; can also be ordered without an onboard fill system',
  },
  {
    slug: 'precision-air-4765', model: 'Precision Air 4765',
    feature: 'Modular meter cartridges give each primary run an individual metering segment',
    fillOptions: 'Conveyor available; can also be ordered without an onboard fill system',
  },
  {
    slug: 'precision-air-4955', model: 'Precision Air 4955',
    feature: 'Current US page describes a conveyor fill system capable of filling the cart in under 15 minutes',
    fillOptions: 'Conveyor available; can also be ordered without an onboard fill system',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'air_cart.configuration', 'Cart configuration', 'text', null, 20],
  ['Capacities', 'air_cart.total_capacity', 'Total capacity', 'decimal', 'bu', 10],
  ['Air Cart System', 'air_cart.primary_tanks', 'Number of primary tanks', 'integer', null, 10],
  ['Air Cart System', 'air_cart.model_feature', 'Model-specific feature', 'text', null, 20],
  ['Air Cart System', 'air_cart.metering', 'Metering and section control', 'text', null, 30],
  ['Air Cart System', 'air_cart.curve_compensation', 'Curve compensation', 'text', null, 40],
  ['Air Cart System', 'air_cart.monitoring', 'Tank monitoring', 'text', null, 50],
  ['Air Cart System', 'air_cart.fill_options', 'Fill-system options', 'text', null, 60],
  ['Air Cart System', 'air_cart.auxiliary_tank', 'Auxiliary tank option', 'text', null, 70],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH Precision Air cart migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function record(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `case-ih-${model.slug}-air-cart-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const url = model.slug === 'precision-air-3915' ? P3915_URL : FAMILY_URL;
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, url, externalId, `Case IH ${model.model} current US air cart data`, JSON.stringify({ captured: '2026-08-31', market: 'United States', equipmentType: 'Air Cart', familySource: FAMILY_URL, note: 'Model-specific numerical capacity and tank count are stored only where the current selected US source explicitly publishes them.', ...model })],
  );
  return Number(result.insertId);
}

async function put(connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null = null) {
  await connection.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const caseIhPrecisionAirCartsCurrentMigration: DbMigration = {
  id: '20260831_513_case_ih_precision_air_carts_current',
  description: 'Add current Case IH US Precision Air 5 Series air cart lineup with strict source-scoped specifications',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Air Cart','air-cart') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='air-cart' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Precision Air 5 Series','precision-air-5-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='precision-air-5-series' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => { const value = definitionIds.get(key); if (!value) throw new Error(`Missing air cart definition ${key}`); return value; };

    for (const model of models) {
      const sourceRecordId = await record(connection, sourceId, model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Case IH United States Precision Air 5 Series lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current Precision Air 5 Series air cart',TRUE,?,'Current Case IH US product-family data captured 2026-08-31. Numerical capacity, tank count and configuration remain blank unless explicitly published for the model by the selected US source.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Air cart');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'Case IH United States current catalog');
      if (model.configuration) await put(connection, machineId, versionId, def('air_cart.configuration'), sourceRecordId, model.configuration);
      if (model.capacityBu !== undefined) await put(connection, machineId, versionId, def('air_cart.total_capacity'), sourceRecordId, model.capacityBu, 'bu');
      if (model.primaryTanks !== undefined) await put(connection, machineId, versionId, def('air_cart.primary_tanks'), sourceRecordId, model.primaryTanks);
      await put(connection, machineId, versionId, def('air_cart.model_feature'), sourceRecordId, model.feature);
      await put(connection, machineId, versionId, def('air_cart.metering'), sourceRecordId, 'AccuSection modular section control with individual electronic meter drives and interchangeable meter cartridges/rollers');
      await put(connection, machineId, versionId, def('air_cart.curve_compensation'), sourceRecordId, 'Optional curve compensation adjusts section application through turns');
      await put(connection, machineId, versionId, def('air_cart.monitoring'), sourceRecordId, 'Tank level sensors and tank scales; optional in-tank and rear video camera package');
      await put(connection, machineId, versionId, def('air_cart.fill_options'), sourceRecordId, model.fillOptions);
      await put(connection, machineId, versionId, def('air_cart.auxiliary_tank'), sourceRecordId, 'Optional 25- or 35-bushel auxiliary tank with pneumatic fill system described for the Precision Air 5 Series');
    }
  },
};
