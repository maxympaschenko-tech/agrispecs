import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const SOURCE_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const SOURCE_EXTERNAL_ID='kubota-2026-full-line-mx-series-current';
const modelSlugs=['mx4900','mx5400','mx6000'] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota MX attachment migration dependency.');
  return Number(rows[0].id);
}

export const kubotaMXAttachmentsMigration:DbMigration={
  id:'20260827_165_kubota_mx_attachments',
  description:'Add current official Kubota MX Series LA1065 loader and BH92 ROPS-only backhoe compatibility',
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
        `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA 2026 Full Product Line - current MX Series lineup',JSON.stringify({
          models:['MX4900','MX5400','MX6000'],
          loader:{model:'LA1065',maximumLiftHeightIn:111.2,liftCapacityMaxHeightLb:2275,liftCapacity1500mmLb:2864,breakoutForceLb:3981},
          backhoe:{model:'BH92',ropsOnly:true,diggingDepthIn:109.8,loadingHeightIn:84.3,reachFromSwingPivotIn:150.4,bucketSizesIn:[12,16,18,24,30,36],thumb:'Optional mechanical or hydraulic'},
        })],
      );
      sourceRecordId=Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES (?,'front-loader','LA1065','la1065',?,?,?,'verified')
       ON DUPLICATE KEY UPDATE model_name='LA1065',lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId,'2275 lb at pivot pin/max height; 2864 lb at pivot pin @ 1.5 m; breakout force 3981 lbf','111.2 in maximum lift height at pivot pin','Kubota-built performance-matched MX Series front loader. Current 2026 full-line source lists LA1065 for MX4900, MX5400 and MX6000.'],
    );
    const loaderId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug='la1065' LIMIT 1`,[manufacturerId]);

    await connection.query(
      `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES (?,'backhoe','BH92','bh92',NULL,NULL,?,'verified')
       ON DUPLICATE KEY UPDATE model_name='BH92',configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId,'Digging depth: 109.8 in; loading height: 84.3 in; reach from swing pivot: 150.4 in; bucket sizes 12, 16, 18, 24, 30 and 36 in; optional mechanical or hydraulic thumb. BH92 cannot be used with cab models.'],
    );
    const backhoeId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='backhoe' AND slug='bh92' LIMIT 1`,[manufacturerId]);

    for(const modelSlug of modelSlugs){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[modelSlug]);
      await connection.query(
        `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES (?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId,loaderId,`Kubota USA 2026 Full Product Line lists LA1065 as the current front loader for ${modelSlug.toUpperCase()}.`,sourceRecordId],
      );
      await connection.query(
        `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES (?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId,backhoeId,`Kubota USA 2026 Full Product Line lists BH92 for ${modelSlug.toUpperCase()} ROPS configurations. BH92 cannot be used with cab models.`,sourceRecordId],
      );
    }
  },
};
