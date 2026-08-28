import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const CURRENT_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/full-product-line-brochure-2026.pdf?sfvrsn=6b591835_8';
const CURRENT_EXTERNAL_ID='kubota-2026-m7-gen4-lm2606-current-mapping';
const DETAIL_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/m7-g4-brochure.pdf?sfvrsn=47999f69_4';
const DETAIL_EXTERNAL_ID='kubota-m7-gen4-lm2606-loader-detail';

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M7 Gen 4 loader migration dependency.');
  return Number(rows[0].id);
}
async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,url:string,externalId:string,title:string){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,[sourceId,url,externalId,title]);
  return Number(result.insertId);
}

export const kubotaM7Gen4LM2606LoaderMigration:DbMigration={
  id:'20260828_205_kubota_m7_gen4_lm2606_loader',
  description:'Add current Kubota M7 Gen 4 LM2606 front-loader compatibility and official loader performance data',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const currentSourceId=await ensureSourceRecord(connection,sourceId,CURRENT_URL,CURRENT_EXTERNAL_ID,'Kubota USA 2026 Full Product Line - current M7 Gen 4 LM2606 mapping');
    await ensureSourceRecord(connection,sourceId,DETAIL_URL,DETAIL_EXTERNAL_ID,'Kubota USA M7 Generation 4 brochure - LM2606 detailed front-loader performance');

    await connection.query(
      `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
       VALUES (?,'front-loader','LM2606','lm2606',?,?,?,'verified')
       ON DUPLICATE KEY UPDATE model_name='LM2606',lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
      [manufacturerId,'5,776 lb at bucket pivot pin at maximum height; 5,765 lb at 800 mm forward at maximum height','167 in maximum lift height at bucket pivot pin; 156 in at bucket-under-level','Z-bar linkage with mechanical self-leveling; mechanical joystick on Deluxe, electronic joystick on Premium/Premium KVT; third function, single-lever hydraulic quick coupler and KSR accumulator standard'],
    );
    const attachmentId=await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND slug='lm2606' AND attachment_type='front-loader' LIMIT 1`,[manufacturerId]);

    for(const modelSlug of ['m7-134','m7-154','m7-174'] as const){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[modelSlug]);
      const gradeNote=modelSlug==='m7-134'
        ? 'Current 2026 US M7-134 availability is Deluxe grade; LM2606 uses the mechanical loader joystick on Deluxe.'
        : 'LM2606 is current across available M7 Gen 4 grades; mechanical joystick on Deluxe and electronic joystick on Premium/Premium KVT.';
      await connection.query(
        `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES (?,?,?,?,'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId,attachmentId,`${gradeNote} Confirm tractor/loader mounting configuration before installation.`,currentSourceId],
      );
    }
  },
};