import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id:number };
const MT225_BROCHURE='https://www.lstractorusa.com/wp-content/themes/impactbase/brochures/LS-Tractor-Brochure_MT225E.pdf';
const MT2E_BROCHURE='https://lstractorusa.com/wp-content/themes/weicks-media-base-theme/brochures/LS-Tractor-Brochure_MT2E.pdf';
const CAB_BROCHURE='https://lstractorusa.com/wp-content/themes/weicks-media-base-theme/brochures/LS-Tractor-Brochure_MT2EC.pdf';
const CURRENT_LOADERS='https://lstractorusa.com/front-end-loaders/';
const CURRENT_BACKHOES='https://lstractorusa.com/backhoes/';

async function id(c:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){const [rows]=await c.query<IdRow[]>(sql,params);if(!rows[0])throw new Error('LS Tractor Previous MT2E attachment dependency missing');return Number(rows[0].id);}
async function ensureSource(c:Parameters<DbMigration['apply']>[0],sourceId:number,externalId:string,url:string,title:string,raw:unknown){const [rows]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);if(rows[0])return Number(rows[0].id);const [inserted]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sourceId,url,externalId,title,JSON.stringify(raw)]);return Number(inserted.insertId);}
async function link(c:Parameters<DbMigration['apply']>[0],manufacturerId:number,machineSlug:string,attachmentId:number,note:string,sourceRecordId:number){const machineId=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,[manufacturerId,machineSlug]);await c.query(`INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES(?,?,?,?, 'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,[machineId,attachmentId,note,sourceRecordId]);}

export const lsTractorPreviousMt2eAttachmentsMigration:DbMigration={
 id:'20260830_394_ls_tractor_previous_mt2e_attachments',
 description:'Add generation-correct previous MT2E loader/backhoe fitment without replacing it with later HTML attachment mappings',
 async apply(c){
  const manufacturerId=await id(c,`SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);const sourceId=await id(c,`SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);
  const mt225Source=await ensureSource(c,sourceId,'ls-tractor-previous-mt2e-mt225-attachments',MT225_BROCHURE,'LS Tractor MT225E/MT225HE generation attachments',{
    generation:'Previous MT2E', capturedReference:'generation brochure', loader:'LL3300', backhoe:'LB1106', applications:['MT225E','MT225HE'],
    currentCrossCheck:{loaders:CURRENT_LOADERS,backhoes:CURRENT_BACKHOES},
    sourceDifference:'The generation brochure publishes LL3300 at 1,609 lb at pivot pin and LB1106 at 76.3 in digging depth / 2,817 lb bucket force. The current centralized implement catalogs use different labels and, for the LB1100/LB1105/LB1106 group, a later 79.3 in / 2,097 lb specification set. Archive attachment specs follow the generation brochure.'
  });
  const ropsSource=await ensureSource(c,sourceId,'ls-tractor-previous-mt2e-rops-attachments',MT2E_BROCHURE,'LS Tractor previous MT2E ROPS generation attachments',{
    generation:'Previous MT2E',
    fitment:{LL3301:['MT230E','MT235E','MT235HE'],LL3302:['MT240E','MT240HE'],LB1105:['MT230E','MT235E','MT235HE','MT240E','MT240HE']},
    currentCrossCheck:{loaders:CURRENT_LOADERS,backhoes:CURRENT_BACKHOES},
    sourcePolicy:'Generation-correct fitment follows the original MT2E brochure. Later live model pages can expose newer/replacement loader mappings (for example LL3302/LL3116 on MT235 pages); these do not overwrite the original-generation fitment.'
  });
  const cabSource=await ensureSource(c,sourceId,'ls-tractor-previous-mt2e-cab-attachments',CAB_BROCHURE,'LS Tractor previous MT2E Cabin generation attachments',{
    generation:'Previous MT2E', verifiedLoader:{LL3116:['MT235EC','MT235HEC','MT240HEC']},
    deferredBackhoe:'The cabin brochure prints LB2104 but labels its tractor application XR3100 Series; current cab HTML pages instead list LB1105. Cab backhoe compatibility remains intentionally unresolved.',
    laterHtmlNote:'Current cab model pages may also list LL3302, but the generation cabin brochure explicitly lists LL3116 as the all-series loader; archive normalization uses LL3116.'
  });

  const attachments=[
   {slug:'ll3300',type:'front-loader',model:'LL3300',lift:'1,609 lb at pivot pin (generation MT225E/MT225HE brochure); current centralized catalog later publishes 1,896 lb at pivot pin / 1.5 m height',height:'92 in generation brochure; current centralized catalog later publishes 91.1 in',config:'Previous-generation MT225E/MT225HE front loader. Generation brochure: 66 in bucket; 92 in max lift; 63.2 in dumped clearance; 15.7 in reach at max height; 58° dump; 40° rollback; 7.6 in digging depth; 50.6 in carry height; 1,609 lb lift at pivot pin; 2,701 lb breakout; approx. 648 lb without bucket.',source:mt225Source,machines:['mt225e','mt225he']},
   {slug:'ll3301',type:'front-loader',model:'LL3301',lift:'1,688 lb at pivot pin (generation previous-MT2E brochure)',height:'94 in maximum lift height',config:'Previous-generation MT230E/MT235E/MT235HE front loader. 66 in bucket; 94 in max lift; 65.6 in dumped clearance; 11.5 in reach at max height; 57° dump; 40° rollback; 5.5 in digging depth; 53 in carry height; 1,688 lb lift at pivot pin; 2,855 lb breakout; approx. 650 lb without bucket.',source:ropsSource,machines:['mt230e','mt235e','mt235he']},
   {slug:'ll3302',type:'front-loader',model:'LL3302',lift:'2,153 lb at pivot pin (generation previous-MT2E brochure; current centralized catalog also publishes 2,153 lb at pivot pin / maximum height)',height:'94 in maximum lift height',config:'Previous-generation MT240E/MT240HE front loader. 66 in bucket; 94 in max lift; 65.6 in dumped clearance; 11.5 in reach at max height; 57° dump; 40° rollback; 5.5 in digging depth; 53 in carry height; 2,153 lb lift at pivot pin; 3,579 lb breakout; approx. 653 lb without bucket.',source:ropsSource,machines:['mt240e','mt240he']},
   {slug:'ll3116',type:'front-loader',model:'LL3116',lift:'2,178–2,185 lb at pivot pin across previous MT2E Cabin Series applications (generation brochure)',height:'92.7–94.4 in across cabin applications',config:'Previous-generation MT2E Cabin Series front loader. Generation cabin brochure lists LL3116 for all cabin-series tractors with 66 in bucket; 92.7–94.4 in max lift; 61.7–64.4 in dumped clearance; 15–15.4 in reach; 48–52° dump; 41–43° rollback; 4.3 in digging depth; 49.1–51.4 in carry height; 2,178–2,185 lb pivot-pin lift; 3,450–3,612 lb breakout; approx. 717 lb without bucket.',source:cabSource,machines:['mt235ec','mt235hec','mt240hec']},
   {slug:'lb1106',type:'backhoe',model:'LB1106',lift:null,height:null,config:'Previous-generation MT225E/MT225HE backhoe. Generation brochure: 76.3 in digging depth; 113.1 in reach from swing pivot; 63.6 in loading height; 180° swing arc; 77.2 in transport height; 180° bucket rotation; 68.7 in stabilizer spread down; 46.4 in up; 2,817 lb bucket digging force. Current centralized LB1100/LB1105/LB1106 catalog publishes a later/different grouped specification set, preserved in provenance.',source:mt225Source,machines:['mt225e','mt225he']},
   {slug:'lb1105',type:'backhoe',model:'LB1105',lift:null,height:null,config:'Previous-generation MT230E/MT235E/MT235HE/MT240E/MT240HE backhoe. Generation brochure: 76.3 in digging depth; 113.1 in reach from swing pivot; 63.6 in loading height; 180° swing arc; 77.2 in transport height; 180° bucket rotation; 68.7 in stabilizer spread down; 46.4 in up; 2,817 lb bucket digging force. Current centralized LB1100/LB1105/LB1106 catalog publishes a later/different grouped specification set, preserved in provenance.',source:ropsSource,machines:['mt230e','mt235e','mt235he','mt240e','mt240he']},
  ] as const;

  for(const a of attachments){
    await c.query(`INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES(?,?,?,?,?,?,?,'verified') ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),attachment_type=VALUES(attachment_type),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,[manufacturerId,a.type,a.model,a.slug,a.lift,a.height,a.config]);
    const attachmentId=await id(c,`SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`,[manufacturerId,a.slug]);
    for(const machineSlug of a.machines){await link(c,manufacturerId,machineSlug,attachmentId,`${a.model} generation-correct compatibility is preserved from the LS Tractor brochure for this previous MT2E generation.`,a.source);}
  }
 }
};
