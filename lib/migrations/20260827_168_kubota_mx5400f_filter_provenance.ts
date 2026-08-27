import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow=RowDataPacket&{id:number};

const SOURCE_URL='https://www.messicks.com/catalogs/kubota/mx5400f';
const SOURCE_EXTERNAL_ID='messicks-kubota-mx5400f-service-filters';
const FILTERS=['HH16432430','HH1J143172','R140142270','HHTA037710'] as const;

async function selectId(connection:Parameters<DbMigration['apply']>[0],sql:string,params:unknown[]=[]){
  const [rows]=await connection.query<IdRow[]>(sql,params);
  if(!rows[0]) throw new Error('Missing Kubota MX5400F filter provenance dependency.');
  return Number(rows[0].id);
}

export const kubotaMX5400FFilterProvenanceMigration:DbMigration={
  id:'20260827_168_kubota_mx5400f_filter_provenance',
  description:'Correct MX5400F 2WD service-filter provenance to the model-specific dealer catalog',
  async apply(connection){
    const machineId=await selectId(connection,`
      SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='kubota' AND m.slug='mx5400' LIMIT 1
    `);
    const versionId=await selectId(connection,`
      SELECT id FROM machine_versions WHERE machine_id=? AND slug='us-current-gear-2wd' LIMIT 1
    `,[machineId]);

    let [sourceRows]=await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`);
    let sourceId=sourceRows[0]?.id?Number(sourceRows[0].id):0;
    if(!sourceId){
      const [result]=await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Messicks','messicks.com','supplier','secondary')`);
      sourceId=Number(result.insertId);
    }

    const [existing]=await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[SOURCE_EXTERNAL_ID]);
    let sourceRecordId=existing[0]?.id?Number(existing[0].id):0;
    if(!sourceRecordId){
      const [result]=await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota MX5400F parts catalog - 2WD service-filter references'],
      );
      sourceRecordId=Number(result.insertId);
    }

    await connection.query(`
      UPDATE machine_parts mp
      JOIN parts p ON p.id=mp.part_id
      JOIN manufacturers pmf ON pmf.id=p.manufacturer_id
      SET mp.source_record_id=?,
          mp.fitment_note=CONCAT('Messicks MX5400F 2WD catalog lists ',p.part_number,' for this model. Confirm exact tractor serial before ordering.'),
          mp.configuration_note='MX5400F 2WD gear-drive service-filter reference',
          mp.fitment_confidence='high'
      WHERE mp.machine_id=? AND mp.machine_version_id=?
        AND pmf.slug='kubota'
        AND p.normalized_part_number IN ('HH16432430','HH1J143172','R140142270','HHTA037710')
    `,[sourceRecordId,machineId,versionId]);
  },
};
