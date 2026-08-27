import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSlug='mx4900'|'mx5400'|'mx6000';
type VersionSlug='us-current-gear-2wd'|'us-current-gear-4wd'|'us-current-hst-4wd';

type FilterSeed={
  partNumber:string;
  normalizedPartNumber:string;
  categoryName:string;
  categorySlug:string;
  name:string;
  description:string;
  hstOnly?:boolean;
};

type ModelSource={url:string;externalId:string;title:string};

const filters:FilterSeed[]=[
  {partNumber:'HH164-32430',normalizedPartNumber:'HH16432430',categoryName:'Engine Oil Filters',categorySlug:'engine-oil-filters',name:'Engine Oil Filter',description:'Engine oil filter listed in current MX model dealer parts catalogs.'},
  {partNumber:'HH1J1-43172',normalizedPartNumber:'HH1J143172',categoryName:'Fuel Filters',categorySlug:'fuel-filters',name:'Fuel Filter Cartridge',description:'Current fuel filter cartridge listed in MX model dealer parts catalogs.'},
  {partNumber:'R1401-42270',normalizedPartNumber:'R140142270',categoryName:'Engine Air Filters',categorySlug:'engine-air-filters',name:'Outer Air Filter Element',description:'Primary outer engine air-cleaner element listed in MX model dealer parts catalogs.'},
  {partNumber:'HHTA0-37710',normalizedPartNumber:'HHTA037710',categoryName:'Hydraulic Filters',categorySlug:'hydraulic-filters',name:'Hydraulic Oil Filter',description:'Hydraulic oil filter listed in MX model dealer parts catalogs.'},
  {partNumber:'HHTA0-59900',normalizedPartNumber:'HHTA059900',categoryName:'Transmission Filters',categorySlug:'transmission-filters',name:'HST Hydraulic Filter',description:'Hydrostatic transmission hydraulic filter listed on current MX HST model dealer parts catalogs.',hstOnly:true},
];

const modelVersions:Record<ModelSlug,VersionSlug[]>={
  mx4900:['us-current-gear-4wd','us-current-hst-4wd'],
  mx5400:['us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd'],
  mx6000:['us-current-hst-4wd'],
};

const gearSources:Partial<Record<ModelSlug,ModelSource>>={
  mx4900:{url:'https://www.messicks.com/catalogs/kubota/mx4900dt',externalId:'messicks-kubota-mx4900dt-service-filters',title:'Kubota MX4900DT parts catalog - current service-filter references'},
  mx5400:{url:'https://www.messicks.com/catalogs/kubota/mx5400dt',externalId:'messicks-kubota-mx5400dt-service-filters',title:'Kubota MX5400DT parts catalog - current service-filter references'},
};

const hstSources:Record<ModelSlug,ModelSource>={
  mx4900:{url:'https://www.messicks.com/catalogs/kubota/mx4900h',externalId:'messicks-kubota-mx4900h-service-filters',title:'Kubota MX4900H parts catalog - current HST service-filter references'},
  mx5400:{url:'https://www.messicks.com/catalogs/kubota/mx5400h',externalId:'messicks-kubota-mx5400h-service-filters',title:'Kubota MX5400H parts catalog - current HST service-filter references'},
  mx6000:{url:'https://www.messicks.com/catalogs/kubota/mx6000h',externalId:'messicks-kubota-mx6000h-service-filters',title:'Kubota MX6000H parts catalog - current HST service-filter references'},
};

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota MX service-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,source:ModelSource){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[source.externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,source.url,source.externalId,source.title]);
  return Number(result.insertId);
}

async function upsertVersionFitment(connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,partId:number,sourceRecordId:number,fitmentNote:string,configurationNote:string){
  const [existing]=await connection.query<IdRow[]>(
    `SELECT id FROM machine_parts WHERE machine_id=? AND machine_version_id=? AND part_id=? AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL ORDER BY id DESC LIMIT 1`,
    [machineId,versionId,partId],
  );
  if(existing[0]){
    await connection.query(`UPDATE machine_parts SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='high' WHERE id=?`,[fitmentNote,configurationNote,sourceRecordId,Number(existing[0].id)]);
  }else{
    await connection.query(
      `INSERT INTO machine_parts (machine_id,machine_version_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence) VALUES (?,?,?,?,?,?,'high')`,
      [machineId,versionId,partId,fitmentNote,configurationNote,sourceRecordId],
    );
  }
}

export const kubotaMXServiceFiltersMigration:DbMigration={
  id:'20260827_166_kubota_mx_service_filters',
  description:'Add configuration-aware Kubota MX4900, MX5400 and MX6000 service-filter fitments from model-specific dealer catalogs',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`);
      sourceId=Number(result.insertId);
    }

    const sourceIds=new Map<string,number>();
    for(const modelSlug of Object.keys(modelVersions) as ModelSlug[]){
      const hst=await ensureSourceRecord(connection,sourceId,hstSources[modelSlug]);
      sourceIds.set(`${modelSlug}:hst`,hst);
      const gearSource=gearSources[modelSlug];
      if(gearSource){
        const gear=await ensureSourceRecord(connection,sourceId,gearSource);
        sourceIds.set(`${modelSlug}:gear`,gear);
      }
    }

    for(const filter of filters){
      await connection.query(`INSERT INTO part_categories (name,slug) VALUES (?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,[filter.categoryName,filter.categorySlug]);
      const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug=? LIMIT 1`,[filter.categorySlug]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,categoryId,filter.partNumber,filter.normalizedPartNumber,filter.name,filter.description],
      );
    }

    for(const modelSlug of Object.keys(modelVersions) as ModelSlug[]){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[modelSlug]);
      for(const versionSlug of modelVersions[modelSlug]){
        const isHst=versionSlug==='us-current-hst-4wd';
        const sourceRecordId=sourceIds.get(`${modelSlug}:${isHst?'hst':'gear'}`);
        if(!sourceRecordId) throw new Error(`Missing ${modelSlug} ${versionSlug} service-filter source.`);
        const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,versionSlug]);

        for(const filter of filters){
          if(filter.hstOnly&&!isHst) continue;
          const partId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,filter.normalizedPartNumber]);
          await upsertVersionFitment(
            connection,machineId,versionId,partId,sourceRecordId,
            `Messicks' ${modelSlug.toUpperCase()} ${isHst?'HST':'gear-drive'} catalog lists ${filter.partNumber} for this model family. Confirm exact tractor serial and station configuration before ordering.`,
            filter.hstOnly?'HST-only hydraulic/transmission filter':`${modelSlug.toUpperCase()} ${isHst?'HST':'gear-drive'} service-filter reference`,
          );
        }
      }
    }
  },
};
