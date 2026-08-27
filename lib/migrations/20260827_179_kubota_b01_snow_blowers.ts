import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const SOURCE_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/4017_ktc_lx20_tractorrtvsnowbrochure_v8.pdf?sfvrsn=ca40ec39_3';
const SOURCE_EXTERNAL_ID='kubota-b01-current-snow-implements';

const snowBlowers=[
  {
    model:'BX2816A',slug:'bx2816a',
    configuration:'50 in two-stage residential front snow blower. Manual chute rotation and deflection, chain reduction and 4-blade impeller. Requires B3410 Quick Hitch, B2412 Grill Guard Tilt Kit, B3411 Mid PTO Driveline and BX2842A Completion Kit. BX2842 completion kit is not compatible with mower deck linkage.',
  },
  {
    model:'BX2830',slug:'bx2830',
    configuration:'48 in two-stage commercial front snow blower with hydraulic chute rotation, manual chute deflector and replaceable/reversible cutting edge. Requires B3410 Quick Hitch, B2412 Grill Guard Tilt Kit and B3411 Mid PTO Driveline.',
  },
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota B01 snow-blower migration dependency.');
  return Number(rows[0].id);
}

export const kubotaB01SnowBlowersMigration:DbMigration={
  id:'20260827_179_kubota_b01_snow_blowers',
  description:'Add official B01 BX2816A residential and BX2830 commercial front snow-blower compatibility and required mounting kits',
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
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA B01 Snow Implements - front snow-blower compatibility and requirements'],
      );
      sourceRecordId=Number(result.insertId);
    }

    for(const blower of snowBlowers){
      await connection.query(
        `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES (?,'front-snow-blower',?,?,NULL,NULL,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=NULL,lift_height_text=NULL,configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId,blower.model,blower.slug,blower.configuration],
      );
      const attachmentId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-snow-blower' AND slug=? LIMIT 1`,[manufacturerId,blower.slug]);
      for(const machineSlug of ['b2301','b2601','b2401dt'] as const){
        const machineId=await selectId(connection,`
          SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
          WHERE mf.slug='kubota' AND m.slug=? LIMIT 1
        `,[machineSlug]);
        await connection.query(
          `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES (?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId,attachmentId,`Kubota B01 Snow Implements documentation directly lists ${blower.model} for B2301HSD, B2601HSD and B2401DT. Required quick-hitch, driveline and completion-kit conditions remain mandatory.`,sourceRecordId],
        );
      }
    }
  },
};
