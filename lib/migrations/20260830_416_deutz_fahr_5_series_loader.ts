import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id:number };
const SOURCE_URL='https://deutz-fahramerica.com/wp-content/uploads/5-Series-Brochure-Specs.pdf';
const machines=['5105','5125'];

async function id(c:Parameters<DbMigration['apply']>[0],sql:string,p:unknown[]=[]){const[r]=await c.query<IdRow[]>(sql,p);if(!r[0])throw new Error('Deutz-Fahr 5 Series loader dependency missing');return Number(r[0].id)}
async function source(c:Parameters<DbMigration['apply']>[0],sid:number){const eid='deutz-fahr-america-fz46-33-1-current-us-2026-08';const raw={market:'United States',captured:'2026-08-30',model:'FZ46-33.1',fitment:['5105','5125'],maxLiftHeightPivotIn:152,maxLiftHeightUnderLevelBucketIn:143,clearanceDumpedIn:110,reachAtMaxLiftIn:28,maxDumpDeg:57,maxRollbackDeg:44,diggingDepthIn:8.3,liftCapacityPivotMaxHeightLb:3417,liftCapacityPivotGroundLb:5070,bucketRollbackForceGroundLb:6415,loaderBoomWeightLb:1330,measurementPolicy:'Lift figures are retained with their published measurement positions rather than collapsed into a single capacity.'};const[r]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[eid]);if(r[0])return Number(r[0].id);const[i]=await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,[sid,SOURCE_URL,eid,'Deutz-Fahr America FZ46-33.1 loader specifications',JSON.stringify(raw)]);return Number(i.insertId)}

export const deutzFahr5SeriesLoaderMigration:DbMigration={
 id:'20260830_416_deutz_fahr_5_series_loader',
 description:'Add official FZ46-33.1 front-loader fitment for current Deutz-Fahr America 5105 and 5125',
 async apply(c){
  const mf=await id(c,`SELECT id FROM manufacturers WHERE slug='deutz-fahr' LIMIT 1`),sid=await id(c,`SELECT id FROM sources WHERE name='Deutz-Fahr America' AND domain='deutz-fahramerica.com' LIMIT 1`),sr=await source(c,sid);
  await c.query(`INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status) VALUES(?,'front-loader','FZ46-33.1','fz46-33-1',?,?,?,'verified') ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,[mf,'3,417 lb at pivot pin / maximum lift height; 5,070 lb at pivot pin / ground level','152 in maximum lift height at pivot point','Deutz-Fahr America loader for 5105/5125. 143 in max lift under level bucket; 110 in dumped clearance; 28 in reach at max height; 57° dump; 44° rollback; 8.3 in digging depth; 6,415 lb rollback force at ground; approximately 1,330 lb loader boom.']);
  const aid=await id(c,`SELECT id FROM attachments WHERE manufacturer_id=? AND slug='fz46-33-1' LIMIT 1`,[mf]);
  for(const slug of machines){const mid=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,[mf,slug]);await c.query(`INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence) VALUES(?,?,?,?, 'official') ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,[mid,aid,'FZ46-33.1 is listed in the current Deutz-Fahr America 5 Series loader dimensional/specification table for 5105 and 5125.',sr]);}
 }
};
