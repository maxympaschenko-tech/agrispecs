import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; name: string; traction: string; ratedHp: number; maxHp: number; widthIn: number };

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://www.claas.com/en-us/agricultural-machinery/tractors/axion-900';
const TECH_BROCHURE = 'https://www.claas.com/caas/v1/media/971456/data/9a2a336e4ac801b2d7fa3539d7b6a49a';

const models: Seed[] = [
  { slug: 'axion-960-tt', name: 'AXION 960 TERRA TRAC', traction: 'TERRA TRAC half-track', ratedHp: 440, maxHp: 445, widthIn: 99 },
  { slug: 'axion-930-tt', name: 'AXION 930 TERRA TRAC', traction: 'TERRA TRAC half-track', ratedHp: 350, maxHp: 355, widthIn: 99 },
  { slug: 'axion-960', name: 'AXION 960', traction: 'Wheeled', ratedHp: 440, maxHp: 445, widthIn: 118 },
  { slug: 'axion-930', name: 'AXION 930', traction: 'Wheeled', ratedHp: 350, maxHp: 355, widthIn: 118 },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.station', 'Operator station', 'text', null, 1],
  ['Machine Configuration', 'configuration.traction', 'Traction configuration', 'text', null, 2],
  ['Engine', 'engine.make', 'Engine manufacturer', 'text', null, 1],
  ['Engine', 'engine.cylinders', 'Cylinders', 'integer', null, 4],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 6],
  ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 7],
  ['Engine', 'engine.gross_power', 'Maximum engine power', 'decimal', 'hp', 8],
  ['Transmission', 'transmission.standard', 'Transmission', 'text', null, 10],
  ['Transmission', 'transmission.speeds', 'Transmission speed range', 'text', null, 20],
  ['Dimensions & Weight', 'dimensions.overall_width', 'Minimum overall width', 'decimal', 'in', 20],
  ['Cab', 'cab.suspension', 'Cab suspension', 'text', null, 10],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) {
  const [r] = await c.query<IdRow[]>(sql, p);
  if (!r[0]) throw new Error('CLAAS AXION 900 migration dependency missing');
  return Number(r[0].id);
}
async function source(c: Parameters<DbMigration['apply']>[0], sid: number, eid: string, url: string, title: string, raw: unknown) {
  const [r] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [eid]);
  if (r[0]) return Number(r[0].id);
  const [i] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sid, url, eid, title, JSON.stringify(raw)]);
  return Number(i.insertId);
}
async function put(c: Parameters<DbMigration['apply']>[0], mid: number, vid: number, did: number, srid: number, v: string | number, u: string | null) {
  await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [mid, vid, did, typeof v === 'string' ? v : null, typeof v === 'number' ? v : null, u, srid]);
}

export const claasAxion900CurrentUsMigration: DbMigration = {
  id: '20260830_428_claas_axion_900_current_us',
  description: 'Add the four current US CLAAS AXION 900 wheel and TERRA TRAC configurations',
  async apply(c) {
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='claas' LIMIT 1`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sid = await id(c, `SELECT id FROM sources WHERE name='CLAAS North America' AND domain='claas.com' LIMIT 1`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'CLAAS AXION 900','claas-axion-900') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et]);
    const series = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='claas-axion-900' LIMIT 1`, [mf]);
    const seriesSr = await source(c, sid, 'claas-axion-900-current-us-2026-08', SERIES_URL, 'CLAAS current US AXION 900 lineup', {
      market: 'United States', captured: '2026-08-30',
      currentCards: ['960 TT', '930 TT', '960', '930'],
      currentUsPage: { transmission: 'CMATIC continuously variable transmission', minWidthIn: { terraTrac: 99, wheeled: 118 }, seriesMaxOutputHp: 445, terraTracBenefits: '15% more traction; 50% less soil pressure' },
      technicalBrochure: TECH_BROCHURE,
      technicalMapping: { '960 TT': { ratedHp: 440, maxHp: 445 }, '930 TT': { ratedHp: 350, maxHp: 355 }, '960': { ratedHp: 440, maxHp: 445 }, '930': { ratedHp: 350, maxHp: 355 } },
      scopePolicy: 'Current US page explicitly exposes only 960 TT, 930 TT, 960 and 930 as current configurable cards. Global brochure models 950, 940 and 920 are not marked current in US records.',
      brochurePolicy: 'The technical brochure is global and notes regional specifications may differ. It is used only for stable model-level engine architecture/output mapping that aligns with current US naming. No emissions approval, local fuel capacity, hitch capacity, axle, tire or hydraulic-option claims are normalized from it here.',
    });
    const d = new Map<string, number>();
    for (const row of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, row);
      d.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }
    for (const m of models) {
      const sr = await source(c, sid, `claas-${m.slug}-current-us-2026-08`, SERIES_URL, `CLAAS ${m.name} current US configuration`, { market: 'United States', captured: '2026-08-30', model: m.name, traction: m.traction, ratedHp: m.ratedHp, maxHp: m.maxHp, technicalBrochure: TECH_BROCHURE });
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US CLAAS AXION 900 tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [mf, et, series, m.name, m.slug]);
      const mid = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [mf, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mid, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,'Current CLAAS US AXION 900 configuration.') ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [mid, VERSION, `Cab; ${m.traction}; CMATIC continuously variable transmission`, sr || seriesSr]);
      const vid = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [mid, VERSION]);
      const vals: Array<[string, string | number, string | null]> = [
        ['configuration.station', 'Cab', null], ['configuration.traction', m.traction, null], ['engine.make', 'FPT', null], ['engine.cylinders', 6, null], ['engine.displacement', 8.71, 'L'], ['engine.rated_power', m.ratedHp, 'hp'], ['engine.gross_power', m.maxHp, 'hp'], ['transmission.standard', 'CMATIC continuously variable transmission', null], ['transmission.speeds', 'Continuously variable; powered zero mode', null], ['dimensions.overall_width', m.widthIn, 'in'], ['cab.suspension', 'Four-point cab suspension', null],
      ];
      for (const [k, v, u] of vals) { const did = d.get(k); if (!did) throw new Error(`Missing CLAAS AXION 900 spec ${k}`); await put(c, mid, vid, did, sr || seriesSr, v, u); }
    }
  },
};
