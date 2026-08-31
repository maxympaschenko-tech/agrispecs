import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; model: string; hp: number; rocLb: number; category: 'Classic' | 'Pro' | 'Electric'; batteryKwh?: number; voltage?: number; rocNote?: string };

const VERSION = 'united-states-current-2026-08';
const URL = 'https://www.bobcat.com/na/en/equipment/loaders/compact-track-loaders';
const T7X_URL = 'https://www.bobcat.com/na/en/equipment/loaders/compact-track-loaders/t7x';
const models: Seed[] = [
  { slug: 't450', model: 'T450', hp: 55, rocLb: 1490, category: 'Classic' },
  { slug: 't595', model: 'T595', hp: 70, rocLb: 2100, category: 'Classic' },
  { slug: 't64-2', model: 'T64-2', hp: 68, rocLb: 2300, category: 'Pro' },
  { slug: 't66-2', model: 'T66-2', hp: 74, rocLb: 2400, category: 'Pro' },
  { slug: 't650', model: 'T650', hp: 74, rocLb: 2500, category: 'Classic' },
  { slug: 't76-2', model: 'T76-2', hp: 74, rocLb: 2900, category: 'Pro' },
  { slug: 't770', model: 'T770', hp: 92, rocLb: 3475, category: 'Classic' },
  { slug: 't86-2', model: 'T86-2', hp: 115, rocLb: 3925, category: 'Pro' },
  { slug: 't7x', model: 'T7X', hp: 100, rocLb: 3056, category: 'Electric', batteryKwh: 72.6, voltage: 465, rocNote: 'Rated Operating Capacity (ISO); page also identifies 3,056 lb as 35% of tipping load' },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Machine Configuration','bobcat.loader_category','Bobcat loader category','text',null,10],
  ['Engine','bobcat.compact_track_loader.published_power','Published horsepower','decimal','hp',10],
  ['Loader Performance','bobcat.compact_track_loader.published_roc','Published rated operating capacity','decimal','lb',10],
  ['Loader Performance','bobcat.compact_track_loader.roc_basis','ROC source basis','text',null,20],
  ['Electrical','bobcat.compact_track_loader.battery_capacity','Gross battery capacity','decimal','kWh',10],
  ['Electrical','bobcat.compact_track_loader.system_voltage','System voltage','decimal','V',20],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) { const [r] = await c.query<IdRow[]>(sql, p); if (!r[0]) throw new Error('Bobcat compact track loader migration dependency missing'); return Number(r[0].id); }
async function source(c: Parameters<DbMigration['apply']>[0]) { const [r] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Bobcat' AND domain='bobcat.com' ORDER BY id LIMIT 1`); if (r[0]) return Number(r[0].id); const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Bobcat','bobcat.com','manufacturer','official')`); return Number(x.insertId); }
async function record(c: Parameters<DbMigration['apply']>[0], sid: number, externalId: string, url: string, title: string, raw: unknown) { const [r] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]); if (r[0]) return Number(r[0].id); const [x] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sid, url, externalId, title, JSON.stringify(raw)]); return Number(x.insertId); }
async function put(c: Parameters<DbMigration['apply']>[0], mid: number, vid: number, did: number, rid: number, value: string | number, unit: string | null = null) { await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [mid, vid, did, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, rid]); }

export const bobcatCompactTrackLoadersCurrentMigration: DbMigration = {
  id: '20260831_548_bobcat_compact_track_loaders_current',
  description: 'Add current Bobcat United States compact track loaders including T7X',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Compact Track Loader','compact-track-loader') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Bobcat','bobcat') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='bobcat' LIMIT 1`), et = await id(c, `SELECT id FROM equipment_types WHERE slug='compact-track-loader' LIMIT 1`), sid = await source(c);
    const familyRid = await record(c, sid, 'bobcat-compact-track-loaders-us-current-2026-08', URL, 'Bobcat current US Classic and Pro compact track loader lineup', { captured: '2026-08-31', market: 'United States / North America', equipmentType: 'Compact Track Loader', models: models.map(({ batteryKwh, voltage, rocNote, ...m }) => m) });
    const t7xRid = await record(c, sid, 'bobcat-t7x-us-current-2026-08', T7X_URL, 'Bobcat T7X current US specifications', { captured: '2026-08-31', model: 'T7X', horsepower: 100, rocLb: 3056, rocBasis: 'Rated Operating Capacity (ISO); 35% of tipping load', operatingWeightLb: 12590, systemVoltage: 465, batteryType: 'Lithium Ion', grossBatteryCapacityKwh: 72.6 });
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Bobcat Current Compact Track Loaders','bobcat-current-compact-track-loaders') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et]);
    const series = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='bobcat-current-compact-track-loaders' LIMIT 1`, [mf, et]);
    const ids = new Map<string,number>(); for (const d of defs) { await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, d); ids.set(d[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [d[1]])); }
    const def = (k: string) => { const v = ids.get(k); if (!v) throw new Error(`Missing Bobcat CTL definition ${k}`); return v; };
    for (const m of models) {
      const rid = m.model === 'T7X' ? t7xRid : familyRid;
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Bobcat North America compact track loader listed in the official 2026 Classic/Pro loader catalog','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [mf, et, series, m.model, m.slug]);
      const mid = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [mf, et, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mid, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,'Current Bobcat North America compact track loader data captured 2026-08-31. T7X keeps its electric-system values and its ISO ROC basis separate from the family listing.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [mid, VERSION, `${m.category} current model`, rid]);
      const vid = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [mid, VERSION]);
      await put(c, mid, vid, def('configuration.type'), rid, 'Compact track loader'); await put(c, mid, vid, def('configuration.market_scope'), rid, 'United States / North America current catalog'); await put(c, mid, vid, def('bobcat.loader_category'), rid, m.category); await put(c, mid, vid, def('bobcat.compact_track_loader.published_power'), rid, m.hp, 'hp'); await put(c, mid, vid, def('bobcat.compact_track_loader.published_roc'), rid, m.rocLb, 'lb');
      if (m.rocNote) await put(c, mid, vid, def('bobcat.compact_track_loader.roc_basis'), rid, m.rocNote);
      if (m.batteryKwh) await put(c, mid, vid, def('bobcat.compact_track_loader.battery_capacity'), rid, m.batteryKwh, 'kWh');
      if (m.voltage) await put(c, mid, vid, def('bobcat.compact_track_loader.system_voltage'), rid, m.voltage, 'V');
    }
  },
};
