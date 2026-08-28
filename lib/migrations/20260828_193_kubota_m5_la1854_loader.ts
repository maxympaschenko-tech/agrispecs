import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const CURRENT_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const CURRENT_EXTERNAL_ID='kubota-2026-m5-la1854-current-compatibility';
const DETAIL_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/m5-series.pdf';
const DETAIL_EXTERNAL_ID='kubota-m5-la1854-loader-detailed-specs';

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M5 LA1854 migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,url:string,externalId:string,title:string){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,url,externalId,title]);
  return Number(result.insertId);
}

export const kubotaM5LA1854LoaderMigration:DbMigration={
  id:'20260828_193_kubota_m5_la1854_loader',
  description:'Add official LA1854 front-loader specifications and current M5-091/M5-111 compatibility',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const currentSourceId=await ensureSourceRecord(connection,sourceId,CURRENT_URL,CURRENT_EXTERNAL_ID,'Kubota USA 2026 Full Product Line - M5 compatible front loader LA1854');
    await ensureSourceRecord(connection,sourceId,DETAIL_URL,DETAIL_EXTERNAL_ID,'Kubota USA M5 Series brochure - LA1854 detailed front-loader specifications');

    await connection.query(
      `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES (?,'front-loader','LA1854','la1854',?,?,?,'verified')
       ON DUPLICATE KEY UPDATE model_name='LA1854',lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [
        manufacturerId,
        'Lift capacity at pivot pin/max height: 3,990 lb height-position / 4,144 lb power-position',
        'Maximum pivot-pin lift height: 145.7 in height-position / 131.9 in power-position',
        'Height/power boom-cylinder fulcrum positions; standard quick coupler, optional Euro-type quick coupler and optional single-lever hydraulic hose quick coupler.',
      ],
    );
    const attachmentId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug='la1854' LIMIT 1`,[manufacturerId]);

    for(const machineSlug of ['m5-091','m5-111'] as const){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[machineSlug]);
      await connection.query(
        `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES (?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId,attachmentId,'Kubota USA 2026 Full Product Line explicitly lists LA1854 as the compatible front loader for the current M5 Series.',currentSourceId],
      );
    }
  },
};
