import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SERIES_URL = 'https://lstractorusa.com/series/mt2/';
const fitments = [
  { machineSlug:'mt226hc', loaderSlug:'ll3002', modelUrl:'https://lstractorusa.com/tractor/mt226hc/' },
  { machineSlug:'mt232h', loaderSlug:'ll3003', modelUrl:'https://lstractorusa.com/tractor/new-mt232h/' },
  { machineSlug:'mt232hc', loaderSlug:'ll3003', modelUrl:'https://lstractorusa.com/tractor/new-mt232hc/' },
  { machineSlug:'mt242h', loaderSlug:'ll3003', modelUrl:'https://lstractorusa.com/tractor/new-mt242h/' },
  { machineSlug:'mt242hc', loaderSlug:'ll3003', modelUrl:'https://lstractorusa.com/tractor/new-mt242hc/' },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql:string, params:unknown[]=[]){
  const [rows]=await c.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('LS Tractor MT2 loader-fitment dependency missing');
  return Number(rows[0].id);
}

export const lsTractorMt2LoaderFitmentMigration: DbMigration = {
  id:'20260830_375_ls_tractor_mt2_loader_fitment',
  description:'Add official LS Tractor LL3002/LL3003 fitment for current MT2 models',
  async apply(c){
    const manufacturerId=await id(c,`SELECT id FROM manufacturers WHERE slug='ls-tractor' LIMIT 1`);
    const sourceId=await id(c,`SELECT id FROM sources WHERE name='LS Tractor' AND domain='lstractorusa.com' LIMIT 1`);
    const externalId='ls-tractor-mt2-loader-fitment-current-us-2026-08';
    const [existing]=await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
    let sourceRecordId=existing[0]?.id?Number(existing[0].id):0;
    if(!sourceRecordId){
      const [inserted]=await c.query<ResultSetHeader>(
        `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
        [sourceId,SERIES_URL,externalId,'LS Tractor USA current MT2 loader fitment',JSON.stringify({market:'United States',captured:'2026-08-30',fitments,sourcePolicy:'Each current MT2 individual model page explicitly lists its front-end loader in the Attachments section. Existing verified LL3002/LL3003 attachment specs are reused; this migration adds only exact MT2 model fitment links.'})],
      );
      sourceRecordId=Number(inserted.insertId);
    }

    for(const fit of fitments){
      const machineId=await id(c,`SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,[manufacturerId,fit.machineSlug]);
      const attachmentId=await id(c,`SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`,[manufacturerId,fit.loaderSlug]);
      await c.query(
        `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES(?,?,?,?, 'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId,attachmentId,`Current LS Tractor USA model page explicitly lists ${fit.loaderSlug.toUpperCase()} as a front-end loader attachment.`,sourceRecordId],
      );
    }
  },
};
