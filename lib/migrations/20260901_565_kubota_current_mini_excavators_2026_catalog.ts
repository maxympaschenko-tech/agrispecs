import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  series: 'U Series' | 'KX Series';
  slug: string;
  model: string;
  engineModel: string;
  hp: number;
  displacementCuIn: number;
  operatingWeightLb: number;
  weightConfiguration: 'Canopy, rubber' | 'Cab, rubber';
  digDepth: string;
  dumpHeight: string;
  pumpCapacityGpm: number;
  auxFlow: string;
  bucketBreakoutLbf: number;
  travelSpeedPair?: string;
  groundPressurePsi: number;
};

const VERSION = 'united-states-current-2026-09';
const CATALOG_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf';
const U_SERIES_URL = 'https://www.kubotausa.com/equipment-series/u-series';
const KX_SERIES_URL = 'https://www.kubotausa.com/equipment-series/kx-series';

const models: Seed[] = [
  { series:'U Series', slug:'u10-5', model:'U10-5', engineModel:'D722-E4-BH-5US', hp:10.3, displacementCuIn:44, operatingWeightLb:2646, weightConfiguration:'Canopy, rubber', digDepth:`5' 11"`, dumpHeight:`7' 3"`, pumpCapacityGpm:5.6, auxFlow:'5.5 gpm', bucketBreakoutLbf:2337, travelSpeedPair:'1.2 / 2.5 mph (Kubota published pair)', groundPressurePsi:4.2 },
  { series:'U Series', slug:'u17-5', model:'U17-5', engineModel:'D902-E4-BH-6EU', hp:17.0, displacementCuIn:54.7, operatingWeightLb:3702, weightConfiguration:'Canopy, rubber', digDepth:`7' 5.9"`, dumpHeight:`8' 1.2"`, pumpCapacityGpm:12.3, auxFlow:'7.3 gpm', bucketBreakoutLbf:3417, travelSpeedPair:'1.4 / 2.7 mph (Kubota published pair)', groundPressurePsi:3.8 },
  { series:'U Series', slug:'u27-4', model:'U27-4', engineModel:'D1105-E4-BH-5-KBM', hp:20.8, displacementCuIn:68.5, operatingWeightLb:5688, weightConfiguration:'Canopy, rubber', digDepth:`9' 5"`, dumpHeight:`10'`, pumpCapacityGpm:20.3, auxFlow:'12.7 gpm', bucketBreakoutLbf:7014, travelSpeedPair:'1.6 / 2.7 mph (Kubota published pair)', groundPressurePsi:3.5 },
  { series:'U Series', slug:'u35-4', model:'U35-4', engineModel:'D1703M-DI-E4B', hp:23.9, displacementCuIn:100.5, operatingWeightLb:8129, weightConfiguration:'Canopy, rubber', digDepth:`9' 8.9"`, dumpHeight:`11' 0.7"`, pumpCapacityGpm:26.5, auxFlow:'15.8 gpm', bucketBreakoutLbf:7924, travelSpeedPair:'1.9 / 2.9 mph (Kubota published pair)', groundPressurePsi:4.89 },
  { series:'U Series', slug:'u48-5', model:'U48-5', engineModel:'D1803-CR-TE5', hp:40.4, displacementCuIn:112, operatingWeightLb:10848, weightConfiguration:'Canopy, rubber', digDepth:`10' 8"`, dumpHeight:`12' 9"`, pumpCapacityGpm:31.4, auxFlow:'17.2 gpm', bucketBreakoutLbf:9304, groundPressurePsi:4.0 },
  { series:'U Series', slug:'u55-5', model:'U55-5', engineModel:'V2607-CR-T-E4B', hp:47.6, displacementCuIn:159.6, operatingWeightLb:12247, weightConfiguration:'Canopy, rubber', digDepth:`11' 11"`, dumpHeight:`13' 1.5"`, pumpCapacityGpm:39.4, auxFlow:'19.8 / 9.8 gpm', bucketBreakoutLbf:10172, travelSpeedPair:'1.7 / 3.0 mph (Kubota published pair)', groundPressurePsi:4.6 },
  { series:'KX Series', slug:'kx040-5', model:'KX040-5', engineModel:'D1803-CR-TE5-BEH5 / D1803-CR-TE5-BEH6', hp:40.3, displacementCuIn:111.4, operatingWeightLb:9199, weightConfiguration:'Canopy, rubber', digDepth:`11' 2.3"`, dumpHeight:`12' 9.5"`, pumpCapacityGpm:24.4, auxFlow:'17.2 / 9.8 gpm', bucketBreakoutLbf:9535, travelSpeedPair:'1.8 / 3.1 mph (Kubota published pair)', groundPressurePsi:4.53 },
  { series:'KX Series', slug:'kx057-5', model:'KX057-5', engineModel:'V2607-CR-E4', hp:47.6, displacementCuIn:159.6, operatingWeightLb:12346, weightConfiguration:'Canopy, rubber', digDepth:`12' 9"`, dumpHeight:`13' 7.5"`, pumpCapacityGpm:39.4, auxFlow:'19.8 / 9.8 gpm', bucketBreakoutLbf:10172, travelSpeedPair:'1.7 / 3.0 mph (Kubota published pair)', groundPressurePsi:4.6 },
  { series:'KX Series', slug:'kx080-5', model:'KX080-5', engineModel:'V3307-CR-TE5', hp:66.6, displacementCuIn:203.3, operatingWeightLb:18365, weightConfiguration:'Cab, rubber', digDepth:`15' 1.1"`, dumpHeight:`17' 2.7"`, pumpCapacityGpm:44.6, auxFlow:'26.4 / 17.6 gpm', bucketBreakoutLbf:14660, travelSpeedPair:'1.7 / 3.0 mph (Kubota published pair)', groundPressurePsi:5.25 },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Machine Configuration','kubota.excavator.series','Kubota excavator series','text',null,3],
  ['Engine','kubota.excavator.engine_model','Engine model','text',null,10],
  ['Engine','kubota.excavator.published_power','Published engine power','decimal','hp',20],
  ['Engine','kubota.excavator.displacement','Engine displacement','decimal','cu in',30],
  ['Excavator Performance','kubota.excavator.max_dig_depth','Maximum digging depth','text',null,10],
  ['Excavator Performance','kubota.excavator.max_dump_height','Maximum dumping height','text',null,20],
  ['Excavator Performance','kubota.excavator.bucket_breakout','Bucket breakout force','decimal','lbf',30],
  ['Hydraulics','kubota.excavator.pump_capacity','Pump capacity','decimal','gpm',10],
  ['Hydraulics','kubota.excavator.aux_flow','Auxiliary hydraulic line flow','text',null,20],
  ['Travel','kubota.excavator.travel_speed_pair','Maximum traveling speed, published pair','text',null,10],
  ['Dimensions & Weight','kubota.excavator.operating_weight','Operating weight, published configuration','decimal','lb',10],
  ['Dimensions & Weight','kubota.excavator.weight_configuration','Operating weight configuration','text',null,20],
  ['Dimensions & Weight','kubota.excavator.ground_pressure','Ground contact pressure','decimal','psi',30],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) {
  const [r] = await c.query<IdRow[]>(sql, p);
  if (!r[0]) throw new Error('Kubota mini excavator migration dependency missing');
  return Number(r[0].id);
}

async function source(c: Parameters<DbMigration['apply']>[0]) {
  const [r] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
  if (r[0]) return Number(r[0].id);
  const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Kubota','kubotausa.com','manufacturer','official')`);
  return Number(x.insertId);
}

async function record(c: Parameters<DbMigration['apply']>[0], sid: number, m: Seed) {
  const externalId = `kubota-${m.slug}-mini-excavator-us-current-2026-09`;
  const [r] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (r[0]) return Number(r[0].id);
  const currentSeriesUrl = m.series === 'U Series' ? U_SERIES_URL : KX_SERIES_URL;
  const [x] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [sid, CATALOG_URL, externalId, `Kubota ${m.model} 2026 U.S. compact excavator specifications`, JSON.stringify({
      captured:'2026-09-01', market:'United States', equipmentType:'Mini Excavator', currentSeriesUrl, model:m,
      notes:'Primary specifications are from Kubota USA 2026 Full Product Line. Current model status is corroborated by the live Kubota U Series or KX Series page. Operating-weight configuration and slash-separated hydraulic/travel pairs remain exactly attributable to the catalog instead of being normalized by assumption.',
    })],
  );
  return Number(x.insertId);
}

async function put(c: Parameters<DbMigration['apply']>[0], mid:number, vid:number, did:number, rid:number, value:string|number, unit:string|null=null) {
  await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`, [mid,vid,did,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,rid]);
}

export const kubotaCurrentMiniExcavators2026CatalogMigration: DbMigration = {
  id:'20260901_565_kubota_current_mini_excavators_2026_catalog',
  description:'Add nine current Kubota U.S. mini excavators from the 2026 factory catalog',
  async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Mini Excavator','mini-excavator') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Kubota','kubota') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`), et=await id(c,`SELECT id FROM equipment_types WHERE slug='mini-excavator' LIMIT 1`), sid=await source(c);

    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Kubota U Series Excavators','kubota-u-series-excavators') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Kubota KX Series Excavators','kubota-kx-series-excavators') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    const uSeries=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='kubota-u-series-excavators' LIMIT 1`,[mf,et]);
    const kxSeries=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='kubota-kx-series-excavators' LIMIT 1`,[mf,et]);

    const ids=new Map<string,number>();
    for(const d of defs){
      await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);
      ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));
    }
    const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing Kubota excavator definition ${k}`);return v;};

    for(const m of models){
      const rid=await record(c,sid,m);
      const seriesId=m.series==='U Series'?uSeries:kxSeries;
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Kubota USA compact excavator in the live U or KX Series catalog','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,seriesId,m.model,m.slug]);
      const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Kubota USA 2026 Full Product Line specification',TRUE,?,'Current status corroborated by live Kubota USA series page. Operating weight uses the exact 2026 catalog basis shown in the specifications; slash-separated travel and auxiliary-flow values are preserved without assuming ordering beyond the published table.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,[mid,VERSION,rid]);
      const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);

      await put(c,mid,vid,def('configuration.type'),rid,'Mini excavator');
      await put(c,mid,vid,def('configuration.market_scope'),rid,'United States current catalog');
      await put(c,mid,vid,def('kubota.excavator.series'),rid,m.series);
      await put(c,mid,vid,def('kubota.excavator.engine_model'),rid,m.engineModel);
      await put(c,mid,vid,def('kubota.excavator.published_power'),rid,m.hp,'hp');
      await put(c,mid,vid,def('kubota.excavator.displacement'),rid,m.displacementCuIn,'cu in');
      await put(c,mid,vid,def('kubota.excavator.max_dig_depth'),rid,m.digDepth);
      await put(c,mid,vid,def('kubota.excavator.max_dump_height'),rid,m.dumpHeight);
      await put(c,mid,vid,def('kubota.excavator.bucket_breakout'),rid,m.bucketBreakoutLbf,'lbf');
      await put(c,mid,vid,def('kubota.excavator.pump_capacity'),rid,m.pumpCapacityGpm,'gpm');
      await put(c,mid,vid,def('kubota.excavator.aux_flow'),rid,m.auxFlow);
      if(m.travelSpeedPair) await put(c,mid,vid,def('kubota.excavator.travel_speed_pair'),rid,m.travelSpeedPair);
      await put(c,mid,vid,def('kubota.excavator.operating_weight'),rid,m.operatingWeightLb,'lb');
      await put(c,mid,vid,def('kubota.excavator.weight_configuration'),rid,m.weightConfiguration);
      await put(c,mid,vid,def('kubota.excavator.ground_pressure'),rid,m.groundPressurePsi,'psi');
    }
  },
};
