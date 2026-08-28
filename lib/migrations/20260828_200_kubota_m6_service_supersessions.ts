import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type Replacement={oldNumber:string;oldNormalized:string;currentNormalized:string;categorySlug:string;name:string;sourceUrl:string;sourceKey:string};

const replacements:Replacement[]=[
  {oldNumber:'3Y205-82590',oldNormalized:'3Y20582590',currentNormalized:'HH3S082590',categorySlug:'hydraulic-filters',name:'Legacy Hydraulic / Transmission Filter',sourceUrl:'https://www.messicks.com/parts/kubota/HH3S0-82590',sourceKey:'hh3s0-82590'},
  {oldNumber:'HH3Y0-82590',oldNormalized:'HH3Y082590',currentNormalized:'HH3S082590',categorySlug:'hydraulic-filters',name:'Legacy Hydraulic / Transmission Filter',sourceUrl:'https://www.messicks.com/parts/kubota/HH3S0-82590',sourceKey:'hh3s0-82590'},
  {oldNumber:'1J521-43170',oldNormalized:'1J52143170',currentNormalized:'HH1J043172',categorySlug:'fuel-filters',name:'Legacy Fuel Filter Cartridge',sourceUrl:'https://www.messicks.com/parts/kubota/HH1J0-43172',sourceKey:'hh1j0-43172'},
  {oldNumber:'1J521-43172',oldNormalized:'1J52143172',currentNormalized:'HH1J043172',categorySlug:'fuel-filters',name:'Legacy Fuel Filter Cartridge',sourceUrl:'https://www.messicks.com/parts/kubota/HH1J0-43172',sourceKey:'hh1j0-43172'},
  {oldNumber:'HH1J0-43170',oldNormalized:'HH1J043170',currentNormalized:'HH1J043172',categorySlug:'fuel-filters',name:'Legacy Fuel Filter Cartridge',sourceUrl:'https://www.messicks.com/parts/kubota/HH1J0-43172',sourceKey:'hh1j0-43172'},
  {oldNumber:'15831-43380',oldNormalized:'1583143380',currentNormalized:'1G31143380',categorySlug:'fuel-water-separators',name:'Legacy Fuel Separator Element',sourceUrl:'https://www.messicks.com/parts/kubota/1G311-43380',sourceKey:'1g311-43380'},
  {oldNumber:'15831-43382',oldNormalized:'1583143382',currentNormalized:'1G31143380',categorySlug:'fuel-water-separators',name:'Legacy Fuel Separator Element',sourceUrl:'https://www.messicks.com/parts/kubota/1G311-43380',sourceKey:'1g311-43380'},
];

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M6 supersession migration dependency.');
  return Number(rows[0].id);
}

export const kubotaM6ServiceSupersessionsMigration:DbMigration={
  id:'20260828_200_kubota_m6_service_supersessions',
  description:'Add dealer-confirmed legacy Kubota M6 hydraulic, fuel-filter and fuel-separator replacement relations',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`);
      sourceId=Number(result.insertId);
    }

    const sourceRecordIds=new Map<string,number>();
    for(const source of [
      {key:'hh3s0-82590',url:'https://www.messicks.com/parts/kubota/HH3S0-82590',title:'Kubota HH3S0-82590 hydraulic filter - legacy replacement numbers'},
      {key:'hh1j0-43172',url:'https://www.messicks.com/parts/kubota/HH1J0-43172',title:'Kubota HH1J0-43172 fuel filter - legacy replacement numbers'},
      {key:'1g311-43380',url:'https://www.messicks.com/parts/kubota/1G311-43380',title:'Kubota 1G311-43380 fuel separator - legacy replacement numbers'},
    ]){
      const externalId=`messicks-kubota-${source.key}-m6-supersessions`;
      const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
      let sourceRecordId=existing[0]?.id?Number(existing[0].id):0;
      if(!sourceRecordId){
        const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,source.url,externalId,source.title]);
        sourceRecordId=Number(result.insertId);
      }
      sourceRecordIds.set(source.key,sourceRecordId);
    }

    // Create every legacy part before connecting the graph so this stays order-independent.
    for(const item of replacements){
      const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug=? LIMIT 1`,[item.categorySlug]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,categoryId,item.oldNumber,item.oldNormalized,item.name,'Legacy Kubota service-filter number retained for replacement lookup. Dealer catalog identifies a newer current replacement.'],
      );
    }

    for(const item of replacements){
      const oldPartId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,item.oldNormalized]);
      const currentPartId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,item.currentNormalized]);
      const sourceRecordId=sourceRecordIds.get(item.sourceKey);
      if(!sourceRecordId) throw new Error(`Missing M6 supersession source for ${item.oldNumber}`);
      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'replaces',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [oldPartId,currentPartId,sourceRecordId],
      );
    }
  },
};
