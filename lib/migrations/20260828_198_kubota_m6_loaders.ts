import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const CURRENT_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const CURRENT_EXTERNAL_ID='kubota-2026-m6-loader-current-mapping';
const DETAIL_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/m6-brochure.pdf?sfvrsn=375a8c27_4';
const DETAIL_EXTERNAL_ID='kubota-m6-la1955-la2255-loader-detail';

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M6 loader migration dependency.');
  return Number(rows[0].id);
}
async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,url:string,externalId:string,title:string){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,url,externalId,title]);
  return Number(result.insertId);
}

export const kubotaM6LoadersMigration:DbMigration={
  id:'20260828_198_kubota_m6_loaders',
  description:'Add current Kubota M6 LA1955 and LA2255 loader mappings with height-position and power-position performance data',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const currentSourceId=await ensureSourceRecord(connection,sourceId,CURRENT_URL,CURRENT_EXTERNAL_ID,'Kubota USA 2026 Full Product Line - M6 current front-loader mapping');
    await ensureSourceRecord(connection,sourceId,DETAIL_URL,DETAIL_EXTERNAL_ID,'Kubota USA M6 Series brochure - LA1955 and LA2255 detailed loader performance');

    await connection.query(
      `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES (?,'front-loader','LA1955','la1955',?,?,?,'verified')
       ON DUPLICATE KEY UPDATE model_name='LA1955',lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId,'Height position: 4,178 lb at maximum height; Power position: 4,299 lb at maximum height','Height position: 145.7 in to pivot pin; Power position: 132.7 in to pivot pin','M6-101/M6-111 performance-matched loader; height and power boom-cylinder positions; Euro Quick Attach coupler type optional'],
    );
    const la1955Id=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND slug='la1955' AND attachment_type='front-loader' LIMIT 1`,[manufacturerId]);

    await connection.query(
      `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES (?,'front-loader','LA2255','la2255',?,?,?,'verified')
       ON DUPLICATE KEY UPDATE model_name='LA2255',lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId,'Height position: 4,711 lb at maximum height; Power position: 4,877 lb at maximum height','Height position: 161.4 in to pivot pin; Power position: 148.2 in to pivot pin','M6-131/M6-141 performance-matched loader; height and power boom-cylinder positions; Euro Quick Attach coupler type optional'],
    );
    const la2255Id=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND slug='la2255' AND attachment_type='front-loader' LIMIT 1`,[manufacturerId]);

    for(const modelSlug of ['m6-101','m6-111'] as const){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[modelSlug]);
      await connection.query(
        `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES (?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId,la1955Id,'Kubota current M6 product material maps LA1955 to M6-101/M6-111. Confirm loader mounting kit and tractor serial/configuration before installation.',currentSourceId],
      );
    }
    for(const modelSlug of ['m6-131','m6-141'] as const){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[modelSlug]);
      await connection.query(
        `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES (?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId,la2255Id,'Kubota current M6 product material maps LA2255 to M6-131/M6-141. Confirm loader mounting kit, front-axle configuration and tractor serial before installation.',currentSourceId],
      );
    }
  },
};
