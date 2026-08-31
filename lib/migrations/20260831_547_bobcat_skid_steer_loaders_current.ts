import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; model: string; hp: number; rocLb: number; category: 'Classic' | 'Pro' };

const VERSION = 'united-states-current-2026-08';
const URL = 'https://www.bobcat.com/na/en/equipment/loaders/skid-steer-loaders';
const models: Seed[] = [
  { slug: 's70', model: 'S70', hp: 23.5, rocLb: 760, category: 'Classic' },
  { slug: 's450', model: 'S450', hp: 49, rocLb: 1370, category: 'Classic' },
  { slug: 's590', model: 'S590', hp: 68, rocLb: 2000, category: 'Classic' },
  { slug: 's64-2', model: 'S64-2', hp: 68, rocLb: 2300, category: 'Pro' },
  { slug: 's66-2', model: 'S66-2', hp: 74, rocLb: 2400, category: 'Pro' },
  { slug: 's650', model: 'S650', hp: 74, rocLb: 2690, category: 'Classic' },
  { slug: 's76-2', model: 'S76-2', hp: 74, rocLb: 2900, category: 'Pro' },
  { slug: 's770', model: 'S770', hp: 92, rocLb: 3350, category: 'Classic' },
  { slug: 's86-2', model: 'S86-2', hp: 115, rocLb: 3500, category: 'Pro' },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Machine Configuration','bobcat.loader_category','Bobcat loader category','text',null,10],
  ['Engine','bobcat.skid_steer.published_power','Published horsepower','decimal','hp',10],
  ['Loader Performance','bobcat.skid_steer.published_roc','Published rated operating capacity','decimal','lb',10],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) {
  const [r] = await c.query<IdRow[]>(sql, p);
  if (!r[0]) throw new Error('Bobcat skid steer migration dependency missing');
  return Number(r[0].id);
}

async function source(c: Parameters<DbMigration['apply']>[0]) {
  const [r] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Bobcat' AND domain='bobcat.com' ORDER BY id LIMIT 1`);
  if (r[0]) return Number(r[0].id);
  const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Bobcat','bobcat.com','manufacturer','official')`);
  return Number(x.insertId);
}

async function record(c: Parameters<DbMigration['apply']>[0], sid: number) {
  const externalId = 'bobcat-skid-steer-loaders-us-current-2026-08';
  const [r] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (r[0]) return Number(r[0].id);
  const [x] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sid, URL, externalId, 'Bobcat current US Classic and Pro skid-steer loader lineup', JSON.stringify({ captured: '2026-08-31', market: 'United States / North America', equipmentType: 'Skid Steer Loader', models, notes: 'Current Bobcat page separates Classic and Pro loader paths. Pro models use the new -2 designations.' })],
  );
  return Number(x.insertId);
}

async function put(c: Parameters<DbMigration['apply']>[0], mid: number, vid: number, did: number, rid: number, value: string | number, unit: string | null = null) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [mid, vid, did, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, rid],
  );
}

export const bobcatSkidSteerLoadersCurrentMigration: DbMigration = {
  id: '20260831_547_bobcat_skid_steer_loaders_current',
  description: 'Add current Bobcat United States Classic and Pro skid-steer loaders',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Skid Steer Loader','skid-steer-loader') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Bobcat','bobcat') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='bobcat' LIMIT 1`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='skid-steer-loader' LIMIT 1`);
    const sid = await source(c);
    const rid = await record(c, sid);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Bobcat Current Skid-Steer Loaders','bobcat-current-skid-steer-loaders') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et]);
    const series = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='bobcat-current-skid-steer-loaders' LIMIT 1`, [mf, et]);
    const ids = new Map<string, number>();
    for (const d of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, d);
      ids.set(d[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [d[1]]));
    }
    const def = (k: string) => { const v = ids.get(k); if (!v) throw new Error(`Missing Bobcat skid steer definition ${k}`); return v; };
    for (const m of models) {
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Bobcat North America skid-steer loader listed in the official Classic/Pro lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [mf, et, series, m.model, m.slug]);
      const mid = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [mf, et, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mid, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,'Current Bobcat North America Classic/Pro loader page captured 2026-08-31. Horsepower and ROC are stored exactly as published on the current family page.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [mid, VERSION, `${m.category} current model`, rid]);
      const vid = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [mid, VERSION]);
      await put(c, mid, vid, def('configuration.type'), rid, 'Skid steer loader');
      await put(c, mid, vid, def('configuration.market_scope'), rid, 'United States / North America current catalog');
      await put(c, mid, vid, def('bobcat.loader_category'), rid, m.category);
      await put(c, mid, vid, def('bobcat.skid_steer.published_power'), rid, m.hp, 'hp');
      await put(c, mid, vid, def('bobcat.skid_steer.published_roc'), rid, m.rocLb, 'lb');
    }
  },
};
