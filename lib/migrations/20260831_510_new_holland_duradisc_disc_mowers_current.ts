import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  family: 'Heavy-Duty' | 'Economy';
  cuttingWidth: string;
  discs: number;
  mounting: string;
};

const VERSION = 'north-america-current-2026-08';
const HD_URL = 'https://agriculture.newholland.com/en-us/nar/products/haytools-spreaders/duradisc-heavy-duty-disc-mowers';
const ECON_URL = 'https://agriculture.newholland.com/en-us/nar/products/haytools-spreaders/duradisc-economy-disc-mowers';
const models: Seed[] = [
  { slug: 'duradisc-107m', model: 'DuraDisc 107M', family: 'Heavy-Duty', cuttingWidth: '6 ft 8 in (2.0 m)', discs: 5, mounting: 'Mounted; quick-hitch compatible' },
  { slug: 'duradisc-108m', model: 'DuraDisc 108M', family: 'Heavy-Duty', cuttingWidth: '7 ft 10 in (2.4 m)', discs: 6, mounting: 'Mounted; quick-hitch compatible' },
  { slug: 'duradisc-109m', model: 'DuraDisc 109M', family: 'Heavy-Duty', cuttingWidth: '9 ft 2 in (2.8 m)', discs: 7, mounting: 'Mounted; quick-hitch compatible' },
  { slug: 'duradisc-210m', model: 'DuraDisc 210M', family: 'Heavy-Duty', cuttingWidth: '10 ft 4 in (3.2 m)', discs: 8, mounting: 'Side-pull / pull-type' },
  { slug: 'duradisc-106e', model: 'DuraDisc 106E', family: 'Economy', cuttingWidth: '5 ft 6 in (1676 mm)', discs: 4, mounting: 'Three-point mounted' },
  { slug: 'duradisc-107e', model: 'DuraDisc 107E', family: 'Economy', cuttingWidth: '6 ft 9 in (2057 mm)', discs: 5, mounting: 'Three-point mounted' },
  { slug: 'duradisc-108e', model: 'DuraDisc 108E', family: 'Economy', cuttingWidth: '7 ft 11 in (2413 mm)', discs: 6, mounting: 'Three-point mounted' },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'disc_mower.family', 'Disc mower family', 'text', null, 20],
  ['Machine Configuration', 'disc_mower.mounting', 'Mounting configuration', 'text', null, 30],
  ['Cutting System', 'disc_mower.cutting_width', 'Cutting width', 'text', null, 10],
  ['Cutting System', 'disc_mower.disc_count', 'Number of cutting discs', 'integer', null, 20],
  ['Cutting System', 'disc_mower.cutterbar', 'Cutterbar system', 'text', null, 30],
  ['Cutting System', 'disc_mower.knife_system', 'Knife system', 'text', null, 40],
  ['Cutting System', 'disc_mower.protection', 'Cutterbar protection', 'text', null, 50],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('New Holland DuraDisc migration dependency missing');
  return Number(rows[0].id);
}
async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland','agriculture.newholland.com','manufacturer','official')`);
  return Number(result.insertId);
}
async function record(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const sourceUrl = model.family === 'Heavy-Duty' ? HD_URL : ECON_URL;
  const externalId = `new-holland-${model.slug}-disc-mower-na-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId, sourceUrl, externalId, `New Holland ${model.model} current North America disc mower specifications`, JSON.stringify({ captured: '2026-08-31', market: 'North America', equipmentType: 'Disc Mower', ...model })]);
  return Number(result.insertId);
}
async function put(connection: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, sourceRecordId: number, value: string | number, unit: string | null = null) {
  await connection.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, versionId, definitionId, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sourceRecordId]);
}

export const newHollandDuraDiscDiscMowersCurrentMigration: DbMigration = {
  id: '20260831_510_new_holland_duradisc_disc_mowers_current',
  description: 'Add current New Holland North America DuraDisc heavy-duty and economy disc mowers',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Disc Mower','disc-mower') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='disc-mower' LIMIT 1`);
    const sourceId = await ensureSource(connection);
    await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'DuraDisc Disc Mowers','duradisc-disc-mowers') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [manufacturerId, equipmentTypeId]);
    const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='duradisc-disc-mowers' LIMIT 1`, [manufacturerId, equipmentTypeId]);
    const definitionIds = new Map<string, number>();
    for (const definition of defs) {
      await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, definition);
      definitionIds.set(definition[1], await id(connection, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [definition[1]]));
    }
    const def = (key: string) => { const value = definitionIds.get(key); if (!value) throw new Error(`Missing DuraDisc definition ${key}`); return value; };
    for (const model of models) {
      const sourceRecordId = await record(connection, sourceId, model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current New Holland North America DuraDisc disc mower lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug]);
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America',?,TRUE,?,'Current New Holland North America product-page data captured 2026-08-31. PTO horsepower is not assigned per model unless the selected product page publishes a model-specific requirement.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`, [machineId, VERSION, `${model.family} DuraDisc disc mower`, sourceRecordId]);
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Disc mower');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'New Holland North America current product line');
      await put(connection, machineId, versionId, def('disc_mower.family'), sourceRecordId, model.family);
      await put(connection, machineId, versionId, def('disc_mower.mounting'), sourceRecordId, model.mounting);
      await put(connection, machineId, versionId, def('disc_mower.cutting_width'), sourceRecordId, model.cuttingWidth);
      await put(connection, machineId, versionId, def('disc_mower.disc_count'), sourceRecordId, model.discs);
      if (model.family === 'Heavy-Duty') {
        await put(connection, machineId, versionId, def('disc_mower.cutterbar'), sourceRecordId, 'MowMax modular disc cutterbar');
        await put(connection, machineId, versionId, def('disc_mower.knife_system'), sourceRecordId, 'QuickMax knife change system');
        await put(connection, machineId, versionId, def('disc_mower.protection'), sourceRecordId, 'ShockPRO hub protection');
      } else {
        await put(connection, machineId, versionId, def('disc_mower.cutterbar'), sourceRecordId, 'Low-profile gear-driven economy cutterbar');
        await put(connection, machineId, versionId, def('disc_mower.knife_system'), sourceRecordId, 'Two reversible knives per oval disc');
        await put(connection, machineId, versionId, def('disc_mower.protection'), sourceRecordId, 'Rock guards, skid shoes and spring-loaded breakaway latch');
      }
    }
  },
};
