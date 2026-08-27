import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSlug='bx1880'|'bx2380'|'bx2680'|'bx23s';

type MowerSeed={
  model:string;
  slug:string;
  type:'mid-mount-mower'|'easy-over-mower';
  configuration:string;
  machineSlugs:ModelSlug[];
  note:string;
};

const SOURCE_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/bx-series-brochure.pdf?sfvrsn=c783b090_6';
const SOURCE_EXTERNAL_ID='kubota-bx-current-mower-compatibility-2026-08';

const mowers:MowerSeed[]=[
  {
    model:'RCK48-18BX',slug:'rck48-18bx',type:'mid-mount-mower',
    configuration:'48 in (1219 mm) cutting width; 1.0-4.0 in cutting height; 3 blades; Quick-Joint parallel suspended linkage; 1/4 in dial height adjustment; approx. 165 lb; 6.0 in transport ground clearance.',
    machineSlugs:['bx1880'],
    note:'Kubota BX Series brochure lists RCK48-18BX as the matching 48-inch mid-mount mower for BX1880.',
  },
  {
    model:'RCK54-23BX',slug:'rck54-23bx',type:'mid-mount-mower',
    configuration:'54 in (1375 mm) cutting width; 1.0-4.0 in cutting height; 3 blades; Quick-Joint parallel suspended linkage; 1/4 in dial height adjustment; approx. 210 lb; 6.0 in transport ground clearance.',
    machineSlugs:['bx1880','bx2380','bx2680','bx23s'],
    note:'Kubota BX Series brochure lists RCK54-23BX as compatible with BX1880, BX2380, BX2680 and BX23S.',
  },
  {
    model:'RCK60B-23BX',slug:'rck60b-23bx',type:'mid-mount-mower',
    configuration:'60 in (1524 mm) cutting width; 1.0-4.0 in cutting height; 3 blades; Quick-Joint self-balance suspended linkage; 1/4 in dial height adjustment; approx. 250 lb; 6.0 in transport ground clearance.',
    machineSlugs:['bx2380','bx2680','bx23s'],
    note:'Kubota BX Series brochure lists RCK60B-23BX as compatible with BX2380, BX2680 and BX23S.',
  },
  {
    model:'RCK54D-26BX-1',slug:'rck54d-26bx-1',type:'easy-over-mower',
    configuration:'54 in (1372 mm) cutting width; 1.0-4.0 in cutting height; 3 blades; drive-over suspended linkage; 1/4 in dial height adjustment; approx. 269 lb on BX2380/BX2680 and 258 lb on BX23S; 6.0 in transport ground clearance. Not compatible with bar tires.',
    machineSlugs:['bx2380','bx2680','bx23s'],
    note:'Kubota BX Series brochure lists RCK54D-26BX-1 Easy-Over mower for BX2380, BX2680 and BX23S. Kubota notes that this mower is not compatible with bar tires.',
  },
  {
    model:'RCK60D-26BX-1',slug:'rck60d-26bx-1',type:'easy-over-mower',
    configuration:'60 in (1524 mm) cutting width; 1.0-4.0 in cutting height; 3 blades; drive-over suspended linkage; 1/4 in dial height adjustment; approx. 295 lb on BX2380/BX2680 and 284 lb on BX23S; 6.0 in transport ground clearance. Not compatible with bar tires.',
    machineSlugs:['bx2380','bx2680','bx23s'],
    note:'Kubota BX Series brochure lists RCK60D-26BX-1 Easy-Over mower for BX2380, BX2680 and BX23S. Kubota notes that this mower is not compatible with bar tires.',
  },
];

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota BX mower migration dependency.');
  return Number(rows[0].id);
}

export const kubotaBXMowersMigration:DbMigration={
  id:'20260827_174_kubota_bx_mowers',
  description:'Add official current Kubota BX mid-mount and Easy-Over mower compatibility and published mower specifications',
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
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA BX Series brochure - mid-mount and Easy-Over mower specifications'],
      );
      sourceRecordId=Number(result.insertId);
    }

    for(const mower of mowers){
      await connection.query(
        `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES (?,?,?,?,NULL,NULL,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=NULL,lift_height_text=NULL,configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId,mower.type,mower.model,mower.slug,mower.configuration],
      );
      const attachmentId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type=? AND slug=? LIMIT 1`,[manufacturerId,mower.type,mower.slug]);
      for(const machineSlug of mower.machineSlugs){
        const machineId=await selectId(connection,`
          SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
          WHERE mf.slug='kubota' AND m.slug=? LIMIT 1
        `,[machineSlug]);
        await connection.query(
          `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES (?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId,attachmentId,mower.note,sourceRecordId],
        );
      }
    }
  },
};
