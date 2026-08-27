import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id:number };

const SOURCE_URL='https://www.kubotausa.com/equipment-series/standard-l-series';
const SOURCE_EXTERNAL_ID='kubota-standard-l-current-l4802-la766-2026-08';

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota L4802 LA766 migration dependency.');
  return Number(rows[0].id);
}

export const kubotaL4802LA766LoaderMigration:DbMigration={
  id:'20260827_160_kubota_l4802_la766_loader',
  description:'Add current official Kubota L4802 to LA766 front-loader compatibility and current loader capacities',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug='l4802' LIMIT 1`);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }

    const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[SOURCE_EXTERNAL_ID]);
    let sourceRecordId=existing[0]?.id?Number(existing[0].id):0;
    if(!sourceRecordId){
      const [result]=await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA Standard L Series current product page - L4802 LA766 front loader',JSON.stringify({
          maximumLiftCapacityAtPivotPinMaxHeightLb:1675,
          maximumLiftHeightAtPivotPinIn:105.2,
          liftCapacityAtPivotPin1500mmLb:2147,
          quickCoupler:'2-lever quick coupler standard',
        })],
      );
      sourceRecordId=Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES (?,'front-loader','LA766','la766',?,?,?,'verified')
       ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId,'1675 lb at pivot pin/max height; 2147 lb at pivot pin @ 1.5 m','105.2 in maximum lift height at pivot pin','Kubota-built LA766 for L4802; current Standard L page lists a standard 2-lever quick coupler and simultaneous boom/bucket loader valve operation.'],
    );
    const attachmentId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug='la766' LIMIT 1`,[manufacturerId]);

    await connection.query(
      `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
       VALUES (?,?,?,?,'official')
       ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
      [machineId,attachmentId,'Kubota USA current Standard L Series page identifies LA766 as the performance-matched front loader for L4802, with 1675 lb at the pivot pin/max height, 2147 lb at the pivot pin at 1.5 m, and 105.2 in maximum lift height.',sourceRecordId],
    );
  },
};
