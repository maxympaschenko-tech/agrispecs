import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type AirPart = {
  oldNumber: 'MT40007576' | 'MT40049446';
  oldName: string;
  replacementNumber: '87682994' | '87682991';
  replacementName: string;
  oemUrl: string;
  dealerUrl: string;
  dealerExternalId: string;
};

type FitmentSeed = {
  machineSlug: 'boomer-35' | 'boomer-45' | 'boomer-55';
  partNumber: 'MT40007576' | 'MT40049446';
  configurationNote: string;
  fitmentNote: string;
};

const CURRENT_VERSION = 'united-states-current-2026-08';

const airParts: AirPart[] = [
  {
    oldNumber: 'MT40007576',
    oldName: 'Primary Engine Air Filter',
    replacementNumber: '87682994',
    replacementName: 'Primary Engine Air Filter',
    oemUrl: 'https://www.mycnhstore.com/eu/en/newhollandag/cn/air-filter/p/87682994',
    dealerUrl: 'https://www.newhollandrochester.com/shop/mt40007576/',
    dealerExternalId: 'new-holland-rochester-mt40007576-boomer-fitment-replacement-2026-09',
  },
  {
    oldNumber: 'MT40049446',
    oldName: 'Safety Engine Air Filter',
    replacementNumber: '87682991',
    replacementName: 'Secondary Engine Air Filter',
    oemUrl: 'https://www.mycnhstore.com/eu/en/newhollandce/cn/air-filter/p/87682991',
    dealerUrl: 'https://www.newhollandrochester.com/shop/mt40049446/',
    dealerExternalId: 'new-holland-rochester-mt40049446-boomer-fitment-replacement-2026-09',
  },
];

const fitments: FitmentSeed[] = [
  {
    machineSlug: 'boomer-35',
    partNumber: 'MT40007576',
    configurationNote: 'Tier 4B North America; ROPS',
    fitmentNote: 'Primary/outer engine air filter for New Holland Boomer 35 Tier 4B North America. New Holland Rochester lists MT40007576 under Boomer 35 ROPS applications beginning 03/17; use serial/build-date verification when ordering because the dealer also identifies OEM replacement 87682994.',
  },
  {
    machineSlug: 'boomer-35',
    partNumber: 'MT40049446',
    configurationNote: 'Tier 4B North America; ROPS',
    fitmentNote: 'Safety/inner engine air filter for New Holland Boomer 35 Tier 4B North America. New Holland Rochester lists MT40049446 under Boomer 35 ROPS applications beginning 03/17; use serial/build-date verification when ordering because the dealer also identifies OEM replacement 87682991.',
  },
  {
    machineSlug: 'boomer-45',
    partNumber: 'MT40007576',
    configurationNote: 'Tier 4B North America; ROPS or cab',
    fitmentNote: 'Primary/outer engine air filter for New Holland Boomer 45 Tier 4B North America. New Holland Rochester lists MT40007576 for both ROPS and cab Boomer 45 applications beginning 03/17; use serial/build-date verification when ordering because the dealer also identifies OEM replacement 87682994.',
  },
  {
    machineSlug: 'boomer-45',
    partNumber: 'MT40049446',
    configurationNote: 'Tier 4B North America; ROPS or cab',
    fitmentNote: 'Safety/inner engine air filter for New Holland Boomer 45 Tier 4B North America. New Holland Rochester lists MT40049446 for both ROPS and cab Boomer 45 applications beginning 03/17; use serial/build-date verification when ordering because the dealer also identifies OEM replacement 87682991.',
  },
  {
    machineSlug: 'boomer-55',
    partNumber: 'MT40007576',
    configurationNote: 'Tier 4B North America; ROPS or cab',
    fitmentNote: 'Primary/outer engine air filter for New Holland Boomer 55 Tier 4B North America. New Holland Rochester lists MT40007576 for both ROPS and cab Boomer 55 applications beginning 11/16; use serial/build-date verification when ordering because the dealer also identifies OEM replacement 87682994.',
  },
  {
    machineSlug: 'boomer-55',
    partNumber: 'MT40049446',
    configurationNote: 'Tier 4B North America; ROPS or cab',
    fitmentNote: 'Safety/inner engine air filter for New Holland Boomer 55 Tier 4B North America. New Holland Rochester lists MT40049446 for both ROPS and cab Boomer 55 applications beginning 11/16; use serial/build-date verification when ordering because the dealer also identifies OEM replacement 87682991.',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing New Holland Boomer air-filter migration dependency.');
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

export const newHollandBoomerAirFiltersReplacementsMigration: DbMigration = {
  id: '20260902_583_new_holland_boomer_air_filters_replacements',
  description: 'Add Boomer 35/45/55 Tier 4B primary and safety air-filter fitment plus documented OEM replacement chains',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const airCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='air-filters' LIMIT 1`);
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

    const dealerSourceIds = new Map<AirPart['oldNumber'], number>();

    for (const part of airParts) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, airCategoryId, part.oldNumber, part.oldNumber, part.oldName],
      );
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, airCategoryId, part.replacementNumber, part.replacementNumber, part.replacementName],
      );

      await ensureSourceRecord(
        connection,
        officialSourceId,
        `new-holland-mycnh-${part.replacementNumber}-air-filter-2026-09`,
        part.oemUrl,
        `New Holland MyCNH ${part.replacementNumber} ${part.replacementName}`,
        {
          role: 'Official OEM identity for current replacement part',
          partNumber: part.replacementNumber,
          name: part.replacementName,
        },
      );

      const dealerSourceRecordId = await ensureSourceRecord(
        connection,
        dealerSourceId,
        part.dealerExternalId,
        part.dealerUrl,
        `New Holland Rochester ${part.oldNumber} model fitment and replacement listing`,
        {
          role: 'Exact Boomer model/configuration fitment plus replacement-chain evidence',
          partNumber: part.oldNumber,
          replacementPartNumber: part.replacementNumber,
          boomerModels: ['Boomer 35', 'Boomer 40', 'Boomer 45', 'Boomer 50', 'Boomer 55'],
          modelNotes: {
            'Boomer 35': 'ROPS Tier 4B NA, 03/17 onward',
            'Boomer 40': 'ROPS and cab Tier 4B NA, 03/17 onward',
            'Boomer 45': 'ROPS and cab Tier 4B NA, 03/17 onward',
            'Boomer 50': 'ROPS and cab Tier 4B NA, 03/17 onward',
            'Boomer 55': 'ROPS and cab Tier 4B NA, 11/16 onward',
          },
          duplicateAvoidance: 'Boomer 40 and Boomer 50 direct air-filter rows already exist from migrations 578 and 577 and are intentionally not duplicated here.',
        },
      );
      dealerSourceIds.set(part.oldNumber, dealerSourceRecordId);

      const oldPartId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, part.oldNumber],
      );
      const replacementPartId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, part.replacementNumber],
      );
      await connection.query(
        `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
         VALUES (?,?,'replaces',?)
         ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
        [oldPartId, replacementPartId, dealerSourceRecordId],
      );
    }

    for (const fitment of fitments) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [fitment.machineSlug],
      );
      const machineVersionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, CURRENT_VERSION],
      );
      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, fitment.partNumber],
      );
      const sourceRecordId = dealerSourceIds.get(fitment.partNumber);
      if (!sourceRecordId) throw new Error(`Missing dealer source for ${fitment.partNumber}.`);

      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts
         WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
        [machineId, partId, machineVersionId, fitment.configurationNote],
      );
      if (!existing[0]) {
        await connection.query(
          `INSERT INTO machine_parts
           (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
           VALUES (?,?,?,?,?,'high',?)`,
          [machineId, partId, machineVersionId, fitment.configurationNote, fitment.fitmentNote, sourceRecordId],
        );
      }
    }
  },
};
