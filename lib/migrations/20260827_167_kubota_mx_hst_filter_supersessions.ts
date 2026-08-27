import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

type Replacement={oldNumber:string;oldNormalized:string};

const CURRENT_NORMALIZED='HHTA059900';
const SOURCE_URL='https://www.messicks.com/parts/kubota/hhta0-59900';
const replacements:Replacement[]=[
  {oldNumber:'TA240-59900',oldNormalized:'TA24059900'},
  {oldNumber:'TA240-59901',oldNormalized:'TA24059901'},
  {oldNumber:'V0511-65320',oldNormalized:'V051165320'},
];

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota MX HST-filter supersession dependency.');
  return Number(rows[0].id);
}

export const kubotaMXHSTFilterSupersessionsMigration:DbMigration={
  id:'20260827_167_kubota_mx_hst_filter_supersessions',
  description:'Add legacy Kubota HST hydraulic-filter replacements to current HHTA0-59900',
  async apply(connection){
    const manufacturerId=await selectId(connection,`SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const categoryId=await selectId(connection,`SELECT id FROM part_categories WHERE slug='transmission-filters' LIMIT 1`);
    const currentPartId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,CURRENT_NORMALIZED]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`);
      sourceId=Number(result.insertId);
    }

    const sourceRecordIds=new Map<string,number>();
    for(const item of replacements){
      const externalId=`messicks-kubota-${item.oldNormalized.toLowerCase()}-replaced-by-hhta0-59900`;
      const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[externalId]);
      let sourceRecordId=existing[0]?.id?Number(existing[0].id):0;
      if(!sourceRecordId){
        const [result]=await connection.query<ResultSetHeader>(
          `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
          [sourceId,SOURCE_URL,externalId,`Kubota ${item.oldNumber} - replaced by HHTA0-59900`],
        );
        sourceRecordId=Number(result.insertId);
      }
      sourceRecordIds.set(item.oldNormalized,sourceRecordId);

      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId,categoryId,item.oldNumber,item.oldNormalized,'Legacy HST Hydraulic Filter',`Legacy Kubota hydraulic/HST filter number. Dealer catalog lists HHTA0-59900 as the current replacement.`],
      );
    }

    // Connect the graph only after every legacy node exists, so the migration stays order-independent.
    for(const item of replacements){
      const oldPartId=await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,item.oldNormalized]);
      const sourceRecordId=sourceRecordIds.get(item.oldNormalized);
      if(!sourceRecordId) throw new Error(`Missing supersession source for ${item.oldNumber}.`);
      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'replaces',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [oldPartId,currentPartId,sourceRecordId],
      );
    }
  },
};
