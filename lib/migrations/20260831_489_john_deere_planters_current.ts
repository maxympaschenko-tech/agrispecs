import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  seriesName: string;
  seriesSlug: string;
  sourceUrl: string;
  rowCount: number;
  rowSpacingIn: number;
  frameType: string;
  transportWidthFt?: number;
  ccsCapacity: string;
  rowUnit: string;
  fieldWidthFt?: number;
  transportHeightFt?: number;
  transportLengthFt?: number;
  fieldLengthFt?: number;
  frameFlex?: string;
  tractorPower?: string;
  note: string;
};

const PLANTER_CATALOG_URL = 'https://www.deere.com/en/planting-equipment/1725-ccs-stack-fold-planter/';
const VERSION = 'united-states-current-2026-08';
const models: Seed[] = [
  {
    slug: '1775nt-12row30', model: '1775NT 12Row30', seriesName: '1775NT', seriesSlug: '1775nt', sourceUrl: PLANTER_CATALOG_URL,
    rowCount: 12, rowSpacingIn: 30, frameType: 'Drawn planter', transportWidthFt: 12,
    ccsCapacity: '100 bu Central Commodity System (CCS)', rowUnit: 'ExactEmerge, MaxEmerge 5e, or MaxEmerge 5 depending configuration',
    note: 'Current John Deere planter comparison table captured 2026-08-31. This machine is stored as the 12-row, 30-inch 1775NT configuration rather than collapsing all 1775NT configurations into one record.',
  },
  {
    slug: '1775nt-16row30', model: '1775NT 16Row30', seriesName: '1775NT', seriesSlug: '1775nt', sourceUrl: PLANTER_CATALOG_URL,
    rowCount: 16, rowSpacingIn: 30, frameType: 'Drawn planter', transportWidthFt: 12,
    ccsCapacity: '130 bu Central Commodity System (CCS)', rowUnit: 'ExactEmerge, MaxEmerge 5e, or MaxEmerge 5 depending configuration',
    note: 'Current John Deere planter comparison table captured 2026-08-31. This machine is stored as the 16-row, 30-inch 1775NT configuration.',
  },
  {
    slug: '1775nt-24row30', model: '1775NT 24Row30', seriesName: '1775NT', seriesSlug: '1775nt',
    sourceUrl: 'https://www.deere.com/en/planting-equipment/1775nt-24row30-planter/',
    rowCount: 24, rowSpacingIn: 30, frameType: 'Drawn planter', transportWidthFt: 12,
    ccsCapacity: '130 bu Central Commodity System (CCS)', rowUnit: 'ExactEmerge, MaxEmerge 5e, or MaxEmerge 5 depending configuration',
    note: 'Current John Deere US 1775NT 24Row30 product/catalog data captured 2026-08-31. Configuration values are cross-checked to the current John Deere planter comparison table.',
  },
  {
    slug: '1795-24row20', model: '1795 24Row20', seriesName: '1795', seriesSlug: '1795',
    sourceUrl: 'https://www.deere.com/en-us/products-solutions/planters/drawn-planters/1795-24row20-planter-nja4weg',
    rowCount: 24, rowSpacingIn: 20, frameType: 'Drawn split-row planter',
    ccsCapacity: '100 bu with liquid tank; 130 bu without liquid tank', rowUnit: 'Vacuum seed meter',
    fieldWidthFt: 43.35, transportWidthFt: 13.27, transportHeightFt: 13.37, transportLengthFt: 34.2, fieldLengthFt: 25.96,
    frameFlex: '15° up / 15° down', tractorPower: 'Minimum 360 hp for the 40-ft class configuration',
    note: 'Current John Deere US 1795 24Row20 page captured 2026-08-31. The 360-hp recommendation follows Deere’s published minimum for 40-ft 1795 configurations; CCS capacity differs depending on whether a liquid tank is fitted.',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Planting System', 'planting.frame_type', 'Frame type', 'text', null, 5],
  ['Planting System', 'planting.row_count', 'Number of rows', 'integer', null, 10],
  ['Planting System', 'planting.row_spacing', 'Row spacing', 'decimal', 'in', 15],
  ['Planting System', 'planting.seed_capacity', 'Seed capacity', 'text', null, 35],
  ['Planting System', 'planting.row_unit', 'Row unit / seed meter', 'text', null, 40],
  ['Planting System', 'planting.frame_flexibility', 'Frame flexibility', 'text', null, 45],
  ['Planting System', 'planting.recommended_tractor_power', 'Recommended tractor power', 'text', null, 50],
  ['Dimensions & Weight', 'dimensions.field_operation_width', 'Field operation width', 'decimal', 'ft', 10],
  ['Dimensions & Weight', 'dimensions.transport_width', 'Transport width', 'decimal', 'ft', 20],
  ['Dimensions & Weight', 'dimensions.transport_height', 'Transport height', 'decimal', 'ft', 30],
  ['Dimensions & Weight', 'dimensions.transport_length', 'Transport length', 'decimal', 'ft', 40],
  ['Dimensions & Weight', 'dimensions.field_operation_length', 'Field operation length', 'decimal', 'ft', 50],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere planter migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('John Deere','deere.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `john-deere-${model.slug}-planter-us-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, model.sourceUrl, externalId, `John Deere ${model.model} current US planter specifications`, JSON.stringify({ captured: '2026-08-31', market: 'United States', equipmentType: 'Planter', planterCatalog: PLANTER_CATALOG_URL, ...model })],
  );
  return Number(result.insertId);
}

async function put(connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null) {
  await connection.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId],
  );
}

export const johnDeerePlantersCurrentMigration: DbMigration = {
  id: '20260831_489_john_deere_planters_current',
  description: 'Add current John Deere US 1775NT and 1795 planter configurations',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Planter','planter') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('John Deere','john-deere') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='planter' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    for (const series of Array.from(new Map(models.map((model) => [model.seriesSlug, { name: model.seriesName, slug: model.seriesSlug }])).values())) {
      await connection.query(
        `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [manufacturerId, equipmentTypeId, series.name, series.slug],
      );
    }

    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        definition,
      );
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => {
      const value = definitionIds.get(key);
      if (!value) throw new Error(`Missing John Deere planter spec definition ${key}`);
      return value;
    };

    for (const model of models) {
      const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.seriesSlug]);
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current John Deere United States planter configuration','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Current US planter configuration',TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code=VALUES(market_code),market_name=VALUES(market_name),configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId, model.note],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      const values: Array<[string, string | number, string | null]> = [
        ['configuration.type', 'Planter', null],
        ['configuration.market_scope', 'United States', null],
        ['planting.frame_type', model.frameType, null],
        ['planting.row_count', model.rowCount, null],
        ['planting.row_spacing', model.rowSpacingIn, 'in'],
        ['planting.seed_capacity', model.ccsCapacity, null],
        ['planting.row_unit', model.rowUnit, null],
      ];
      if (model.frameFlex) values.push(['planting.frame_flexibility', model.frameFlex, null]);
      if (model.tractorPower) values.push(['planting.recommended_tractor_power', model.tractorPower, null]);
      if (model.fieldWidthFt !== undefined) values.push(['dimensions.field_operation_width', model.fieldWidthFt, 'ft']);
      if (model.transportWidthFt !== undefined) values.push(['dimensions.transport_width', model.transportWidthFt, 'ft']);
      if (model.transportHeightFt !== undefined) values.push(['dimensions.transport_height', model.transportHeightFt, 'ft']);
      if (model.transportLengthFt !== undefined) values.push(['dimensions.transport_length', model.transportLengthFt, 'ft']);
      if (model.fieldLengthFt !== undefined) values.push(['dimensions.field_operation_length', model.fieldLengthFt, 'ft']);
      for (const [key, value, unit] of values) await put(connection, machineId, versionId, def(key), sourceRecordId, value, unit);
    }
  },
};
