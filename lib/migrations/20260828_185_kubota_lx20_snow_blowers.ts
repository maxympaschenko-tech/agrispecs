import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const SOURCE_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/4017_ktc_lx20_tractorrtvsnowbrochure_v8.pdf?sfvrsn=ca40ec39_3';
const SOURCE_EXTERNAL_ID='kubota-lx20-snow-implements-2026-08';

const blowers=[
  {model:'LX2963',slug:'lx2963',width:'63 in residential 2-stage snow blower',details:'Gearbox reduction; hydraulic chute rotation; manual chute deflection.'},
  {model:'LX2970',slug:'lx2970',width:'51 in commercial 2-stage snow blower',details:'Oil-bath reduction gearboxes; hydraulic chute rotation; manual deflection; abrasion-resistant housing and impeller.'},
  {model:'LX2980',slug:'lx2980',width:'64 in commercial 2-stage snow blower',details:'Oil-bath reduction gearboxes; hydraulic chute rotation; manual deflection; abrasion-resistant housing and impeller.'},
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota LX20 snow-blower migration dependency.');
  return Number(rows[0].id);
}

export const kubotaLX20SnowBlowersMigration:DbMigration={
  id:'20260828_185_kubota_lx20_snow_blowers',
  description:'Add official Kubota LX20 LX2963, LX2970 and LX2980 snow-blower compatibility with front-hitch and SU/narrow restrictions',
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
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA LX20 snow implements brochure - snow blower compatibility and requirements']);
      sourceRecordId=Number(result.insertId);
    }

    const attachmentIds=new Map<string,number>();
    for(const blower of blowers){
      await connection.query(
        `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES (?,'snow-blower',?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId,blower.model,blower.slug,blower.width,'Front PTO-driven snow implement',`${blower.details} Requires LX2940B front hitch on LX2620 or LX6971 front hitch on LX3520/LX4020 plus the correct mid-PTO driveline kit. Not compatible with LX2620 SU, LX3520DTN narrow, or LX3520 SU configurations.`],
      );
      attachmentIds.set(blower.slug,await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='snow-blower' AND slug=? LIMIT 1`,[manufacturerId,blower.slug]));
    }

    for(const machineSlug of ['lx2620','lx3520','lx4020'] as const){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[machineSlug]);
      const requirement=machineSlug==='lx2620'
        ? 'Requires LX2940B front hitch and the correct LX2620 mid-PTO driveline kit. Compatible with standard LX2620 HSD/HSDC configurations; the official snow brochure excludes the LX2620 SU configuration.'
        : machineSlug==='lx3520'
          ? 'Requires LX6971 front hitch and the correct LX20 mid-PTO driveline kit. Compatible with standard LX3520 HSD/HSDC configurations; the official snow brochure excludes LX3520DTN narrow and LX3520 SU configurations.'
          : 'Requires LX6971 front hitch and the correct LX20 mid-PTO driveline kit for LX4020.';
      for(const blower of blowers){
        const attachmentId=attachmentIds.get(blower.slug);
        if(!attachmentId) throw new Error(`Missing LX20 snow blower ${blower.model}`);
        await connection.query(
          `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES (?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId,attachmentId,requirement,sourceRecordId],
        );
      }
    }
  },
};
