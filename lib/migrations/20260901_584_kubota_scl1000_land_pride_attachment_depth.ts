import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id:number };
type AttachmentSeed = {
  type:string;
  model:string;
  slug:string;
  liftCapacity?:string|null;
  configuration:string;
};

const CATALOG_URL='https://www.landpride.com/product-search/scl-attachments/1000';
const EXTERNAL_ID='land-pride-scl1000-current-attachments-2026-09';

const additions:AttachmentSeed[]=[
  {type:'pallet-fork',model:'CPF1236',slug:'cpf1236',liftCapacity:'1,200 lb',configuration:'Kubota by Land Pride CPF12 compact pallet fork; 36 in fork configuration, CII hitch, adjustable fork width, spring-loaded width lock and spill guard. Land Pride lists the CPF12 family as Kubota matched for SCL.'},
  {type:'pallet-fork',model:'CPF1242',slug:'cpf1242',liftCapacity:'1,200 lb',configuration:'Kubota by Land Pride CPF12 compact pallet fork; 42 in fork configuration, CII hitch, adjustable fork width, spring-loaded width lock and spill guard. Land Pride lists the CPF12 family as Kubota matched for SCL.'},
  {type:'compact-auger',model:'CSA10',slug:'csa10',configuration:'Kubota by Land Pride CSA10 compact auger; CII hitch, 10-20 GPM hydraulic requirement, reversible planetary gearbox, 2 in hex output shaft and 1,775 ft-lb rating at 3,000 psi. Land Pride lists CSA10 as Kubota matched to SCL1000.'},
  {type:'powered-rake',model:'CSR1048',slug:'csr1048',configuration:'Kubota by Land Pride CSR10 compact powered rake; 48 in width, CII hitch, up to 15 GPM, direct drive and manual or hydraulic 25 degree left/right angle.'},
  {type:'bucket',model:'CL148H',slug:'cl148h',configuration:'Kubota by Land Pride CL Series high-capacity bucket; 48 in width, CII hitch, 7 cu ft struck and 9 cu ft heaped capacity, with optional bolt-on teeth or bolt-on cutting edge.'},
  {type:'trencher',model:'CTR10 Series',slug:'ctr10-series',configuration:'Kubota by Land Pride CTR10 compact trencher family for SCL1000; 30, 36 and 48 in trenching-length configurations, CII hitch, high-torque or high-speed motor options, chain widths from 4 to 10 in depending on length, three chain styles, 12 in spoil auger and optional crumber shoe.'},
];

async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){
  const[r]=await c.query<IdRow[]>(sql,p);
  if(!r[0])throw new Error('Kubota SCL1000 Land Pride attachment migration dependency missing');
  return Number(r[0].id);
}

async function landPrideSource(c:Parameters<DbMigration['apply']>[0]){
  const[r]=await c.query<IdRow[]>(`SELECT id FROM sources WHERE name='Land Pride' AND domain='landpride.com' ORDER BY id LIMIT 1`);
  if(r[0])return Number(r[0].id);
  const[x]=await c.query<ResultSetHeader>(`INSERT INTO sources(name,domain,source_type,authority_level) VALUES('Land Pride','landpride.com','manufacturer','official')`);
  return Number(x.insertId);
}

async function fit(c:Parameters<DbMigration['apply']>[0],machine:number,attachment:number,record:number,note:string){
  await c.query(`INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES (?,?,?,?,'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,[machine,attachment,note,record]);
}

export const kubotaScl1000LandPrideAttachmentDepthMigration:DbMigration={
  id:'20260901_584_kubota_scl1000_land_pride_attachment_depth',
  description:'Deepen current Kubota SCL1000 fitment with official Land Pride SCL attachments and exact current attachment models',
  async apply(c){
    const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const machine=await id(c,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id JOIN equipment_types et ON et.id=m.equipment_type_id WHERE mf.slug='kubota' AND et.slug='stand-on-compact-loader' AND m.slug='scl1000' LIMIT 1`);
    const sid=await landPrideSource(c);
    const[existing]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[EXTERNAL_ID]);
    let rid=existing[0]?.id?Number(existing[0].id):0;
    if(!rid){
      const raw={captured:'2026-09-01',catalogUrl:CATALOG_URL,sources:{
        ctp10:'https://www.landpride.com/products/11275/ctp10-series-compact-tree-puller',
        cgc1040:'https://www.landpride.com/products/10607/cgc10%20series%20compact%20claw%20grapple',
        ssg2024:'https://www.landpride.com/products/8870/ssg20-series-stump-grinder',
        br3504:'https://www.landpride.com/products/6128/br-series-breakers',
        cpf12:'https://www.landpride.com/products/6634/cpf12-series-compact-pallet-forks',
        csa10:'https://www.landpride.com/node/6631',
        csr1048:'https://www.landpride.com/products/6632/csr10-series-compact-powered-rakes',
        cl148h:'https://www.landpride.com/products/6630/cl-series-compact-buckets'
      },models:['CSC1042','CTP10','CGC1040','SSG2024','BR3504','CPF1236','CPF1242','CSA10','CSR1048','CL148H','CTR10 Series']};
      const[x]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,CATALOG_URL,EXTERNAL_ID,'Land Pride current SCL attachments and SCL1000 matched product pages',JSON.stringify(raw)]);
      rid=Number(x.insertId);
    }

    const refinements:AttachmentSeed[]=[
      {type:'compact-skid-cutter',model:'CSC1042',slug:'csc1042',configuration:'Kubota by Land Pride CSC1042 compact skid cutter; designed for SCL1000, 42 in width, 1 in cutting capacity, push bar and bi-fold door.'},
      {type:'tree-puller',model:'CTP10',slug:'ctp10',configuration:'Kubota by Land Pride CTP10 compact tree puller; CII hitch and Kubota matched to SCL1000. Push bar protects the operator area, angled jaw tips aid root loosening, and the hydraulic cylinder fittings and hoses are guarded.'},
      {type:'claw-grapple',model:'CGC1040',slug:'cgc1040',configuration:'Kubota by Land Pride CGC1040 compact claw grapple; designed specifically for SCL1000, 40 in width, CII hitch, AR400 teeth material, 5/16 in tine thickness and 32 in jaw opening.'},
      {type:'hydraulic-breaker',model:'BR3504 Compact Mount',slug:'br3504-compact-mount',configuration:'Kubota by Land Pride BR3504 compact breaker mount; performance matched to SCL1000, 2.36 in tool diameter, Universal Quick-Attach and 5.3-16.4 GPM hydraulic requirement.'},
    ];

    for(const a of refinements){
      await c.query(`UPDATE attachments SET model_name=?,configuration_text=?,data_status='verified' WHERE manufacturer_id=? AND attachment_type=? AND slug=?`,[a.model,a.configuration,mf,a.type,a.slug]);
      const aid=await id(c,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type=? AND slug=? LIMIT 1`,[mf,a.type,a.slug]);
      await fit(c,machine,aid,rid,`Official Land Pride SCL attachment listing confirms current SCL/SCL1000 compatibility. Fitment does not imply standard equipment; verify hydraulic flow, mount and dealer configuration for the exact attachment.`);
    }

    const[oldSsg]=await c.query<IdRow[]>(`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='stump-grinder' AND slug='ssg20' LIMIT 1`,[mf]);
    let ssgId:number;
    const ssgConfig='Kubota by Land Pride SSG2024 stump grinder; SSG20 Series current model with 24 in cutting wheel, 15 Wearsharp teeth, 8-21 GPM hydraulic requirement and Kubota match listing for SCL.';
    if(oldSsg[0]){
      ssgId=Number(oldSsg[0].id);
      await c.query(`UPDATE attachments SET model_name='SSG2024',slug='ssg2024',configuration_text=?,data_status='verified' WHERE id=?`,[ssgConfig,ssgId]);
    }else{
      await c.query(`INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES (?,'stump-grinder','SSG2024','ssg2024',NULL,NULL,?,'verified') ON DUPLICATE KEY UPDATE model_name='SSG2024',configuration_text=VALUES(configuration_text),data_status='verified'`,[mf,ssgConfig]);
      ssgId=await id(c,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type='stump-grinder' AND slug='ssg2024' LIMIT 1`,[mf]);
    }
    await fit(c,machine,ssgId,rid,'Land Pride lists SSG2024 in the SSG20 Series as Kubota matched for SCL. Attachment requires an appropriate SCL mount/hose configuration and is not standard equipment.');

    for(const a of additions){
      await c.query(`INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES (?,?,?,?,?,NULL,?,'verified') ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),configuration_text=VALUES(configuration_text),data_status='verified'`,[mf,a.type,a.model,a.slug,a.liftCapacity??null,a.configuration]);
      const aid=await id(c,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type=? AND slug=? LIMIT 1`,[mf,a.type,a.slug]);
      await fit(c,machine,aid,rid,`Listed in Land Pride's current SCL attachment catalog for the Kubota SCL family/SCL1000. Compatibility is source-backed but exact hydraulic, chain, edge, tooth and mount configuration must be selected for the job.`);
    }
  }
};