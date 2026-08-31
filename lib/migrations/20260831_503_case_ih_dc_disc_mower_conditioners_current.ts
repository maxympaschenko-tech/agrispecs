import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = {
  slug: string;
  model: string;
  sourceUrl: string;
  series: 'DC3' | 'DC5';
  type: string;
  cuttingWidth: string;
  discs: number;
  ptoHp: number;
  conditioning?: string;
  conditionerWidthIn?: number;
};

const VERSION = 'united-states-current-2026-08';
const FAMILY_URL = 'https://www.caseih.com/en-us/unitedstates/products/mowers-conditioners/disc-mower-conditioners';
const models: Seed[] = [
  { slug:'dc93', model:'DC93', series:'DC3', type:'Side-pull', cuttingWidth:'9 ft 2 in (2.8 m)', discs:7, ptoHp:65, conditioning:'Rubber-roll or flail conditioning', conditionerWidthIn:90, sourceUrl:`${FAMILY_URL}/dc93` },
  { slug:'dc103', model:'DC103', series:'DC3', type:'Side-pull', cuttingWidth:'10 ft 4 in (3.2 m)', discs:8, ptoHp:80, conditioning:'Rubber-on-rubber, steel-on-steel, or flail conditioning', conditionerWidthIn:102, sourceUrl:`${FAMILY_URL}/dc103` },
  { slug:'dc105', model:'DC105', series:'DC5', type:'Center pivot', cuttingWidth:'10 ft 1 in', discs:6, ptoHp:80, conditioning:'Rubber-roll or flail conditioning', sourceUrl:`${FAMILY_URL}/dc105` },
  { slug:'dc125', model:'DC125', series:'DC5', type:'Center pivot', cuttingWidth:'11 ft 7 in', discs:7, ptoHp:85, conditioning:'Rubber rolls, steel rolls, or flail conditioning', sourceUrl:`${FAMILY_URL}/dc125` },
  { slug:'dc135', model:'DC135', series:'DC5', type:'Center pivot', cuttingWidth:'13 ft 1 in (4 m)', discs:8, ptoHp:90, sourceUrl:`${FAMILY_URL}/dc135` },
  { slug:'dc165', model:'DC165', series:'DC5', type:'Center pivot', cuttingWidth:'16 ft 5 in (5 m)', discs:10, ptoHp:100, sourceUrl:`${FAMILY_URL}/dc165` },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Cutting System','mower.cutting_width','Cutting width','text',null,10],
  ['Cutting System','mower.number_of_discs','Number of discs','integer',null,20],
  ['Cutting System','mower.cutterbar','Cutterbar','text',null,30],
  ['Conditioning System','mower.conditioning_options','Conditioning options','text',null,10],
  ['Conditioning System','mower.conditioner_width','Conditioner width','decimal','in',20],
  ['Tractor Requirements','mower.minimum_pto_power','Minimum PTO power required','decimal','hp',10],
];

async function id(connection: Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){const [rows]=await connection.query<IdRow[]>(sql,params);if(!rows[0])throw new Error('Case IH DC mower-conditioner migration dependency missing');return Number(rows[0].id);}
async function ensureSource(connection: Parameters<DbMigration['apply']>[0]){const [rows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Case IH' AND domain='caseih.com' ORDER BY id LIMIT 1`);if(rows[0])return Number(rows[0].id);const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Case IH','caseih.com','manufacturer','official')`);return Number(result.insertId);}
async function sourceRecord(connection: Parameters<DbMigration['apply']>[0],sourceId:number,model:Seed){const externalId=`case-ih-${model.slug}-disc-mower-conditioner-us-current-2026-08`;const [rows]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);if(rows[0])return Number(rows[0].id);const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sourceId,model.sourceUrl,externalId,`Case IH ${model.model} current US disc mower-conditioner specifications`,JSON.stringify({captured:'2026-08-31',market:'United States',equipmentType:'Disc Mower-Conditioner',familySource:FAMILY_URL,...model,note:'Only values exposed on the current Case IH US model/family pages are published. Conditioning options are omitted for models where the current model page does not identify the exact available configuration.'})]);return Number(result.insertId);}
async function put(connection: Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,definitionId:number,sourceRecordId:number,value:string|number,unit:string|null=null){await connection.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[machineId,versionId,definitionId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceRecordId]);}

export const caseIHDcDiscMowerConditionersCurrentMigration: DbMigration = {
  id:'20260831_503_case_ih_dc_disc_mower_conditioners_current',
  description:'Add current Case IH US DC3 and DC5 disc mower-conditioner lineup',
  async apply(connection){
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Disc Mower-Conditioner','disc-mower-conditioner') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('Case IH','case-ih') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId=await id(connection,`SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);const equipmentTypeId=await id(connection,`SELECT id FROM equipment_types WHERE slug='disc-mower-conditioner' LIMIT 1`);const sourceId=await ensureSource(connection);
    for(const s of [{name:'DC3 Series',slug:'dc3-series'},{name:'DC5 Series',slug:'dc5-series'}])await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,[manufacturerId,equipmentTypeId,s.name,s.slug]);
    const definitionIds=new Map<string,number>();for(const definition of defs){await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,definition);definitionIds.set(definition[1],await id(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[definition[1]]));}const def=(key:string)=>{const value=definitionIds.get(key);if(!value)throw new Error(`Missing mower definition ${key}`);return value;};
    for(const model of models){
      const seriesId=await id(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.series==='DC3'?'dc3-series':'dc5-series']);const sourceRecordId=await sourceRecord(connection,sourceId,model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current Case IH United States DC disc mower-conditioner lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`,[manufacturerId,equipmentTypeId,seriesId,model.model,model.slug]);const machineId=await id(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[machineId,VERSION]);await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'US','United States','Current Case IH DC mower-conditioner specification',TRUE,?,'Current Case IH US product-page data captured 2026-08-31.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[machineId,VERSION,sourceRecordId]);const versionId=await id(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,VERSION]);
      await put(connection,machineId,versionId,def('configuration.type'),sourceRecordId,`${model.type} disc mower-conditioner`);await put(connection,machineId,versionId,def('configuration.market_scope'),sourceRecordId,'United States current Case IH catalog');await put(connection,machineId,versionId,def('mower.cutting_width'),sourceRecordId,model.cuttingWidth);await put(connection,machineId,versionId,def('mower.number_of_discs'),sourceRecordId,model.discs);await put(connection,machineId,versionId,def('mower.cutterbar'),sourceRecordId,model.series==='DC3'?'Modular DC3 cutterbar with quick-change knives and counter-rotating discs':'DC5 center-pivot disc mower-conditioner cutterbar');await put(connection,machineId,versionId,def('mower.minimum_pto_power'),sourceRecordId,model.ptoHp,'hp');if(model.conditioning)await put(connection,machineId,versionId,def('mower.conditioning_options'),sourceRecordId,model.conditioning);if(model.conditionerWidthIn!==undefined)await put(connection,machineId,versionId,def('mower.conditioner_width'),sourceRecordId,model.conditionerWidthIn,'in');
    }
  }
};
