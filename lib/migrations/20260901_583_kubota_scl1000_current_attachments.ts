import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id:number };
type AttachmentSeed = {
  type:string;
  model:string;
  slug:string;
  configuration:string;
};

const LIVE_URL='https://www.kubotausa.com/equipment-series/scl-series';
const EXTERNAL_ID='kubota-scl1000-live-addons-2026-09';
const attachments:AttachmentSeed[]=[
  {type:'compact-skid-cutter',model:'CSC1042',slug:'csc1042',configuration:'Kubota by Land Pride CSC10 Series Compact Skid Cutter; 42 in width, 1 in cutting capacity, CII hitch; live SCL page publishes 13-20 GPM requirement.'},
  {type:'tree-puller',model:'CTP10',slug:'ctp10',configuration:'Kubota by Land Pride CTP10 Compact Tree Puller for shrubs, saplings, trees and fence posts; CII hitch.'},
  {type:'claw-grapple',model:'CGC1040',slug:'cgc1040',configuration:'Kubota by Land Pride CGC10 Compact Claw Grapple; 40 in working width; CII hitch; described as designed specifically for SCL1000.'},
  {type:'stump-grinder',model:'SSG20',slug:'ssg20',configuration:'Kubota by Land Pride SSG20 Series Stump Grinder; current SCL1000 add-on listing publishes an 8-21 GPM hydraulic requirement.'},
  {type:'hydraulic-breaker',model:'BR3504 Compact Mount',slug:'br3504-compact-mount',configuration:'Kubota by Land Pride compact mount for BR3504 breaker, performance matched to SCL1000; 2.36 in tool diameter; 5.3-16.4 GPM; Universal Quick-Attach.'},
];

async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('Kubota SCL1000 attachment migration dependency missing');return Number(r[0].id);}
async function source(c:Parameters<DbMigration['apply']>[0]){const[r]=await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);if(r[0])return Number(r[0].id);const[x]=await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Kubota','kubotausa.com','manufacturer','official')`);return Number(x.insertId);}

export const kubotaScl1000CurrentAttachmentsMigration:DbMigration={
  id:'20260901_583_kubota_scl1000_current_attachments',
  description:'Add current Kubota by Land Pride SCL1000 add-ons from the live SCL Series page',
  async apply(c){
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const machine=await id(c,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN equipment_types et ON et.id=m.equipment_type_id WHERE mf.slug='kubota' AND et.slug='stand-on-compact-loader' AND m.slug='scl1000' LIMIT 1`);
    const sid=await source(c);
    const [existing]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[EXTERNAL_ID]);
    let rid=existing[0]?.id?Number(existing[0].id):0;
    if(!rid){const[x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,LIVE_URL,EXTERNAL_ID,'Kubota USA current SCL1000 Add-Ons',JSON.stringify({captured:'2026-09-01',attachments:attachments.map(a=>({model:a.model,type:a.type,configuration:a.configuration}))})]);rid=Number(x.insertId);}
    for(const a of attachments){
      await c.query(`INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES (?,?,?,?,NULL,NULL,?,'verified') ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),configuration_text=VALUES(configuration_text),data_status='verified'`,[mf,a.type,a.model,a.slug,a.configuration]);
      const aid=await id(c,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type=? AND slug=? LIMIT 1`,[mf,a.type,a.slug]);
      await c.query(`INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES (?,?,?,?,'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,[machine,aid,`Listed by Kubota USA as a current SCL1000 Add-On. Compatibility record does not imply that the attachment is standard equipment; dealer configuration, hydraulic flow and mount requirements must still be checked.`,rid]);
    }
  }
};