import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const PART_NUMBER='1J770-05810';
const NORMALIZED='1J77005810';
const SOURCE_URL='https://www.messicks.com/parts/kubota/1j770-05810';
const SOURCE_EXTERNAL_ID='messicks-kubota-1j770-05810-mx-current-fitment';

const versions=[
  ['mx4900','us-current-gear-4wd'],['mx4900','us-current-hst-4wd'],
  ['mx5400','us-current-gear-2wd'],['mx5400','us-current-gear-4wd'],['mx5400','us-current-hst-4wd'],
  ['mx6000','us-current-hst-4wd'],
] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota MX oil-separator migration dependency.');
  return Number(rows[0].id);
}

export const kubotaMXOilSeparatorFilterMigration:DbMigration={
  id:'20260827_169_kubota_mx_oil_separator_filter',
  description:'Add source-backed 1J770-05810 oil-separator element fitment across current Kubota MX configurations',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Oil Separator Filters','oil-separator-filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug='oil-separator-filters' LIMIT 1`);

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
       VALUES (?,?,?,?,?,?,'partial')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),data_status=IF(data_status='verified','verified','partial')`,
      [manufacturerId,categoryId,PART_NUMBER,NORMALIZED,'Oil Separator Element Kit','Kubota engine oil-separator element kit listed across current MX4900, MX5400 and MX6000 dealer parts diagrams.'],
    );
    const partId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,NORMALIZED]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`);
      sourceId=Number(result.insertId);
    }
    const [existingSource]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[SOURCE_EXTERNAL_ID]);
    let sourceRecordId=existingSource[0]?.id?Number(existingSource[0].id):0;
    if(!sourceRecordId){
      const [result]=await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota 1J770-05810 oil separator element kit - MX Series model fitment'],
      );
      sourceRecordId=Number(result.insertId);
    }

    for(const [modelSlug,versionSlug] of versions){
      const machineId=await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,[modelSlug]);
      const versionId=await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,versionSlug]);
      const [existing]=await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND machine_version_id=? AND part_id=? AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL ORDER BY id DESC LIMIT 1`,
        [machineId,versionId,partId],
      );
      const fitmentNote=`Messicks' ${PART_NUMBER} fitment listing includes the ${modelSlug.toUpperCase()} model family. Confirm exact tractor serial before ordering.`;
      const configurationNote=`${modelSlug.toUpperCase()} ${versionSlug==='us-current-hst-4wd'?'HST':'gear-drive'} oil-separator service reference`;
      if(existing[0]){
        await connection.query(`UPDATE machine_parts SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='high' WHERE id=?`,[fitmentNote,configurationNote,sourceRecordId,Number(existing[0].id)]);
      }else{
        await connection.query(
          `INSERT INTO machine_parts (machine_id,machine_version_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence) VALUES (?,?,?,?,?,?,'high')`,
          [machineId,versionId,partId,fitmentNote,configurationNote,sourceRecordId],
        );
      }
    }
  },
};
