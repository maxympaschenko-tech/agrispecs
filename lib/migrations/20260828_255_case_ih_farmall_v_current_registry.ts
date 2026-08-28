import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const VERSION = 'united-states-current-2026-08';
const FAMILY = 'https://www.caseih.com/en-us/unitedstates/products/tractors/farmall-series/farmall-v-series';
const models = [
  { slug: 'farmall-80v', model: 'Farmall 80V', url: FAMILY + '/farmall-80v', externalId: 'case-ih-farmall-80v-current-us' },
  { slug: 'farmall-110v', model: 'Farmall 110V', url: FAMILY + '/farmall-110v', externalId: 'case-ih-farmall-110v-current-us' },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Farmall V dependency missing');
  return Number(rows[0].id);
}

export const caseIHFarmallVCurrentRegistryMigration: DbMigration = {
  id: '20260828_255_case_ih_farmall_v_current_registry',
  description: 'Register current US Case IH Farmall V 80V and 110V with source-backed specialty classification',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Tractor','tractor') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='case-ih'`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor'`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Farmall V Series','farmall-v-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et]);
    const series = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND slug='farmall-v-series'`, [mf]);
    let [s] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' LIMIT 1`);
    let sid = s[0]?.id ? Number(s[0].id) : 0;
    if (!sid) {
      const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`);
      sid = Number(x.insertId);
    }
    await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES('Application','application.type','Application','text',NULL,3) ON DUPLICATE KEY UPDATE label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit)`);
    const appDef = await id(c, `SELECT id FROM spec_definitions WHERE spec_key='application.type'`);

    for (const m of models) {
      const [existing] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [m.externalId]);
      let sr = existing[0]?.id ? Number(existing[0].id) : 0;
      if (!sr) {
        const [x] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sid, m.url, m.externalId, `Case IH US ${m.model} current product page`, JSON.stringify({ model: m.model, application: 'Specialty - Narrow', verification: 'Current US product page and current Case IH implement compatibility listing' })]);
        sr = Number(x.insertId);
      }
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US Case IH Farmall V specialty narrow tractor; only source-confirmed fields stored','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [mf, et, series, m.model, m.slug]);
      const mi = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=?`, [mf, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mi, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current Farmall V specialty narrow tractor',TRUE,?,'Official Case IH US current product evidence; detailed powertrain specs intentionally omitted until directly verified') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [mi, VERSION, sr]);
      const vi = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=?`, [mi, VERSION]);
      await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,'Specialty - Narrow',NULL,NULL,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=NULL,unit=NULL,source_record_id=VALUES(source_record_id),confidence='official'`, [mi, vi, appDef, sr]);
    }
  },
};
