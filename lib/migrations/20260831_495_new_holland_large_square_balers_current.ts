import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  seriesName: 'BigBaler PLUS' | 'BigBaler High Density';
  seriesSlug: 'bigbaler-plus' | 'bigbaler-high-density';
  sourceUrl: string;
  baleWidthIn: number;
  baleHeightIn: number;
  feedingConfiguration: string;
  plungerSpeed?: number;
};

const VERSION = 'north-america-current-2026-08';
const PLUS_URL = 'https://agriculture.newholland.com/en-us/nar/products/haytools-spreaders/bigbaler-plus-series';
const HD_URL = 'https://agriculture.newholland.com/en-us/nar/products/haytools-spreaders/bigbaler-high-density-series/bigbaler-340-high-density';

const models: Seed[] = [
  { slug: 'bigbaler-330-plus', model: 'BigBaler 330 PLUS', seriesName: 'BigBaler PLUS', seriesSlug: 'bigbaler-plus', sourceUrl: PLUS_URL, baleWidthIn: 31.5, baleHeightIn: 35.4, feedingConfiguration: 'Standard BigBaler PLUS crop feeding configuration', plungerSpeed: 48 },
  { slug: 'bigbaler-330-plus-cropcutter-packer-cutter', model: 'BigBaler 330 PLUS CropCutter Packer Cutter', seriesName: 'BigBaler PLUS', seriesSlug: 'bigbaler-plus', sourceUrl: PLUS_URL, baleWidthIn: 31.5, baleHeightIn: 35.4, feedingConfiguration: 'CropCutter Packer Cutter', plungerSpeed: 48 },
  { slug: 'bigbaler-330-plus-cropcutter-rotor-cutter', model: 'BigBaler 330 PLUS CropCutter Rotor Cutter', seriesName: 'BigBaler PLUS', seriesSlug: 'bigbaler-plus', sourceUrl: PLUS_URL, baleWidthIn: 31.5, baleHeightIn: 35.4, feedingConfiguration: 'CropCutter Rotor Cutter', plungerSpeed: 48 },
  { slug: 'bigbaler-340-plus', model: 'BigBaler 340 PLUS', seriesName: 'BigBaler PLUS', seriesSlug: 'bigbaler-plus', sourceUrl: PLUS_URL, baleWidthIn: 47.2, baleHeightIn: 35.4, feedingConfiguration: 'Standard BigBaler PLUS crop feeding configuration', plungerSpeed: 48 },
  { slug: 'bigbaler-340-plus-cropcutter-rotor-cutter', model: 'BigBaler 340 PLUS CropCutter Rotor Cutter', seriesName: 'BigBaler PLUS', seriesSlug: 'bigbaler-plus', sourceUrl: PLUS_URL, baleWidthIn: 47.2, baleHeightIn: 35.4, feedingConfiguration: 'CropCutter Rotor Cutter', plungerSpeed: 48 },
  { slug: 'bigbaler-340-high-density', model: 'BigBaler 340 High Density', seriesName: 'BigBaler High Density', seriesSlug: 'bigbaler-high-density', sourceUrl: HD_URL, baleWidthIn: 47.2, baleHeightIn: 35.4, feedingConfiguration: 'Packer feeding system' },
  { slug: 'bigbaler-340-high-density-cropcutter-rotor-cutter', model: 'BigBaler 340 High Density CropCutter Rotor Cutter', seriesName: 'BigBaler High Density', seriesSlug: 'bigbaler-high-density', sourceUrl: HD_URL, baleWidthIn: 47.2, baleHeightIn: 35.4, feedingConfiguration: 'CropCutter rotor cutter with up to 29 spring-protected knives' },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Bale Formation', 'baler.bale_width', 'Bale width', 'decimal', 'in', 10],
  ['Bale Formation', 'baler.bale_height', 'Bale height', 'decimal', 'in', 20],
  ['Bale Formation', 'baler.plunger_speed', 'Plunger speed', 'decimal', 'strokes/min', 30],
  ['Pickup & Feeding', 'baler.feeding_system', 'Feeding / crop processing configuration', 'text', null, 20],
  ['Tying System', 'baler.tying_system', 'Tying system', 'text', null, 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('New Holland large square baler migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland','agriculture.newholland.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `new-holland-${model.slug}-large-square-baler-na-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, model.sourceUrl, externalId, `New Holland ${model.model} current North America large square baler specifications`, JSON.stringify({ captured: '2026-08-31', market: 'North America', equipmentType: 'Large Square Baler', ...model })],
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

export const newHollandLargeSquareBalersCurrentMigration: DbMigration = {
  id: '20260831_495_new_holland_large_square_balers_current',
  description: 'Add current New Holland North America BigBaler PLUS and BigBaler High Density configurations',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Large Square Baler','large-square-baler') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='large-square-baler' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    for (const series of [
      { name: 'BigBaler PLUS', slug: 'bigbaler-plus' },
      { name: 'BigBaler High Density', slug: 'bigbaler-high-density' },
    ]) {
      await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId, series.name, series.slug]);
    }

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => { const value = definitionIds.get(key); if (!value) throw new Error(`Missing New Holland large square baler definition ${key}`); return value; };

    for (const model of models) {
      const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.seriesSlug]);
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current New Holland North America large square baler lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','Current North America large square baler configuration',TRUE,?,'Official current New Holland North America product-family data captured 2026-08-31. Values missing from the current public technical table remain unpublished rather than imported from older brochures.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Large square baler');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'North America current catalog');
      await put(connection, machineId, versionId, def('baler.bale_width'), sourceRecordId, model.baleWidthIn, 'in');
      await put(connection, machineId, versionId, def('baler.bale_height'), sourceRecordId, model.baleHeightIn, 'in');
      await put(connection, machineId, versionId, def('baler.feeding_system'), sourceRecordId, model.feedingConfiguration);
      await put(connection, machineId, versionId, def('baler.tying_system'), sourceRecordId, 'Loop Master double knotting system');
      if (model.plungerSpeed !== undefined) await put(connection, machineId, versionId, def('baler.plunger_speed'), sourceRecordId, model.plungerSpeed, 'strokes/min');
    }
  },
};
