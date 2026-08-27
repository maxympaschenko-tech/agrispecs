import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const SOURCE_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/b01-series-brochure.pdf?sfvrsn=cacc5402_4';
const SOURCE_EXTERNAL_ID='kubota-b01-current-mid-mount-mowers';

const mowers=[
  {
    model:'RCK54-32',slug:'rck54-32',
    configuration:'54 in (1372 mm) side-discharge mid-mount mower; 3 blades; 1.0-4.0 in cutting height; suspended mounting; dial cutting-height adjustment; approx. 300 lb.',
  },
  {
    model:'RCK60-32',slug:'rck60-32',
    configuration:'60 in (1524 mm) side-discharge mid-mount mower; 3 blades; 1.0-4.0 in cutting height; suspended mounting; dial cutting-height adjustment; approx. 322 lb.',
  },
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota B01 mower migration dependency.');
  return Number(rows[0].id);
}

export const kubotaB01MowersMigration:DbMigration={
  id:'20260827_178_kubota_b01_mowers',
  description:'Add official RCK54-32 and RCK60-32 mid-mount mower specifications and direct B2301/B2601 compatibility',
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
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA B01 Series brochure - RCK54-32 and RCK60-32 mower specifications'],
      );
      sourceRecordId=Number(result.insertId);
    }

    for(const mower of mowers){
      await connection.query(
        `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES (?,'mid-mount-mower',?,?,NULL,NULL,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=NULL,lift_height_text=NULL,configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId,mower.model,mower.slug,mower.configuration],
      );
      const attachmentId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='mid-mount-mower' AND slug=? LIMIT 1`,[manufacturerId,mower.slug]);
      for(const machineSlug of ['b2301','b2601'] as const){
        const machineId=await selectId(connection,`
          SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
          WHERE mf.slug='kubota' AND m.slug=? LIMIT 1
        `,[machineSlug]);
        await connection.query(
          `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES (?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId,attachmentId,`Kubota B01 Series documentation identifies ${mower.model} as a matching mid-mount mower for B2301HSD/B2601HSD.`,sourceRecordId],
        );
      }
    }
  },
};
