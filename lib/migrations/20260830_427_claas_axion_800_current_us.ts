import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; name: string; ratedHp: number; maxHp: number };

const VERSION = 'united-states-current-2026-08';
const SERIES_URL = 'https://www.claas.com/en-us/agricultural-machinery/tractors/axion-800';
const NA_BROCHURE = 'https://www.claas.com/caas/claas/media/stable/1145046';

const models: Seed[] = [
  { slug: 'axion-880-cmatic', name: 'AXION 880 CMATIC', ratedHp: 265, maxHp: 295 },
  { slug: 'axion-860-cmatic', name: 'AXION 860 CMATIC', ratedHp: 250, maxHp: 264 },
  { slug: 'axion-840-cmatic', name: 'AXION 840 CMATIC', ratedHp: 230, maxHp: 235 },
  { slug: 'axion-820-cmatic', name: 'AXION 820 CMATIC', ratedHp: 215, maxHp: 215 },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.station', 'Operator station', 'text', null, 1],
  ['Engine', 'engine.cylinders', 'Cylinders', 'integer', null, 4],
  ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 6],
  ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 7],
  ['Engine', 'engine.gross_power', 'Maximum engine power', 'decimal', 'hp', 8],
  ['Transmission', 'transmission.standard', 'Transmission', 'text', null, 10],
  ['Transmission', 'transmission.speeds', 'Transmission speed range', 'text', null, 20],
  ['Transmission', 'transmission.max_forward_speed', 'Maximum forward speed', 'decimal', 'mph', 30],
  ['Dimensions & Weight', 'dimensions.overall_width', 'Minimum overall width', 'decimal', 'in', 20],
  ['Cab', 'cab.suspension', 'Cab suspension', 'text', null, 10],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) {
  const [r] = await c.query<IdRow[]>(sql, p);
  if (!r[0]) throw new Error('CLAAS AXION 800 migration dependency missing');
  return Number(r[0].id);
}

async function source(c: Parameters<DbMigration['apply']>[0], sid: number, eid: string, url: string, title: string, raw: unknown) {
  const [r] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [eid]);
  if (r[0]) return Number(r[0].id);
  const [i] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sid, url, eid, title, JSON.stringify(raw)],
  );
  return Number(i.insertId);
}

async function put(c: Parameters<DbMigration['apply']>[0], mid: number, vid: number, did: number, srid: number, v: string | number, u: string | null) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES(?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [mid, vid, did, typeof v === 'string' ? v : null, typeof v === 'number' ? v : null, u, srid],
  );
}

export const claasAxion800CurrentUsMigration: DbMigration = {
  id: '20260830_427_claas_axion_800_current_us',
  description: 'Add the four current North America CLAAS AXION 800 CMATIC models',
  async apply(c) {
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='claas' LIMIT 1`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    const sid = await id(c, `SELECT id FROM sources WHERE name='CLAAS North America' AND domain='claas.com' LIMIT 1`);

    await c.query(
      `INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'CLAAS AXION 800','claas-axion-800')
       ON DUPLICATE KEY UPDATE name=VALUES(name)`,
      [mf, et],
    );
    const series = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='claas-axion-800' LIMIT 1`, [mf]);

    const seriesSr = await source(c, sid, 'claas-axion-800-current-us-2026-08', SERIES_URL, 'CLAAS North America current AXION 800 lineup', {
      market: 'United States',
      captured: '2026-08-30',
      currentCards: models.map((m) => m.name),
      currentUsPage: {
        transmission: 'CMATIC continuously variable transmission',
        minOverallWidthIn: 118,
        maxForwardSpeedMph: 31,
        modelMaxOutputHp: { '880 CMATIC': 295, '860 CMATIC': 264, '840 CMATIC': 235, '820 CMATIC': 215 },
      },
      northAmericaBrochure: NA_BROCHURE,
      brochureRatedHp: { '880': 265, '860': 250, '840': 230, '820': 215 },
      brochureNote: 'The North America AXION 800 brochure also publishes an 880 rated-power boost figure of 280 hp. This migration stores 265 hp as base rated output and 295 hp as current maximum output; the boost figure remains preserved in source metadata rather than being substituted for either field.',
      regionalPolicy: 'North America current model numbering is 880/860/840/820. Current European AXION 800 numbering such as 870/850/830/810 is intentionally not imported into US current records.',
      scopePolicy: 'Only fields explicitly supported by the current US page or North America brochure are normalized. Hitch, weight, fuel and hydraulic capacities are left unset here rather than copied from another regional configuration.',
    });

    const d = new Map<string, number>();
    for (const row of defs) {
      await c.query(
        `INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        row,
      );
      d.set(row[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [row[1]]));
    }

    for (const m of models) {
      const sr = await source(c, sid, `claas-${m.slug}-current-us-2026-08`, SERIES_URL, `CLAAS ${m.name} current North America specifications`, {
        market: 'United States', captured: '2026-08-30', model: m.name, ratedHp: m.ratedHp, maxHp: m.maxHp, brochure: NA_BROCHURE,
      });
      await c.query(
        `INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status)
         VALUES(?,?,?,?,?,'Current North America CLAAS AXION 800 tractor','partial')
         ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,
        [mf, et, series, m.name, m.slug],
      );
      const mid = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [mf, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mid, VERSION]);
      await c.query(
        `INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES(?,?,'US','United States','Cab; CMATIC continuously variable transmission',TRUE,?,'Current CLAAS North America AXION 800 configuration.')
         ON DUPLICATE KEY UPDATE configuration=VALUES(configuration),is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [mid, VERSION, sr || seriesSr],
      );
      const vid = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [mid, VERSION]);
      const vals: Array<[string, string | number, string | null]> = [
        ['configuration.station', 'Cab', null],
        ['engine.cylinders', 6, null],
        ['engine.displacement', 6.73, 'L'],
        ['engine.rated_power', m.ratedHp, 'hp'],
        ['engine.gross_power', m.maxHp, 'hp'],
        ['transmission.standard', 'CMATIC continuously variable transmission', null],
        ['transmission.speeds', 'Continuously variable; 0.05 to 31 mph; powered zero mode', null],
        ['transmission.max_forward_speed', 31, 'mph'],
        ['dimensions.overall_width', 118, 'in'],
        ['cab.suspension', 'Four-point cab suspension; PROACTIV front axle suspension', null],
      ];
      for (const [k, v, u] of vals) {
        const did = d.get(k);
        if (!did) throw new Error(`Missing CLAAS AXION 800 spec ${k}`);
        await put(c, mid, vid, did, sr || seriesSr, v, u);
      }
    }
  },
};
