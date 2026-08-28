import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const SOURCE_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const SOURCE_EXTERNAL_ID='kubota-2026-m4-la1154-loader-performance';

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M4 LA1154 migration dependency.');
  return Number(rows[0].id);
}

export const kubotaM4LA1154LoaderMigration:DbMigration={
  id:'20260828_189_kubota_m4_la1154_loader',
  description:'Link current M4 tractors to LA1154 with machine-specific official loader performance overrides',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const attachmentId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='front-loader' AND slug='la1154' LIMIT 1`,[manufacturerId]);

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
        `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA 2026 Full Product Line - M4 LA1154 loader performance'],
      );
      sourceRecordId=Number(result.insertId);
    }

    for(const machineSlug of ['m4d-061','m4-071','m4d-071'] as const){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[machineSlug]);
      await connection.query(
        `INSERT INTO machine_attachments (
          machine_id,attachment_id,compatibility_note,performance_capacity_text,performance_height_text,performance_configuration_text,source_record_id,confidence
        ) VALUES (?,?,?,?,?,?,?,'official')
        ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),performance_capacity_text=VALUES(performance_capacity_text),performance_height_text=VALUES(performance_height_text),performance_configuration_text=VALUES(performance_configuration_text),source_record_id=VALUES(source_record_id),confidence='official'`,
        [
          machineId,attachmentId,
          'Kubota USA current M4 material explicitly identifies LA1154 as the performance-matched front loader for the M4 Series.',
          'At max height: 2,674 lb height-position / 2,928 lb power-position; at 1.5 m: 3,228 lb height-position / 3,741 lb power-position',
          'Pivot-pin height: 133.0 in height-position / 117.6 in power-position',
          'LA1154 height/power boom-cylinder fulcrum configuration; optional Kubota Shockless Ride and hydraulic self-leveling.',
          sourceRecordId,
        ],
      );
    }
  },
};
