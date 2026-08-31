import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  series: 'Roll-Belt 1 Series' | 'Pro-Belt';
  seriesSlug: 'roll-belt-1-series' | 'pro-belt';
  sourceUrl: string;
  baleWidthIn: number;
  baleDiameterMinIn: number;
  baleDiameterMaxIn: number;
  feeding?: string;
  pickup?: string;
  wrapping?: string;
  ptoRequirement?: string;
};

const VERSION = 'north-america-current-2026-08';
const ROLL_BELT_URL = 'https://agriculture.newholland.com/en-us/nar/products/haytools-spreaders/new-roll-belt-round-balers/roll-belt-450';
const PRO_BELT_URL = 'https://agriculture.newholland.com/en-us/nar/products/haytools-spreaders/pro-belt-round-balers/pro-belt-450-cropcutter';

const models: Seed[] = [
  {
    slug: 'roll-belt-450-utility-plus', model: 'Roll-Belt 450 Utility PLUS', series: 'Roll-Belt 1 Series', seriesSlug: 'roll-belt-1-series', sourceUrl: ROLL_BELT_URL,
    baleWidthIn: 46.5, baleDiameterMinIn: 36, baleDiameterMaxIn: 60,
    pickup: 'SuperSweep pickup', feeding: 'Mechanical stuffer', wrapping: 'Net and twine or net-only wrapping system', ptoRequirement: '45 PTO hp',
  },
  {
    slug: 'roll-belt-451', model: 'Roll-Belt 451', series: 'Roll-Belt 1 Series', seriesSlug: 'roll-belt-1-series', sourceUrl: ROLL_BELT_URL,
    baleWidthIn: 46.5, baleDiameterMinIn: 36, baleDiameterMaxIn: 60,
    feeding: 'SuperFeed and CropCutter configurations available; Bale-Slice available on selected configurations', wrapping: 'Net and twine or net-only wrapping system',
  },
  {
    slug: 'roll-belt-461', model: 'Roll-Belt 461', series: 'Roll-Belt 1 Series', seriesSlug: 'roll-belt-1-series', sourceUrl: ROLL_BELT_URL,
    baleWidthIn: 46.5, baleDiameterMinIn: 36, baleDiameterMaxIn: 72,
    feeding: 'SuperFeed and CropCutter configurations available', wrapping: 'Net and twine or net-only wrapping system',
  },
  {
    slug: 'roll-belt-561', model: 'Roll-Belt 561', series: 'Roll-Belt 1 Series', seriesSlug: 'roll-belt-1-series', sourceUrl: ROLL_BELT_URL,
    baleWidthIn: 61.5, baleDiameterMinIn: 36, baleDiameterMaxIn: 72,
    feeding: 'Specialty Crop and Bale-Slice configurations are represented in the current family', wrapping: 'Net and twine or net-only wrapping system',
  },
  {
    slug: 'pro-belt-450-superfeed', model: 'Pro-Belt 450 SuperFeed', series: 'Pro-Belt', seriesSlug: 'pro-belt', sourceUrl: PRO_BELT_URL,
    baleWidthIn: 47.5, baleDiameterMinIn: 35.5, baleDiameterMaxIn: 65,
    pickup: 'Heavy-duty MaxiSweep pickup with five-bar reel and 160 tines', feeding: 'SuperFeed rotary feeding system with 20.5-in rotor', wrapping: 'EdgeWrap net wrap system',
  },
  {
    slug: 'pro-belt-460-superfeed', model: 'Pro-Belt 460 SuperFeed', series: 'Pro-Belt', seriesSlug: 'pro-belt', sourceUrl: PRO_BELT_URL,
    baleWidthIn: 47.5, baleDiameterMinIn: 35.5, baleDiameterMaxIn: 75,
    pickup: 'Heavy-duty MaxiSweep pickup with five-bar reel and 160 tines', feeding: 'SuperFeed rotary feeding system with 20.5-in rotor', wrapping: 'EdgeWrap net wrap system',
  },
  {
    slug: 'pro-belt-450-cropcutter', model: 'Pro-Belt 450 CropCutter', series: 'Pro-Belt', seriesSlug: 'pro-belt', sourceUrl: PRO_BELT_URL,
    baleWidthIn: 47.5, baleDiameterMinIn: 35.5, baleDiameterMaxIn: 65,
    pickup: 'Heavy-duty MaxiSweep pickup with five-bar reel and 160 tines', feeding: 'CropCutter rotary feeding and cutting system with 20.5-in rotor', wrapping: 'EdgeWrap net wrap system',
  },
  {
    slug: 'pro-belt-460-cropcutter', model: 'Pro-Belt 460 CropCutter', series: 'Pro-Belt', seriesSlug: 'pro-belt', sourceUrl: PRO_BELT_URL,
    baleWidthIn: 47.5, baleDiameterMinIn: 35.5, baleDiameterMaxIn: 75,
    pickup: 'Heavy-duty MaxiSweep pickup with five-bar reel and 160 tines', feeding: 'CropCutter rotary feeding and cutting system with 20.5-in rotor', wrapping: 'EdgeWrap net wrap system',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Bale Formation', 'baler.bale_width', 'Bale width', 'decimal', 'in', 20],
  ['Bale Formation', 'baler.bale_diameter_min', 'Minimum bale diameter', 'decimal', 'in', 30],
  ['Bale Formation', 'baler.bale_diameter_max', 'Maximum bale diameter', 'decimal', 'in', 40],
  ['Pickup & Feeding', 'baler.pickup_system', 'Pickup system', 'text', null, 10],
  ['Pickup & Feeding', 'baler.feeding_system', 'Feeding system', 'text', null, 20],
  ['Wrapping System', 'baler.wrapping_system', 'Wrapping system', 'text', null, 10],
  ['Tractor Requirements', 'baler.pto_power_requirement', 'PTO power requirement', 'text', null, 10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('New Holland round baler migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland','agriculture.newholland.com','manufacturer','official')`,
  );
  return Number(result.insertId);
}

async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `new-holland-${model.slug}-round-baler-na-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, model.sourceUrl, externalId, `New Holland ${model.model} current North America round baler specifications`, JSON.stringify({ captured: '2026-08-31', market: 'North America', equipmentType: 'Round Baler', ...model })],
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

export const newHollandRoundBalersCurrentMigration: DbMigration = {
  id: '20260831_491_new_holland_round_balers_current',
  description: 'Add current New Holland North America Roll-Belt 1 Series and Pro-Belt round balers',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Round Baler','round-baler') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const equipmentTypeId = await id(connection, `SELECT id FROM equipment_types WHERE slug='round-baler' LIMIT 1`);
    const sourceId = await ensureSource(connection);

    for (const series of [
      { name: 'Roll-Belt 1 Series', slug: 'roll-belt-1-series' },
      { name: 'Pro-Belt', slug: 'pro-belt' },
    ]) {
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
    const def = (key: string) => { const value = definitionIds.get(key); if (!value) throw new Error(`Missing round baler definition ${key}`); return value; };

    for (const model of models) {
      const seriesId = await id(connection, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.seriesSlug]);
      const sourceRecordId = await sourceRecord(connection, sourceId, model);
      await connection.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current New Holland North America round baler lineup','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`,
        [manufacturerId, equipmentTypeId, seriesId, model.model, model.slug],
      );
      const machineId = await id(connection, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [manufacturerId, equipmentTypeId, model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
      await connection.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'NA','North America','Current North America round baler specification',TRUE,?,'Official New Holland North America product-family data captured 2026-08-31. Only values explicitly exposed by the current page are stored; unexposed tractor requirements remain unpublished.')
         ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId, VERSION, sourceRecordId],
      );
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
      await put(connection, machineId, versionId, def('configuration.type'), sourceRecordId, 'Round baler');
      await put(connection, machineId, versionId, def('configuration.market_scope'), sourceRecordId, 'North America current catalog');
      await put(connection, machineId, versionId, def('baler.bale_width'), sourceRecordId, model.baleWidthIn, 'in');
      await put(connection, machineId, versionId, def('baler.bale_diameter_min'), sourceRecordId, model.baleDiameterMinIn, 'in');
      await put(connection, machineId, versionId, def('baler.bale_diameter_max'), sourceRecordId, model.baleDiameterMaxIn, 'in');
      if (model.pickup) await put(connection, machineId, versionId, def('baler.pickup_system'), sourceRecordId, model.pickup);
      if (model.feeding) await put(connection, machineId, versionId, def('baler.feeding_system'), sourceRecordId, model.feeding);
      if (model.wrapping) await put(connection, machineId, versionId, def('baler.wrapping_system'), sourceRecordId, model.wrapping);
      if (model.ptoRequirement) await put(connection, machineId, versionId, def('baler.pto_power_requirement'), sourceRecordId, model.ptoRequirement);
    }
  },
};
