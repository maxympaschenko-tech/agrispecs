import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const SOURCE_URL='https://www.kubotausa.com/products/tractors/utility/m6S';
const SOURCE_EXTERNAL_ID='kubota-m6s-la1941-current-2026-08';

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M6S LA1941 migration dependency.');
  return Number(rows[0].id);
}

export const kubotaM6SLA1941LoaderMigration:DbMigration={
  id:'20260828_202_kubota_m6s_la1941_loader',
  description:'Add current Kubota M6S-111 compatibility with LA1941 front loader using current product-page capacity data',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='m6s-111' LIMIT 1`);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[SOURCE_EXTERNAL_ID]);
    let sourceRecordId=existing[0]?.id?Number(existing[0].id):0;
    if(!sourceRecordId){
      const [result]=await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA current M6S product page - M6S-111 / LA1941 loader and lift capacity'],
      );
      sourceRecordId=Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES (?,'front-loader','LA1941','la1941',?,NULL,?,'verified')
       ON DUPLICATE KEY UPDATE model_name='LA1941',lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=NULL,configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId,'Height-position lift capacity: 4,178 lb; Power-position lift capacity: 4,299 lb','Current Kubota M6S product page identifies the M6S-111 / LA1941 pairing. Maximum lift-height dimensions are intentionally not imported until a direct LA1941 specification table is verified.'],
    );
    const attachmentId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug='la1941' LIMIT 1`,[manufacturerId]);

    await connection.query(
      `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
       VALUES (?,?,?,?,'official')
       ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
      [machineId,attachmentId,'Kubota USA current M6S page explicitly shows the M6S-111 with LA1941 and publishes 4,178 lb height-position / 4,299 lb power-position lift capacities. Verify mounting kit and tractor configuration before installation.',sourceRecordId],
    );
  },
};
