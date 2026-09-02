import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const CURRENT_VERSION = 'united-states-current-2026-08';
const OLD_PART = 'MT40318591';
const NEW_PART = '92287748';
const DEALER_URL = 'https://www.newhollandrochester.com/shop/92287748/';
const DEALER_EXTERNAL_ID = 'new-holland-rochester-92287748-boomer-fitment-replacement-2026-09';
const MYCNH_URL = 'https://www.mycnhstore.com/es/es/newhollandag/categora/filtros/filtro-de-aceite-de-motor/filtro-de-aceite-de/p/92287748';
const MYCNH_EXTERNAL_ID = 'new-holland-mycnh-92287748-engine-oil-filter-2026-09';
const MACHINE_SLUGS = ['boomer-35', 'boomer-40', 'boomer-45', 'boomer-50', 'boomer-55'] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing New Holland Boomer engine-oil replacement dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  externalId: string,
  url: string,
  title: string,
  rawReference: unknown,
) {
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [externalId]);
  if (rows[0]?.id) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [sourceId, url, externalId, title, JSON.stringify(rawReference)],
  );
  return Number(result.insertId);
}

export const newHollandBoomerEngineOilReplacementMigration: DbMigration = {
  id: '20260902_584_new_holland_boomer_engine_oil_replacement',
  description: 'Add New Holland 92287748 engine-oil filter, Boomer 35-55 direct fitment, and documented MT40318591 replacement chain',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='engine-oil-filters' LIMIT 1`);
    const officialSourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='New Holland Parts' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`,
    );

    let [dealerRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='New Holland Rochester' AND domain='newhollandrochester.com' ORDER BY id LIMIT 1`,
    );
    let dealerSourceId = dealerRows[0]?.id ? Number(dealerRows[0].id) : 0;
    if (!dealerSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('New Holland Rochester','newhollandrochester.com','supplier','secondary')`,
      );
      dealerSourceId = Number(result.insertId);
    }

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
       VALUES (?,?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),description=VALUES(description),data_status='verified'`,
      [
        manufacturerId,
        categoryId,
        NEW_PART,
        NEW_PART,
        'Engine Oil Filter',
        'Current New Holland engine oil filter listed by MyCNH; New Holland Rochester documents it as replacing MT40318591 and lists Boomer 35, 40, 45, 50 and 55 applications.',
      ],
    );

    await ensureSourceRecord(
      connection,
      officialSourceId,
      MYCNH_EXTERNAL_ID,
      MYCNH_URL,
      'New Holland MyCNH 92287748 engine oil filter',
      {
        role: 'Official OEM identity for current replacement part',
        partNumber: NEW_PART,
        name: 'Engine Oil Filter',
      },
    );

    const dealerSourceRecordId = await ensureSourceRecord(
      connection,
      dealerSourceId,
      DEALER_EXTERNAL_ID,
      DEALER_URL,
      'New Holland Rochester 92287748 Boomer fitment and replacement listing',
      {
        role: 'Exact current Boomer model fitment and replacement-chain evidence',
        partNumber: NEW_PART,
        replacesPartNumber: OLD_PART,
        boomerModels: [
          { model: 'Boomer 35', catalogRange: '03/17-present' },
          { model: 'Boomer 40', catalogRange: '09/10-present' },
          { model: 'Boomer 45', catalogRange: '03/17-present' },
          { model: 'Boomer 50', catalogRange: '09/10-present' },
          { model: 'Boomer 55', catalogRange: '11/16-present' },
        ],
        caution: 'Dealer catalog fitment is stored as high-confidence secondary evidence; OEM identity is separately corroborated by MyCNH.',
      },
    );

    const oldPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, OLD_PART],
    );
    const newPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, NEW_PART],
    );

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [oldPartId, newPartId, dealerSourceRecordId],
    );

    for (const machineSlug of MACHINE_SLUGS) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [machineSlug],
      );
      const machineVersionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, CURRENT_VERSION],
      );
      const configurationNote = 'Current New Holland Boomer application; exact serial/build date should be verified before ordering';
      const fitmentNote = `New Holland Rochester lists ${NEW_PART} as an engine oil filter for ${machineSlug.replace('boomer-', 'Boomer ')} and documents it as replacing ${OLD_PART}. MyCNH independently confirms ${NEW_PART} as a New Holland engine oil filter.`;

      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts
         WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
        [machineId, newPartId, machineVersionId, configurationNote],
      );
      if (!existing[0]) {
        await connection.query(
          `INSERT INTO machine_parts
           (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
           VALUES (?,?,?,?,?,'high',?)`,
          [machineId, newPartId, machineVersionId, configurationNote, fitmentNote, dealerSourceRecordId],
        );
      }
    }
  },
};
