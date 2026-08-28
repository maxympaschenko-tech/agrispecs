import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type VersionSeed={modelSlug:'m8-181'|'m8-201';versionSlug:'us-current-semi-powershift'|'us-current-kvt';catalogCode:string;url:string;isKvt:boolean};
type PartSeed={partNumber:string;normalized:string;name:string;categorySlug:string;kvtOnly?:boolean};

const versions:VersionSeed[]=[
  {modelSlug:'m8-181',versionSlug:'us-current-semi-powershift',catalogCode:'M8-181',url:'https://www.messicks.com/catalogs/kubota/m8-181',isKvt:false},
  {modelSlug:'m8-181',versionSlug:'us-current-kvt',catalogCode:'M8-181KVT',url:'https://www.messicks.com/catalogs/kubota/m8-181kvt',isKvt:true},
  {modelSlug:'m8-201',versionSlug:'us-current-semi-powershift',catalogCode:'M8-201',url:'https://www.messicks.com/catalogs/kubota/m8-201',isKvt:false},
  {modelSlug:'m8-201',versionSlug:'us-current-kvt',catalogCode:'M8-201KVT',url:'https://www.messicks.com/catalogs/kubota/m8-201kvt',isKvt:true},
];

const parts:PartSeed[]=[
  {partNumber:'LBT00-10184',normalized:'LBT0010184',name:'Hydraulic Return Filter Element',categorySlug:'hydraulic-filters'},
  {partNumber:'LBT00-10260',normalized:'LBT0010260',name:'Transmission Oil Filter',categorySlug:'transmission-filters'},
  {partNumber:'LBT00-13504',normalized:'LBT0013504',name:'Primary Engine Air Filter Element',categorySlug:'engine-air-filters'},
  {partNumber:'LBT00-10137',normalized:'LBT0010137',name:'Secondary Engine Air Filter Element',categorySlug:'engine-air-filters'},
  {partNumber:'LBT00-10216',normalized:'LBT0010216',name:'Engine Oil Filter - Cummins B6.7',categorySlug:'engine-oil-filters'},
  {partNumber:'LBT00-10165',normalized:'LBT0010165',name:'Hydraulic Oil Filter Element',categorySlug:'hydraulic-filters'},
  {partNumber:'LBT00-10218',normalized:'LBT0010218',name:'Fuel Filter / Water Separator Element',categorySlug:'fuel-water-separators'},
  {partNumber:'LBT00-10217',normalized:'LBT0010217',name:'Fuel Filter - Cummins B6.7',categorySlug:'fuel-filters'},
  {partNumber:'LBT00-11021',normalized:'LBT0011021',name:'KVT Suction Filter Kit',categorySlug:'transmission-filters',kvtOnly:true},
];

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M8 service-filter migration dependency.');
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

export const kubotaM8ServiceFiltersMigration:DbMigration={
  id:'20260828_209_kubota_m8_service_filters',
  description:'Add current M8-181/M8-201 Semi-Powershift and KVT model-specific Cummins, fuel, air, hydraulic and transmission service filters',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Transmission Filters','transmission-filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
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
        [manufacturerId,categoryId,part.partNumber,part.normalized,part.name,part.kvtOnly?'Kubota M8 KVT-specific service-filter reference from direct model catalog evidence; confirm serial/configuration before ordering.':'Kubota M8 service-filter reference from direct M8-181/M8-181KVT/M8-201/M8-201KVT dealer catalog evidence; confirm serial before ordering.'],
      );
      partIds.set(part.normalized,await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,part.normalized]));
    }

    for(const version of versions){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[version.modelSlug]);
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=1 LIMIT 1`,[machineId,version.versionSlug]);
      const sourceRecordId=await ensureSourceRecord(connection,sourceId,`messicks-${version.catalogCode.toLowerCase()}-m8-service-filters-2026-08`,version.url,`Messicks Kubota ${version.catalogCode} parts catalog - frequently used service filters`);
      for(const part of parts){
        if(part.kvtOnly&&!version.isKvt) continue;
        const partId=partIds.get(part.normalized);
        if(!partId) throw new Error(`Missing M8 service part ${part.partNumber}`);
        const configurationNote=part.kvtOnly
          ? `${version.catalogCode} KVT transmission-specific suction filter reference; confirm tractor serial/configuration before ordering.`
          : `${version.catalogCode} current service-filter reference; confirm tractor serial/configuration before ordering.`;
        await upsertFitment(connection,machineId,versionId,partId,sourceRecordId,`Messicks' ${version.catalogCode} catalog lists ${part.partNumber} among frequently purchased/service items for this exact model code. Confirm tractor serial before ordering.`,configurationNote);
      }
    }
  },
};