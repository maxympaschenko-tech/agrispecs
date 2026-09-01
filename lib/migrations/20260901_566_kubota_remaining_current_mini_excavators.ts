import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  sourceUrl: string;
  sourceKind: string;
  engineModel: string;
  grossHp: number;
  netHp?: number;
  displacementCuIn: number;
  operatingWeightLb: number;
  weightConfiguration: string;
  digDepth: string;
  dumpHeight: string;
  pumpCapacityGpm?: number;
  pumpConfiguration?: string;
  auxFlow: string;
  bucketBreakoutLbf: number;
  armBreakoutLbf?: number;
  travelSpeedPair: string;
  groundPressurePsi: number;
  notes: string;
};

const VERSION = 'united-states-current-2026-09';
const CATALOG_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf';
const U17_URL = 'https://www.kubotausa.com/docs/default-source/brochure-sheets/u17.pdf';
const KX040_4_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/kx040-4specs.pdf';
const U_SERIES_URL = 'https://www.kubotausa.com/equipment-series/u-series';
const KX_SERIES_URL = 'https://www.kubotausa.com/equipment-series/kx-series';

const models: Seed[] = [
  {
    slug:'u17', model:'U17', sourceUrl:U17_URL, sourceKind:'Direct Kubota U17 specification sheet',
    engineModel:'D902-E4', grossHp:16.1, netHp:15.1, displacementCuIn:54.8,
    operatingWeightLb:3703, weightConfiguration:'Canopy, rubber; published weight includes operator',
    digDepth:`7' 7"`, dumpHeight:`8' 0"`,
    pumpConfiguration:'4.57 gpm × 2 / 2.75 gpm × 1', auxFlow:'7.32 gpm',
    bucketBreakoutLbf:3417.2, armBreakoutLbf:1918,
    travelSpeedPair:'1.4 / 2.6 mph (Low / High)', groundPressurePsi:3.8,
    notes:'U17 remains separately buildable on the live Kubota USA U Series page alongside U17-5. Direct Kubota U17 sheet is used for model-specific specifications; no U17-5 values are transferred to U17.',
  },
  {
    slug:'k008-5', model:'K008-5', sourceUrl:CATALOG_URL, sourceKind:'Kubota USA 2026 Full Product Line',
    engineModel:'D722-E4-BH-4US', grossHp:10.3, displacementCuIn:44,
    operatingWeightLb:2315, weightConfiguration:'Canopy, rubber', digDepth:`5' 8"`, dumpHeight:`6' 8"`,
    pumpCapacityGpm:5.6, auxFlow:'5.5 gpm', bucketBreakoutLbf:2205,
    travelSpeedPair:'1.2 / 2.5 mph (Kubota published pair)', groundPressurePsi:4.2,
    notes:'Current Kubota USA 2026 construction catalog value set.',
  },
  {
    slug:'kx018-4', model:'KX018-4', sourceUrl:CATALOG_URL, sourceKind:'Kubota USA 2026 Full Product Line',
    engineModel:'D902-E4-BH-4US', grossHp:16.1, displacementCuIn:54.8,
    operatingWeightLb:3747, weightConfiguration:'Canopy, rubber', digDepth:`7' 9.7"`, dumpHeight:`7' 9.7"`,
    pumpCapacityGpm:12.0, auxFlow:'7.4 gpm', bucketBreakoutLbf:3594,
    travelSpeedPair:'1.4 / 2.6 mph (Kubota published pair)', groundPressurePsi:3.7,
    notes:'Current Kubota USA 2026 construction catalog value set.',
  },
  {
    slug:'kx030-4', model:'KX030-4', sourceUrl:CATALOG_URL, sourceKind:'Kubota USA 2026 Full Product Line',
    engineModel:'V1505-E4-BH-3USA', grossHp:23.3, displacementCuIn:91.5,
    operatingWeightLb:6272, weightConfiguration:'Canopy, rubber', digDepth:`9' 9"`, dumpHeight:`10' 4"`,
    pumpCapacityGpm:23.0, auxFlow:'13.1 gpm', bucketBreakoutLbf:6924,
    travelSpeedPair:'1.7 / 2.7 mph (Kubota published pair)', groundPressurePsi:3.9,
    notes:'Primary current value is 23.3 gross hp from the 2026 Kubota USA full-line catalog. Other market/model sheets expose different horsepower values and are not used to overwrite this U.S. current version.',
  },
  {
    slug:'kx033-4', model:'KX033-4', sourceUrl:CATALOG_URL, sourceKind:'Kubota USA 2026 Full Product Line',
    engineModel:'D1703M-DI-E4', grossHp:23.3, displacementCuIn:100.5,
    operatingWeightLb:7420, weightConfiguration:'Canopy, rubber', digDepth:`10' 6" / 12' 2" with extendable dipper arm`, dumpHeight:`11' 7"`,
    pumpCapacityGpm:26.5, auxFlow:'15.8 gpm', bucketBreakoutLbf:8138,
    travelSpeedPair:'1.9 / 2.9 mph (Kubota published pair)', groundPressurePsi:4.36,
    notes:'Primary current value is 23.3 gross hp from the 2026 Kubota USA full-line catalog. The catalog publishes two digging depths because KX033-4 is available with an extendable dipper arm; both are retained as configuration text.',
  },
  {
    slug:'kx040-4', model:'KX040-4', sourceUrl:KX040_4_URL, sourceKind:'Direct Kubota KX040-4 specification sheet',
    engineModel:'D1803-CR-TE4', grossHp:48.3, netHp:41.9, displacementCuIn:111.4,
    operatingWeightLb:9195, weightConfiguration:'Standard blade, rubber tracks, canopy; published weight includes operator',
    digDepth:`11' 2.7"`, dumpHeight:`12' 9.5"`,
    pumpCapacityGpm:24.4, auxFlow:'17.2 / 9.8 gpm (AUX1 / AUX2)',
    bucketBreakoutLbf:9535, armBreakoutLbf:4112,
    travelSpeedPair:'1.8 / 3.1 mph (Low / High)', groundPressurePsi:4.53,
    notes:'KX040-4 remains separately buildable on the live Kubota USA KX Series page alongside KX040-5. Direct KX040-4 spec sheet values use the standard-blade rubber-track canopy configuration where configuration-sensitive values are stored.',
  },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Machine Configuration','kubota.excavator.series','Kubota excavator series','text',null,3],
  ['Engine','kubota.excavator.engine_model','Engine model','text',null,10],
  ['Engine','kubota.excavator.gross_power','Gross engine power','decimal','hp',20],
  ['Engine','kubota.excavator.net_power','Net engine power','decimal','hp',30],
  ['Engine','kubota.excavator.displacement','Engine displacement','decimal','cu in',40],
  ['Excavator Performance','kubota.excavator.max_dig_depth','Maximum digging depth','text',null,10],
  ['Excavator Performance','kubota.excavator.max_dump_height','Maximum dumping height','text',null,20],
  ['Excavator Performance','kubota.excavator.bucket_breakout','Bucket breakout force','decimal','lbf',30],
  ['Excavator Performance','kubota.excavator.arm_breakout','Arm breakout force','decimal','lbf',40],
  ['Hydraulics','kubota.excavator.pump_capacity','Pump capacity','decimal','gpm',10],
  ['Hydraulics','kubota.excavator.pump_configuration','Pump configuration','text',null,15],
  ['Hydraulics','kubota.excavator.aux_flow','Auxiliary hydraulic line flow','text',null,20],
  ['Travel','kubota.excavator.travel_speed_pair','Maximum traveling speed, published pair','text',null,10],
  ['Dimensions & Weight','kubota.excavator.operating_weight','Operating weight, published configuration','decimal','lb',10],
  ['Dimensions & Weight','kubota.excavator.weight_configuration','Operating weight configuration','text',null,20],
  ['Dimensions & Weight','kubota.excavator.ground_pressure','Ground contact pressure','decimal','psi',30],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql:string, p:unknown[]=[]){
  const [r]=await c.query<IdRow[]>(sql,p);
  if(!r[0]) throw new Error('Kubota remaining excavator migration dependency missing');
  return Number(r[0].id);
}
async function source(c:Parameters<DbMigration['apply']>[0]){
  const [r]=await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
  if(r[0]) return Number(r[0].id);
  const [x]=await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Kubota','kubotausa.com','manufacturer','official')`);
  return Number(x.insertId);
}
async function record(c:Parameters<DbMigration['apply']>[0],sid:number,m:Seed){
  const externalId=`kubota-${m.slug}-mini-excavator-us-current-remaining-2026-09`;
  const [r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
  if(r[0]) return Number(r[0].id);
  const currentSeriesUrl=m.slug==='u17'?U_SERIES_URL:KX_SERIES_URL;
  const [x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,m.sourceUrl,externalId,`Kubota ${m.model} current U.S. compact excavator specifications`,JSON.stringify({captured:'2026-09-01',market:'United States',equipmentType:'Mini Excavator',currentSeriesUrl,sourceKind:m.sourceKind,model:m,notes:m.notes})]);
  return Number(x.insertId);
}
async function put(c:Parameters<DbMigration['apply']>[0],mid:number,vid:number,did:number,rid:number,value:string|number,unit:string|null=null){
  await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,rid]);
}

export const kubotaRemainingCurrentMiniExcavatorsMigration:DbMigration={
  id:'20260901_566_kubota_remaining_current_mini_excavators',
  description:'Add the remaining six current Kubota U.S. mini excavators from current catalog and direct model sheets',
  async apply(c){
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Mini Excavator','mini-excavator') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Kubota','kubota') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`),et=await id(c,`SELECT id FROM equipment_types WHERE slug='mini-excavator' LIMIT 1`),sid=await source(c);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Kubota U Series Excavators','kubota-u-series-excavators') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Kubota KX Series Excavators','kubota-kx-series-excavators') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    const uSeries=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='kubota-u-series-excavators' LIMIT 1`,[mf,et]);
    const kxSeries=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='kubota-kx-series-excavators' LIMIT 1`,[mf,et]);
    const ids=new Map<string,number>();
    for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));}
    const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing Kubota remaining excavator definition ${k}`);return v;};

    for(const m of models){
      const rid=await record(c,sid,m),seriesId=m.slug==='u17'?uSeries:kxSeries;
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Kubota USA compact excavator listed as buildable in the live U or KX Series catalog','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes),data_status=IF(data_status='verified','verified','partial')`,[mf,et,seriesId,m.model,m.slug]);
      const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States',?,TRUE,?,?) ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),configuration=VALUES(configuration),notes=VALUES(notes)`,[mid,VERSION,m.sourceKind,rid,m.notes]);
      const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);

      await put(c,mid,vid,def('configuration.type'),rid,'Mini excavator');
      await put(c,mid,vid,def('configuration.market_scope'),rid,'United States current catalog');
      await put(c,mid,vid,def('kubota.excavator.series'),rid,m.slug==='u17'?'U Series':'KX Series');
      await put(c,mid,vid,def('kubota.excavator.engine_model'),rid,m.engineModel);
      await put(c,mid,vid,def('kubota.excavator.gross_power'),rid,m.grossHp,'hp');
      if(m.netHp!==undefined) await put(c,mid,vid,def('kubota.excavator.net_power'),rid,m.netHp,'hp');
      await put(c,mid,vid,def('kubota.excavator.displacement'),rid,m.displacementCuIn,'cu in');
      await put(c,mid,vid,def('kubota.excavator.max_dig_depth'),rid,m.digDepth);
      await put(c,mid,vid,def('kubota.excavator.max_dump_height'),rid,m.dumpHeight);
      await put(c,mid,vid,def('kubota.excavator.bucket_breakout'),rid,m.bucketBreakoutLbf,'lbf');
      if(m.armBreakoutLbf!==undefined) await put(c,mid,vid,def('kubota.excavator.arm_breakout'),rid,m.armBreakoutLbf,'lbf');
      if(m.pumpCapacityGpm!==undefined) await put(c,mid,vid,def('kubota.excavator.pump_capacity'),rid,m.pumpCapacityGpm,'gpm');
      if(m.pumpConfiguration) await put(c,mid,vid,def('kubota.excavator.pump_configuration'),rid,m.pumpConfiguration);
      await put(c,mid,vid,def('kubota.excavator.aux_flow'),rid,m.auxFlow);
      await put(c,mid,vid,def('kubota.excavator.travel_speed_pair'),rid,m.travelSpeedPair);
      await put(c,mid,vid,def('kubota.excavator.operating_weight'),rid,m.operatingWeightLb,'lb');
      await put(c,mid,vid,def('kubota.excavator.weight_configuration'),rid,m.weightConfiguration);
      await put(c,mid,vid,def('kubota.excavator.ground_pressure'),rid,m.groundPressurePsi,'psi');
    }
  },
};
