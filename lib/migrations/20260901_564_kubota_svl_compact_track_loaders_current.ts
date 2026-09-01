import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  sourceUrl: string;
  grossHp: number;
  roc35Lb: number;
  tippingLb: number;
  bucketBreakoutLbf: number;
  liftArmBreakoutLbf: number;
  lowMph: number;
  highMph: number;
  auxPressurePsi: number;
  auxStandardGpm?: number;
  auxHighGpm: number;
  openWeightLb?: number;
  closedWeightLb?: number;
  note: string;
};

const VERSION = 'united-states-current-2026-09';
const SERIES_URL = 'https://www.kubotausa.com/equipment-series/svl-series';
const CURRENT_CATALOG_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf';
const SVL97_2_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/svl97-2-spec-sheet.pdf';

const models: Seed[] = [
  {
    slug: 'svl65-2', model: 'SVL65-2', sourceUrl: CURRENT_CATALOG_URL,
    grossHp: 68.4, roc35Lb: 2100, tippingLb: 6000, bucketBreakoutLbf: 4614, liftArmBreakoutLbf: 4266,
    lowMph: 4.9, highMph: 7.1, auxPressurePsi: 3263, auxStandardGpm: 18.5, auxHighGpm: 28.1,
    note: 'Primary 2026 Kubota construction full-line catalog value set. The live SVL Series table has exposed 68.3 gross hp and 17.4/27.0 gpm for SVL65-2 in another rendering; those alternate official values are not silently merged into this version.',
  },
  {
    slug: 'svl65-2s', model: 'SVL65-2s', sourceUrl: SERIES_URL,
    grossHp: 68.4, roc35Lb: 2100, tippingLb: 6000, bucketBreakoutLbf: 4614, liftArmBreakoutLbf: 4266,
    lowMph: 4.9, highMph: 7.1, auxPressurePsi: 3263, auxStandardGpm: 17.4, auxHighGpm: 27,
    openWeightLb: 8135, closedWeightLb: 8631,
    note: 'Current Kubota USA SVL Series live specification table captured 2026-09-01. SVL65-2s remains a separate current model from SVL65-2.',
  },
  {
    slug: 'svl75-3', model: 'SVL75-3', sourceUrl: CURRENT_CATALOG_URL,
    grossHp: 71.6, roc35Lb: 2490, tippingLb: 7112, bucketBreakoutLbf: 6191, liftArmBreakoutLbf: 4723,
    lowMph: 5.6, highMph: 8.6, auxPressurePsi: 3185, auxStandardGpm: 19.2, auxHighGpm: 29.8,
    note: 'Primary current value is 71.6 gross hp from Kubota 2026 construction catalog and newer SVL75-3 brochure. Other official Kubota specification literature has published 74.3 gross / 73.2 net hp; that conflict is preserved here rather than averaged or silently normalized. Operating weight is omitted because current official documents also expose differing configurations/values.',
  },
  {
    slug: 'svl97-2', model: 'SVL97-2', sourceUrl: SVL97_2_URL,
    grossHp: 96.4, roc35Lb: 3200, tippingLb: 9143, bucketBreakoutLbf: 7961, liftArmBreakoutLbf: 6742,
    lowMph: 5, highMph: 7.3, auxPressurePsi: 3553, auxStandardGpm: 23.1, auxHighGpm: 40,
    openWeightLb: 11299, closedWeightLb: 11574,
    note: 'SVL97-2 remains listed as a current buildable model on the live Kubota USA SVL Series page even though SVL97-3 is its newer generation. Values come from the direct Kubota SVL97-2 specification sheet.',
  },
  {
    slug: 'svl97-3', model: 'SVL97-3', sourceUrl: CURRENT_CATALOG_URL,
    grossHp: 96.4, roc35Lb: 3459, tippingLb: 9700, bucketBreakoutLbf: 7650, liftArmBreakoutLbf: 5288,
    lowMph: 5.5, highMph: 8.4, auxPressurePsi: 3553, auxStandardGpm: 23.1, auxHighGpm: 41.2,
    openWeightLb: 11676, closedWeightLb: 11929,
    note: 'Primary 2026 Kubota construction full-line catalog value set. A separate Kubota SVL97-3 specification sheet publishes slightly different tipping-load, breakout and standard-flow figures; this current version keeps the 2026 catalog set intact and records the discrepancy instead of mixing fields.',
  },
  {
    slug: 'svl110-3', model: 'SVL110-3', sourceUrl: 'https://www.kubotausa.com/docs/default-source/brochure-sheets/svl110-3-brochure.pdf',
    grossHp: 112.7, roc35Lb: 3700, tippingLb: 10571, bucketBreakoutLbf: 7650, liftArmBreakoutLbf: 5288,
    lowMph: 5.5, highMph: 8.4, auxPressurePsi: 3553, auxHighGpm: 45,
    closedWeightLb: 12322,
    note: 'Current 2026 Kubota SVL110-3 brochure; closed-cab-only operator station. Kubota introduced the model for U.S. availability in April 2026.',
  },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Engine','kubota.svl.gross_power','Gross engine power','decimal','hp',10],
  ['Loader Performance','kubota.svl.roc_35','Rated operating capacity at 35% tipping load','decimal','lb',10],
  ['Loader Performance','kubota.svl.tipping_load','Tipping load','decimal','lb',20],
  ['Loader Performance','kubota.svl.bucket_breakout','Bucket breakout force','decimal','lbf',30],
  ['Loader Performance','kubota.svl.lift_arm_breakout','Lift arm breakout force','decimal','lbf',40],
  ['Loader Performance','kubota.svl.lift_type','Lift type','text',null,50],
  ['Travel','kubota.svl.travel_speed_low','Travel speed, low','decimal','mph',10],
  ['Travel','kubota.svl.travel_speed_high','Travel speed, high','decimal','mph',20],
  ['Hydraulics','kubota.svl.aux_pressure','Auxiliary hydraulic pressure','decimal','psi',10],
  ['Hydraulics','kubota.svl.aux_flow_standard','Auxiliary hydraulic flow, standard','decimal','gpm',20],
  ['Hydraulics','kubota.svl.aux_flow_high','Auxiliary hydraulic flow, high','decimal','gpm',30],
  ['Dimensions & Weight','kubota.svl.operating_weight_open','Operating weight, open cab','decimal','lb',10],
  ['Dimensions & Weight','kubota.svl.operating_weight_closed','Operating weight, closed cab','decimal','lb',20],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) {
  const [r] = await c.query<IdRow[]>(sql, p);
  if (!r[0]) throw new Error('Kubota SVL migration dependency missing');
  return Number(r[0].id);
}

async function source(c: Parameters<DbMigration['apply']>[0]) {
  const [r] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
  if (r[0]) return Number(r[0].id);
  const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Kubota','kubotausa.com','manufacturer','official')`);
  return Number(x.insertId);
}

async function record(c: Parameters<DbMigration['apply']>[0], sid: number, m: Seed) {
  const externalId = `kubota-${m.slug}-compact-track-loader-us-current-2026-09`;
  const [r] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (r[0]) return Number(r[0].id);
  const [x] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sid, m.sourceUrl, externalId, `Kubota ${m.model} current U.S. compact track loader specifications`, JSON.stringify({
      captured: '2026-09-01', market: 'United States', equipmentType: 'Compact Track Loader', currentSeriesUrl: SERIES_URL, model: m,
      notes: m.note,
    })],
  );
  return Number(x.insertId);
}

async function put(c: Parameters<DbMigration['apply']>[0], mid: number, vid: number, did: number, rid: number, value: string | number, unit: string | null = null) {
  await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [mid, vid, did, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, rid]);
}

export const kubotaSVLCompactTrackLoadersCurrentMigration: DbMigration = {
  id: '20260901_564_kubota_svl_compact_track_loaders_current',
  description: 'Add current Kubota United States SVL compact track loaders with source-discrepancy preservation',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Compact Track Loader','compact-track-loader') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Kubota','kubota') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='compact-track-loader' LIMIT 1`);
    const sid = await source(c);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Kubota SVL Series','kubota-svl-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et]);
    const series = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='kubota-svl-series' LIMIT 1`, [mf, et]);

    const ids = new Map<string, number>();
    for (const d of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, d);
      ids.set(d[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [d[1]]));
    }
    const def = (k: string) => { const v = ids.get(k); if (!v) throw new Error(`Missing Kubota SVL definition ${k}`); return v; };

    for (const m of models) {
      const rid = await record(c, sid, m);
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Kubota USA SVL Series compact track loader','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [mf, et, series, m.model, m.slug]);
      const mid = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [mf, et, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mid, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current Kubota USA SVL Series specification',TRUE,?,?) ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`, [mid, VERSION, rid, m.note]);
      const vid = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [mid, VERSION]);

      await put(c, mid, vid, def('configuration.type'), rid, 'Compact track loader');
      await put(c, mid, vid, def('configuration.market_scope'), rid, 'United States current catalog');
      await put(c, mid, vid, def('kubota.svl.gross_power'), rid, m.grossHp, 'hp');
      await put(c, mid, vid, def('kubota.svl.roc_35'), rid, m.roc35Lb, 'lb');
      await put(c, mid, vid, def('kubota.svl.tipping_load'), rid, m.tippingLb, 'lb');
      await put(c, mid, vid, def('kubota.svl.bucket_breakout'), rid, m.bucketBreakoutLbf, 'lbf');
      await put(c, mid, vid, def('kubota.svl.lift_arm_breakout'), rid, m.liftArmBreakoutLbf, 'lbf');
      await put(c, mid, vid, def('kubota.svl.lift_type'), rid, 'Vertical');
      await put(c, mid, vid, def('kubota.svl.travel_speed_low'), rid, m.lowMph, 'mph');
      await put(c, mid, vid, def('kubota.svl.travel_speed_high'), rid, m.highMph, 'mph');
      await put(c, mid, vid, def('kubota.svl.aux_pressure'), rid, m.auxPressurePsi, 'psi');
      if (m.auxStandardGpm !== undefined) await put(c, mid, vid, def('kubota.svl.aux_flow_standard'), rid, m.auxStandardGpm, 'gpm');
      await put(c, mid, vid, def('kubota.svl.aux_flow_high'), rid, m.auxHighGpm, 'gpm');
      if (m.openWeightLb !== undefined) await put(c, mid, vid, def('kubota.svl.operating_weight_open'), rid, m.openWeightLb, 'lb');
      if (m.closedWeightLb !== undefined) await put(c, mid, vid, def('kubota.svl.operating_weight_closed'), rid, m.closedWeightLb, 'lb');
    }
  },
};
