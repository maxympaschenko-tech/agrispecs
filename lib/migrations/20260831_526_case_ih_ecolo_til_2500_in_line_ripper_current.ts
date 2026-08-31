import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
const VERSION = 'united-states-current-2026-08';
const URL = 'https://www.caseih.com/en-us/unitedstates/products/tillage/in-line-rippers/ecolo-til-2500';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/tillage/in-line-rippers';
const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Tillage System','in_line_ripper.shank_types','Shank types','text',null,10],
  ['Tillage System','in_line_ripper.shank_spacing','Shank spacing options','text',null,20],
  ['Tillage System','in_line_ripper.shank_mounts','Shank mount options','text',null,30],
  ['Tillage System','in_line_ripper.compaction_system','Compaction-breaking system','text',null,40],
  ['Tillage System','in_line_ripper.residue_management','Residue-management options','text',null,50],
  ['Application System','in_line_ripper.fertilizer_attachment','Fertilizer attachment','text',null,10],
];
async function id(c: Parameters<DbMigration['apply']>[0], sql: string, p: unknown[] = []) { const [r] = await c.query<IdRow[]>(sql,p); if (!r[0]) throw new Error('Case IH Ecolo-Til 2500 migration dependency missing'); return Number(r[0].id); }
async function src(c: Parameters<DbMigration['apply']>[0]) { const [r] = await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`); if (r[0]) return Number(r[0].id); const [x] = await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`); return Number(x.insertId); }
async function rec(c: Parameters<DbMigration['apply']>[0], sid: number) { const externalId='case-ih-ecolo-til-2500-in-line-ripper-us-current-2026-08'; const [r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]); if(r[0]) return Number(r[0].id); const [x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,URL,externalId,'Case IH Ecolo-Til 2500 current US in-line ripper specifications',JSON.stringify({captured:'2026-08-31',market:'United States',equipmentType:'In-Line Ripper',model:'Ecolo-Til 2500',familySource:FAMILY_URL,source:URL})]); return Number(x.insertId); }
async function put(c: Parameters<DbMigration['apply']>[0], mid:number,vid:number,did:number,rid:number,v:string){await c.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,NULL,NULL,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=NULL,unit=NULL,source_record_id=VALUES(source_record_id),confidence='official'`,[mid,vid,did,v,rid]);}
export const caseIhEcoloTil2500InLineRipperCurrentMigration: DbMigration = { id:'20260831_526_case_ih_ecolo_til_2500_in_line_ripper_current', description:'Add current Case IH US Ecolo-Til 2500 in-line ripper', async apply(c){
  await c.query(`INSERT INTO equipment_types(name,slug) VALUES('In-Line Ripper','in-line-ripper') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
  await c.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
  const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`), et=await id(c,`SELECT id FROM equipment_types WHERE slug='in-line-ripper' LIMIT 1`), sid=await src(c), rid=await rec(c,sid);
  await c.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Ecolo-Til In-Line Rippers','ecolo-til-in-line-rippers') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[mf,et]);
  const series=await id(c,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='ecolo-til-in-line-rippers' LIMIT 1`,[mf,et]);
  const ids=new Map<string,number>(); for(const d of defs){await c.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,d); ids.set(d[1],await id(c,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[d[1]]));} const def=(k:string)=>{const v=ids.get(k);if(!v)throw new Error(`Missing Ecolo-Til definition ${k}`);return v;};
  await c.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Case IH United States in-line ripper lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`,[mf,et,series,'Ecolo-Til 2500','ecolo-til-2500']);
  const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug='ecolo-til-2500' LIMIT 1`,[mf,et]); await c.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[mid,VERSION]);
  await c.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current Ecolo-Til 2500 specification',TRUE,?,'Current Case IH US product-page data captured 2026-08-31. Working width, horsepower and shank count are intentionally left unpublished because the current manufacturer product page does not expose one model-wide value.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[mid,VERSION,rid]);
  const vid=await id(c,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[mid,VERSION]);
  await put(c,mid,vid,def('configuration.type'),rid,'In-line ripper'); await put(c,mid,vid,def('configuration.market_scope'),rid,'United States current catalog');
  await put(c,mid,vid,def('in_line_ripper.shank_types'),rid,'Parabolic, Minimum Residue Disturbance (MRD), and no-till');
  await put(c,mid,vid,def('in_line_ripper.shank_spacing'),rid,'30, 36, 38, or 40 in');
  await put(c,mid,vid,def('in_line_ripper.shank_mounts'),rid,'Spring reset or shear bolt');
  await put(c,mid,vid,def('in_line_ripper.compaction_system'),rid,'Case IH Tiger points use a lift, twist and roll action to fracture compaction');
  await put(c,mid,vid,def('in_line_ripper.residue_management'),rid,'Parabolic, MRD and no-till shank/point choices; optional disk leveler on the current series page');
  await put(c,mid,vid,def('in_line_ripper.fertilizer_attachment'),rid,'Optional fertilizer attachments for root-zone banding in the tillage pass');
}};
