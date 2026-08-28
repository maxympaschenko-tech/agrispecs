import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};
type ModelSlug='m5-091'|'m5-111';
type PartSeed={partNumber:string;normalized:string;name:string;categorySlug:string;description:string};
type ModelSource={modelSlug:ModelSlug;url:string;externalId:string;title:string};

const parts:PartSeed[]=[
  {partNumber:'1G410-52300',normalized:'1G41052300',name:'Fuel Filter Kit',categorySlug:'fuel-filters',description:'Kubota fuel-filter service kit; exact fitment is stored per tractor version.'},
  {partNumber:'V0521-51940',normalized:'V052151940',name:'Fuel Separator Element Assembly',categorySlug:'fuel-water-separators',description:'Kubota fuel/water-separator service element; exact fitment is stored per tractor version.'},
  {partNumber:'55231-26150',normalized:'5523126150',name:'Inner Air Cleaner Element',categorySlug:'engine-air-filters',description:'Kubota secondary/safety engine-air cleaner element; exact fitment is stored per tractor version.'},
  {partNumber:'1J508-05812',normalized:'1J50805812',name:'Oil Separator Element Kit',categorySlug:'oil-separator-filters',description:'Kubota engine oil-separator element kit; exact fitment is stored per tractor version.'},
];

const sources:ModelSource[]=[
  {modelSlug:'m5-091',url:'https://www.messicks.com/catalogs/kubota/m5-091hdc/frequently-used-items/000040-frequently-used-items',externalId:'messicks-m5-091hdc-expanded-service-pack-2026-08',title:'Kubota M5-091HDC frequently used items - fuel, inner-air and oil-separator references'},
  {modelSlug:'m5-111',url:'https://www.messicks.com/catalogs/kubota/m5-111hdc/engine/420000-fuel-filter',externalId:'messicks-m5-111hdc-expanded-service-pack-2026-08',title:'Kubota M5-111HDC parts catalog - fuel, inner-air and oil-separator service references'},
];

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota M5 HDC service-pack migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(connection:Parameters<DbMigration['apply']>[0],sourceId:number,source:ModelSource){
  const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[source.externalId]);
  if(existing[0]) return Number(existing[0].id);
  const [result]=await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId,source.url,source.externalId,source.title],
  );
  return Number(result.insertId);
}

export const kubotaM5HDCServicePackMigration:DbMigration={
  id:'20260828_195_kubota_m5_hdc_service_pack',
  description:'Add direct model-specific fuel, separator, inner-air and oil-separator service references for current M5-091HDC and M5-111HDC cab variants',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Fuel / Water Separators','fuel-water-separators') ON DUPLICATE KEY UPDATE name=VALUES(name)`);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`,
      );
      sourceId=Number(result.insertId);
    }

    const partIds=new Map<string,number>();
    for(const part of parts){
      const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug=? LIMIT 1`,[part.categorySlug]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,categoryId,part.partNumber,part.normalized,part.name,part.description],
      );
      partIds.set(part.normalized,await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,part.normalized]));
    }

    for(const source of sources){
      const machineId=await selectId(connection,
        `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,
        [source.modelSlug],
      );
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug='us-current-hdc-4wd-cab' LIMIT 1`,[machineId]);
      const sourceRecordId=await ensureSourceRecord(connection,sourceId,source);

      for(const part of parts){
        const partId=partIds.get(part.normalized);
        if(!partId) throw new Error(`Missing M5 HDC service part ${part.partNumber}`);
        const [existing]=await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND machine_version_id=? AND part_id=?
             AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL ORDER BY id DESC LIMIT 1`,
          [machineId,versionId,partId],
        );
        const fitmentNote=`${source.title} lists ${part.partNumber} for this HDC configuration. Confirm tractor serial number before ordering.`;
        const configurationNote='Current US HDC 4WD cab model-specific dealer-catalog service reference';
        if(existing[0]){
          await connection.query(
            `UPDATE machine_parts SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='high' WHERE id=?`,
            [fitmentNote,configurationNote,sourceRecordId,Number(existing[0].id)],
          );
        }else{
          await connection.query(
            `INSERT INTO machine_parts (machine_id,machine_version_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence)
             VALUES (?,?,?,?,?,?,'high')`,
            [machineId,versionId,partId,fitmentNote,configurationNote,sourceRecordId],
          );
        }
      }
    }
  },
};
