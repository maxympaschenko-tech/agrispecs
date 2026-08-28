import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
const DETAIL_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/m8-brochureupdate.pdf?sfvrsn=1c788cad_3';
const DETAIL_EXTERNAL_ID='kubota-m8-m77-loader-current-detail';

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M8 M77 loader migration dependency.');
  return Number(rows[0].id);
}
async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number){
  const [rows]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[DETAIL_EXTERNAL_ID]);
  if(rows[0]) return Number(rows[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,DETAIL_URL,DETAIL_EXTERNAL_ID,'Kubota USA current M8 brochure - M77 front-loader performance and compatibility']);
  return Number(result.insertId);
}

export const kubotaM8M77LoaderMigration:DbMigration={
  id:'20260828_208_kubota_m8_m77_loader',
  description:'Add current Kubota M8 M77 front loader with official performance specifications',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const sourceRecordId=await ensureSourceRecord(connection,sourceId);

    await connection.query(
      `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES (?,'front-loader','M77','m77',?,?,?,'verified')
       ON DUPLICATE KEY UPDATE model_name='M77',lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId,'5,200 lb at pivot pin at maximum height; 5,490 lb at 800 mm forward at maximum height; 6,940 lb at pivot pin at ground level','181.2 in to pivot pin; 169.4 in under level bucket; 143.1 in clearance with bucket dumped','Mechanical self-leveling; electrical joystick; third-function valve, hydraulic valve quick couplers and KSR accumulator standard; optional fourth function and hydraulic implement lock'],
    );
    const attachmentId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND slug='m77' AND attachment_type='front-loader' LIMIT 1`,[manufacturerId]);

    for(const modelSlug of ['m8-181','m8-201'] as const){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[modelSlug]);
      await connection.query(
        `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES (?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId,attachmentId,'Kubota current M8 brochure identifies the M77 as the M8 Series front loader. Loader lift capacity remains subject to tractor GVW, proper ballasting and exact tractor/loader configuration.',sourceRecordId],
      );
    }
  },
};