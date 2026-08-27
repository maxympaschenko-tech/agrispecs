import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const OLD_NUMBER='TC830-37700';
const OLD_NORMALIZED='TC83037700';
const CURRENT_NORMALIZED='W950145101';
const SOURCE_URL='https://www.messicks.com/parts/kubota/w9501-45101';
const SOURCE_EXTERNAL_ID='messicks-kubota-tc830-37700-replaced-by-w9501-45101';

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota L4802 hydraulic-filter supersession dependency.');
  return Number(rows[0].id);
}

export const kubotaL4802HydraulicFilterSupersessionMigration:DbMigration={
  id:'20260827_162_kubota_l4802_hydraulic_filter_supersession',
  description:'Add TC830-37700 to W9501-45101 Kubota hydraulic-filter replacement chain used by L4802',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug='hydraulic-filters' LIMIT 1`);
    const currentPartId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,CURRENT_NORMALIZED]);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
       VALUES (?,?,?,?,?,?,'partial')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),data_status=IF(data_status='verified','verified','partial')`,
      [manufacturerId,categoryId,OLD_NUMBER,OLD_NORMALIZED,'Legacy Hydraulic Oil Filter','Legacy Kubota hydraulic filter number; dealer catalog lists W9501-45101 as the current replacement.'],
    );
    const oldPartId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,OLD_NORMALIZED]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`);
      sourceId=Number(result.insertId);
    }
    const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[SOURCE_EXTERNAL_ID]);
    let sourceRecordId=existing[0]?.id?Number(existing[0].id):0;
    if(!sourceRecordId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota TC830-37700 - replaced by W9501-45101']);
      sourceRecordId=Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?) ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [oldPartId,currentPartId,sourceRecordId],
    );
  },
};
