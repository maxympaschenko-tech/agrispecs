import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  sourceUrl: string;
  category: string;
  baleSize: string;
  baleWidthIn: number;
  baleDiameterMinIn: number;
  baleDiameterMaxIn: number;
  ptoRequirement: string;
  configurations?: string;
};

const VERSION = 'united-states-current-2026-08';
const models: Seed[] = [
  {
    slug: 'rb456a-standard', model: 'RB456A Standard', category: 'Standard',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/balers/round-balers/rb456a',
    baleSize: '4 x 5 ft', baleWidthIn: 46.5, baleDiameterMinIn: 36, baleDiameterMaxIn: 60,
    ptoRequirement: '45 hp minimum PTO requirement',
  },
  {
    slug: 'rb456-premium', model: 'RB456 Premium', category: 'Premium',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/balers/round-balers/rb456-premium-round-baler',
    baleSize: '4 x 5 ft', baleWidthIn: 46.5, baleDiameterMinIn: 36, baleDiameterMaxIn: 60,
    ptoRequirement: 'Hay 60 hp; Silage 65 hp; Rotor Feeder 85 hp; Rotor Cutter 100 hp',
    configurations: 'Hay, Silage, Rotor Feeder, Rotor Cutter',
  },
  {
    slug: 'rb466-premium', model: 'RB466 Premium', category: 'Premium',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/balers/round-balers/rb466-premium-round-baler',
    baleSize: '4 x 6 ft', baleWidthIn: 46.5, baleDiameterMinIn: 36, baleDiameterMaxIn: 72,
    ptoRequirement: 'Hay 70 hp; Silage 75 hp; Rotor Feeder 90 hp; Rotor Cutter 105 hp',
    configurations: 'Hay, Silage, Rotor Feeder, Rotor Cutter',
  },
  {
    slug: 'rb565-premium-hd', model: 'RB565 Premium HD', category: 'Premium HD',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/balers/round-balers/rb565-premium-hd-round-baler',
    baleSize: '5 x 6 ft', baleWidthIn: 61.5, baleDiameterMinIn: 36, baleDiameterMaxIn: 72,
    ptoRequirement: '85 hp minimum PTO requirement', configurations: 'Hay, Wide Pickup, Premium',
  },
  {
    slug: 'rb566-premium', model: 'RB566 Premium', category: 'Premium',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/balers/round-balers/rb566-premium-round-baler',
    baleSize: '5 x 6 ft', baleWidthIn: 61.5, baleDiameterMinIn: 36, baleDiameterMaxIn: 72,
    ptoRequirement: '85 hp minimum PTO requirement', configurations: 'Hay, Wide Pickup, Premium',
  },
  {
    slug: 'rb456-hd-pro', model: 'RB456 HD Pro', category: 'HD Pro',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/balers/round-balers/rb456hd',
    baleSize: '4 x 5 ft', baleWidthIn: 47.25, baleDiameterMinIn: 36, baleDiameterMaxIn: 65,
    ptoRequirement: '100-120 hp PTO requirement', configurations: 'Rotor Feeder, Rotor Cutter',
  },
  {
    slug: 'rb466-hd-pro', model: 'RB466 HD Pro', category: 'HD Pro',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/balers/round-balers/rb466hd',
    baleSize: '4 x 6 ft', baleWidthIn: 47.25, baleDiameterMinIn: 36, baleDiameterMaxIn: 75,
    ptoRequirement: '100-120 hp PTO requirement', configurations: 'Rotor Feeder, Rotor Cutter',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Bale Formation', 'baler.category', 'Baler category', 'text', null, 5],
  ['Bale Formation', 'baler.nominal_bale_size', 'Nominal bale size', 'text', null, 10],
  ['Bale Formation', 'baler.bale_width', 'Bale width', 'decimal', 'in', 20],
  ['Bale Formation', 'baler.bale_diameter_min', 'Minimum bale diameter', 'decimal', 'in', 30],
  ['Bale Formation', 'baler.bale_diameter_max', 'Maximum bale diameter', 'decimal', 'in', 40],
  ['Bale Formation', 'baler.configuration_options', 'Configuration options', 'text', null, 50],
  ['Tractor Requirements', 'baler.pto_power_requirement', 'PTO power requirement', 'text', null, 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH round baler migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `case-ih-${model.slug}-round-baler-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, model.sourceUrl, externalId, `Case IH ${model.model} current US round baler specifications`, JSON.stringify({ captured: '2026-08-31', market: 'United States', equipmentType: 'Round Baler', ...model })],
  );
  return Number(result.insertId);
}

async function put(connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null = null) {
  await connection.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const caseIHRoundBalersCurrentMigration: DbMigration = {
  id: '20260831_490_case_ih_round_balers_current',
  description: 'Add current Case IH US Standard, Premium and HD Pro round balers',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Round Baler','round-baler') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='round-baler' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    await connection.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Round Balers','round-balers')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [manufacturerId, equipmentTypeId],
    );
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='round-balers' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        definition,
      );
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => { const value = definitionIds.get(key); if (!value) throw new Error(`Missing round baler definition ${key}`); return value; };

    for (const model of models) {
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current Case IH United States round baler lineup','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current US round baler specification',TRUE,?,'Official Case IH US product-page data captured 2026-08-31. Configuration-dependent PTO requirements are stored as published rather than reduced to a single misleading value.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Round baler');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'United States current catalog');
      await put(connection, machineId, versionId, def('baler.category'), sourceRecordId, model.category);
      await put(connection, machineId, versionId, def('baler.nominal_bale_size'), sourceRecordId, model.baleSize);
      await put(connection, machineId, versionId, def('baler.bale_width'), sourceRecordId, model.baleWidthIn, 'in');
      await put(connection, machineId, versionId, def('baler.bale_diameter_min'), sourceRecordId, model.baleDiameterMinIn, 'in');
      await put(connection, machineId, versionId, def('baler.bale_diameter_max'), sourceRecordId, model.baleDiameterMaxIn, 'in');
      await put(connection, machineId, versionId, def('baler.pto_power_requirement'), sourceRecordId, model.ptoRequirement);
      if (model.configurations) await put(connection, machineId, versionId, def('baler.configuration_options'), sourceRecordId, model.configurations);
    }
  },
};
