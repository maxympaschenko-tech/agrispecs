import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; model: string; sourceUrl: string; pickupWidthIn: number; ptoHp: number; tying: string };

const VERSION = 'united-states-current-2026-08';
const models: Seed[] = [
  {
    slug: 'sb531', model: 'SB531', sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/balers/small-square-balers/sb531',
    pickupWidthIn: 65, ptoHp: 62, tying: 'Gear-driven twine knotters; six-ball twine storage',
  },
  {
    slug: 'sb541', model: 'SB541', sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/balers/small-square-balers/sb541',
    pickupWidthIn: 75, ptoHp: 75, tying: 'Gear-driven twine knotters; wire-tie version available; eight-ball twine storage',
  },
  {
    slug: 'sb541c', model: 'SB541C', sourceUrl: 'https://www.caseih.com/en-us/unitedstates/products/balers/small-square-balers/sb541c',
    pickupWidthIn: 75, ptoHp: 75, tying: 'Gear-driven twine knotters; eight-ball twine storage',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Bale Formation', 'baler.bale_cross_section', 'Bale cross section', 'text', null, 10],
  ['Pickup & Feeding', 'baler.pickup_width_inside', 'Pickup width inside', 'decimal', 'in', 10],
  ['Pickup & Feeding', 'baler.feeding_system', 'Feeding system', 'text', null, 20],
  ['Tying System', 'baler.tying_system', 'Tying system', 'text', null, 10],
  ['Tractor Requirements', 'baler.minimum_pto_power', 'Minimum PTO power', 'decimal', 'hp', 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH small square baler migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`);
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `case-ih-${model.slug}-small-square-baler-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, model.sourceUrl, externalId, `Case IH ${model.model} current US small square baler specifications`, JSON.stringify({ captured: '2026-08-31', market: 'United States', equipmentType: 'Small Square Baler', baleCrossSection: '14 x 18 in', ...model })],
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

export const caseIHSmallSquareBalersCurrentMigration: DbMigration = {
  id: '20260831_492_case_ih_small_square_balers_current',
  description: 'Add current Case IH US SB531, SB541 and SB541C small square balers',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Small Square Baler','small-square-baler') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='small-square-baler' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'SB Series','sb-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='sb-series' LIMIT 1`, [manufacturerId, equipmentTypeId]);

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => { const value = definitionIds.get(key); if (!value) throw new Error(`Missing small square baler definition ${key}`); return value; };

    for (const model of models) {
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Case IH United States small square baler lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current US small square baler specification',TRUE,?,'Official Case IH US product-page data captured 2026-08-31.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Small square baler');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'United States current catalog');
      await put(connection, machineId, versionId, def('baler.bale_cross_section'), sourceRecordId, '14 x 18 in');
      await put(connection, machineId, versionId, def('baler.pickup_width_inside'), sourceRecordId, model.pickupWidthIn, 'in');
      await put(connection, machineId, versionId, def('baler.feeding_system'), sourceRecordId, 'High-throughput rotary feeding system with paired rotating fingers and packer fork');
      await put(connection, machineId, versionId, def('baler.tying_system'), sourceRecordId, model.tying);
      await put(connection, machineId, versionId, def('baler.minimum_pto_power'), sourceRecordId, model.ptoHp, 'hp');
    }
  },
};
