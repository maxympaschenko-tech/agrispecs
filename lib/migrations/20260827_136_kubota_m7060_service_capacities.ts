import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const SOURCE_URL = 'https://www.kubotausa.com/docs/default-source/sales1source/bid-specs-m6060-and-7060.pdf?sfvrsn=763eb21d_2';
const SOURCE_EXTERNAL_ID = 'kubota-m6060-m7060-wsm-service-2017-us';

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota M7060 service-capacity migration dependency.');
  return Number(rows[0].id);
}

export const kubotaM7060ServiceCapacitiesMigration: DbMigration = {
  id: '20260827_136_kubota_m7060_service_capacities',
  description: 'Add source-backed Kubota M7060 service refill capacities from the Kubota USA 2017 WSM as a separate service-reference version',
  async apply(connection) {
    const machineId = await selectId(connection, `
      SELECT m.id FROM machines m
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='kubota' AND m.slug='m7060' LIMIT 1
    `);

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

    const [existingSource] = await connection.query<IdRow[]>(
      `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
      [SOURCE_EXTERNAL_ID],
    );
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,published_date)
         VALUES (?,?,?,?,?)`,
        [sourceId,SOURCE_URL,SOURCE_EXTERNAL_ID,'Kubota M6060/M7060 WSM - US service capacities','2017-04-01'],
      );
      sourceRecordId = Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO machine_versions
        (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
       VALUES (?,'us-service-reference-2017','US','United States','M7060 service refill reference from Kubota USA WSM',FALSE,?,?)
       ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),
         is_current=FALSE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
      [machineId,sourceRecordId,'Service capacities are from the Kubota USA WSM issued in 2017. Confirm the exact tractor PIN and current operator manual before servicing a later production machine.'],
    );
    const versionId = await selectId(
      connection,
      `SELECT id FROM machine_versions WHERE machine_id=? AND slug='us-service-reference-2017' LIMIT 1`,
      [machineId],
    );

    const capacities = [
      { key:'engine-oil-service-2017', label:'Engine oil with filter', config:'', value:12, unit:'L', fluid:'Kubota-approved CJ-4 engine oil', notes:'12.7 US qt. WSM value for the M7060 DPF engine.' },
      { key:'coolant-service-2017', label:'Cooling system', config:'', value:8, unit:'L', fluid:'Fresh clean water with antifreeze', notes:'8.5 US qt; recovery tank is additional.' },
      { key:'transmission-service-2017', label:'Transmission case', config:'', value:56, unit:'L', fluid:'Kubota Super UDT2', notes:'59.2 US qt.' },
      { key:'front-differential-service-2017', label:'Front differential case', config:'4WD', value:5.5, unit:'L', fluid:'Kubota Super UDT2 or SAE 80-SAE 90 gear oil', notes:'5.8 US qt.' },
      { key:'front-axle-gear-service-2017', label:'Front axle gear case', config:'4WD', value:3.5, unit:'L', fluid:'Kubota Super UDT2 or SAE 80-SAE 90 gear oil', notes:'3.7 US qt.' },
    ] as const;

    for (const capacity of capacities) {
      await connection.query(
        `INSERT INTO machine_capacities (
          machine_id,machine_version_id,system_key,label,configuration,value_number,unit,fluid_name,notes,source_record_id,confidence
        ) VALUES (?,?,?,?,?,?,?,?,?,?,'official')
        ON DUPLICATE KEY UPDATE
          machine_version_id=VALUES(machine_version_id),label=VALUES(label),value_number=VALUES(value_number),unit=VALUES(unit),
          fluid_name=VALUES(fluid_name),notes=VALUES(notes),confidence='official'`,
        [machineId,versionId,capacity.key,capacity.label,capacity.config,capacity.value,capacity.unit,capacity.fluid,capacity.notes,sourceRecordId],
      );
    }
  },
};
