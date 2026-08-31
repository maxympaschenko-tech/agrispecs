import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  sourceUrl: string;
  baleWidthIn: number;
  baleHeightIn: number;
  maxLengthIn: number;
  ptoRequirement: string;
  densityClass: string;
};

const VERSION = 'united-states-current-2026-08';
const models: Seed[] = [
  {
    slug: 'lb334xl', model: 'LB334XL',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/balers/large-square-balers/lb334xl',
    baleWidthIn: 31.5, baleHeightIn: 35.4, maxLengthIn: 108,
    ptoRequirement: '109-136 hp minimum PTO requirement depending configuration', densityClass: 'Conventional large square baler',
  },
  {
    slug: 'lb434xl', model: 'LB434XL',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/balers/large-square-balers/lb434xl',
    baleWidthIn: 47.2, baleHeightIn: 35.4, maxLengthIn: 108,
    ptoRequirement: '130-160 hp minimum PTO requirement depending configuration', densityClass: 'Conventional large square baler',
  },
  {
    slug: 'lb436-hd', model: 'LB436 HD',
    sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/balers/large-square-balers/lb436-hd',
    baleWidthIn: 48, baleHeightIn: 35, maxLengthIn: 118,
    ptoRequirement: '250 hp minimum PTO requirement', densityClass: 'High-density large square baler',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Bale Formation', 'baler.density_class', 'Density class', 'text', null, 5],
  ['Bale Formation', 'baler.bale_width', 'Bale width', 'decimal', 'in', 10],
  ['Bale Formation', 'baler.bale_height', 'Bale height', 'decimal', 'in', 20],
  ['Bale Formation', 'baler.maximum_bale_length', 'Maximum bale length', 'decimal', 'in', 30],
  ['Bale Formation', 'baler.plunger_speed', 'Plunger speed', 'decimal', 'strokes/min', 40],
  ['Tying System', 'baler.tying_system', 'Tying system', 'text', null, 10],
  ['Tractor Requirements', 'baler.pto_power_requirement', 'PTO power requirement', 'text', null, 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH large square baler migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `case-ih-${model.slug}-large-square-baler-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, model.sourceUrl, externalId, `Case IH ${model.model} current US large square baler specifications`, JSON.stringify({ captured: '2026-08-31', market: 'United States', equipmentType: 'Large Square Baler', familySource: 'https://www.caseih.com/en-us/unitedstates/products/balers/large-square-balers', ...model })],
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

export const caseIHLargeSquareBalersCurrentMigration: DbMigration = {
  id: '20260831_494_case_ih_large_square_balers_current',
  description: 'Add current Case IH US LB334XL, LB434XL and LB436 HD large square balers',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Large Square Baler','large-square-baler') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='large-square-baler' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'LB Series','lb-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='lb-series' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => { const value = definitionIds.get(key); if (!value) throw new Error(`Missing large square baler definition ${key}`); return value; };

    for (const model of models) {
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Case IH United States large square baler lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current US large square baler specification',TRUE,?,'Official Case IH US product-page values captured 2026-08-31. PTO requirements that vary by configuration remain stored as ranges.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Large square baler');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'United States current catalog');
      await put(connection, machineId, versionId, def('baler.density_class'), sourceRecordId, model.densityClass);
      await put(connection, machineId, versionId, def('baler.bale_width'), sourceRecordId, model.baleWidthIn, 'in');
      await put(connection, machineId, versionId, def('baler.bale_height'), sourceRecordId, model.baleHeightIn, 'in');
      await put(connection, machineId, versionId, def('baler.maximum_bale_length'), sourceRecordId, model.maxLengthIn, 'in');
      await put(connection, machineId, versionId, def('baler.plunger_speed'), sourceRecordId, 48, 'strokes/min');
      await put(connection, machineId, versionId, def('baler.tying_system'), sourceRecordId, model.slug === 'lb436-hd' ? 'TwinePro knotter system' : 'Double-knot tying system');
      await put(connection, machineId, versionId, def('baler.pto_power_requirement'), sourceRecordId, model.ptoRequirement);
    }
  },
};
