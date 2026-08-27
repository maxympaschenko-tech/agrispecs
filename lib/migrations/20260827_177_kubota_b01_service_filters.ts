import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSlug='b2301'|'b2601'|'b2401dt'|'b2401dtn';

type PartSeed={
  partNumber:string;
  normalized:string;
  name:string;
  categorySlug:string;
};

const parts:PartSeed[]=[
  {partNumber:'HH150-32094',normalized:'HH15032094',name:'Engine Oil Filter',categorySlug:'engine-oil-filters'},
  {partNumber:'6A320-59930',normalized:'6A32059930',name:'Fuel Filter Element',categorySlug:'fuel-filters'},
  {partNumber:'6C060-99414',normalized:'6C06099414',name:'Outer Air Filter Element',categorySlug:'engine-air-filters'},
  {partNumber:'32721-58242',normalized:'3272158242',name:'Inner Air Filter Element',categorySlug:'engine-air-filters'},
  {partNumber:'HH660-36060',normalized:'HH66036060',name:'HST Oil Filter',categorySlug:'transmission-filters'},
  {partNumber:'HH670-37712',normalized:'HH67037712',name:'Hydraulic Oil Filter',categorySlug:'hydraulic-filters'},
];

const modelPartNumbers:Record<ModelSlug,string[]>={
  b2301:['HH15032094','6A32059930','6C06099414','3272158242','HH66036060','HH67037712'],
  b2601:['HH15032094','6A32059930','6C06099414','3272158242','HH66036060','HH67037712'],
  b2401dt:['HH15032094','6C06099414','3272158242'],
  b2401dtn:['HH15032094','6C06099414','3272158242'],
};

const versionSlugs:Record<ModelSlug,string>={
  b2301:'us-current-hst-4wd',
  b2601:'us-current-hst-4wd',
  b2401dt:'us-current-gear-4wd',
  b2401dtn:'us-current-gear-narrow-4wd',
};

const sources:Record<ModelSlug,{url:string;externalId:string;title:string}>={
  b2301:{url:'https://www.messicks.com/catalogs/kubota/b2301hsd-1',externalId:'messicks-kubota-b2301hsd-1-service-filters',title:'Kubota B2301HSD-1 parts catalog - service filter references'},
  b2601:{url:'https://www.messicks.com/catalogs/kubota/b2601hsd',externalId:'messicks-kubota-b2601hsd-service-filters',title:'Kubota B2601HSD parts catalog - service filter references'},
  b2401dt:{url:'https://www.messicks.com/catalogs/kubota/b2401dt',externalId:'messicks-kubota-b2401dt-service-filters',title:'Kubota B2401DT parts catalog - directly listed service filters'},
  b2401dtn:{url:'https://www.messicks.com/catalogs/kubota/b2401dtn',externalId:'messicks-kubota-b2401dtn-service-filters',title:'Kubota B2401DTN parts catalog - directly listed service filters'},
};

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota B01 service-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,source:{url:string;externalId:string;title:string}){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[source.externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId,source.url,source.externalId,source.title],
  );
  return Number(result.insertId);
}

async function upsertFitment(
  connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,partId:number,
  sourceRecordId:number,fitmentNote:string,configurationNote:string,
){
  const [existing]=await connection.query<IdRow[]>(
    `SELECT id FROM machine_parts
     WHERE machine_id=? AND machine_version_id=? AND part_id=?
       AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL
     ORDER BY id DESC LIMIT 1`,
    [machineId,versionId,partId],
  );
  if(existing[0]){
    await connection.query(
      `UPDATE machine_parts
       SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='high'
       WHERE id=?`,
      [fitmentNote,configurationNote,sourceRecordId,Number(existing[0].id)],
    );
  }else{
    await connection.query(
      `INSERT INTO machine_parts
        (machine_id,machine_version_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence)
       VALUES (?,?,?,?,?,?,'high')`,
      [machineId,versionId,partId,fitmentNote,configurationNote,sourceRecordId],
    );
  }
}

export const kubotaB01ServiceFiltersMigration:DbMigration={
  id:'20260827_177_kubota_b01_service_filters',
  description:'Add conservative version-aware Kubota B01 service-filter fitments from model-specific dealer catalogs, keeping HST-only filters off gear tractors',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);

    let [sourceRows]=await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`,
    );
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level)
         VALUES ('Messicks','messicks.com','supplier','secondary')`,
      );
      sourceId=Number(result.insertId);
    }

    const sourceRecordIds=new Map<ModelSlug,number>();
    for(const modelSlug of ['b2301','b2601','b2401dt','b2401dtn'] as const){
      sourceRecordIds.set(modelSlug,await ensureSourceRecord(connection,sourceId,sources[modelSlug]));
    }

    const partIds=new Map<string,number>();
    for(const part of parts){
      const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug=? LIMIT 1`,[part.categorySlug]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE
           category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),
           data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,categoryId,part.partNumber,part.normalized,part.name,
          'Kubota B01 service-filter reference supported by model-specific dealer catalog data. Confirm tractor serial number before ordering.'],
      );
      partIds.set(part.normalized,await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId,part.normalized],
      ));
    }

    for(const modelSlug of ['b2301','b2601','b2401dt','b2401dtn'] as const){
      const machineId=await selectId(connection,`
        SELECT m.id FROM machines m
        JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug=? LIMIT 1
      `,[modelSlug]);
      const versionId=await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId,versionSlugs[modelSlug]],
      );
      const sourceRecordId=sourceRecordIds.get(modelSlug);
      if(!sourceRecordId) throw new Error(`Missing ${modelSlug} B01 service-filter source.`);

      for(const normalized of modelPartNumbers[modelSlug]){
        const part=parts.find((candidate)=>candidate.normalized===normalized);
        const partId=partIds.get(normalized);
        if(!part||!partId) throw new Error(`Missing B01 service part ${normalized}`);
        const isHstOnly=normalized==='HH66036060';
        await upsertFitment(
          connection,machineId,versionId,partId,sourceRecordId,
          `${sources[modelSlug].title} supports ${part.partNumber} for this model/configuration. Confirm the tractor serial number before ordering.`,
          isHstOnly
            ? 'HST-only transmission filter; do not apply to B2401 gear-drive tractors'
            : `${modelSlug.toUpperCase()} current US service-filter reference`,
        );
      }
    }
  },
};
