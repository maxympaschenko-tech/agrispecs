import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; model: string; hp: number; url: string; externalId: string };
const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/tractors/puma-super-series/puma-series-new';
const models: Seed[] = [
  { slug: 'puma-165-new', model: 'Puma 165 New', hp: 165, url: `${FAMILY_URL}/puma-165-new`, externalId: 'case-ih-puma-165-new-current-us' },
  { slug: 'puma-185-new', model: 'Puma 185 New', hp: 185, url: `${FAMILY_URL}/puma-185-new`, externalId: 'case-ih-puma-185-new-current-us' },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) {
  const [r] = await c.query<IdRow[]>(sql, p);
  if (!r[0]) throw Error('Puma New dependency missing');
  return Number(r[0].id);
}

async function source(c: Parameters<DbMigration['apply']>[0], sid: number, externalId: string, url: string, title: string, raw?: unknown) {
  const [r] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (r[0]) return Number(r[0].id);
  const [x] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sid, url, externalId, title, raw ? JSON.stringify(raw) : null]);
  return Number(x.insertId);
}

export const caseIHPuma165185NewCurrentMigration: DbMigration = {
  id: '20260828_262_case_ih_puma_165_185_new_current',
  description: 'Add current US Case IH Puma 165 New and Puma 185 New as generation-specific records',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Puma Series New','puma-series-new') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et]);
    const series = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='puma-series-new' LIMIT 1`, [mf, et]);
    let [s] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' LIMIT 1`);
    let sid = s[0]?.id ? Number(s[0].id) : 0;
    if (!sid) {
      const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`);
      sid = Number(x.insertId);
    }
    const familySource = await source(c, sid, 'case-ih-puma-series-new-current-us', FAMILY_URL, 'Case IH US Puma Series New current lineup', { models: ['Puma 155 New', 'Puma 165 New', 'Puma 185 New'], engine: 'latest generation Stage V-compliant FPT', transmission: 'ActiveDrive 8 or CVXDrive', engineOilIntervalHours: 750 });
    const defs: Array<[string,string,string,string,string|null,number]> = [
      ['Machine Configuration','configuration.station','Operator station','text',null,1],
      ['Engine','engine.displacement','Engine displacement','decimal','L',2],
      ['Engine','engine.rated_power','Rated engine power','decimal','hp',3],
      ['Engine','engine.emissions','Emissions standard','text',null,6],
      ['Transmission','transmission.options','Transmission options','text',null,10],
      ['Maintenance','maintenance.engine_oil_interval','Engine oil service interval','integer','hours',10],
    ];
    for (const d of defs) await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit)`, d);
    for (const m of models) {
      const sr = await source(c, sid, m.externalId, m.url, `Case IH US ${m.model} official current specifications`, { horsepower: m.hp, engineSizeL: 6.7 });
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US Case IH Puma Series New tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [mf, et, series, m.model, m.slug]);
      const mi = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [mf, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mi, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current Puma Series New cab tractor',TRUE,?,'Generation-specific Puma Series New record. PTO horsepower is intentionally omitted because the current US product page does not publish a numeric PTO horsepower value.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [mi, VERSION, sr]);
      const vi = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [mi, VERSION]);
      const vals: Array<[string,string|number,string|null,number]> = [
        ['configuration.station','Cab',null,familySource],
        ['engine.displacement',6.7,'L',sr],
        ['engine.rated_power',m.hp,'hp',sr],
        ['engine.emissions','Stage V',null,familySource],
        ['transmission.options','ActiveDrive 8 or CVXDrive',null,familySource],
        ['maintenance.engine_oil_interval',750,'hours',familySource],
      ];
      for (const [key,v,u,sourceId] of vals) {
        const di = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
        await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [mi, vi, di, typeof v === 'string' ? v : null, typeof v === 'number' ? v : null, u, sourceId]);
      }
    }
    const loader = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug='l116-puma' LIMIT 1`, [mf]);
    const lsr = await source(c, sid, 'case-ih-puma-l116-current', 'https://www.caseih.com/en-us/unitedstates/products/loaders-attachments/l11-series-loaders/l116', 'Case IH US L116 loader specifications and Puma compatibility', { compatible: ['Puma 150','Puma 155','Puma 165','Puma 175','Puma 185'] });
    for (const slug of ['puma-165-new','puma-185-new']) {
      const mi = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [mf, slug]);
      await c.query(`INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES(?,?,'Official Case IH L116 compatibility for the Puma model designation.',?,'official') ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id),confidence='official',compatibility_note=VALUES(compatibility_note)`, [mi, loader, lsr]);
    }
  }
};
