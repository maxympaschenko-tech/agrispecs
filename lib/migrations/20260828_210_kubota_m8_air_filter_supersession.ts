import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
const OLD_NUMBER='LBT00-13539';
const OLD_NORMALIZED='LBT0013539';
const CURRENT_NORMALIZED='LBT0010137';
const SOURCE_URL='https://www.messicks.com/parts/kubota/lbt00-10137';
const EXTERNAL_ID='messicks-kubota-lbt00-10137-m8-supersession';

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M8 air-filter supersession dependency.');
  return Number(rows[0].id);
}

export const kubotaM8AirFilterSupersessionMigration:DbMigration={
  id:'20260828_210_kubota_m8_air_filter_supersession',
  description:'Add dealer-confirmed LBT00-13539 to LBT00-10137 M8 secondary air-filter replacement relation',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug='engine-air-filters' LIMIT 1`);
    const currentPartId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,CURRENT_NORMALIZED]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`);
      sourceId=Number(result.insertId);
    }
    const [existingSource]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[EXTERNAL_ID]);
    let sourceRecordId=existingSource[0]?.id?Number(existingSource[0].id):0;
    if(!sourceRecordId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,SOURCE_URL,EXTERNAL_ID,'Kubota LBT00-10137 secondary air filter - replacement for LBT00-13539']);
      sourceRecordId=Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
       VALUES (?,?,?,?,?,?,'partial')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),data_status=IF(data_status='verified','verified','partial')`,
      [manufacturerId,categoryId,OLD_NUMBER,OLD_NORMALIZED,'Legacy Secondary Engine Air Filter Element','Legacy Kubota M8 secondary air-filter number retained for replacement lookup. Messicks identifies LBT00-10137 as its current replacement.'],
    );
    const oldPartId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,OLD_NORMALIZED]);
    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [oldPartId,currentPartId,sourceRecordId],
    );
  },
};