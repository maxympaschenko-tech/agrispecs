import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type Replacement={oldNumber:string;oldNormalized:string;currentNormalized:string;categorySlug:string;name:string;sourceUrl:string};

const replacements:Replacement[]=[
  {oldNumber:'HHK32-16772',oldNormalized:'HHK3216772',currentNormalized:'HHK3216774',categorySlug:'hydraulic-filters',name:'Legacy Hydraulic Oil Filter Cartridge',sourceUrl:'https://www.messicks.com/parts/kubota/hhk32-16774'},
  {oldNumber:'HH3A0-82630',oldNormalized:'HH3A082630',currentNormalized:'HHK3216774',categorySlug:'hydraulic-filters',name:'Legacy Hydraulic Filter',sourceUrl:'https://www.messicks.com/parts/kubota/hhk32-16774'},
  {oldNumber:'HHK32-16770',oldNormalized:'HHK3216770',currentNormalized:'HHK3216774',categorySlug:'hydraulic-filters',name:'Legacy Hydraulic Oil Suction Filter',sourceUrl:'https://www.messicks.com/parts/kubota/hhk32-16774'},
  {oldNumber:'3A431-82630',oldNormalized:'3A43182630',currentNormalized:'HHK3216774',categorySlug:'hydraulic-filters',name:'Legacy Hydraulic Filter',sourceUrl:'https://www.messicks.com/parts/kubota/hhk32-16774'},
  {oldNumber:'K3161-16770',oldNormalized:'K316116770',currentNormalized:'HHK3216774',categorySlug:'hydraulic-filters',name:'Legacy Hydraulic Filter',sourceUrl:'https://www.messicks.com/parts/kubota/hhk32-16774'},
  {oldNumber:'K7591-32050',oldNormalized:'K759132050',currentNormalized:'HHK3216774',categorySlug:'hydraulic-filters',name:'Legacy Hydraulic Filter',sourceUrl:'https://www.messicks.com/parts/kubota/hhk32-16774'},
  {oldNumber:'HHK70-14070',oldNormalized:'HHK7014070',currentNormalized:'HHK7014073',categorySlug:'transmission-filters',name:'Legacy HST Oil Filter Cartridge',sourceUrl:'https://www.messicks.com/parts/kubota/HHK70-14073'},
  {oldNumber:'K7561-14070',oldNormalized:'K756114070',currentNormalized:'HHK7014073',categorySlug:'transmission-filters',name:'Legacy HST Oil Filter Cartridge',sourceUrl:'https://www.messicks.com/parts/kubota/HHK70-14073'},
  {oldNumber:'K7561-14073',oldNormalized:'K756114073',currentNormalized:'HHK7014073',categorySlug:'transmission-filters',name:'Legacy HST Oil Filter Cartridge',sourceUrl:'https://www.messicks.com/parts/kubota/HHK70-14073'},
  {oldNumber:'16271-32090',oldNormalized:'1627132090',currentNormalized:'HH16032093',categorySlug:'engine-oil-filters',name:'Legacy Engine Oil Filter',sourceUrl:'https://www.messicks.com/parts/kubota/hh160-32093'},
  {oldNumber:'16271-32092',oldNormalized:'1627132092',currentNormalized:'HH16032093',categorySlug:'engine-oil-filters',name:'Legacy Engine Oil Filter',sourceUrl:'https://www.messicks.com/parts/kubota/hh160-32093'},
  {oldNumber:'16271-32093',oldNormalized:'1627132093',currentNormalized:'HH16032093',categorySlug:'engine-oil-filters',name:'Legacy Engine Oil Filter',sourceUrl:'https://www.messicks.com/parts/kubota/hh160-32093'},
  {oldNumber:'16271-32099',oldNormalized:'1627132099',currentNormalized:'HH16032093',categorySlug:'engine-oil-filters',name:'Legacy Engine Oil Filter',sourceUrl:'https://www.messicks.com/parts/kubota/hh160-32093'},
  {oldNumber:'HH160-32090',oldNormalized:'HH16032090',currentNormalized:'HH16032093',categorySlug:'engine-oil-filters',name:'Legacy Engine Oil Filter',sourceUrl:'https://www.messicks.com/parts/kubota/hh160-32093'},
];

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota LX20 filter-supersession dependency.');
  return Number(rows[0].id);
}

export const kubotaLX20FilterSupersessionsMigration:DbMigration={
  id:'20260828_184_kubota_lx20_filter_supersessions',
  description:'Add legacy Kubota LX20 hydraulic, HST and engine-oil filter numbers that supersede to current service parts',
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
      const currentPartId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,item.currentNormalized]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,categoryId,item.oldNumber,item.oldNormalized,item.name,`Legacy Kubota filter number. Dealer supersession reference identifies the current replacement part.`],
      );
      const oldPartId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,item.oldNormalized]);
      const externalId=`messicks-${item.oldNormalized.toLowerCase()}-to-${item.currentNormalized.toLowerCase()}`;
      const [existingSource]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
      let sourceRecordId=existingSource[0]?.id?Number(existingSource[0].id):0;
      if(!sourceRecordId){
        const [result]=await connection.query<ResultSetHeader>(
          `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
          [sourceId,item.sourceUrl,externalId,`Kubota ${item.oldNumber} replacement reference`],
        );
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
