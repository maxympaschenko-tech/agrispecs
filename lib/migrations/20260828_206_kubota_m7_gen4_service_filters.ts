import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type FitmentSeed={modelSlug:'m7-134'|'m7-154'|'m7-174';versionSlug:string;catalogCode:string;url:string};
type PartSeed={partNumber:string;normalized:string;name:string;categorySlug:string;description:string};

const fitments:FitmentSeed[]=[
  {modelSlug:'m7-134',versionSlug:'us-current-deluxe',catalogCode:'M7-134S',url:'https://www.messicks.com/catalogs/kubota/m7-134s'},
  {modelSlug:'m7-154',versionSlug:'us-current-deluxe',catalogCode:'M7-154S',url:'https://www.messicks.com/catalogs/kubota/m7-154s'},
  {modelSlug:'m7-154',versionSlug:'us-current-premium',catalogCode:'M7-154P',url:'https://www.messicks.com/catalogs/kubota/m7-154p'},
  {modelSlug:'m7-154',versionSlug:'us-current-premium-kvt',catalogCode:'M7-154P KVT',url:'https://www.messicks.com/catalogs/kubota/m7-154p-kvt'},
  {modelSlug:'m7-174',versionSlug:'us-current-deluxe',catalogCode:'M7-174S',url:'https://www.messicks.com/catalogs/kubota/m7-174s'},
  {modelSlug:'m7-174',versionSlug:'us-current-premium',catalogCode:'M7-174P',url:'https://www.messicks.com/catalogs/kubota/m7-174p'},
  {modelSlug:'m7-174',versionSlug:'us-current-premium-kvt',catalogCode:'M7-174P KVT',url:'https://www.messicks.com/catalogs/kubota/m7-174p-kvt'},
];

const parts:PartSeed[]=[
  {partNumber:'1J520-43060',normalized:'1J52043060',name:'Fuel Filter Element Assembly',categorySlug:'fuel-filters',description:'Kubota M7 Gen 4 fuel-filter element assembly shown in model-specific dealer catalogs and frequently-used-item lists.'},
  {partNumber:'1G311-43380',normalized:'1G31143380',name:'Fuel Filter Separator Element',categorySlug:'fuel-water-separators',description:'Kubota fuel/water separator element directly listed for M7 Gen 4 model codes.'},
  {partNumber:'HH1J0-43172',normalized:'HH1J043172',name:'Fuel Filter Cartridge',categorySlug:'fuel-filters',description:'Current Kubota fuel-filter cartridge directly listed in M7 Gen 4 model catalogs.'},
  {partNumber:'6A671-75090',normalized:'6A67175090',name:'Cabin Air Recirculation Filter',categorySlug:'cabin-air-filters',description:'Kubota M7 Gen 4 cab recirculation/HVAC filter listed in model-specific dealer catalogs.'},
  {partNumber:'3J037-31510',normalized:'3J03731510',name:'Engine Air Filter Element 2',categorySlug:'engine-air-filters',description:'Kubota M7 Gen 4 secondary engine-air filter element; Messicks part-fitment listing explicitly includes M7-134S/P/P KVT, M7-154S/P/P KVT and M7-174S/P/P KVT.'},
];

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M7 Gen 4 service-filter migration dependency.');
  return Number(rows[0].id);
}
async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,externalId:string,url:string,title:string){
  const [rows]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
  if(rows[0]) return Number(rows[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,url,externalId,title]);
  return Number(result.insertId);
}
async function upsertFitment(connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,partId:number,sourceRecordId:number,note:string,configurationNote:string){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM machine_parts WHERE machine_id=? AND machine_version_id=? AND part_id=? AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL ORDER BY id DESC LIMIT 1`,[machineId,versionId,partId]);
  if(existing[0]){
    await connection.query(`UPDATE machine_parts SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='high' WHERE id=?`,[note,configurationNote,sourceRecordId,Number(existing[0].id)]);
  }else{
    await connection.query(`INSERT INTO machine_parts (machine_id,machine_version_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence) VALUES (?,?,?,?,?,?,'high')`,[machineId,versionId,partId,note,configurationNote,sourceRecordId]);
  }
}

export const kubotaM7Gen4ServiceFiltersMigration:DbMigration={
  id:'20260828_206_kubota_m7_gen4_service_filters',
  description:'Add grade-specific current Kubota M7 Gen 4 fuel, separator, cabin-air and engine-air service filter fitments',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Fuel / Water Separators','fuel-water-separators') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`);
      sourceId=Number(result.insertId);
    }

    const partIds=new Map<string,number>();
    for(const part of parts){
      const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug=? LIMIT 1`,[part.categorySlug]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,categoryId,part.partNumber,part.normalized,part.name,part.description],
      );
      partIds.set(part.normalized,await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,part.normalized]));
    }

    for(const fitment of fitments){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[fitment.modelSlug]);
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=1 LIMIT 1`,[machineId,fitment.versionSlug]);
      const externalCode=fitment.catalogCode.toLowerCase().replace(/[^a-z0-9]+/g,'-');
      const sourceRecordId=await ensureSourceRecord(connection,sourceId,`messicks-${externalCode}-m7-gen4-service-filters-2026-08`,fitment.url,`Messicks Kubota ${fitment.catalogCode} parts catalog - M7 Gen 4 service filters`);
      const configurationNote=`Current US ${fitment.catalogCode} grade-specific service-filter reference; confirm tractor serial number before ordering.`;
      for(const part of parts){
        const partId=partIds.get(part.normalized);
        if(!partId) throw new Error(`Missing M7 Gen 4 service part ${part.partNumber}`);
        await upsertFitment(connection,machineId,versionId,partId,sourceRecordId,`Messicks' ${fitment.catalogCode} model catalog/frequently-used items and supporting part-fitment records list ${part.partNumber}. Confirm serial number before ordering.`,configurationNote);
      }
    }
  },
};