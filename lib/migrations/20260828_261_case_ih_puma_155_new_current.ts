import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const VERSION = 'united-states-current-2026-08';
const URL = 'https://www.caseih.com/en-us/unitedstates/products/tractors/puma-super-series/puma-series-new/puma-155-new';
const EXTERNAL_ID = 'case-ih-puma-155-new-current-us';

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Puma 155 New dependency missing');
  return Number(rows[0].id);
}

export const caseIHPuma155NewCurrentMigration: DbMigration = {
  id: '20260828_261_case_ih_puma_155_new_current',
  description: 'Add current US Case IH Puma 155 New official model data and L116 fitment',
  async apply(c) {
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='tractor' LIMIT 1`);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Puma Series New','puma-series-new') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et]);
    const series = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='puma-series-new' LIMIT 1`, [mf, et]);
    const [sourceRows] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' LIMIT 1`);
    const sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) throw new Error('Case IH source missing');
    const [recordRows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [EXTERNAL_ID]);
    let sourceRecordId = recordRows[0]?.id ? Number(recordRows[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId, URL, EXTERNAL_ID, 'Case IH US Puma 155 New official current product specifications', JSON.stringify({ model: 'Puma 155 New', horsepower: 155, engineDisplacementL: 6.7 })]);
      sourceRecordId = Number(result.insertId);
    }
    const defs: Array<[string,string,string,string,string|null,number]> = [
      ['Engine', 'engine.displacement', 'Engine displacement', 'decimal', 'L', 2],
      ['Engine', 'engine.rated_power', 'Rated engine power', 'decimal', 'hp', 3],
    ];
    for (const d of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit)`, d);
    }
    await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current US Case IH Puma Series New tractor','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [mf, et, series, 'Puma 155 New', 'puma-155-new']);
    const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug='puma-155-new' LIMIT 1`, [mf]);
    await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [machineId, VERSION]);
    await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current Puma Series New tractor',TRUE,?,'Official current Case IH US product page. PTO power is intentionally omitted because the accessible current page does not publish it.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION, sourceRecordId]);
    const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
    const vals: Array<[string,number,string]> = [
      ['engine.displacement', 6.7, 'L'],
      ['engine.rated_power', 155, 'hp'],
    ];
    for (const [key, value, unit] of vals) {
      const definitionId = await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [key]);
      await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, versionId, definitionId, value, unit, sourceRecordId]);
    }
    const l116 = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug='l116-puma' LIMIT 1`, [mf]);
    const l116Source = await id(c, `SELECT id FROM source_records WHERE external_id='case-ih-puma-l116-current' LIMIT 1`);
    await c.query(`INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES(?,?,?,?,'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`, [machineId, l116, 'Official Case IH L116 compatibility includes Puma 155.', l116Source]);
  },
};
