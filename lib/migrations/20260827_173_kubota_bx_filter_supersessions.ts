import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

type Replacement={
  oldNumber:string;
  oldNormalized:string;
  newNormalized:string;
  name:string;
  categorySlug:string;
  url:string;
  externalId:string;
  title:string;
};

const replacements:Replacement[]=[
  {
    oldNumber:'HH150-32430',oldNormalized:'HH15032430',newNormalized:'HH1J032430',name:'Legacy Engine Oil Filter',categorySlug:'engine-oil-filters',
    url:'https://www.messicks.com/parts/kubota/hh1j0-32430',externalId:'messicks-hh150-32430-replaced-by-hh1j0-32430',title:'Kubota HH150-32430 replaced by HH1J0-32430',
  },
  {
    oldNumber:'HHK20-36990',oldNormalized:'HHK2036990',newNormalized:'HHK2036994',name:'Legacy Transmission Oil Filter',categorySlug:'transmission-filters',
    url:'https://www.messicks.com/parts/kubota/hhk20-36994',externalId:'messicks-hhk20-36990-replaced-by-hhk20-36994',title:'Kubota HHK20-36990 replaced by HHK20-36994',
  },
  {
    oldNumber:'K2561-36990',oldNormalized:'K256136990',newNormalized:'HHK2036994',name:'Legacy Transmission Oil Filter',categorySlug:'transmission-filters',
    url:'https://www.messicks.com/parts/kubota/hhk20-36994',externalId:'messicks-k2561-36990-replaced-by-hhk20-36994',title:'Kubota K2561-36990 replaced by HHK20-36994',
  },
  {
    oldNumber:'HH150-32090',oldNormalized:'HH15032090',newNormalized:'HH15032094',name:'Legacy Engine Oil Filter',categorySlug:'engine-oil-filters',
    url:'https://www.messicks.com/parts/kubota/hh150-32094',externalId:'messicks-hh150-32090-replaced-by-hh150-32094',title:'Kubota HH150-32090 replaced by HH150-32094',
  },
  {
    oldNumber:'15241-32090',oldNormalized:'1524132090',newNormalized:'HH15032094',name:'Legacy Engine Oil Filter',categorySlug:'engine-oil-filters',
    url:'https://www.messicks.com/parts/kubota/hh150-32094',externalId:'messicks-15241-32090-replaced-by-hh150-32094',title:'Kubota 15241-32090 replaced by HH150-32094',
  },
];

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota BX filter-supersession dependency.');
  return Number(rows[0].id);
}

export const kubotaBXFilterSupersessionsMigration:DbMigration={
  id:'20260827_173_kubota_bx_filter_supersessions',
  description:'Add legacy-to-current Kubota BX engine and transmission filter replacement chains from dealer part records',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`);
      sourceId=Number(result.insertId);
    }

    for(const item of replacements){
      const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug=? LIMIT 1`,[item.categorySlug]);
      const currentPartId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,item.newNormalized]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,categoryId,item.oldNumber,item.oldNormalized,item.name,'Legacy Kubota filter number with a dealer-documented current replacement.'],
      );
      const oldPartId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,item.oldNormalized]);
      const [existingSource]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[item.externalId]);
      let sourceRecordId=existingSource[0]?.id?Number(existingSource[0].id):0;
      if(!sourceRecordId){
        const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,item.url,item.externalId,item.title]);
        sourceRecordId=Number(result.insertId);
      }
      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'replaces',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [oldPartId,currentPartId,sourceRecordId],
      );
    }
  },
};
