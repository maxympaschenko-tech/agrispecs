import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const SOURCE_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/bx-series-brochure.pdf?sfvrsn=c783b090_7';
const SOURCE_EXTERNAL_ID='kubota-bx-series-current-attachments-2026-08';

type AttachmentSeed={
  model:string;
  slug:string;
  type:'front-loader'|'backhoe';
  liftCapacity:string;
  liftHeight:string;
  configuration:string;
  machineSlugs:Array<'bx1880'|'bx2380'|'bx2680'|'bx23s'>;
  note:string;
};

const attachments:AttachmentSeed[]=[
  {
    model:'LA344',slug:'la344',type:'front-loader',
    liftCapacity:'739 lb at pivot pin/max height; 820 lb at pivot pin @ 1.5 m',
    liftHeight:'BX1880: 70.7 in maximum lift height; BX2380/BX2680: 71.0 in',
    configuration:'Kubota Swift-Tach pin-on front loader; 45° maximum dump angle',
    machineSlugs:['bx1880','bx2380','bx2680'],
    note:'Kubota BX Series brochure lists LA344 pin-on Swift-Tach loader for BX1880, BX2380 and BX2680.',
  },
  {
    model:'LA344S',slug:'la344s',type:'front-loader',
    liftCapacity:'613 lb at pivot pin/max height; 699 lb at pivot pin @ 1.5 m',
    liftHeight:'BX1880: 70.7 in maximum lift height; BX2380/BX2680: 71.0 in',
    configuration:'Kubota Swift-Tach quick-attach front loader with two-lever quick coupler',
    machineSlugs:['bx1880','bx2380','bx2680'],
    note:'Kubota BX Series brochure lists LA344S quick-attach Swift-Tach loader for BX1880, BX2380 and BX2680.',
  },
  {
    model:'LA340',slug:'la340',type:'front-loader',
    liftCapacity:'739 lb at pivot pin/max height; 820 lb at pivot pin @ 1.5 m',
    liftHeight:'71.0 in maximum lift height at pivot pin',
    configuration:'Kubota Swift-Tach pin-on front loader; standard loader configuration for BX23S',
    machineSlugs:['bx23s'],
    note:'Kubota BX Series brochure lists LA340 pin-on loader as a matching BX23S loader.',
  },
  {
    model:'LA340S',slug:'la340s',type:'front-loader',
    liftCapacity:'613 lb at pivot pin/max height; 699 lb at pivot pin @ 1.5 m',
    liftHeight:'71.0 in maximum lift height at pivot pin',
    configuration:'Kubota Swift-Tach quick-attach front loader with two-lever quick coupler for BX23S',
    machineSlugs:['bx23s'],
    note:'Kubota BX Series brochure lists LA340S quick-attach loader as a matching BX23S loader.',
  },
  {
    model:'BT603',slug:'bt603',type:'backhoe',
    liftCapacity:'72.5 in digging depth (2 ft flat bottom); 8 ft 7 in reach from swing pivot; 140° swing arc',
    liftHeight:'67.7 in transport height; 100 in operating height fully raised',
    configuration:'Kubota Swift-Connect backhoe for BX23S; optional mechanical thumb; loader and backhoe are standard equipment on BX23S',
    machineSlugs:['bx23s'],
    note:'Kubota BX Series brochure identifies BT603 as the matching backhoe for BX23S and states that the loader and backhoe come standard on BX23S.',
  },
];

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota BX attachment migration dependency.');
  return Number(rows[0].id);
}

export const kubotaBXAttachmentsMigration:DbMigration={
  id:'20260827_171_kubota_bx_attachments',
  description:'Add official BX1880/BX2380/BX2680/BX23S loader and BT603 backhoe compatibility from the current Kubota BX brochure',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const [sourceRecords]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[SOURCE_EXTERNAL_ID]);
    let sourceRecordId=sourceRecords[0]?.id?Number(sourceRecords[0].id):0;
    if(!sourceRecordId){
      const [result]=await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA BX Series brochure - official loader and backhoe specifications'],
      );
      sourceRecordId=Number(result.insertId);
    }

    for(const item of attachments){
      await connection.query(
        `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES (?,?,?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId,item.type,item.model,item.slug,item.liftCapacity,item.liftHeight,item.configuration],
      );
      const attachmentId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type=? AND slug=? LIMIT 1`,[manufacturerId,item.type,item.slug]);
      for(const machineSlug of item.machineSlugs){
        const machineId=await selectId(connection,`
          SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
          WHERE mf.slug='kubota' AND m.slug=? LIMIT 1
        `,[machineSlug]);
        await connection.query(
          `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES (?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
          [machineId,attachmentId,item.note,sourceRecordId],
        );
      }
    }
  },
};
