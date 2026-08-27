import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type VersionSeed = {
  slug: string;
  configuration: string;
  transmission: string;
  ptoPower: number;
  ptoSpeed: string;
};

const SPEC_URL = 'https://www.kubotausa.com/docs/default-source/spec-sheets/m60series_spec.pdf?sfvrsn=4f8ae861_5';
const SPEC_EXTERNAL_ID = 'kubota-m60-spec-sheet-current-2026-08';
const PRODUCT_URL = 'https://www.kubotausa.com/equipment-series/m60-series';
const PRODUCT_EXTERNAL_ID = 'kubota-m60-series-current-2026-08';

const versions: VersionSeed[] = [
  {
    slug: 'us-current-8f8r',
    configuration: 'United States M7060 8F/8R Hydraulic Shuttle configuration (HFC / HD / HDC)',
    transmission: '8 forward / 8 reverse Hydraulic Shuttle',
    ptoPower: 64,
    ptoSpeed: '540 rpm; 540E available as an option on F8/R8 configurations',
  },
  {
    slug: 'us-current-12f12r',
    configuration: 'United States M7060 12F/12R Hydraulic Shuttle configuration (HD12 / HDC12)',
    transmission: '12 forward / 12 reverse Hydraulic Shuttle',
    ptoPower: 62,
    ptoSpeed: '540 / 540E rpm',
  },
];

const definitions = [
  ['Engine','engine.make','Engine manufacturer','text',null,1],
  ['Engine','engine.model','Engine model','text',null,2],
  ['Engine','engine.type','Engine type','text',null,3],
  ['Engine','engine.cylinders','Cylinders','integer',null,4],
  ['Engine','engine.aspiration','Aspiration','text',null,5],
  ['Engine','engine.displacement','Displacement','decimal','L',6],
  ['Engine','engine.gross_power','Gross engine power','decimal','hp',7],
  ['Engine','engine.net_power','Net engine power','decimal','hp',8],
  ['Engine','engine.rated_speed','Rated engine speed','integer','rpm',9],
  ['Engine','engine.fuel_system','Fuel system','text',null,10],
  ['Transmission','transmission.standard','Transmission','text',null,10],
  ['PTO','pto.rated_power','PTO power','decimal','hp',10],
  ['PTO','pto.rear_description','Rear PTO','text',null,20],
  ['Capacities','capacities.fuel_tank_variants','Fuel tank capacity','text',null,10],
  ['Electrical','electrical.alternator_options','Alternator','text',null,10],
  ['Steering & Brakes','steering.type','Steering','text',null,10],
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota M7060 migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
) {
  const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (existing[0]) return Number(existing[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId,url,externalId,title],
  );
  return Number(result.insertId);
}

async function upsertSpec(
  connection: Parameters<DbMigration['apply']>[0],
  machineId: number,
  versionId: number,
  definitionId: number,
  sourceRecordId: number,
  value: string | number,
  unit: string | null = null,
) {
  await connection.query(
    `INSERT INTO machine_specs
      (machine_id,machine_version_id,spec_definition_id,value_text,value_number,unit,source_record_id,confidence)
     VALUES (?,?,?,?,?,?,?,'official')
     ON DUPLICATE KEY UPDATE value_text=VALUES(value_text),value_number=VALUES(value_number),unit=VALUES(unit),
       source_record_id=VALUES(source_record_id),confidence='official'`,
    [machineId,versionId,definitionId,typeof value === 'string' ? value : null,typeof value === 'number' ? value : null,unit,sourceRecordId],
  );
}

export const kubotaM7060CurrentSpecsMigration: DbMigration = {
  id: '20260827_133_kubota_m7060_current_specs',
  description: 'Add current official Kubota USA M7060 specification sets for 8F/8R and 12F/12R configurations',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const machineId = await selectId(connection, `
      SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='kubota' AND m.slug='m7060' LIMIT 1
    `);

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='Kubota' AND domain='kubotausa.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('Kubota','kubotausa.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const specSourceId = await ensureSourceRecord(
      connection,sourceId,SPEC_EXTERNAL_ID,SPEC_URL,'Kubota USA M60 Series current specification sheet',
    );
    await ensureSourceRecord(
      connection,sourceId,PRODUCT_EXTERNAL_ID,PRODUCT_URL,'Kubota USA M60 Series current product page',
    );

    const definitionIds = new Map<string,number>();
    for (const [section,key,label,valueType,canonicalUnit,displayOrder] of definitions) {
      await connection.query(
        `INSERT INTO spec_definitions (section,spec_key,label,value_type,canonical_unit,display_order)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE section=VALUES(section),label=VALUES(label),value_type=VALUES(value_type),
           canonical_unit=VALUES(canonical_unit),display_order=VALUES(display_order)`,
        [section,key,label,valueType,canonicalUnit,displayOrder],
      );
      definitionIds.set(key,await selectId(connection,`SELECT id FROM spec_definitions WHERE spec_key=? LIMIT 1`,[key]));
    }
    const def = (key: string) => {
      const id = definitionIds.get(key);
      if (!id) throw new Error(`Missing Kubota spec definition ${key}`);
      return id;
    };

    for (const version of versions) {
      await connection.query(
        `INSERT INTO machine_versions
          (machine_id,slug,market_code,market_name,configuration,is_current,source_record_id,notes)
         VALUES (?,?,'US','United States',?,TRUE,?,?)
         ON DUPLICATE KEY UPDATE market_code='US',market_name='United States',configuration=VALUES(configuration),
           is_current=TRUE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`,
        [machineId,version.slug,version.configuration,specSourceId,
          'Current Kubota USA M60 Series source. The 8F/8R and 12F/12R configurations are kept separate where PTO or transmission specifications differ.'],
      );
      const versionId = await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,[machineId,version.slug]);

      await upsertSpec(connection,machineId,versionId,def('engine.make'),specSourceId,'Kubota');
      await upsertSpec(connection,machineId,versionId,def('engine.model'),specSourceId,'V3307-CR-TE4');
      await upsertSpec(connection,machineId,versionId,def('engine.type'),specSourceId,'4-cylinder in-line diesel, common rail, direct injection');
      await upsertSpec(connection,machineId,versionId,def('engine.cylinders'),specSourceId,4);
      await upsertSpec(connection,machineId,versionId,def('engine.aspiration'),specSourceId,'Turbocharged');
      await upsertSpec(connection,machineId,versionId,def('engine.displacement'),specSourceId,3.331,'L');
      await upsertSpec(connection,machineId,versionId,def('engine.gross_power'),specSourceId,72.1,'hp');
      await upsertSpec(connection,machineId,versionId,def('engine.net_power'),specSourceId,71,'hp');
      await upsertSpec(connection,machineId,versionId,def('engine.rated_speed'),specSourceId,2400,'rpm');
      await upsertSpec(connection,machineId,versionId,def('engine.fuel_system'),specSourceId,'Common Rail System (CRS), direct injection');
      await upsertSpec(connection,machineId,versionId,def('transmission.standard'),specSourceId,version.transmission);
      await upsertSpec(connection,machineId,versionId,def('pto.rated_power'),specSourceId,version.ptoPower,'hp');
      await upsertSpec(connection,machineId,versionId,def('pto.rear_description'),specSourceId,version.ptoSpeed);
      await upsertSpec(connection,machineId,versionId,def('capacities.fuel_tank_variants'),specSourceId,'ROPS: 18.5 US gal (70 L); Cab: 23.8 US gal (90 L)');
      await upsertSpec(connection,machineId,versionId,def('electrical.alternator_options'),specSourceId,'ROPS: 45 A; Cab: 60 A; 100 A optional');
      await upsertSpec(connection,machineId,versionId,def('steering.type'),specSourceId,'Hydrostatic power steering');
    }

    await connection.query(`UPDATE machines SET data_status='partial' WHERE id=?`,[machineId]);
  },
};
