import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; model: string; cuttingWidth: string; transportWidth: string };

const VERSION = 'north-america-current-2026-08';
const FAMILY_URL = 'https://agriculture.newholland.com/en-us/nar/products/haytools-spreaders/discbine-plus-center-pivot-disc-mower-conditioners';
const models: Seed[] = [
  { slug: 'discbine-310-plus', model: 'Discbine 310 PLUS', cuttingWidth: `10 ft 1 in (3.0 m)`, transportWidth: `10 ft 4 in (3.2 m)` },
  { slug: 'discbine-312-plus', model: 'Discbine 312 PLUS', cuttingWidth: `11 ft 7 in (3.5 m)`, transportWidth: `11 ft 10 in (3.6 m)` },
  { slug: 'discbine-313-plus', model: 'Discbine 313 PLUS', cuttingWidth: `13 ft 1 in (4.0 m)`, transportWidth: `13 ft 5 in (4.03 m)` },
  { slug: 'discbine-316-plus', model: 'Discbine 316 PLUS', cuttingWidth: `16 ft 5 in (5.0 m)`, transportWidth: `16 ft 8 in (5.07 m)` },
];

const defs: Array<[string,string,string,string,string|null,number]> = [
  ['Machine Configuration','configuration.type','Machine configuration','text',null,1],
  ['Machine Configuration','configuration.market_scope','Official market scope','text',null,2],
  ['Cutting System','mower.cutting_width','Cutting width','text',null,10],
  ['Cutting System','mower.cutterbar','Cutterbar','text',null,20],
  ['Cutting System','mower.knife_system','Knife and disc protection','text',null,30],
  ['Conditioning System','mower.conditioning_options','Conditioning options','text',null,10],
  ['Conditioning System','mower.swath_control','Swath control','text',null,20],
  ['Dimensions & Transport','mower.transport_width','Transport width','text',null,10],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('New Holland Discbine PLUS migration dependency missing');
  return Number(rows[0].id);
}
async function ensureSource(connection: Parameters<DbMigration['apply']>[0]) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland' AND domain='agriculture.newholland.com' ORDER BY id LIMIT 1`);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('New Holland','agriculture.newholland.com','manufacturer','official')`);
  return Number(result.insertId);
}
async function sourceRecord(connection: Parameters<DbMigration['apply']>[0], sourceId: number, model: Seed) {
  const externalId = `new-holland-${model.slug}-disc-mower-conditioner-na-current-2026-08`;
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId,FAMILY_URL,externalId,`New Holland ${model.model} current North America disc mower-conditioner data`,JSON.stringify({captured:'2026-08-31',market:'North America',equipmentType:'Disc Mower-Conditioner',...model,note:'Current New Holland North America product page lists four Discbine PLUS center-pivot models. Technical-table cells not exposed in the current HTML remain unpublished.'})]);
  return Number(result.insertId);
}
async function put(connection: Parameters<DbMigration['apply']>[0], machineId:number, versionId:number, definitionId:number, sourceRecordId:number, value:string|number, unit:string|null=null) {
  await connection.query(`INSERT INTO machine_specs(machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence) VALUES(?,?,?,?,?,?,?,'official') ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),source_record_id=VALUES(source_record_id),confidence='official'`,[machineId,versionId,definitionId,typeof value==='string'?value:null,typeof value==='number'?value:null,unit,sourceRecordId]);
}

export const newHollandDiscbinePlusCurrentMigration: DbMigration = {
  id:'20260831_502_new_holland_discbine_plus_current',
  description:'Add current New Holland North America Discbine 310/312/313/316 PLUS center-pivot disc mower-conditioners',
  async apply(connection) {
    await connection.query(`INSERT INTO equipment_types(name,slug) VALUES('Disc Mower-Conditioner','disc-mower-conditioner') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO manufacturers(name,slug) VALUES('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId=await id(connection,`SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const equipmentTypeId=await id(connection,`SELECT id FROM equipment_types WHERE slug='disc-mower-conditioner' LIMIT 1`);
    const sourceId=await ensureSource(connection);
    await connection.query(`INSERT INTO machine_series(manufacturer_id,equipment_type_id,name,slug) VALUES(?,?,'Discbine PLUS Center-Pivot','discbine-plus-center-pivot') ON DUPLICATE KEY UPDATE name=VALUES(name)`,[manufacturerId,equipmentTypeId]);
    const seriesId=await id(connection,`SELECT id FROM machine_series WHERE manufacturer_id=? AND equipment_type_id=? AND slug='discbine-plus-center-pivot' LIMIT 1`,[manufacturerId,equipmentTypeId]);
    const definitionIds=new Map<string,number>();
    for(const definition of defs){await connection.query(`INSERT INTO spec_definitions(section,spec_key,label,value_type,canonical_unit,display_order) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,definition);definitionIds.set(definition[1],await id(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[definition[1]]));}
    const def=(key:string)=>{const value=definitionIds.get(key);if(!value)throw new Error(`Missing mower definition ${key}`);return value;};
    for(const model of models){
      const sourceRecordId=await sourceRecord(connection,sourceId,model);
      await connection.query(`INSERT INTO machines(manufacturer_id,equipment_type_id,series_id,model_name,slug,market_notes,data_status) VALUES(?,?,?,?,?,'Current New Holland North America Discbine PLUS center-pivot lineup','partial') ON DUPLICATE KEY UPDATE series_id=VALUES(series_id),model_name=VALUES(model_name),market_notes=VALUES(market_notes)`,[manufacturerId,equipmentTypeId,seriesId,model.model,model.slug]);
      const machineId=await id(connection,`SELECT id FROM machines WHERE manufacturer_id=? AND equipment_type_id=? AND slug=? LIMIT 1`,[manufacturerId,equipmentTypeId,model.slug]);
      await connection.query(`UPDATE machine_versions SET is_current=FALSE WHERE machine_id=? AND slug<>?`,[machineId,VERSION]);
      await connection.query(`INSERT INTO machine_versions(machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes) VALUES(?,?,'NA','North America','Current Discbine PLUS center-pivot specification',TRUE,?,'Current New Holland North America product data captured 2026-08-31.') ON DUPLICATE KEY UPDATE is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,[machineId,VERSION,sourceRecordId]);
      const versionId=await id(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,VERSION]);
      await put(connection,machineId,versionId,def('configuration.type'),sourceRecordId,'Center-pivot disc mower-conditioner');
      await put(connection,machineId,versionId,def('configuration.market_scope'),sourceRecordId,'New Holland North America current product line');
      await put(connection,machineId,versionId,def('mower.cutting_width'),sourceRecordId,model.cuttingWidth);
      await put(connection,machineId,versionId,def('mower.cutterbar'),sourceRecordId,'MowMax II PLUS modular disc cutterbar');
      await put(connection,machineId,versionId,def('mower.knife_system'),sourceRecordId,'QuickMax knives with ShockPRO disc-drive protection');
      await put(connection,machineId,versionId,def('mower.conditioning_options'),sourceRecordId,'WideDry chevron intermeshing rubber rolls, steel rolls, or LeaningEdge flail tine conditioning');
      await put(connection,machineId,versionId,def('mower.swath_control'),sourceRecordId,'Enhanced Discbine PLUS swath-control surfaces for wide swaths or narrower windrows');
      await put(connection,machineId,versionId,def('mower.transport_width'),sourceRecordId,model.transportWidth);
    }
  },
};
