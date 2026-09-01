import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  specUrl: string;
  engineModel: string;
  grossHp: number;
  netHp: number;
  displacementCuIn: number;
  rocLb: number;
  tippingLb: number;
  bucketBreakoutLbf: number;
  liftArmBreakoutLbf: number;
  liftType: 'Vertical';
  lowMph: number;
  highMph: number;
  loaderFlowGpm: number;
  auxStandardGpm: number;
  auxHighGpm: number;
  hydraulicPressurePsi: number;
  hydraulicTankGal: number;
  fuelTankGal: number;
  openCabWeightLb: number;
  closedCabWeightLb: number;
};

const VERSION = 'united-states-current-2026-09';
const SERIES_URL = 'https://www.kubotausa.com/equipment-series/ssv-series';
const models: Seed[] = [
  {
    slug: 'ssv65', model: 'SSV65',
    specUrl: 'https://www.kubotausa.com/docs/default-source/spec-sheets/ssv65.pdf',
    engineModel: 'V2607-CR-TE4', grossHp: 64, netHp: 61.3, displacementCuIn: 159.7,
    rocLb: 1950, tippingLb: 3900, bucketBreakoutLbf: 4839, liftArmBreakoutLbf: 3858, liftType: 'Vertical',
    lowMph: 6.9, highMph: 11.1, loaderFlowGpm: 18, auxStandardGpm: 18, auxHighGpm: 28,
    hydraulicPressurePsi: 3271, hydraulicTankGal: 4.2, fuelTankGal: 25.4,
    openCabWeightLb: 6790, closedCabWeightLb: 7055,
  },
  {
    slug: 'ssv75', model: 'SSV75',
    specUrl: 'https://www.kubotausa.com/docs/default-source/spec-sheets/ssv75.pdf',
    engineModel: 'V3307-CR-TE4', grossHp: 74.3, netHp: 71.6, displacementCuIn: 203.3,
    rocLb: 2690, tippingLb: 5380, bucketBreakoutLbf: 5884, liftArmBreakoutLbf: 4850, liftType: 'Vertical',
    lowMph: 7.4, highMph: 11.8, loaderFlowGpm: 20.9, auxStandardGpm: 20.9, auxHighGpm: 30.4,
    hydraulicPressurePsi: 3271, hydraulicTankGal: 4.2, fuelTankGal: 26.9,
    openCabWeightLb: 8157, closedCabWeightLb: 8422,
  },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Engine','kubota.ssv.engine_model','Engine model','text',null,10],
  ['Engine','kubota.ssv.gross_power','Gross engine power','decimal','hp',20],
  ['Engine','kubota.ssv.net_power','Net engine power','decimal','hp',30],
  ['Engine','kubota.ssv.displacement','Engine displacement','decimal','cu in',40],
  ['Loader Performance','kubota.ssv.rated_operating_capacity','Rated operating capacity at 50% tipping load','decimal','lb',10],
  ['Loader Performance','kubota.ssv.tipping_load','Tipping load','decimal','lb',20],
  ['Loader Performance','kubota.ssv.bucket_breakout','Bucket breakout force','decimal','lbf',30],
  ['Loader Performance','kubota.ssv.lift_arm_breakout','Lift arm breakout force','decimal','lbf',40],
  ['Loader Performance','kubota.ssv.lift_type','Lift type','text',null,50],
  ['Travel','kubota.ssv.travel_speed_low','Travel speed, low','decimal','mph',10],
  ['Travel','kubota.ssv.travel_speed_high','Travel speed, high','decimal','mph',20],
  ['Hydraulics','kubota.ssv.loader_flow','Loader hydraulic flow','decimal','gpm',10],
  ['Hydraulics','kubota.ssv.aux_flow_standard','Auxiliary hydraulic flow, standard','decimal','gpm',20],
  ['Hydraulics','kubota.ssv.aux_flow_high','Auxiliary hydraulic flow, high','decimal','gpm',30],
  ['Hydraulics','kubota.ssv.hydraulic_pressure','Loader hydraulic pressure','decimal','psi',40],
  ['Capacities','kubota.ssv.hydraulic_tank','Hydraulic tank','decimal','gal',10],
  ['Capacities','kubota.ssv.fuel_tank','Fuel tank','decimal','gal',20],
  ['Dimensions & Weight','kubota.ssv.operating_weight_open_cab','Operating weight, open cab','decimal','lb',10],
  ['Dimensions & Weight','kubota.ssv.operating_weight_closed_cab','Operating weight, closed cab','decimal','lb',20],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) {
  const [r] = await c.query<IdRow[]>(sql, p);
  if (!r[0]) throw new Error('Kubota SSV migration dependency missing');
  return Number(r[0].id);
}

async function source(c: Parameters<DbMigration['apply']>[0]) {
  const [r] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
  if (r[0]) return Number(r[0].id);
  const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Kubota','kubotausa.com','manufacturer','official')`);
  return Number(x.insertId);
}

async function record(c: Parameters<DbMigration['apply']>[0], sid: number, m: Seed) {
  const externalId = `kubota-${m.slug}-skid-steer-us-current-2026-09`;
  const [r] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (r[0]) return Number(r[0].id);
  const [x] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sid, m.specUrl, externalId, `Kubota ${m.model} current U.S. specification sheet`, JSON.stringify({
      captured: '2026-09-01',
      market: 'United States',
      equipmentType: 'Skid Steer Loader',
      currentSeriesUrl: SERIES_URL,
      model: m,
      notes: 'Current status is corroborated by the live Kubota USA SSV Series page. Technical values are taken from the Kubota USA model specification sheet; open-cab and closed-cab operating weights remain separate configurations.',
    })],
  );
  return Number(x.insertId);
}

async function put(c: Parameters<DbMigration['apply']>[0], mid: number, vid: number, did: number, rid: number, value: string | number, unit: string | null = null) {
  await c.query(
    `INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,
    [mid, vid, did, typeof value === 'string' ? value : null, typeof value === 'number' ? value : null, unit, rid],
  );
}

export const kubotaSSVSkidSteerLoadersCurrentMigration: DbMigration = {
  id: '20260901_563_kubota_ssv_skid_steer_loaders_current',
  description: 'Add current Kubota United States SSV65 and SSV75 skid steer loaders',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Skid Steer Loader','skid-steer-loader') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Kubota','kubota') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf = await id(c, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const et = await id(c, `SELECT id FROM equipment_types WHERE slug='skid-steer-loader' LIMIT 1`);
    const sid = await source(c);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Kubota SSV Series','kubota-ssv-series') ON DUPLICATE KEY UPDATE name=VALUES(name)`, [mf, et]);
    const series = await id(c, `SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='kubota-ssv-series' LIMIT 1`, [mf, et]);

    const ids = new Map<string, number>();
    for (const d of defs) {
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`, d);
      ids.set(d[1], await id(c, `SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`, [d[1]]));
    }
    const def = (k: string) => { const v = ids.get(k); if (!v) throw new Error(`Missing Kubota SSV definition ${k}`); return v; };

    for (const m of models) {
      const rid = await record(c, sid, m);
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Kubota USA SSV Series skid steer loader','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`, [mf, et, series, m.model, m.slug]);
      const mid = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`, [mf, et, m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`, [mid, VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current Kubota USA model specification sheet',TRUE,?,'Kubota USA SSV Series current status corroborated 2026-09-01. Net and gross SAE horsepower are kept as separate published metrics; open- and closed-cab operating weights are not averaged.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`, [mid, VERSION, rid]);
      const vid = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [mid, VERSION]);

      await put(c, mid, vid, def('configuration.type'), rid, 'Skid steer loader');
      await put(c, mid, vid, def('configuration.market_scope'), rid, 'United States current catalog');
      await put(c, mid, vid, def('kubota.ssv.engine_model'), rid, m.engineModel);
      await put(c, mid, vid, def('kubota.ssv.gross_power'), rid, m.grossHp, 'hp');
      await put(c, mid, vid, def('kubota.ssv.net_power'), rid, m.netHp, 'hp');
      await put(c, mid, vid, def('kubota.ssv.displacement'), rid, m.displacementCuIn, 'cu in');
      await put(c, mid, vid, def('kubota.ssv.rated_operating_capacity'), rid, m.rocLb, 'lb');
      await put(c, mid, vid, def('kubota.ssv.tipping_load'), rid, m.tippingLb, 'lb');
      await put(c, mid, vid, def('kubota.ssv.bucket_breakout'), rid, m.bucketBreakoutLbf, 'lbf');
      await put(c, mid, vid, def('kubota.ssv.lift_arm_breakout'), rid, m.liftArmBreakoutLbf, 'lbf');
      await put(c, mid, vid, def('kubota.ssv.lift_type'), rid, m.liftType);
      await put(c, mid, vid, def('kubota.ssv.travel_speed_low'), rid, m.lowMph, 'mph');
      await put(c, mid, vid, def('kubota.ssv.travel_speed_high'), rid, m.highMph, 'mph');
      await put(c, mid, vid, def('kubota.ssv.loader_flow'), rid, m.loaderFlowGpm, 'gpm');
      await put(c, mid, vid, def('kubota.ssv.aux_flow_standard'), rid, m.auxStandardGpm, 'gpm');
      await put(c, mid, vid, def('kubota.ssv.aux_flow_high'), rid, m.auxHighGpm, 'gpm');
      await put(c, mid, vid, def('kubota.ssv.hydraulic_pressure'), rid, m.hydraulicPressurePsi, 'psi');
      await put(c, mid, vid, def('kubota.ssv.hydraulic_tank'), rid, m.hydraulicTankGal, 'gal');
      await put(c, mid, vid, def('kubota.ssv.fuel_tank'), rid, m.fuelTankGal, 'gal');
      await put(c, mid, vid, def('kubota.ssv.operating_weight_open_cab'), rid, m.openCabWeightLb, 'lb');
      await put(c, mid, vid, def('kubota.ssv.operating_weight_closed_cab'), rid, m.closedCabWeightLb, 'lb');
    }
  },
};
