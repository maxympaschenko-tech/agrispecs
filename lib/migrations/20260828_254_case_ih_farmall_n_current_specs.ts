import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  hp: number;
  ptoHp: number;
  transmission?: string;
  minWidthIn?: number;
  url: string;
  externalId: string;
};

const VERSION = 'united-states-current-2026-08';
const FAMILY = 'https://www.caseih.com/en-us/unitedstates/products/tractors/farmall-specialty-series/farmall-n-series';
const models: Seed[] = [
  { slug: 'farmall-80n', model: 'Farmall 80N', hp: 74, ptoHp: 65, transmission: '16 x 16 Mechanical or 32 x 16 Power Shuttle', minWidthIn: 52.9, url: FAMILY + '/farmall-80n', externalId: 'case-ih-farmall-80n-current-us' },
  { slug: 'farmall-90n', model: 'Farmall 90N', hp: 85, ptoHp: 75, transmission: '16 x 16 Power Shuttle or 32 x 16 Power Shuttle', minWidthIn: 53.5, url: FAMILY + '/farmall-90n', externalId: 'case-ih-farmall-90n-current-us' },
  { slug: 'farmall-100n', model: 'Farmall 100N', hp: 99, ptoHp: 87, transmission: '16 x 16 Mechanical or Power Shuttle or 32 x 16 Power Shuttle', minWidthIn: 53.4, url: FAMILY + '/farmall-100n', externalId: 'case-ih-farmall-100n-current-us' },
  { slug: 'farmall-110n', model: 'Farmall 110N', hp: 106, ptoHp: 96, transmission: '16 x 16 Mechanical or Power Shuttle or 32 x 16 Power Shuttle', minWidthIn: 53.4, url: FAMILY + '/farmall-110n', externalId: 'case-ih-farmall-110n-current-us' },
  { slug: 'farmall-120n', model: 'Farmall 120N', hp: 119, ptoHp: 102, url: FAMILY + '/farmall-120n', externalId: 'case-ih-farmall-120n-current-us' },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Farmall N dependency missing');
  return Number(rows[0].id);
}

async function source(c: Parameters<DbMigration['apply']>[0], sourceId: number, m: Seed) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [m.externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, m.url, m.externalId, `Case IH US ${m.model} official current specifications`, JSON.stringify({ ...m, displacementL: 3.4, station: 'Cab or Non-cab', traction: '2WD or MFD', application: 'Specialty - Narrow' })],
  );
  return Number(result.insertId);
}

export const caseIHFarmallNCurrentSpecsMigration: DbMigration = {
  id: '20260828_254_case_ih_farmall_n_current_specs',
  description: 'Add current US Case IH Farmall N 80N-120N official specs',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='case-ih'`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor'`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Farmall N Series','farmall-n-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et]);
    const series = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='farmall-n-series'`, [mf]);
    let [s] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' LIMIT 1`);
    let sid = s[0]?.id ? Number(s[0].id) : 0;
    if (!sid) {
      const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`);
      sid = Number(x.insertId);
    }

    const defs: Array<[string, string, string, string, string | null, number]> = [
      ['Machine Configuration', 'configuration.station', 'Operator station', 'text', null, 1],
      ['Machine Configuration', 'configuration.drive', 'Drive configuration', 'text', null, 2],
      ['Application', 'application.type', 'Application', 'text', null, 3],
      ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 2],
      ['Engine', 'engine.rated_power', 'Engine horsepower', 'decimal', 'hp', 3],
      ['PTO', 'pto.rated_power', 'PTO power', 'decimal', 'hp', 10],
      ['Transmission', 'transmission.options', 'Transmission options', 'text', null, 10],
      ['Dimensions', 'dimensions.minimum_width', 'Minimum working width', 'decimal', 'in', 10],
    ];
    for (const d of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit)`, d);
    }

    for (const m of models) {
      const sr = await source(c, sid, m);
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US Case IH Farmall N specialty narrow tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [mf, et, series, m.model, m.slug]);
      const mi = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=?`, [mf, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mi, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current Farmall N specialty narrow tractor',TRUE,?,'Official Case IH US current product data') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [mi, VERSION, sr]);
      const vi = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=?`, [mi, VERSION]);
      const vals: Array<[string, string | number, string | null]> = [
        ['configuration.station', 'Cab or Non-cab', null],
        ['configuration.drive', '2WD or MFD', null],
        ['application.type', 'Specialty - Narrow', null],
        ['engine.displacement', 3.4, 'L'],
        ['engine.rated_power', m.hp, 'hp'],
        ['pto.rated_power', m.ptoHp, 'hp'],
      ];
      if (m.transmission) vals.push(['transmission.options', m.transmission, null]);
      if (m.minWidthIn !== undefined) vals.push(['dimensions.minimum_width', m.minWidthIn, 'in']);
      for (const [key, value, unit] of vals) {
        const di = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=?`, [key]);
        await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [mi, vi, di, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, sr]);
      }
    }
  },
};
