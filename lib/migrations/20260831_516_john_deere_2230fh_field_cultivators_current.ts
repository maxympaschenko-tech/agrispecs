import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  url: string;
  widthFt: number;
  transportHeightFt: number;
};

const VERSION = 'united-states-current-2026-08';
const models: Seed[] = [
  {
    slug: '2230fh-44-ft-6-in',
    model: '2230FH 44 ft 6 in',
    url: 'https://www-cm-us.deere.com/en-us/products-solutions/tillage/cultivators/2230fh-5-section-11-ft-center-frame-44-ft-6-in-floating-hitch-field-cultivator-nje4m4k',
    widthFt: 44.5,
    transportHeightFt: 12.58,
  },
  {
    slug: '2230fh-48-ft-6-in',
    model: '2230FH 48 ft 6 in',
    url: 'https://www-cm-us.deere.com/en-us/products-solutions/tillage/cultivators/2230fh-5-section-11-ft-center-frame-48-ft-6-in-floating-hitch-field-cultivator-nje440m',
    widthFt: 48.5,
    transportHeightFt: 13.58,
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Tillage System', 'tillage.working_width_ft', 'Working width', 'decimal', 'ft', 10],
  ['Tillage System', 'tillage.operating_depth_in', 'Operating depth', 'decimal', 'in', 20],
  ['Tillage System', 'tillage.operating_speed', 'Operating speed', 'text', null, 30],
  ['Tillage System', 'tillage.spacing_in', 'Split-the-middle spacing', 'decimal', 'in', 40],
  ['Tillage System', 'tillage.frame_design', 'Frame design', 'text', null, 50],
  ['Tillage System', 'tillage.underframe_clearance_in', 'Underframe clearance', 'decimal', 'in', 60],
  ['Tractor Requirements', 'tillage.hp_required_per_ft', 'Horsepower required', 'text', null, 10],
  ['Dimensions & Transport', 'tillage.transport_width_ft', 'Transport width without rear harrow', 'decimal', 'ft', 10],
  ['Dimensions & Transport', 'tillage.transport_height_ft', 'Transport height without rear harrow', 'decimal', 'ft', 20],
  ['Precision Technology', 'tillage.depth_control', 'Depth control technology', 'text', null, 10],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('John Deere 2230FH migration dependency missing');
  return Number(rows[0].id);
}

async function source(c: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('John Deere','deere.com','manufacturer','official')`);
  return Number(inserted.insertId);
}

async function record(c: Parameters<DbMigration['apply']>[0], sourceId: number, m: Seed) {
  const externalId = `john-deere-${m.slug}-field-cultivator-us-current-2026-08`;
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sourceId, m.url, externalId, `John Deere ${m.model} current US field cultivator specifications`, JSON.stringify({ captured: '2026-08-31', market: 'United States', equipmentType: 'Field Cultivator', configuration: '2230FH 5-section 11-ft center frame', ...m })],
  );
  return Number(inserted.insertId);
}

async function putText(c: Parameters<DbMigration['apply']>[0], mid: number, vid: number, did: number, rid: number, value: string) {
  await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,NULL,NULL,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=NULL,unit=NULL,source_record_id=VALUES(source_record_id),confidence='official'`, [mid, vid, did, value, rid]);
}

async function putNumber(c: Parameters<DbMigration['apply']>[0], mid: number, vid: number, did: number, rid: number, value: number, unit: string) {
  await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,NULL,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=NULL,value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [mid, vid, did, value, unit, rid]);
}

export const johnDeere2230fhFieldCultivatorsCurrentMigration: DbMigration = {
  id: '20260831_516_john_deere_2230fh_field_cultivators_current',
  description: 'Add current John Deere US 2230FH field cultivator configurations',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Field Cultivator','field-cultivator') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('John Deere','john-deere') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='field-cultivator' LIMIT 1`);
    const sid = await source(c);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'2230FH Floating Hitch','2230fh-floating-hitch') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et]);
    const series = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='2230fh-floating-hitch' LIMIT 1`, [mf, et]);

    const ids = new Map<string, number>();
    for (const d of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, d);
      ids.set(d[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [d[1]]));
    }
    const def = (key: string) => {
      const value = ids.get(key);
      if (!value) throw new Error(`Missing John Deere field cultivator definition ${key}`);
      return value;
    };

    for (const m of models) {
      const rid = await record(c, sid, m);
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current John Deere United States 2230FH field cultivator configuration','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`, [mf, et, series, m.model, m.slug]);
      const mid = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [mf, et, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mid, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','2230FH 5-section, 11-ft center frame',TRUE,?,'Current John Deere US product-page data captured 2026-08-31.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [mid, VERSION, rid]);
      const vid = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [mid, VERSION]);
      await putText(c, mid, vid, def('configuration.type'), rid, 'Floating hitch field cultivator');
      await putText(c, mid, vid, def('configuration.market_scope'), rid, 'United States current product page');
      await putNumber(c, mid, vid, def('tillage.working_width_ft'), rid, m.widthFt, 'ft');
      await putNumber(c, mid, vid, def('tillage.operating_depth_in'), rid, 5, 'in');
      await putText(c, mid, vid, def('tillage.operating_speed'), rid, '6 - 10 mph');
      await putNumber(c, mid, vid, def('tillage.spacing_in'), rid, 6, 'in');
      await putText(c, mid, vid, def('tillage.frame_design'), rid, '5-section, 11-ft center frame; lattice-style frame; floating hitch');
      await putNumber(c, mid, vid, def('tillage.underframe_clearance_in'), rid, 24, 'in');
      await putText(c, mid, vid, def('tillage.hp_required_per_ft'), rid, '8 - 12 hp/ft (19.6 - 29.4 kW/m)');
      await putNumber(c, mid, vid, def('tillage.transport_width_ft'), rid, 16, 'ft');
      await putNumber(c, mid, vid, def('tillage.transport_height_ft'), rid, m.transportHeightFt, 'ft');
      await putText(c, mid, vid, def('tillage.depth_control'), rid, 'TruSet Active improves tillage depth accuracy and can make automatic adjustments');
    }
  },
};
