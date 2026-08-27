import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id:number };

const SOURCE_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const SOURCE_EXTERNAL_ID='kubota-2026-full-line-l4802-current';

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota L4802 BH92 migration dependency.');
  return Number(rows[0].id);
}

export const kubotaL4802BH92BackhoeMigration:DbMigration={
  id:'20260827_163_kubota_l4802_bh92_backhoe',
  description:'Add current official Kubota L4802 to BH92 backhoe compatibility and core backhoe dimensions',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='l4802' LIMIT 1`);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }

    const [existingSource]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[SOURCE_EXTERNAL_ID]);
    let sourceRecordId=existingSource[0]?.id?Number(existingSource[0].id):0;
    if(!sourceRecordId){
      const [result]=await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA 2026 Full Product Line - L4802 current configuration and attachment lineup',JSON.stringify({
          backhoe:'BH92',
          diggingDepthIn:109.8,
          loadingHeightIn:84.3,
          reachFromSwingPivotIn:150.4,
          compatibleModels:['L4802F','L4802DT','L4802HST'],
        })],
      );
      sourceRecordId=Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES (?,'backhoe','BH92','bh92',NULL,NULL,?,'verified')
       ON DUPLICATE KEY UPDATE model_name='BH92',configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId,'Digging depth: 109.8 in; loading height: 84.3 in; reach from swing pivot: 150.4 in. Kubota USA 2026 Full Product Line lists BH92 for L4802F and L4802 DT/HST.'],
    );
    const attachmentId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='backhoe' AND slug='bh92' LIMIT 1`,[manufacturerId]);

    await connection.query(
      `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
       VALUES (?,?,?,?,'official')
       ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
      [machineId,attachmentId,'Kubota USA 2026 Full Product Line lists BH92 as the backhoe for L4802F and L4802 DT/HST. Published dimensions: 109.8 in digging depth, 84.3 in loading height and 150.4 in reach from swing pivot.',sourceRecordId],
    );
  },
};
