import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  sourceUrl: string;
  frame: string;
  width: string;
  shankSystem: string;
  spacing: string;
  shankCount?: string;
  depth?: string;
  clearance?: string;
  holdingForce?: string;
  precision?: string;
};

const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/tillage/field-cultivators';
const models: Seed[] = [
  {
    slug: 'tiger-mate-255',
    model: 'Tiger-Mate 255',
    sourceUrl: `${FAMILY_URL}/tiger-mate-255`,
    frame: 'Single-fold or double-fold',
    width: '22 ft 2 in - 60 ft 1 in (6.8 - 18.3 m)',
    shankSystem: 'C-shank with split-the-middle sweep pattern',
    spacing: '6-in shank spacing',
    precision: 'Soil Command with Seedbed Sense available for current Tiger-Mate 255 configurations',
  },
  {
    slug: 'vibra-tine-265',
    model: 'Vibra-Tine 265',
    sourceUrl: `${FAMILY_URL}/vibra-tine-s-tine`,
    frame: 'Single-fold or double-fold',
    width: '26.5 - 48.5 ft (8.0 - 14.8 m)',
    shankSystem: 'Six ranks of vibrating S-tines',
    spacing: 'Effective 4-in spacing',
    shankCount: '78 - 144 S-tines',
    depth: '0.5 - 4 in (1.27 - 10.16 cm)',
    clearance: '24 in (60.96 cm)',
    holdingForce: '110 lb standard one-piece coil; 160 lb heavy-duty two-piece coil',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Tillage System', 'tillage.frame_type', 'Frame type', 'text', null, 10],
  ['Tillage System', 'tillage.working_width', 'Working width', 'text', null, 20],
  ['Tillage System', 'tillage.shank_system', 'Shank system', 'text', null, 30],
  ['Tillage System', 'tillage.spacing', 'Shank or tine spacing', 'text', null, 40],
  ['Tillage System', 'tillage.shank_count', 'Shank or tine count', 'text', null, 50],
  ['Tillage System', 'tillage.operating_depth', 'Operating depth', 'text', null, 60],
  ['Tillage System', 'tillage.frame_clearance', 'Frame clearance', 'text', null, 70],
  ['Tillage System', 'tillage.holding_force', 'Shank holding force', 'text', null, 80],
  ['Precision Technology', 'tillage.precision_control', 'Precision tillage control', 'text', null, 10],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH field cultivator migration dependency missing');
  return Number(rows[0].id);
}

async function source(c: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`);
  return Number(inserted.insertId);
}

async function record(c: Parameters<DbMigration['apply']>[0], sourceId: number, m: Seed) {
  const externalId = `case-ih-${m.slug}-field-cultivator-us-current-2026-08`;
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, m.sourceUrl, externalId, `Case IH ${m.model} current US field cultivator specifications`, JSON.stringify({ captured: '2026-08-31', market: 'United States', equipmentType: 'Field Cultivator', familySource: FAMILY_URL, ...m })],
  );
  return Number(inserted.insertId);
}

async function put(c: Parameters<DbMigration['apply']>[0], machineId: number, versionId: number, definitionId: number, recordId: number, value: string) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,NULL,NULL,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=NULL,unit=NULL,source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId, versionId, definitionId, value, recordId],
  );
}

export const caseIhFieldCultivatorsCurrentMigration: DbMigration = {
  id: '20260831_515_case_ih_field_cultivators_current',
  description: 'Add current Case IH US Tiger-Mate 255 and Vibra-Tine 265 field cultivators',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Field Cultivator','field-cultivator') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='field-cultivator' LIMIT 1`);
    const sid = await source(c);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Field Cultivators','field-cultivators') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et]);
    const series = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='field-cultivators' LIMIT 1`, [mf, et]);

    const ids = new Map<string, number>();
    for (const d of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, d);
      ids.set(d[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [d[1]]));
    }
    const def = (key: string) => {
      const value = ids.get(key);
      if (!value) throw new Error(`Missing field cultivator definition ${key}`);
      return value;
    };

    for (const m of models) {
      const rid = await record(c, sid, m);
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Case IH United States field cultivator lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [mf, et, series, m.model, m.slug]);
      const mid = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [mf, et, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mid, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current field cultivator specification',TRUE,?,'Current Case IH US product-page data captured 2026-08-31.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [mid, VERSION, rid]);
      const vid = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [mid, VERSION]);
      await put(c, mid, vid, def('configuration.type'), rid, 'Pull-type field cultivator');
      await put(c, mid, vid, def('configuration.market_scope'), rid, 'United States current catalog');
      await put(c, mid, vid, def('tillage.frame_type'), rid, m.frame);
      await put(c, mid, vid, def('tillage.working_width'), rid, m.width);
      await put(c, mid, vid, def('tillage.shank_system'), rid, m.shankSystem);
      await put(c, mid, vid, def('tillage.spacing'), rid, m.spacing);
      if (m.shankCount) await put(c, mid, vid, def('tillage.shank_count'), rid, m.shankCount);
      if (m.depth) await put(c, mid, vid, def('tillage.operating_depth'), rid, m.depth);
      if (m.clearance) await put(c, mid, vid, def('tillage.frame_clearance'), rid, m.clearance);
      if (m.holdingForce) await put(c, mid, vid, def('tillage.holding_force'), rid, m.holdingForce);
      if (m.precision) await put(c, mid, vid, def('tillage.precision_control'), rid, m.precision);
    }
  },
};
