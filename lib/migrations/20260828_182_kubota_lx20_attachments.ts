import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const SOURCE_URL='https://www.kubotausa.com/docs/default-source/brochure-sheets/3524_kubota_ktc_lx20_brochure_v9.pdf?sfvrsn=9d0b4c05_8';
const SOURCE_EXTERNAL_ID='kubota-lx20-la535-la545-bh77-attachments-2026-08';

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota LX20 attachment migration dependency.');
  return Number(rows[0].id);
}

export const kubotaLX20AttachmentsMigration:DbMigration={
  id:'20260828_182_kubota_lx20_attachments',
  description:'Add current official Kubota LX20 LA535/LA545 loader specifications and BH77 backhoe compatibility with narrow-model restrictions',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`);
      sourceId=Number(result.insertId);
    }
    const [existingSource]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[SOURCE_EXTERNAL_ID]);
    let sourceRecordId=existingSource[0]?.id?Number(existingSource[0].id):0;
    if(!sourceRecordId){
      const [result]=await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota USA LX20 Series brochure - LA535, LA545 and BH77 specifications'],
      );
      sourceRecordId=Number(result.insertId);
    }

    const attachmentSeeds=[
      {type:'front-loader',model:'LA535',slug:'la535',capacity:'1,067 lb at pivot pin/max height; 1,324 lb at pivot pin @ 1.5 m',height:'84.0 in maximum lift height at pivot pin',configuration:'Standard 2-lever quick coupler; optional mechanical self-leveling and Swift-Tach. Swift-Tach option is for ROPS tractors.'},
      {type:'front-loader',model:'LA545',slug:'la545',capacity:'1,100 lb at pivot pin/max height; 1,325 lb at pivot pin @ 1.5 m',height:'87.6 in maximum lift height at pivot pin',configuration:'Wide-boom loader with standard 2-lever quick coupler; optional mechanical self-leveling and Swift-Tach. Front loader is not compatible with LX3520DTN narrow tractor.'},
      {type:'backhoe',model:'BH77',slug:'bh77',capacity:'86.8 in digging depth at 2-ft flat bottom; 123.7 in reach from swing pivot',height:'123 in operating height fully raised',configuration:'180° swing arc; approximate net weight 824.5 lb excluding buckets and subframes. Kubota describes BH77 as performance matched to the LX20 Series; tractor-specific subframe requirements must be confirmed.'},
    ] as const;

    const attachmentIds=new Map<string,number>();
    for(const seed of attachmentSeeds){
      await connection.query(
        `INSERT INTO attachments (manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status)
         VALUES (?,?,?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE model_name=VALUES(model_name),lift_capacity_text=VALUES(lift_capacity_text),lift_height_text=VALUES(lift_height_text),configuration_text=VALUES(configuration_text),data_status='verified'`,
        [manufacturerId,seed.type,seed.model,seed.slug,seed.capacity,seed.height,seed.configuration],
      );
      attachmentIds.set(seed.slug,await selectId(connection,`SELECT id FROM attachments WHERE manufacturer_id=? AND attachment_type=? AND slug=? LIMIT 1`,[manufacturerId,seed.type,seed.slug]));
    }

    const machineIds=new Map<string,number>();
    for(const slug of ['lx2620','lx3520','lx4020'] as const){
      machineIds.set(slug,await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[slug]));
    }

    const fitments=[
      {machine:'lx2620',attachment:'la535',confidence:'official',note:'Kubota LX20 loader table pairs LA535 with the LX2620 platform. Confirm ROPS/cab hydraulic coupler and Swift-Tach kit requirements before installation.'},
      {machine:'lx3520',attachment:'la545',confidence:'official',note:'Kubota pairs LA545 with LX3520, but the official brochure explicitly excludes the LX3520DTN narrow model from front-loader compatibility.'},
      {machine:'lx4020',attachment:'la545',confidence:'official',note:'Kubota pairs LA545 with LX4020. Confirm ROPS/cab Swift-Tach and hydraulic-coupler configuration before installation.'},
      {machine:'lx2620',attachment:'bh77',confidence:'high',note:'Kubota describes BH77 as performance matched to the LX20 Series. Confirm the LX2620-specific subframe, three-point/mower interaction and tractor configuration before ordering.'},
      {machine:'lx3520',attachment:'bh77',confidence:'high',note:'Kubota describes BH77 as performance matched to the LX20 Series and publishes BH77 dimensions on an LX3520HSD. Confirm subframe compatibility for SU/cab/narrow configurations before ordering.'},
      {machine:'lx4020',attachment:'bh77',confidence:'high',note:'Kubota describes BH77 as performance matched to the LX20 Series. Confirm the LX4020-specific subframe and cab/ROPS configuration before ordering.'},
    ] as const;

    for(const fitment of fitments){
      const machineId=machineIds.get(fitment.machine);
      const attachmentId=attachmentIds.get(fitment.attachment);
      if(!machineId||!attachmentId) throw new Error(`Missing LX20 attachment fitment dependency ${fitment.machine}/${fitment.attachment}`);
      await connection.query(
        `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
         VALUES (?,?,?,?,?)
         ON DUPLICATE KEY UPDATE compatibility_note=VALUES(compatibility_note),source_record_id=VALUES(source_record_id),confidence=VALUES(confidence)`,
        [machineId,attachmentId,fitment.note,sourceRecordId,fitment.confidence],
      );
    }
  },
};
