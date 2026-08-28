import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSlug='m4d-061'|'m4-071'|'m4d-071';

type PartSeed={partNumber:string;normalized:string;name:string;categorySlug:string};
const parts:PartSeed[]=[
  {partNumber:'HH1C0-32430',normalized:'HH1C032430',name:'Engine Oil Filter',categorySlug:'engine-oil-filters'},
  {partNumber:'HH1J1-43172',normalized:'HH1J143172',name:'Fuel Filter Cartridge',categorySlug:'fuel-filters'},
  {partNumber:'59800-26110',normalized:'5980026110',name:'Outer Air Filter Element',categorySlug:'engine-air-filters'},
  {partNumber:'3A111-19130',normalized:'3A11119130',name:'Inner Air Filter Safety Element',categorySlug:'engine-air-filters'},
  {partNumber:'1J770-05810',normalized:'1J77005810',name:'Oil Separator Element Kit',categorySlug:'oil-separator-filters'},
  {partNumber:'6A671-75090',normalized:'6A67175090',name:'Cabin Air Recirculation Filter',categorySlug:'cabin-air-filters'},
];

const sources:Record<ModelSlug,{url:string;externalId:string;title:string}>={
  'm4d-061':{url:'https://www.messicks.com/catalogs/kubota/m4d-061hdc12',externalId:'messicks-m4d-061hdc12-service-filters-2026-08',title:'Kubota M4D-061HDC12 parts catalog - service filter references'},
  'm4-071':{url:'https://www.messicks.com/catalogs/kubota/m4-071hdc12',externalId:'messicks-m4-071hdc12-service-filters-2026-08',title:'Kubota M4-071HDC12 parts catalog - service filter references'},
  'm4d-071':{url:'https://www.messicks.com/catalogs/kubota/m4d-071hdc12',externalId:'messicks-m4d-071hdc12-service-filters-2026-08',title:'Kubota M4D-071HDC12 parts catalog - service filter references'},
};

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M4 service-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,source:{url:string;externalId:string;title:string}){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[source.externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,source.url,source.externalId,source.title]);
  return Number(result.insertId);
}

async function upsertFitment(connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,partId:number,sourceRecordId:number,note:string){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM machine_parts WHERE machine_id=? AND machine_version_id=? AND part_id=? AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL ORDER BY id DESC LIMIT 1`,[machineId,versionId,partId]);
  if(existing[0]){
    await connection.query(`UPDATE machine_parts SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='high' WHERE id=?`,[note,'Current US M4 HDC12 cab service-filter reference; confirm serial number before ordering.',sourceRecordId,Number(existing[0].id)]);
  }else{
    await connection.query(`INSERT INTO machine_parts (machine_id,machine_version_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence) VALUES (?,?,?,?,?,?,'high')`,[machineId,versionId,partId,note,'Current US M4 HDC12 cab service-filter reference; confirm serial number before ordering.',sourceRecordId]);
  }
}

export const kubotaM4ServiceFiltersMigration:DbMigration={
  id:'20260828_190_kubota_m4_service_filters',
  description:'Add model-specific current Kubota M4 engine, fuel, air, oil-separator and cabin-air filter fitments',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Cabin Air Filters','cabin-air-filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

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
        [manufacturerId,categoryId,part.partNumber,part.normalized,part.name,'Kubota M4 HDC12 service filter supported by direct model-specific dealer catalog evidence; verify tractor serial number before ordering.'],
      );
      partIds.set(part.normalized,await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,part.normalized]));
    }

    for(const modelSlug of ['m4d-061','m4-071','m4d-071'] as const){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[modelSlug]);
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug='us-current-hdc12-cab-4wd' LIMIT 1`,[machineId]);
      const sourceRecordId=await ensureSourceRecord(connection,sourceId,sources[modelSlug]);
      for(const part of parts){
        const partId=partIds.get(part.normalized);
        if(!partId) throw new Error(`Missing M4 service part ${part.partNumber}`);
        await upsertFitment(connection,machineId,versionId,partId,sourceRecordId,`${sources[modelSlug].title} lists ${part.partNumber} among the model's service/frequently-used filter items. Confirm serial number before ordering.`);
      }
    }
  },
};
