import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSlug='bx1880'|'bx2380'|'bx2680'|'bx23s';

type PartSeed={
  partNumber:string;
  normalized:string;
  name:string;
  categorySlug:string;
};

const parts:PartSeed[]=[
  {partNumber:'HH1J0-32430',normalized:'HH1J032430',name:'Engine Oil Filter Cartridge',categorySlug:'engine-oil-filters'},
  {partNumber:'12581-43012',normalized:'1258143012',name:'In-Line Fuel Filter',categorySlug:'fuel-filters'},
  {partNumber:'K1211-82320',normalized:'K121182320',name:'Engine Air Filter Element',categorySlug:'engine-air-filters'},
  {partNumber:'HHK20-36994',normalized:'HHK2036994',name:'Transmission Oil Filter Cartridge',categorySlug:'transmission-filters'},
];

const sources:Record<ModelSlug,{url:string;externalId:string;title:string}>={
  bx1880:{url:'https://www.messicks.com/catalogs/kubota/bx1880-1',externalId:'messicks-kubota-bx1880-1-service-filters',title:'Kubota BX1880-1 parts catalog - current service filter references'},
  bx2380:{url:'https://www.messicks.com/catalogs/kubota/bx2380-1',externalId:'messicks-kubota-bx2380-1-service-filters',title:'Kubota BX2380-1 parts catalog - current service filter references'},
  bx2680:{url:'https://www.messicks.com/catalogs/kubota/bx2680-1',externalId:'messicks-kubota-bx2680-1-service-filters',title:'Kubota BX2680-1 parts catalog - current service filter references'},
  bx23s:{url:'https://www.messicks.com/catalogs/kubota/bx23s-1',externalId:'messicks-kubota-bx23s-1-service-filters',title:'Kubota BX23S-1 parts catalog - current service filter references'},
};

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota BX service-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,source:{url:string;externalId:string;title:string}){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[source.externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,source.url,source.externalId,source.title]);
  return Number(result.insertId);
}

async function upsertFitment(connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,partId:number,sourceRecordId:number,fitmentNote:string){
  const [existing]=await connection.query<IdRow[]>(
    `SELECT id FROM machine_parts WHERE machine_id=? AND machine_version_id=? AND part_id=? AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL ORDER BY id DESC LIMIT 1`,
    [machineId,versionId,partId],
  );
  if(existing[0]){
    await connection.query(`UPDATE machine_parts SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='high' WHERE id=?`,[fitmentNote,'Current US BX80 HST service-filter reference',sourceRecordId,Number(existing[0].id)]);
  }else{
    await connection.query(
      `INSERT INTO machine_parts (machine_id,machine_version_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence)
       VALUES (?,?,?,?,?,?,'high')`,
      [machineId,versionId,partId,fitmentNote,'Current US BX80 HST service-filter reference',sourceRecordId],
    );
  }
}

export const kubotaBXServiceFiltersMigration:DbMigration={
  id:'20260827_172_kubota_bx_service_filters',
  description:'Add version-aware current Kubota BX80 engine oil, fuel, air and transmission service-filter fitments from model-specific dealer catalogs',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`);
      sourceId=Number(result.insertId);
    }

    const sourceRecordIds=new Map<ModelSlug,number>();
    for(const modelSlug of ['bx1880','bx2380','bx2680','bx23s'] as const){
      sourceRecordIds.set(modelSlug,await ensureSourceRecord(connection,sourceId,sources[modelSlug]));
    }

    const partIds=new Map<string,number>();
    for(const part of parts){
      const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug=? LIMIT 1`,[part.categorySlug]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,categoryId,part.partNumber,part.normalized,part.name,'Kubota BX80 service filter supported by model-specific dealer catalog references; confirm serial number before ordering.'],
      );
      partIds.set(part.normalized,await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,part.normalized]));
    }

    for(const modelSlug of ['bx1880','bx2380','bx2680','bx23s'] as const){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[modelSlug]);
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug='us-current-hst-4wd' LIMIT 1`,[machineId]);
      const sourceRecordId=sourceRecordIds.get(modelSlug);
      if(!sourceRecordId) throw new Error(`Missing ${modelSlug} BX service-filter source.`);
      for(const part of parts){
        const partId=partIds.get(part.normalized);
        if(!partId) throw new Error(`Missing BX part ${part.partNumber}`);
        await upsertFitment(
          connection,machineId,versionId,partId,sourceRecordId,
          `${sources[modelSlug].title} supports ${part.partNumber} as a service-filter reference for this BX model family. Confirm exact tractor serial number before ordering.`,
        );
      }
    }
  },
};
