import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type VersionRef={modelSlug:'m6-101'|'m6-111'|'m6-131'|'m6-141';versionSlug:string};
type PartSeed={partNumber:string;normalized:string;name:string;categorySlug:string;description:string};

const allVersions:VersionRef[]=[
  {modelSlug:'m6-101',versionSlug:'us-current-dtc-f-cab-4wd'},
  {modelSlug:'m6-111',versionSlug:'us-current-dtc-f-cab-4wd'},
  {modelSlug:'m6-131',versionSlug:'us-current-dtc-f-cab-4wd'},
  {modelSlug:'m6-141',versionSlug:'us-current-dtc-f-cab-4wd'},
  {modelSlug:'m6-141',versionSlug:'us-current-dtsc-f-suspended-cab-4wd'},
];
const smallEngineVersions=allVersions.filter((v)=>v.modelSlug==='m6-101'||v.modelSlug==='m6-111');
const largeEngineVersions=allVersions.filter((v)=>v.modelSlug==='m6-131'||v.modelSlug==='m6-141');

const parts:PartSeed[]=[
  {partNumber:'HH3S0-82590',normalized:'HH3S082590',name:'Hydraulic / Transmission Filter',categorySlug:'hydraulic-filters',description:'Kubota hydraulic/transmission filter cartridge. Current M6 -1 fitment is supported by the dealer model-fitment catalog.'},
  {partNumber:'6A671-75090',normalized:'6A67175090',name:'Cabin Air Recirculation Filter',categorySlug:'cabin-air-filters',description:'Kubota cab HVAC recirculation filter. Exact M6 fitment is stored per current tractor version.'},
  {partNumber:'T1855-71600',normalized:'T185571600',name:'Cab Air Filter',categorySlug:'cabin-air-filters',description:'Kubota cab fresh-air filter. Exact M6 fitment is stored per current tractor version.'},
  {partNumber:'HH1C0-32430',normalized:'HH1C032430',name:'Engine Oil Filter',categorySlug:'engine-oil-filters',description:'Kubota engine oil filter used on the current V3800-powered M6-101/M6-111 revision.'},
  {partNumber:'59700-26112',normalized:'5970026112',name:'Outer Air Cleaner Element',categorySlug:'engine-air-filters',description:'Kubota outer air-cleaner element used on the current V3800-powered M6-101/M6-111 revision.'},
  {partNumber:'1G311-43380',normalized:'1G31143380',name:'Fuel Filter Separator Element',categorySlug:'fuel-water-separators',description:'Kubota fuel/water-separator element used on the current V6108-powered M6-131/M6-141 revision.'},
  {partNumber:'HH1J0-43172',normalized:'HH1J043172',name:'Fuel Filter Cartridge',categorySlug:'fuel-filters',description:'Kubota fuel-filter cartridge used on the current V6108-powered M6-131/M6-141 revision.'},
];

const SOURCE_101='https://www.messicks.com/catalogs/kubota/m6-101dtc-1/fuel-system/a16100-separator-component-parts';
const SOURCE_111='https://www.messicks.com/catalogs/kubota/m6-111dtc-1/clutch-transmission/d26700-pto-clutch-component-parts';
const SOURCE_131='https://www.messicks.com/catalogs/kubota/m6-131dtc-1/fuel-system/a14100-fuel-pipe-fuel-filter';
const SOURCE_141='https://www.messicks.com/catalogs/kubota/m6-141dtc-1-dtsc-1/front-rear-tire/r12001-rear-wheel-18-4r38';
const SOURCE_HYD='https://www.messicks.com/parts/kubota/HH3S0-82590';
const SOURCE_FUEL='https://www.messicks.com/parts/kubota/HH1J0-43172';

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M6 service-filter migration dependency.');
  return Number(rows[0].id);
}
async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,url:string,externalId:string,title:string){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,url,externalId,title]);
  return Number(result.insertId);
}
async function upsertFitment(connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,partId:number,sourceRecordId:number,partNumber:string,note:string){
  const [existing]=await connection.query<IdRow[]>(
    `SELECT id FROM machine_parts WHERE machine_id=? AND machine_version_id=? AND part_id=? AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL ORDER BY id DESC LIMIT 1`,
    [machineId,versionId,partId],
  );
  if(existing[0]){
    await connection.query(`UPDATE machine_parts SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='high' WHERE id=?`,[note,'Current M6 -1 version-specific dealer-catalog service reference',sourceRecordId,Number(existing[0].id)]);
  }else{
    await connection.query(`INSERT INTO machine_parts (machine_id,machine_version_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence) VALUES (?,?,?,?,?,?,'high')`,[machineId,versionId,partId,note,'Current M6 -1 version-specific dealer-catalog service reference',sourceRecordId]);
  }
}

export const kubotaM6ServiceFiltersMigration:DbMigration={
  id:'20260828_199_kubota_m6_service_filters',
  description:'Add conservative version-specific service-filter fitments for current Kubota M6-101-1, M6-111-1, M6-131-1 and M6-141-1 tractors',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Cabin Air Filters','cabin-air-filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Fuel / Water Separators','fuel-water-separators') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`);sourceId=Number(result.insertId);}

    const modelSources=new Map<string,number>();
    modelSources.set('m6-101',await ensureSourceRecord(connection,sourceId,SOURCE_101,'messicks-m6-101dtc-1-service-filters-2026-08','Kubota M6-101DTC-1 parts catalog - current service filter references'));
    modelSources.set('m6-111',await ensureSourceRecord(connection,sourceId,SOURCE_111,'messicks-m6-111dtc-1-service-filters-2026-08','Kubota M6-111DTC-1 parts catalog - current service filter references'));
    modelSources.set('m6-131',await ensureSourceRecord(connection,sourceId,SOURCE_131,'messicks-m6-131dtc-1-service-filters-2026-08','Kubota M6-131DTC-1 parts catalog - current service filter references'));
    modelSources.set('m6-141',await ensureSourceRecord(connection,sourceId,SOURCE_141,'messicks-m6-141dtc-1-dtsc-1-service-filters-2026-08','Kubota M6-141DTC-1/DTSC-1 parts catalog - current service filter references'));
    const hydraulicSourceId=await ensureSourceRecord(connection,sourceId,SOURCE_HYD,'messicks-hh3s0-82590-m6-current-fitment','Kubota HH3S0-82590 - current M6-101/111/131/141 model fitment');
    const fuelSourceId=await ensureSourceRecord(connection,sourceId,SOURCE_FUEL,'messicks-hh1j0-43172-m6-current-fitment','Kubota HH1J0-43172 - current M6-131/M6-141 model fitment');

    const partIds=new Map<string,number>();
    for(const part of parts){
      const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug=? LIMIT 1`,[part.categorySlug]);
      await connection.query(`INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status) VALUES (?,?,?,?,?,?,'partial') ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),data_status=IF(data_status='verified','verified','partial')`,[manufacturerId,categoryId,part.partNumber,part.normalized,part.name,part.description]);
      partIds.set(part.normalized,await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,part.normalized]));
    }

    for(const ref of allVersions){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[ref.modelSlug]);
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,ref.versionSlug]);
      const modelSourceId=modelSources.get(ref.modelSlug);
      if(!modelSourceId) throw new Error(`Missing M6 source ${ref.modelSlug}`);
      for(const normalized of ['6A67175090','T185571600']){
        const part=parts.find((p)=>p.normalized===normalized)!; const partId=partIds.get(normalized)!;
        await upsertFitment(connection,machineId,versionId,partId,modelSourceId,part.partNumber,`Model-specific dealer catalog lists ${part.partNumber} for ${ref.modelSlug.toUpperCase()} current -1 cab configuration. Confirm tractor serial before ordering.`);
      }
      const hydraulicPart=parts.find((p)=>p.normalized==='HH3S082590')!;
      await upsertFitment(connection,machineId,versionId,partIds.get(hydraulicPart.normalized)!,hydraulicSourceId,hydraulicPart.partNumber,`Dealer part-fitment catalog explicitly lists ${hydraulicPart.partNumber} for the current M6-101DTC-1, M6-111DTC-1, M6-131DTC-1 and M6-141DTC-1/DTSC-1 families. Confirm serial before ordering.`);
    }

    for(const ref of smallEngineVersions){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[ref.modelSlug]);
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,ref.versionSlug]);
      const modelSourceId=modelSources.get(ref.modelSlug)!;
      for(const normalized of ['HH1C032430','5970026112']){
        const part=parts.find((p)=>p.normalized===normalized)!;
        await upsertFitment(connection,machineId,versionId,partIds.get(normalized)!,modelSourceId,part.partNumber,`Current ${ref.modelSlug.toUpperCase()}-1 model catalog lists ${part.partNumber}. This fitment is not generalized to the V6108 M6-131/M6-141 engine family.`);
      }
    }

    for(const ref of largeEngineVersions){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[ref.modelSlug]);
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,ref.versionSlug]);
      const modelSourceId=modelSources.get(ref.modelSlug)!;
      const separator=parts.find((p)=>p.normalized==='1G31143380')!;
      await upsertFitment(connection,machineId,versionId,partIds.get(separator.normalized)!,modelSourceId,separator.partNumber,`Current ${ref.modelSlug.toUpperCase()}-1 model catalog lists ${separator.partNumber} fuel/water-separator element. Confirm serial before ordering.`);
      const fuel=parts.find((p)=>p.normalized==='HH1J043172')!;
      await upsertFitment(connection,machineId,versionId,partIds.get(fuel.normalized)!,fuelSourceId,fuel.partNumber,`Dealer part-fitment catalog explicitly lists ${fuel.partNumber} for current M6-131DTC-1 and M6-141DTC-1/DTSC-1. Confirm serial before ordering.`);
    }
  },
};
