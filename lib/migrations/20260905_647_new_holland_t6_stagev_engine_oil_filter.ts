import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_PART = '5802872619';
const LEGACY_PARTS = ['42579931', '5802432482'] as const;
const VERSION_SLUG = 'stage-v-2020-market-unspecified';

const models = [
  { slug: 't6-145', model: 'T6.145', source: 'messicks' },
  { slug: 't6-155', model: 'T6.155', source: 'messicks' },
  { slug: 't6-160', model: 'T6.160', source: 'messicks' },
  { slug: 't6-175', model: 'T6.175', source: 'messicks' },
  { slug: 't6-180', model: 'T6.180', source: 'trivino' },
] as const;

const configurations = ['AutoCommand', 'Dynamic Command', 'Electro Command'] as const;

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing T6 Stage V engine-oil-filter migration dependency.');
  return Number(rows[0].id);
}

async function source(connection: Parameters<DbMigration['apply']>[0], name: string, domain: string, type: 'manufacturer' | 'supplier', authority: 'official' | 'secondary') {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name=? AND domain=? ORDER BY id LIMIT 1`, [name, domain]);
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?,?,?,?)`, [name, domain, type, authority]);
  return Number(result.insertId);
}

async function record(connection: Parameters<DbMigration['apply']>[0], sourceId: number, externalId: string, url: string, title: string, raw: unknown) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [externalId]);
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`, [sourceId, url, externalId, title, JSON.stringify(raw)]);
  return Number(result.insertId);
}

export const newHollandT6StageVEngineOilFilterMigration: DbMigration = {
  id: '20260905_647_new_holland_t6_stagev_engine_oil_filter',
  description: 'Add source-backed Stage V T6.145-T6.180 engine oil filter 5802872619 and predecessor history without asserting current-US fitment',
  async apply(connection) {
    const manufacturerId = await id(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await id(connection, `SELECT id FROM part_categories WHERE slug='engine-oil-filters' LIMIT 1`);

    await connection.query(`INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status) VALUES (?,?,?,?,?,'verified') ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`, [manufacturerId, categoryId, CURRENT_PART, CURRENT_PART, 'Engine Oil Filter']);
    const currentPartId = await id(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, CURRENT_PART]);

    for (const legacy of LEGACY_PARTS) {
      await connection.query(`INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status) VALUES (?,?,?,?,?,'verified') ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`, [manufacturerId, categoryId, legacy, legacy, 'Engine Oil Filter']);
    }

    const myCnhSource = await source(connection, 'MyCNH Store', 'mycnhstore.com', 'manufacturer', 'official');
    await record(connection, myCnhSource, 'mycnh-5802872619-engine-oil-filter-identity-2026-09', 'https://www.mycnhstore.com/eu/en/newhollandag/cn/engine-oil-filter/p/5802872619', 'MyCNH 5802872619 Engine Oil Filter identity', {
      role: 'Official CNH part identity only',
      partNumber: CURRENT_PART,
      identity: 'Engine Oil Filter',
      guardrail: 'The MyCNH product page establishes part identity; exact T6 model/transmission fitment is sourced separately.',
    });

    const messicksSource = await source(connection, "Messick's", 'messicks.com', 'supplier', 'secondary');
    const messicksRecord = await record(connection, messicksSource, 'messicks-5802872619-t6-stagev-fitment-2026-09', 'https://www.messicks.com/parts/new-holland/5802872619', "Messick's 5802872619 T6 Stage V maintenance-filter fitment", {
      role: 'Exact Stage V model/transmission fitment evidence',
      models: ['T6.145','T6.155','T6.160','T6.175'],
      configurations: [...configurations],
      catalogStart: '07/20',
      evidence: 'The part page lists 5802872619 under MAINTENANCE PARTS - FILTERS for Stage V AutoCommand, Dynamic Command and Electro Command T6 families.',
      guardrail: 'Market is not stated in the indexed T6 rows, so these records are not attached to the current United States machine version.',
    });

    const trivinoSource = await source(connection, 'Agricola Trivino', 'agricolatrivino.com', 'supplier', 'secondary');
    const trivinoRecord = await record(connection, trivinoSource, 'agricola-trivino-5802872619-t6-180-stagev-fitment-2026-09', 'https://agricolatrivino.com/producto/filtro-aceite-motor/', 'Agricola Trivino 5802872619 T6.180 Stage V fitment', {
      role: 'Exact T6.180 Stage V model/transmission fitment evidence',
      configurations: [...configurations],
      catalogStart: '07/20',
      guardrail: 'Market is not specified, so the fitment is stored in a non-current market-unspecified version.',
    });

    const replacementRecord = await record(connection, messicksSource, 'messicks-5802872619-replaces-42579931-5802432482-2026-09', 'https://www.messicks.com/parts/new-holland/5802872619', "Messick's 5802872619 replacement listing", {
      currentPartNumber: CURRENT_PART,
      legacyPartNumbers: [...LEGACY_PARTS],
      statement: '5802872619 replaces 42579931 and 5802432482.',
      guardrail: 'Replacement history does not automatically transfer machine fitment to predecessor numbers.',
    });

    for (const legacy of LEGACY_PARTS) {
      const legacyId = await id(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, legacy]);
      await connection.query(`INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id) VALUES (?,?,'replaces',?) ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`, [legacyId, currentPartId, replacementRecord]);
    }

    for (const model of models) {
      const machineId = await id(connection, `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`, [model.slug]);
      const fitmentRecord = model.source === 'messicks' ? messicksRecord : trivinoRecord;

      await connection.query(`INSERT INTO machine_versions (machine_id,slug,market_code,market_name,model_year_start,model_year_end,configuration,is_current,source_record_id,notes) VALUES (?,?,NULL,'Market not specified',NULL,NULL,'Stage V tractor family from 07/20',FALSE,?,?) ON DUPLICATE KEY UPDATE market_code=NULL,market_name='Market not specified',configuration=VALUES(configuration),is_current=FALSE,source_record_id=VALUES(source_record_id),notes=VALUES(notes)`, [machineId, VERSION_SLUG, fitmentRecord, 'Exact Stage V parts-catalog context. Market is not stated in the fitment rows, so this version is intentionally separate from the current United States version.']);
      const versionId = await id(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION_SLUG]);

      for (const configuration of configurations) {
        const note = `${configuration}, Stage V, catalog family from 07/20, market not specified`;
        const fitmentNote = `${CURRENT_PART} Engine Oil Filter is directly listed for ${model.model} ${configuration} Stage V in the cited maintenance-parts catalog. Market is not stated; verify build and regional parts book before ordering.`;
        const [existing] = await connection.query<IdRow[]>(`SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`, [machineId, currentPartId, versionId, note]);
        if (existing[0]) {
          await connection.query(`UPDATE machine_parts SET fitment_note=?,fitment_confidence='high',source_record_id=? WHERE id=?`, [fitmentNote, fitmentRecord, Number(existing[0].id)]);
        } else {
          await connection.query(`INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id) VALUES (?,?,?,?,?,'high',?)`, [machineId, currentPartId, versionId, note, fitmentNote, fitmentRecord]);
        }
      }
    }
  },
};
