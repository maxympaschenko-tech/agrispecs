import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  url: string;
  width: string;
  transport: string;
  blade: string;
  bladeSize: string;
  spacing: string;
  power?: string;
  hydraulics?: string;
  gangAngle: string;
  depth?: string;
  speed?: string;
  precision: string;
};

const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/tillage/vertical-tillage';
const models: Seed[] = [
  {
    slug: 'true-tandem-335vt', model: 'True-Tandem 335VT', url: `${FAMILY_URL}/true-tandem-335-vt`,
    width: '22 ft 2 in (6.8 m) - 47 ft 2 in (14.4 m)', transport: '14 ft 6 in (4.42 m) - 18 ft 6 in (5.64 m)',
    blade: 'Earth Metal VT Wave Blade', bladeSize: '20 in (508 mm)', spacing: '7.5 in (191 mm)', power: '7 - 11 hp/ft', hydraulics: '4 remotes',
    gangAngle: '18-degree symmetrical True-Tandem gang angle', precision: 'Optional Case IH Soil Command tillage technology',
  },
  {
    slug: 'true-tandem-335-barracuda', model: 'True-Tandem 335 Barracuda', url: `${FAMILY_URL}/true-tandem-335-barracuda`,
    width: '22 ft (6.7 m) - 47 ft (14.3 m)', transport: '14 ft 6 in (4.42 m) - 18 ft (5.5 m)',
    blade: 'Earth Metal Barracuda Blade', bladeSize: '22 in', spacing: '7.5 in (191 mm)', power: '10 - 15 hp/ft', hydraulics: '4 remotes',
    gangAngle: '18-degree symmetrical True-Tandem gang angle', precision: 'Optional Case IH Soil Command tillage technology',
  },
  {
    slug: 'vt-flex-435', model: 'VT-Flex 435', url: `${FAMILY_URL}/vt-flex-435-vertical-tillage-tool`,
    width: '11 - 34 ft', transport: '13.7 ft on 25-ft and smaller units',
    blade: '22-in reverse crimp notched blade or 20-in VT wave blade', bladeSize: '20 or 22 in', spacing: '7.5 in',
    gangAngle: '0 - 12 degrees, mechanically or hydraulically adjustable', depth: '1 - 4 in', speed: '6 - 10 mph',
    precision: 'Soil Command standard on 25-, 30- and 34-ft models; available for in-cab tillage adjustments',
  },
];

const defs: Array<[string, string, string, string, string | null, number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Tillage System','vertical_tillage.working_width','Working width','text',null,10],
  ['Tillage System','vertical_tillage.blade_type','Blade type','text',null,20],
  ['Tillage System','vertical_tillage.blade_size','Blade size','text',null,30],
  ['Tillage System','vertical_tillage.blade_spacing','Blade spacing','text',null,40],
  ['Tillage System','vertical_tillage.gang_angle','Gang angle','text',null,50],
  ['Tillage System','vertical_tillage.operating_depth','Operating depth','text',null,60],
  ['Tillage System','vertical_tillage.operating_speed','Operating speed','text',null,70],
  ['Tractor Requirements','vertical_tillage.power_requirement','Power requirement','text',null,10],
  ['Hydraulics','vertical_tillage.hydraulic_remotes','Hydraulic remotes','text',null,10],
  ['Dimensions & Transport','vertical_tillage.transport_width','Transport width','text',null,10],
  ['Precision Technology','vertical_tillage.precision_control','Precision tillage control','text',null,10],
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) { const [r] = await c.query<IdRow[]>(sql,p); if(!r[0]) throw new Error('Case IH vertical tillage migration dependency missing'); return Number(r[0].id); }
async function src(c: Parameters<DbMigration['apply']>[0]) { const [r] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`); if(r[0]) return Number(r[0].id); const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`); return Number(x.insertId); }
async function rec(c: Parameters<DbMigration['apply']>[0], sid:number, m:Seed) { const externalId=`case-ih-${m.slug}-vertical-tillage-us-current-2026-08`; const [r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]); if(r[0]) return Number(r[0].id); const [x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,m.url,externalId,`Case IH ${m.model} current US vertical tillage specifications`,JSON.stringify({captured:'2026-08-31',market:'United States',equipmentType:'Vertical Tillage',familySource:FAMILY_URL,...m})]); return Number(x.insertId); }
async function put(c: Parameters<DbMigration['apply']>[0], mid:number, vid:number, did:number, rid:number, value:string) { await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,NULL,NULL,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=NULL,unit=NULL,source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,value,rid]); }

export const caseIhVerticalTillageCurrentMigration: DbMigration = {
  id:'20260831_517_case_ih_vertical_tillage_current', description:'Add current Case IH US vertical tillage lineup', async apply(c) {
    await c.query(`INSERT INTO equipment_types(name,slug) VALUES('Vertical Tillage','vertical-tillage') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`), et=await id(c,`SELECT id FROM equipment_types WHERE slug='vertical-tillage' LIMIT 1`), sid=await src(c);
    await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Vertical Tillage','vertical-tillage') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
    const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='vertical-tillage' LIMIT 1`,[mf,et]);
    const ids=new Map<string,number>();
    for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d);ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));}
    const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing vertical tillage definition ${k}`);return v;};
    for(const m of models){
      const rid=await rec(c,sid,m);
      await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Case IH United States vertical tillage lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`,[mf,et,series,m.model,m.slug]);
      const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[mf,et,m.slug]);
      await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);
      await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current vertical tillage specification',TRUE,?,'Current Case IH US product-page data captured 2026-08-31.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[mid,VERSION,rid]);
      const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);
      await put(c,mid,vid,def('configuration.type'),rid,'Pull-type vertical tillage tool'); await put(c,mid,vid,def('configuration.market_scope'),rid,'United States current catalog');
      await put(c,mid,vid,def('vertical_tillage.working_width'),rid,m.width); await put(c,mid,vid,def('vertical_tillage.blade_type'),rid,m.blade); await put(c,mid,vid,def('vertical_tillage.blade_size'),rid,m.bladeSize); await put(c,mid,vid,def('vertical_tillage.blade_spacing'),rid,m.spacing); await put(c,mid,vid,def('vertical_tillage.gang_angle'),rid,m.gangAngle);
      if(m.depth) await put(c,mid,vid,def('vertical_tillage.operating_depth'),rid,m.depth); if(m.speed) await put(c,mid,vid,def('vertical_tillage.operating_speed'),rid,m.speed); if(m.power) await put(c,mid,vid,def('vertical_tillage.power_requirement'),rid,m.power); if(m.hydraulics) await put(c,mid,vid,def('vertical_tillage.hydraulic_remotes'),rid,m.hydraulics);
      await put(c,mid,vid,def('vertical_tillage.transport_width'),rid,m.transport); await put(c,mid,vid,def('vertical_tillage.precision_control'),rid,m.precision);
    }
  }
};
