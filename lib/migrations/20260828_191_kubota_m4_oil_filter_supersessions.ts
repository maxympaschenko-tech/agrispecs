import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const CURRENT_NORMALIZED='HH1C032430';
const SOURCE_URL='https://www.messicks.com/parts/kubota/HH1C0-32430';
const replacements=[
  {partNumber:'1C010-32430',normalized:'1C01032430'},
  {partNumber:'1C020-32430',normalized:'1C02032430'},
  {partNumber:'1C020-32434',normalized:'1C02032434'},
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M4 oil-filter supersession dependency.');
  return Number(rows[0].id);
}

export const kubotaM4OilFilterSupersessionsMigration:DbMigration={
  id:'20260828_191_kubota_m4_oil_filter_supersessions',
  description:'Add legacy Kubota engine-oil filter numbers replaced by current HH1C0-32430',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug='engine-oil-filters' LIMIT 1`);
    const currentPartId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,CURRENT_NORMALIZED]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`);
      sourceId=Number(result.insertId);
    }

    for(const item of replacements){
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,categoryId,item.partNumber,item.normalized,'Legacy Engine Oil Filter',`Legacy Kubota engine-oil filter number. Dealer catalog identifies HH1C0-32430 as the current replacement.`],
      );
      const oldPartId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,item.normalized]);
      const externalId=`messicks-${item.normalized.toLowerCase()}-to-hh1c032430`;
      const [existingSource]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
      let sourceRecordId=existingSource[0]?.id?Number(existingSource[0].id):0;
      if(!sourceRecordId){
        const [result]=await connection.query<ResultSetHeader>(
          `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
          [sourceId,SOURCE_URL,externalId,`Kubota ${item.partNumber} replacement reference - HH1C0-32430`],
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
