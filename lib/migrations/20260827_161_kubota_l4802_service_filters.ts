import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id:number };
type VersionSlug='us-current-gear-2wd'|'us-current-gear-4wd'|'us-current-hst-4wd';

type FilterSeed={
  categoryName:string;
  categorySlug:string;
  partNumber:string;
  normalizedPartNumber:string;
  name:string;
  description:string;
  url:string;
  externalId:string;
  sourceTitle:string;
};

const versions:VersionSlug[]=['us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd'];

const filters:FilterSeed[]=[
  {
    categoryName:'Engine Oil Filters',categorySlug:'engine-oil-filters',partNumber:'HH164-32430',normalizedPartNumber:'HH16432430',name:'Engine Oil Filter',
    description:'Kubota engine oil filter listed in the L4802 parts catalog.',
    url:'https://www.messicks.com/catalogs/kubota/l4802dt/accessories-and-service-parts/s10500-accessories-and-service-parts',
    externalId:'messicks-kubota-l4802-hh164-32430-engine-oil-filter',sourceTitle:'Kubota L4802 parts catalog - HH164-32430 engine oil filter',
  },
  {
    categoryName:'Fuel Filters',categorySlug:'fuel-filters',partNumber:'HH1J1-43172',normalizedPartNumber:'HH1J143172',name:'Fuel Filter Cartridge',
    description:'Current Kubota fuel filter cartridge listed in the L4802 parts catalog.',
    url:'https://www.messicks.com/catalogs/kubota/l4802dt/accessories-and-service-parts/s10500-accessories-and-service-parts',
    externalId:'messicks-kubota-l4802-hh1j1-43172-fuel-filter',sourceTitle:'Kubota L4802 parts catalog - HH1J1-43172 fuel filter cartridge',
  },
  {
    categoryName:'Fuel Filters',categorySlug:'fuel-filters',partNumber:'6C830-55220',normalizedPartNumber:'6C83055220',name:'Fuel/Water Separator Element',
    description:'Fuel/water separator element listed for L4802F, L4802DT and L4802HST.',
    url:'https://www.messicks.com/parts/kubota/6c830-55220',
    externalId:'messicks-kubota-6c830-55220-l4802-fitment',sourceTitle:'Kubota 6C830-55220 separator element - L4802 model fitment',
  },
  {
    categoryName:'Engine Air Filters',categorySlug:'engine-air-filters',partNumber:'TE112-42280',normalizedPartNumber:'TE11242280',name:'Outer Air Filter Element',
    description:'Primary outer air-cleaner element listed for L4802F, L4802DT and L4802HST.',
    url:'https://www.messicks.com/parts/kubota/te112-42280',
    externalId:'messicks-kubota-te112-42280-l4802-fitment',sourceTitle:'Kubota TE112-42280 outer air filter - L4802 model fitment',
  },
  {
    categoryName:'Engine Air Filters',categorySlug:'engine-air-filters',partNumber:'TE112-16370',normalizedPartNumber:'TE11216370',name:'Inner Safety Air Filter',
    description:'Inner safety air-filter element listed for L4802F, L4802DT and L4802HST.',
    url:'https://www.messicks.com/parts/kubota/te112-16370',
    externalId:'messicks-kubota-te112-16370-l4802-fitment',sourceTitle:'Kubota TE112-16370 inner safety air filter - L4802 model fitment',
  },
  {
    categoryName:'Hydraulic Filters',categorySlug:'hydraulic-filters',partNumber:'W9501-45101',normalizedPartNumber:'W950145101',name:'Hydraulic Oil Filter',
    description:'Current hydraulic oil filter cartridge listed for L4802F, L4802DT and L4802HST.',
    url:'https://www.messicks.com/parts/kubota/w9501-45101',
    externalId:'messicks-kubota-w9501-45101-l4802-fitment',sourceTitle:'Kubota W9501-45101 hydraulic oil filter - L4802 model fitment',
  },
];

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota L4802 service-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,filter:FilterSeed){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[filter.externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,filter.url,filter.externalId,filter.sourceTitle]);
  return Number(result.insertId);
}

async function upsertVersionFitment(connection:Parameters<DbMigration['apply']>[0],machineId:number,machineVersionId:number,partId:number,sourceRecordId:number,fitmentNote:string,configurationNote:string){
  const [existing]=await connection.query<IdRow[]>(
    `SELECT id FROM machine_parts WHERE machine_id=? AND machine_version_id=? AND part_id=? AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL ORDER BY id DESC LIMIT 1`,
    [machineId,machineVersionId,partId],
  );
  if(existing[0]){
    await connection.query(`UPDATE machine_parts SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='high' WHERE id=?`,[fitmentNote,configurationNote,sourceRecordId,Number(existing[0].id)]);
  }else{
    await connection.query(
      `INSERT INTO machine_parts (machine_id,machine_version_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence) VALUES (?,?,?,?,?,?,'high')`,
      [machineId,machineVersionId,partId,fitmentNote,configurationNote,sourceRecordId],
    );
  }
}

export const kubotaL4802ServiceFiltersMigration:DbMigration={
  id:'20260827_161_kubota_l4802_service_filters',
  description:'Add configuration-aware Kubota L4802 service-filter fitments from model-specific dealer parts references',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='l4802' LIMIT 1`);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`);
      sourceId=Number(result.insertId);
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
      const partId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,filter.normalizedPartNumber]);
      const sourceRecordId=await ensureSourceRecord(connection,sourceId,filter);

      for(const versionSlug of versions){
        const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,versionSlug]);
        await upsertVersionFitment(
          connection,machineId,versionId,partId,sourceRecordId,
          `Messicks' Kubota catalog lists ${filter.partNumber} for L4802 model applications including this transmission/driveline family. Confirm exact tractor serial number before ordering.`,
          `L4802 ${versionSlug==='us-current-hst-4wd'?'HST 4WD':versionSlug==='us-current-gear-4wd'?'gear-drive 4WD':'gear-drive 2WD'} service-filter reference`,
        );
      }
    }
  },
};
