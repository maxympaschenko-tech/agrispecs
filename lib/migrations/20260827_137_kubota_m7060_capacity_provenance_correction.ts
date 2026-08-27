import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://www.kubotausa.com/docs/default-source/sales1source/m-60-series-bid-specs.pdf?sfvrsn=54fb02a5_2';
const SOURCE_EXTERNAL_ID = 'kubota-m7060-capacities-bid-spec-2013-02-25';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota M7060 capacity provenance correction dependency.');
  return Number(rows[0].id);
}

export const kubotaM7060CapacityProvenanceCorrectionMigration: DbMigration = {
  id: '20260827_137_kubota_m7060_capacity_provenance_correction',
  description: 'Correct source provenance for M7060 transmission and front-axle service capacities using the Kubota USA document that explicitly lists those values',
  async apply(connection) {
    const machineId = await selectId(connection, `
      SELECT m.id FROM machines m
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='kubota' AND m.slug='m7060' LIMIT 1
    `);
    const versionId = await selectId(connection, `
      SELECT id FROM machine_versions WHERE machine_id=? AND slug='us-service-reference-2017' LIMIT 1
    `,[machineId]);

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level)
         VALUES ('Kubota','kubotausa.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [existing] = await connection.query<IdRow[]>(
      `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[SOURCE_EXTERNAL_ID],
    );
    let sourceRecordId = existing[0]?.id ? Number(existing[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,published_date)
         VALUES (?,?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota M7060 Utility Tractor specifications, capacities, dimensions and wheels','2013-02-25'],
      );
      sourceRecordId = Number(result.insertId);
    }

    // These three values were introduced in migration 136 with the correct values but an overly broad source assignment.
    // Remove those rows and recreate them with the Kubota USA source that explicitly lists 59.2 qt transmission
    // capacity and the 5.8 qt differential + 3.7 qt per bevel-gear-case front axle capacities.
    await connection.query(
      `DELETE FROM machine_capacities
       WHERE machine_id=? AND system_key IN (
         'transmission-service-2017','front-differential-service-2017','front-axle-gear-service-2017'
       )`,[machineId],
    );

    const capacities = [
      { key:'transmission-service-2017', label:'Transmission case', config:'', value:56, unit:'L', fluid:'Kubota Super UDT2', notes:'59.2 US qt (14.8 US gal) in the cited Kubota USA M7060 specification.' },
      { key:'front-differential-service-2017', label:'Front differential case', config:'4WD', value:5.5, unit:'L', fluid:'Kubota Super UDT2 or SAE 80-SAE 90 gear oil', notes:'5.8 US qt in the cited Kubota USA M7060 specification.' },
      { key:'front-axle-gear-service-2017', label:'Front axle bevel gear case', config:'Each 4WD bevel gear case', value:3.5, unit:'L', fluid:'Kubota Super UDT2 or SAE 80-SAE 90 gear oil', notes:'3.7 US qt per bevel gear case in the cited Kubota USA M7060 specification.' },
    ] as const;

    for (const capacity of capacities) {
      await connection.query(
        `INSERT INTO machine_capacities (
          machine_id,machine_version_id,system_key,label,configuration,value_number,unit,fluid_name,notes,source_record_id,confidence
        ) VALUES (?,?,?,?,?,?,?,?,?,?,'official')`,
        [machineId,versionId,capacity.key,capacity.label,capacity.config,capacity.value,capacity.unit,capacity.fluid,capacity.notes,sourceRecordId],
      );
    }
  },
};
