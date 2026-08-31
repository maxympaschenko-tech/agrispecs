import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Seed = { slug: string; model: string; type: string; note: string };

const LIVE_URL = 'https://www.ventrac.com/products/tractors/45rc/attachments';
const SPEC_URL = 'https://www.ventrac.com/d/spec/45RC.pdf';

const attachments: Seed[] = [
  { slug:'hq682', model:'HQ682', type:'rough-cut-mower', note:'Tough Cut brush mower' },
  { slug:'msmu-finish-mowers', model:'MS/MU Finish Mowers', type:'finish-mower', note:'Current 45RC page groups compatible finish mowers under MSMU' },
  { slug:'mz480', model:'MZ480', type:'brush-cutter', note:'Brush cutter' },
  { slug:'he200', model:'HE200', type:'power-grapple', note:'Power grapple' },
  { slug:'he482', model:'HE482', type:'power-bucket', note:'Power bucket' },
  { slug:'kj520', model:'KJ520', type:'broom', note:'Broom' },
  { slug:'mj840', model:'MJ840', type:'contour-mower', note:'Contour mower' },
  { slug:'kg540', model:'KG540', type:'power-rake', note:'Power rake' },
  { slug:'mk960', model:'MK960', type:'wide-area-mower', note:'Wide area mower' },
  { slug:'kd-blades', model:'KD Blades', type:'dozer-blade', note:'Current 45RC page groups compatible blades under KD; current spec sheet includes KD482/KD602/KD722' },
  { slug:'mwmy-flail-mowers', model:'MW/MY Flail Mowers', type:'flail-mower', note:'Current 45RC page groups compatible flail mowers under MWMY' },
  { slug:'dc520', model:'DC520', type:'soil-cultivator', note:'Soil cultivator' },
  { slug:'ea600', model:'EA600', type:'aera-vator', note:'AERA-Vator' },
  { slug:'kl480', model:'KL480', type:'tiller', note:'Tiller' },
  { slug:'se530', model:'SE530', type:'v-blade', note:'V-Blade' },
  { slug:'kr502', model:'KR502', type:'landscape-rake', note:'Landscape rake' },
  { slug:'sp720', model:'SP720', type:'box-plow', note:'Box snow plow' },
  { slug:'ky400', model:'KY400', type:'trencher', note:'Trencher' },
  { slug:'eb480-aerator-family', model:'EB480 Aerators', type:'aerator', note:'Current 45RC page groups compatible aerators under EB480' },
  { slug:'ef300', model:'EF300', type:'leaf-plow', note:'Leaf plow' },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Ventrac 45RC attachment migration dependency missing');
  return Number(rows[0].id);
}
async function source(c: Parameters<DbMigration['apply']>[0], sourceId: number) {
  const externalId = 'ventrac-45rc-current-attachments-2026-08';
  const raw = {
    market:'United States', captured:'2026-08-31', currentLivePage:LIVE_URL, officialSpecSheet:SPEC_URL,
    liveCurrentCount:20,
    liveCurrentModels:attachments.map(a=>a.model),
    sourcePolicy:'Current live 45RC attachment page is primary for current fitment. The official 45RC spec sheet contains a broader approved-attachments list explicitly dated March 2025; those additional PDF-only products are not marked current here unless they also appear on the current live page.',
    familyPolicy:'Where Ventrac current page groups multiple models as one attachment family (MSMU finish mowers, KD blades, MWMY flail mowers, EB480 aerators), the database keeps a family attachment record rather than inventing one current exact model.'
  };
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(`INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`, [sourceId,LIVE_URL,externalId,'Ventrac current 45RC compatible attachments',JSON.stringify(raw)]);
  return Number(inserted.insertId);
}

export const ventrac45rcAttachmentsMigration: DbMigration = {
  id:'20260831_466_ventrac_45rc_attachments',
  description:'Add the twenty current Ventrac 45RC attachment families/models from the live compatibility catalog',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='ventrac' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Ventrac' AND domain='ventrac.com' LIMIT 1`);
    const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug='45rc' LIMIT 1`, [manufacturerId]);
    const sourceRecordId = await source(c, sourceId);

    for (const a of attachments) {
      await c.query(
        `INSERT INTO attachments(manufacturer_id,attachment_type,model_name,slug,configuration_text,data_status)
         VALUES(?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE attachment_type=VALUES(attachment_type),model_name=VALUES(model_name),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId,a.type,a.model,a.slug,`${a.note}. Current compatible attachment for Ventrac 45RC/45RCN according to the live Ventrac attachment catalog.`],
      );
      const attachmentId = await id(c, `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId,a.slug]);
      await c.query(
        `INSERT INTO machine_attachments(machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES(?,?,?,?, 'official')
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence='official'`,
        [machineId,attachmentId,`${a.model} is listed on the current Ventrac 45RC compatible-products page. ${a.note}.`,sourceRecordId],
      );
    }
  }
};
