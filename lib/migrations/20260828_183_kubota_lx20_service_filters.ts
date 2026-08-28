import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type MachineSlug='lx2620'|'lx3520'|'lx4020';

type SourceSeed={machine:MachineSlug;versionSlug:string;url:string;externalId:string;title:string};
type PartSeed={partNumber:string;normalized:string;name:string;categorySlug:string;group:'lx2620'|'lx35-40';hstOnly?:boolean};

const sources:SourceSeed[]=[
  {machine:'lx2620',versionSlug:'us-current-hsd-rops',url:'https://www.messicks.com/catalogs/kubota/lx2620hsd',externalId:'messicks-lx2620hsd-service-filters-2026-08',title:'Kubota LX2620HSD parts catalog - service filter references'},
  {machine:'lx2620',versionSlug:'us-current-hsdc-cab',url:'https://www.messicks.com/catalogs/kubota/lx2620hsdc',externalId:'messicks-lx2620hsdc-service-filters-2026-08',title:'Kubota LX2620HSDC parts catalog - service filter references'},
  {machine:'lx2620',versionSlug:'us-current-suhsd-rops',url:'https://www.messicks.com/catalogs/kubota/lx2620suhsd',externalId:'messicks-lx2620suhsd-service-filters-2026-08',title:'Kubota LX2620SUHSD parts catalog - service filter references'},
  {machine:'lx3520',versionSlug:'us-current-dtn-narrow',url:'https://www.messicks.com/catalogs/kubota/lx3520dtn',externalId:'messicks-lx3520dtn-service-filters-2026-08',title:'Kubota LX3520DTN parts catalog - service filter references'},
  {machine:'lx3520',versionSlug:'us-current-hsd-rops',url:'https://www.messicks.com/catalogs/kubota/lx3520hsd',externalId:'messicks-lx3520hsd-service-filters-2026-08',title:'Kubota LX3520HSD parts catalog - service filter references'},
  {machine:'lx3520',versionSlug:'us-current-hsdc-cab',url:'https://www.messicks.com/catalogs/kubota/lx3520hsdc',externalId:'messicks-lx3520hsdc-service-filters-2026-08',title:'Kubota LX3520HSDC parts catalog - service filter references'},
  {machine:'lx3520',versionSlug:'us-current-suhsdc-cab',url:'https://www.messicks.com/catalogs/kubota/lx3520suhsdc',externalId:'messicks-lx3520suhsdc-service-filters-2026-08',title:'Kubota LX3520SUHSDC parts catalog - service filter references'},
  {machine:'lx4020',versionSlug:'us-current-hsd-rops',url:'https://www.messicks.com/catalogs/kubota/lx4020hsd',externalId:'messicks-lx4020hsd-service-filters-2026-08',title:'Kubota LX4020HSD parts catalog - service filter references'},
  {machine:'lx4020',versionSlug:'us-current-hsdc-cab',url:'https://www.messicks.com/catalogs/kubota/lx4020hsdc',externalId:'messicks-lx4020hsdc-service-filters-2026-08',title:'Kubota LX4020HSDC parts catalog - service filter references'},
];

const parts:PartSeed[]=[
  {partNumber:'HH150-32094',normalized:'HH15032094',name:'Engine Oil Filter',categorySlug:'engine-oil-filters',group:'lx2620'},
  {partNumber:'6A320-59930',normalized:'6A32059930',name:'Fuel Filter Element',categorySlug:'fuel-filters',group:'lx2620'},
  {partNumber:'6C060-99414',normalized:'6C06099414',name:'Outer Air Filter Element',categorySlug:'engine-air-filters',group:'lx2620'},
  {partNumber:'32721-58242',normalized:'3272158242',name:'Inner Safety Air Filter Element',categorySlug:'engine-air-filters',group:'lx2620'},
  {partNumber:'HHK70-14073',normalized:'HHK7014073',name:'HST / Transmission Oil Filter Cartridge',categorySlug:'transmission-filters',group:'lx2620'},
  {partNumber:'HH160-32093',normalized:'HH16032093',name:'Engine Oil Filter',categorySlug:'engine-oil-filters',group:'lx35-40'},
  {partNumber:'R1401-42270',normalized:'R140142270',name:'Outer Air Filter Element',categorySlug:'engine-air-filters',group:'lx35-40'},
  {partNumber:'R2401-42280',normalized:'R240142280',name:'Inner Air Filter Element',categorySlug:'engine-air-filters',group:'lx35-40'},
  {partNumber:'6C830-55120',normalized:'6C83055120',name:'Fuel Filter Element',categorySlug:'fuel-filters',group:'lx35-40'},
  {partNumber:'6C830-55220',normalized:'6C83055220',name:'Water Separator Element',categorySlug:'fuel-filters',group:'lx35-40'},
  {partNumber:'HH660-36060',normalized:'HH66036060',name:'Hydrostatic Transmission Oil Filter',categorySlug:'transmission-filters',group:'lx35-40',hstOnly:true},
  {partNumber:'HHK32-16774',normalized:'HHK3216774',name:'Hydraulic Oil Filter Cartridge',categorySlug:'hydraulic-filters',group:'lx35-40'},
];

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota LX20 service-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,seed:SourceSeed){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[seed.externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,seed.url,seed.externalId,seed.title]);
  return Number(result.insertId);
}

async function upsertFitment(connection:Parameters<DbMigration['apply']>[0],machineId:number,versionId:number,partId:number,sourceRecordId:number,note:string){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM machine_parts WHERE machine_id=? AND machine_version_id=? AND part_id=? AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL ORDER BY id DESC LIMIT 1`,[machineId,versionId,partId]);
  if(existing[0]){
    await connection.query(`UPDATE machine_parts SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='high' WHERE id=?`,[note,'Current US LX20 configuration-specific service reference; confirm tractor serial number before ordering.',sourceRecordId,Number(existing[0].id)]);
  }else{
    await connection.query(`INSERT INTO machine_parts (machine_id,machine_version_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence) VALUES (?,?,?,?,?,?,'high')`,[machineId,versionId,partId,note,'Current US LX20 configuration-specific service reference; confirm tractor serial number before ordering.',sourceRecordId]);
  }
}

export const kubotaLX20ServiceFiltersMigration:DbMigration={
  id:'20260828_183_kubota_lx20_service_filters',
  description:'Add version-aware Kubota LX20 engine, fuel, air, HST and hydraulic service-filter fitments from model-specific dealer catalogs',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
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
        [manufacturerId,categoryId,part.partNumber,part.normalized,part.name,'Kubota LX20 service filter supported by model-specific dealer catalog evidence. Confirm serial number and configuration before ordering.'],
      );
      partIds.set(part.normalized,await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,part.normalized]));
    }

    for(const seed of sources){
      const sourceRecordId=await ensureSourceRecord(connection,sourceId,seed);
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[seed.machine]);
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,seed.versionSlug]);
      const group=seed.machine==='lx2620'?'lx2620':'lx35-40';
      const isHst=!seed.versionSlug.includes('dtn-narrow');

      for(const part of parts.filter((item)=>item.group===group && (!item.hstOnly||isHst))){
        const partId=partIds.get(part.normalized);
        if(!partId) throw new Error(`Missing LX20 service part ${part.partNumber}`);
        const hydraulicDerived=part.normalized==='HHK3216774';
        await upsertFitment(
          connection,machineId,versionId,partId,sourceRecordId,
          hydraulicDerived
            ? `${seed.title} lists predecessor HHK32-16772 for this configuration; the dealer supersession record maps it to current HHK32-16774. Confirm serial number before ordering.`
            : `${seed.title} supports ${part.partNumber} for this configuration. Confirm exact tractor serial number before ordering.`,
        );
      }
    }
  },
};
