import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const SOURCE_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/b01-series-brochure.pdf';
const SOURCE_EXTERNAL_ID='kubota-b01-la435-bh70-attachments';

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota B01 attachment migration dependency.');
  return Number(rows[0].id);
}

export const kubotaB01AttachmentsMigration:DbMigration={
  id:'20260827_176_kubota_b01_attachments',
  description:'Add source-backed LA435 front-loader and BH70 backhoe compatibility for the directly supported B2301/B2601 B01 tractors',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
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
        `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA B01 Series brochure - LA435 loader and BH70 backhoe specifications'],
      );
      sourceRecordId=Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES (?,'front-loader','LA435','la435',?,?,?,'verified')
       ON DUPLICATE KEY UPDATE model_name='LA435',lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId,'948 lb at bucket pivot pin/max height; 1175 lb at bucket pivot pin @ 1.5 m; 2146 lbf breakout force at pivot pin','78.5 in maximum lift height at bucket pivot pin','Swift-Tach loader; optional 2-lever quick coupler and mechanical self-leveling; source brochure lists standard loader valve on B2301/B2601'],
    );
    const loaderId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug='la435' LIMIT 1`,[manufacturerId]);

    await connection.query(
      `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES (?,'backhoe','BH70','bh70',?,?,?,'verified')
       ON DUPLICATE KEY UPDATE model_name='BH70',lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId,'85.2 in digging depth (2 ft flat bottom); 116.8 in reach from swing pivot','61.6 in loading height','Performance-matched Kubota backhoe; 10, 12 and 16 in bucket sizes; optional mechanical thumb; 4-point quick-attach system'],
    );
    const backhoeId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='backhoe' AND slug='bh70' LIMIT 1`,[manufacturerId]);

    for(const machineSlug of ['b2301','b2601'] as const){
      const machineId=await selectId(connection,`
        SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
        WHERE mf.slug='kubota' AND m.slug=? LIMIT 1
      `,[machineSlug]);
      await connection.query(
        `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES (?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId,loaderId,'Kubota B01 material identifies the LA435 Swift-Tach loader as performance-matched to the HST B01 platform; B2301/B2601 have the standard compatible loader valve.',sourceRecordId],
      );
      await connection.query(
        `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES (?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId,backhoeId,'Kubota B01 backhoe documentation directly supports BH70 use with B2301/B2601. Verify the required subframe/mount kit and loader configuration before installation.',sourceRecordId],
      );
    }
  },
};
