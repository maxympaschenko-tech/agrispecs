import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Line = 'FarmLine' | 'ProLine';
type DetailSource = 'catalog' | 'ra1000' | 'ra2071' | 'ra2000' | 'ra2577' | 'broad';
type Seed = {
  slug: string;
  model: string;
  line: Line;
  workingWidth: string;
  transportWidth?: string;
  transportLength?: string;
  transportHeight: string;
  weightLb: number;
  swathWidth?: string;
  capacity?: number;
  hitch: string;
  rotorDiameter: string;
  swathDelivery: string;
  rotors: number;
  armsPerRotor: string;
  doubleTinesPerArm: string;
  tineDiameterIn: number;
  heightAdjustment: string;
  suggestedPtoHp?: number;
  groundFollowing?: string;
  detailSource: DetailSource;
  notes: string;
};

const VERSION = 'united-states-current-2026-09';
const LIVE_URL = 'https://www.kubotausa.com/equipment-series/rakes';
const FULL_LINE_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const BROAD_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/tedders-and-rakes.pdf';
const RA1000_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/ra1000_specs.pdf?sfvrsn=67d98d2_2';
const RA2071_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/ra2071tevo_specs.pdf?sfvrsn=7edb23fd_2';
const RA2000_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/ra2000_specs.pdf?sfvrsn=a9c0f629_2';
const RA2577_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/ra2577_specs.pdf?sfvrsn=f926935a_2';

const models: Seed[] = [
  { slug: 'ra1035', model: 'RA1035', line: 'FarmLine', workingWidth: `11' 6"`, transportWidth: `5' 9"`, transportLength: `11'`, transportHeight: `5' 7"`, weightLb: 926, capacity: 9.6, hitch: 'Pivoting 3-point headstock, Category I/II', rotorDiameter: `9' 2"`, swathDelivery: 'Left', rotors: 1, armsPerRotor: '10', doubleTinesPerArm: '4', tineDiameterIn: 0.35, heightAdjustment: 'Mechanical', detailSource: 'ra1000', notes: 'Current model status comes from the live Kubota USA Rakes page. Detailed values use the recent RA1000 specification sheet and agree with the 2026 full-line table.' },
  { slug: 'ra1042t', model: 'RA1042T', line: 'FarmLine', workingWidth: `13' 9"`, transportWidth: `6' 7"`, transportLength: `13' 2"`, transportHeight: `7' 7"`, weightLb: 1257, capacity: 11.4, hitch: 'Linkage drawbar', rotorDiameter: `11'`, swathDelivery: 'Left', rotors: 1, armsPerRotor: '11', doubleTinesPerArm: '4', tineDiameterIn: 0.35, heightAdjustment: 'Mechanical', detailSource: 'ra1000', notes: 'Current model status comes from the live Kubota USA Rakes page. Detailed values use the recent RA1000 specification sheet.' },
  { slug: 'ra1047t', model: 'RA1047T', line: 'FarmLine', workingWidth: `15' 5"`, transportWidth: `7' 10"`, transportLength: `15' 9"`, transportHeight: `8' 8"`, weightLb: 1466, hitch: 'FarmLine trailing rotary rake configuration', rotorDiameter: `12'`, swathDelivery: 'Left', rotors: 1, armsPerRotor: '12', doubleTinesPerArm: '4', tineDiameterIn: 0.35, heightAdjustment: 'Mechanical', detailSource: 'catalog', notes: 'RA1047T is confirmed current by the live Kubota USA Rakes page and September 2026 financing offer. The 2026 full-line table supplies dimensions, weight and rotor geometry. Fields not independently exposed by Kubota are deliberately left unset rather than inferred from neighboring RA1000 models.' },
  { slug: 'ra2071t-evo', model: 'RA2071T EVO', line: 'FarmLine', workingWidth: `21' 8" / 23' 3" double swath`, transportWidth: `9' 10"`, transportLength: `24' 9" with detached tine arms and lowered headstock`, transportHeight: `7' 10"–9' 6"`, weightLb: 2976, capacity: 18, hitch: 'Linkage drawbar', rotorDiameter: `9' 8"`, swathDelivery: 'Left; one or two windrows depending configuration', rotors: 2, armsPerRotor: '11 / 12', doubleTinesPerArm: '4', tineDiameterIn: 0.35, heightAdjustment: 'Hydraulic / mechanical', detailSource: 'ra2071', notes: 'Current model status comes from the live Rakes page. Recent RA2071T EVO sheet publishes 21 ft 8 in / 23 ft 3 in double-swath working width; the 2026 full-line table prints 22 ft 3 in for the larger figure. The recent dedicated sheet is retained and the catalog discrepancy is not averaged.' },
  { slug: 'ra2072', model: 'RA2072', line: 'FarmLine', workingWidth: `20' 4"–23' 7"`, transportWidth: `9' 2"`, transportHeight: `12' 8"`, weightLb: 3430, swathWidth: `3' 11"–6' 7"`, hitch: '2-point lower links', rotorDiameter: `11'`, swathDelivery: 'Center', rotors: 2, armsPerRotor: '11', doubleTinesPerArm: '4', tineDiameterIn: 0.35, heightAdjustment: 'Mechanical', suggestedPtoHp: 50, groundFollowing: 'TerraLink Quattro', detailSource: 'ra2000', notes: 'Current model status is confirmed live. The recent RA2000 sheet publishes 3,430 lb and a suggested 50 PTO hp. An older standalone RA2072 brochure published 3,616 lb; the newer RA2000/full-line value is retained.' },
  { slug: 'ra2076', model: 'RA2076', line: 'FarmLine', workingWidth: `23'–25' 7"`, transportWidth: `9' 2"`, transportLength: `19' 4"`, transportHeight: `11' 4" / 13' 5"`, weightLb: 3616, swathWidth: `4' 3"–7' 3"`, capacity: 20.8, hitch: '2-point lower links', rotorDiameter: `11'`, swathDelivery: 'Center', rotors: 2, armsPerRotor: '11', doubleTinesPerArm: '4', tineDiameterIn: 0.35, heightAdjustment: 'Mechanical', suggestedPtoHp: 50, groundFollowing: 'TerraLink Quattro', detailSource: 'broad', notes: 'The newer broad Kubota Tedders & Rakes brochure publishes 3,616 lb; the recent RA2000 sheet prints 3,615 lb. This version keeps the newer broad-brochure value and records the one-pound publication difference.' },
  { slug: 'ra2577', model: 'RA2577', line: 'ProLine', workingWidth: `25' 3"`, transportWidth: `9' 9"`, transportLength: `19' 4"`, transportHeight: `12' 4" / 14' 5"`, weightLb: 5049, capacity: 21, hitch: '2-point lower links', rotorDiameter: `12'`, swathDelivery: 'Left', rotors: 2, armsPerRotor: '12 front / 13 rear', doubleTinesPerArm: '4 front / 5 rear', tineDiameterIn: 0.39, heightAdjustment: 'Mechanical', groundFollowing: 'TerraLink Quattro', detailSource: 'ra2577', notes: 'Recent dedicated RA2577 specification sheet supplies 25 ft 3 in working width, 5,049 lb weight, 12/13 arm arrangement and 4/5 double-tine arrangement. Current status is confirmed on Kubota USA live Rakes page.' },
  { slug: 'ra2584', model: 'RA2584', line: 'ProLine', workingWidth: `24' 11"–27' 7"`, transportWidth: `9' 9"`, transportLength: `20' 6"`, transportHeight: `11' 4" / 13' 5"`, weightLb: 4299, swathWidth: `4' 7"–7' 3"`, capacity: 22.7, hitch: '2-point lower links', rotorDiameter: `12'`, swathDelivery: 'Center', rotors: 2, armsPerRotor: '2 x 12', doubleTinesPerArm: '4', tineDiameterIn: 0.39, heightAdjustment: 'Mechanical', suggestedPtoHp: 50, groundFollowing: 'TerraLink Quattro', detailSource: 'broad', notes: 'The newer broad Tedders & Rakes brochure and 2026 full-line catalog publish 9 ft 9 in transport width and 4,299 lb. The recent RA2000 sheet instead prints 9 ft 2 in and 4,300 lb. This version keeps the newer broad/catalog values and preserves the dedicated-sheet conflict in notes.' },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration', 'configuration.type', 'Machine configuration', 'text', null, 1],
  ['Machine Configuration', 'configuration.market_scope', 'Official market scope', 'text', null, 2],
  ['Machine Configuration', 'kubota.rotary_rake.line', 'Kubota rake line', 'text', null, 3],
  ['Rake Performance', 'kubota.rotary_rake.working_width', 'Working width', 'text', null, 10],
  ['Rake Performance', 'kubota.rotary_rake.swath_width', 'Swath width', 'text', null, 20],
  ['Rake Performance', 'kubota.rotary_rake.capacity', 'Theoretical capacity', 'decimal', 'acres/h', 30],
  ['Dimensions & Weight', 'kubota.rotary_rake.transport_width', 'Transport width', 'text', null, 10],
  ['Dimensions & Weight', 'kubota.rotary_rake.transport_length', 'Transport length', 'text', null, 20],
  ['Dimensions & Weight', 'kubota.rotary_rake.transport_height', 'Transport / parking height', 'text', null, 30],
  ['Dimensions & Weight', 'kubota.rotary_rake.weight', 'Weight', 'decimal', 'lb', 40],
  ['Attachment to Tractor', 'kubota.rotary_rake.hitch', 'Hitching system', 'text', null, 10],
  ['Attachment to Tractor', 'kubota.rotary_rake.suggested_pto_hp', 'Suggested PTO horsepower', 'decimal', 'hp', 20],
  ['Rotors & Tines', 'kubota.rotary_rake.rotor_diameter', 'Rotor diameter', 'text', null, 10],
  ['Rotors & Tines', 'kubota.rotary_rake.swath_delivery', 'Swath delivery', 'text', null, 20],
  ['Rotors & Tines', 'kubota.rotary_rake.rotors', 'Number of rotors', 'integer', null, 30],
  ['Rotors & Tines', 'kubota.rotary_rake.arms_per_rotor', 'Arms per rotor', 'text', null, 40],
  ['Rotors & Tines', 'kubota.rotary_rake.double_tines_per_arm', 'Double tines per arm', 'text', null, 50],
  ['Rotors & Tines', 'kubota.rotary_rake.tine_diameter', 'Tine diameter', 'decimal', 'in', 60],
  ['Rotors & Tines', 'kubota.rotary_rake.height_adjustment', 'Height adjustment', 'text', null, 70],
  ['Ground Following', 'kubota.rotary_rake.ground_following', 'Ground-following system', 'text', null, 10],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) { const [r] = await c.query<IdRow[]>(sql, p); if (!r[0]) throw new Error('Kubota rotary rake migration dependency missing'); return Number(r[0].id); }
async function source(c: Parameters<DbMigration['apply']>[0]) { const [r] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`); if (r[0]) return Number(r[0].id); const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Kubota','kubotausa.com','manufacturer','official')`); return Number(x.insertId); }
async function record(c: Parameters<DbMigration['apply']>[0], sid: number, url: string, externalId: string, title: string, raw: unknown) { const [r] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]); if (r[0]) return Number(r[0].id); const [x] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sid, url, externalId, title, JSON.stringify(raw)]); return Number(x.insertId); }
async function put(c: Parameters<DbMigration['apply']>[0], mid: number, vid: number, did: number, rid: number, value: string | number, unit: string | null = null) { await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [mid, vid, did, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, rid]); }

export const kubotaCurrentRotaryRakesMigration: DbMigration = {
  id: '20260901_575_kubota_current_rotary_rakes', description: 'Add current Kubota USA FarmLine and ProLine rotary rakes with source-specific dimensions and rake geometry',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Rotary Rake','rotary-rake') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Kubota','kubota') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`), et = await id(c, `SELECT id FROM equipment_types WHERE slug='rotary-rake' LIMIT 1`), sid = await source(c);
    const records = {
      live: await record(c, sid, LIVE_URL, 'kubota-rakes-live-current-2026-09', 'Kubota USA current Rakes lineup', { captured: '2026-09-01', currentRotaryRakes: models.map((m) => m.model) }),
      catalog: await record(c, sid, FULL_LINE_URL, 'kubota-2026-full-line-rotary-rakes', 'Kubota USA 2026 Full Product Line - Rotary Rakes', { captured: '2026-09-01', pages: '54-55' }),
      broad: await record(c, sid, BROAD_URL, 'kubota-current-tedders-rakes-brochure-2026-09', 'Kubota current Tedders and Rakes brochure', { captured: '2026-09-01' }),
      ra1000: await record(c, sid, RA1000_URL, 'kubota-ra1000-current-specs', 'Kubota RA1000 specification sheet', { captured: '2026-09-01' }),
      ra2071: await record(c, sid, RA2071_URL, 'kubota-ra2071t-evo-current-specs', 'Kubota RA2071T EVO specification sheet', { captured: '2026-09-01' }),
      ra2000: await record(c, sid, RA2000_URL, 'kubota-ra2000-current-specs', 'Kubota RA2000 specification sheet', { captured: '2026-09-01' }),
      ra2577: await record(c, sid, RA2577_URL, 'kubota-ra2577-current-specs', 'Kubota RA2577 specification sheet', { captured: '2026-09-01' }),
    } as const;
    const seriesIds = new Map<Line, number>();
    for (const line of ['FarmLine', 'ProLine'] as Line[]) { const slug = `kubota-rotary-rake-${line.toLowerCase()}`; await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et, `Kubota ${line} Rotary Rakes`, slug]); seriesIds.set(line, await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [mf, et, slug])); }
    const ids = new Map<string, number>(); for (const d of defs) { await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, d); ids.set(d[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [d[1]])); } const def = (k: string) => { const v = ids.get(k); if (!v) throw new Error(`Missing Kubota rotary rake definition ${k}`); return v; };
    for (const m of models) {
      const series = seriesIds.get(m.line); if (!series) throw new Error(`Missing rake series ${m.line}`);
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Kubota USA rotary rake','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [mf, et, series, m.model, m.slug]);
      const mid = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [mf, et, m.slug]); await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mid, VERSION]); await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current Kubota USA rotary rake',TRUE,?,?) ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`, [mid, VERSION, records.live, m.notes]); const vid = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [mid, VERSION]); const detail = records[m.detailSource];
      const values: Array<[string, string | number, string | null]> = [['configuration.type','Rotary rake',null],['configuration.market_scope','United States current lineup',null],['kubota.rotary_rake.line',m.line,null],['kubota.rotary_rake.working_width',m.workingWidth,null],['kubota.rotary_rake.transport_height',m.transportHeight,null],['kubota.rotary_rake.weight',m.weightLb,'lb'],['kubota.rotary_rake.hitch',m.hitch,null],['kubota.rotary_rake.rotor_diameter',m.rotorDiameter,null],['kubota.rotary_rake.swath_delivery',m.swathDelivery,null],['kubota.rotary_rake.rotors',m.rotors,null],['kubota.rotary_rake.arms_per_rotor',m.armsPerRotor,null],['kubota.rotary_rake.double_tines_per_arm',m.doubleTinesPerArm,null],['kubota.rotary_rake.tine_diameter',m.tineDiameterIn,'in'],['kubota.rotary_rake.height_adjustment',m.heightAdjustment,null]];
      if (m.transportWidth) values.push(['kubota.rotary_rake.transport_width',m.transportWidth,null]); if (m.transportLength) values.push(['kubota.rotary_rake.transport_length',m.transportLength,null]); if (m.swathWidth) values.push(['kubota.rotary_rake.swath_width',m.swathWidth,null]); if (m.capacity !== undefined) values.push(['kubota.rotary_rake.capacity',m.capacity,'acres/h']); if (m.suggestedPtoHp !== undefined) values.push(['kubota.rotary_rake.suggested_pto_hp',m.suggestedPtoHp,'hp']); if (m.groundFollowing) values.push(['kubota.rotary_rake.ground_following',m.groundFollowing,null]);
      for (const [k,v,u] of values) await put(c,mid,vid,def(k),k.startsWith('configuration.')?records.live:detail,v,u);
    }
  },
};