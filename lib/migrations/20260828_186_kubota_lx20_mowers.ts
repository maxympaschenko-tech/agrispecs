import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const SOURCE_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/3524_kubota_ktc_lx20_brochure_v10.pdf?sfvrsn=c63ef3c5_3';
const SOURCE_EXTERNAL_ID='kubota-lx20-rck60-40lx-rc72-40lx-mowers-2026-08';

const decks=[
  {model:'RCK60-40LX',slug:'rck60-40lx',width:'60 in cutting width',configuration:'Right side discharge; 3 blades; 1.5-4 in cutting height; parallel linkage moved by 3-point linkage; wash port; compatible with large-diameter, R4 and R14 tires.'},
  {model:'RC72-40LX',slug:'rc72-40lx',width:'72 in cutting width',configuration:'Right side discharge; 3 blades; 1.5-4 in cutting height; parallel linkage moved by 3-point linkage; wash port; compatible with large-diameter, R4 and R14 tires.'},
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota LX20 mower migration dependency.');
  return Number(rows[0].id);
}

export const kubotaLX20MowersMigration:DbMigration={
  id:'20260828_186_kubota_lx20_mowers',
  description:'Add source-backed RCK60-40LX and RC72-40LX mid-mount mower pages for current LX3520/LX4020 platforms with SU restrictions',
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
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA LX20 brochure - RCK60-40LX and RC72-40LX mid-mount mower specifications'],
      );
      sourceRecordId=Number(result.insertId);
    }

    const attachmentIds=new Map<string,number>();
    for(const deck of decks){
      await connection.query(
        `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES (?,'mid-mount-mower',?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId,deck.model,deck.slug,deck.width,'1.5-4 in cutting-height range',deck.configuration],
      );
      attachmentIds.set(deck.slug,await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='mid-mount-mower' AND slug=? LIMIT 1`,[manufacturerId,deck.slug]));
    }

    for(const machineSlug of ['lx3520','lx4020'] as const){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[machineSlug]);
      const note=machineSlug==='lx3520'
        ? 'Current Kubota material identifies 60 and 72 in mid-mount mower options for LX3520/LX4020. RCK60-40LX and RC72-40LX are the LX20 deck models. Standard HSD/HSDC configurations are supported; LX3520SUHSDC requires B1017 and LX3520DTN narrow should not be assumed compatible.'
        : 'Current Kubota material identifies 60 and 72 in mid-mount mower options for LX3520/LX4020. RCK60-40LX and RC72-40LX are the LX20 deck models. Confirm current mid-PTO and tire configuration before ordering.';
      for(const deck of decks){
        const attachmentId=attachmentIds.get(deck.slug);
        if(!attachmentId) throw new Error(`Missing LX20 mower ${deck.model}`);
        await connection.query(
          `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES (?,?,?,?,'high')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='high'`,
          [machineId,attachmentId,note,sourceRecordId],
        );
      }
    }
  },
};
