import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type VersionRef={slug:string;isCab:boolean};
type PartSeed={partNumber:string;normalized:string;name:string;categorySlug:string;description:string};

const versions:VersionRef[]=[
  {slug:'us-current-shf-2wd-open',isCab:false},
  {slug:'us-current-shc-2wd-cab',isCab:true},
  {slug:'us-current-shd-4wd-open',isCab:false},
  {slug:'us-current-shdc-4wd-cab',isCab:true},
  {slug:'us-current-sds2-4wd-open',isCab:false},
  {slug:'us-current-sdsc-4wd-cab',isCab:true},
];

const coreParts:PartSeed[]=[
  {partNumber:'HH1C0-32430',normalized:'HH1C032430',name:'Engine Oil Filter',categorySlug:'engine-oil-filters',description:'Kubota engine oil filter with direct dealer fitment listings for current M6S-111 SHF/SHC/SHD/SHDC/SDS2/SDSC configurations.'},
  {partNumber:'59700-26112',normalized:'5970026112',name:'Outer Air Cleaner Element',categorySlug:'engine-air-filters',description:'Kubota outer air-cleaner element with direct dealer fitment listings for current M6S-111 configurations.'},
  {partNumber:'HHTA0-37710',normalized:'HHTA037710',name:'Hydraulic Oil Filter',categorySlug:'hydraulic-filters',description:'Kubota hydraulic oil filter with direct dealer fitment listings for current M6S-111 configurations.'},
];
const cabPart:PartSeed={partNumber:'T1855-71600',normalized:'T185571600',name:'Cab Air Filter',categorySlug:'cabin-air-filters',description:'Kubota cab air-conditioning/fresh-air filter with direct dealer fitment listings for M6S-111 SHC, SHDC and SDSC cab configurations.'};

const OIL_URL='https://www.binghamequipment.com/products/parts/maintenance-items/filters/kubota/kubota-hh1c0-32430-oil-cartridge-filter';
const AIR_URL='https://www.colemanequip.com/parts/details/KubotaParts/Kubota-Air-Filter---Outer/59700-26112/';
const HYD_URL='https://parts.mbtractor.com/item/HHTA0-37710/';
const CAB_URL='https://www.binghamequipment.com/products/parts/maintenance-items/filters/kubota/kubota-t1855-71600-cab-filter-air';

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M6S service-filter migration dependency.');
  return Number(rows[0].id);
}
async function ensureSource(connection:Parameters<DbMigration['apply']>[0],name:string,domain:string){
  const [rows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name=? AND domain=? ORDER BY id LIMIT 1`,[name,domain]);
  if(rows[0]) return Number(rows[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?,?,'supplier','primary')`,[name,domain]);
  return Number(result.insertId);
}
async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,url:string,externalId:string,title:string){
  const [rows]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
  if(rows[0]) return Number(rows[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,url,externalId,title]);
  return Number(result.insertId);
}
async function upsertFitment(connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,partId:number,sourceRecordId:number,partNumber:string,versionSlug:string){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM machine_parts WHERE machine_id=? AND machine_version_id=? AND part_id=? AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL ORDER BY id DESC LIMIT 1`,[machineId,versionId,partId]);
  const fitmentNote=`Dealer model-fitment catalog explicitly lists ${partNumber} for the M6S-111 configuration family represented by ${versionSlug}. Confirm tractor serial before ordering.`;
  if(existing[0]) await connection.query(`UPDATE machine_parts SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='high' WHERE id=?`,[fitmentNote,'Current M6S-111 version-specific dealer fitment reference',sourceRecordId,Number(existing[0].id)]);
  else await connection.query(`INSERT INTO machine_parts (machine_id,machine_version_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence) VALUES (?,?,?,?,?,?,'high')`,[machineId,versionId,partId,fitmentNote,'Current M6S-111 version-specific dealer fitment reference',sourceRecordId]);
}

export const kubotaM6SServiceFiltersMigration:DbMigration={
  id:'20260828_203_kubota_m6s_service_filters',
  description:'Add direct dealer-fitment engine-oil, outer-air, hydraulic and cab-air filters for current Kubota M6S-111 configurations',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='m6s-111' LIMIT 1`);
    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Cabin Air Filters','cabin-air-filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    const binghamId=await ensureSource(connection,'Bingham Equipment Company','binghamequipment.com');
    const colemanId=await ensureSource(connection,'Coleman Equipment','colemanequip.com');
    const mbTractorId=await ensureSource(connection,'Kubota Parts Depot at MB Tractor','parts.mbtractor.com');
    const oilSourceId=await ensureSourceRecord(connection,binghamId,OIL_URL,'bingham-hh1c0-32430-m6s-fitment','Kubota HH1C0-32430 - M6S-111 model fitment');
    const airSourceId=await ensureSourceRecord(connection,colemanId,AIR_URL,'coleman-59700-26112-m6s-fitment','Kubota 59700-26112 outer air filter - M6S-111 model fitment');
    const hydSourceId=await ensureSourceRecord(connection,mbTractorId,HYD_URL,'mbtractor-hhta0-37710-m6s-fitment','Kubota HHTA0-37710 hydraulic filter - M6S-111 model fitment');
    const cabSourceId=await ensureSourceRecord(connection,binghamId,CAB_URL,'bingham-t1855-71600-m6s-cab-fitment','Kubota T1855-71600 cab air filter - M6S-111 cab model fitment');

    const sourceByPart=new Map<string,number>([['HH1C032430',oilSourceId],['5970026112',airSourceId],['HHTA037710',hydSourceId],['T185571600',cabSourceId]]);
    const partIds=new Map<string,number>();
    for(const part of [...coreParts,cabPart]){
      const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug=? LIMIT 1`,[part.categorySlug]);
      await connection.query(`INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status) VALUES (?,?,?,?,?,?,'partial') ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),data_status=IF(data_status='verified','verified','partial')`,[manufacturerId,categoryId,part.partNumber,part.normalized,part.name,part.description]);
      partIds.set(part.normalized,await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,part.normalized]));
    }

    for(const version of versions){
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,version.slug]);
      for(const part of coreParts){
        await upsertFitment(connection,machineId,versionId,partIds.get(part.normalized)!,sourceByPart.get(part.normalized)!,part.partNumber,version.slug);
      }
      if(version.isCab) await upsertFitment(connection,machineId,versionId,partIds.get(cabPart.normalized)!,cabSourceId,cabPart.partNumber,version.slug);
    }
  },
};
