import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type MachineSlug = 'boomer-35' | 'boomer-40' | 'boomer-45' | 'boomer-50' | 'boomer-55';
type FilterKind = 'primary' | 'secondary';

const CURRENT_VERSION = 'united-states-current-2026-08';
const MACHINE_SLUGS: MachineSlug[] = ['boomer-35', 'boomer-40', 'boomer-45', 'boomer-50', 'boomer-55'];

const OLD_PRIMARY = 'MT40007576';
const NEW_PRIMARY = '87682994';
const OLD_SECONDARY = 'MT40049446';
const NEW_SECONDARY = '87682991';

const MYCNH_PRIMARY_URL = 'https://www.mycnhstore.com/eu/en/newhollandag/cn/air-filter/p/87682994';
const MYCNH_SECONDARY_URL = 'https://www.mycnhstore.com/eu/en/newhollandce/cn/air-filter/p/87682991';
const ROCHESTER_OLD_PRIMARY_URL = 'https://www.newhollandrochester.com/shop/mt40007576/';
const ROCHESTER_NEW_PRIMARY_URL = 'https://www.newhollandrochester.com/shop/87682994/';
const ROCHESTER_OLD_SECONDARY_URL = 'https://www.newhollandrochester.com/shop/mt40049446/';
const ROCHESTER_NEW_SECONDARY_URL = 'https://www.newhollandrochester.com/shop/87682991/';

const sourceExternalIds = {
  primaryOem: 'new-holland-87682994-primary-air-filter-oem-2026-09',
  secondaryOem: 'new-holland-87682991-secondary-air-filter-oem-2026-09',
  oldPrimary: 'rochester-new-holland-mt40007576-boomer-fitment-replacement-2026-09',
  newPrimary: 'rochester-new-holland-87682994-boomer-fitment-2026-09',
  oldSecondary: 'rochester-new-holland-mt40049446-boomer-fitment-replacement-2026-09',
  newSecondary: 'rochester-new-holland-87682991-boomer-fitment-2026-09',
} as const;

function configurationNote(machineSlug: MachineSlug) {
  return machineSlug === 'boomer-35'
    ? 'Tier 4B North America; ROPS'
    : 'Tier 4B North America; ROPS or cab';
}

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing New Holland Boomer air-filter replacement migration dependency.');
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

export const newHollandBoomerAirFilterReplacementsMigration: DbMigration = {
  id: '20260902_583_new_holland_boomer_air_filter_replacements',
  description: 'Add current Boomer 35-55 primary/secondary air-filter replacements, replacement chains, and missing Tier 4B fitment',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const airCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='air-filters' LIMIT 1`);
    const officialSourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='New Holland Parts' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`,
    );

    let [supplierRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='New Holland Rochester' AND domain='newhollandrochester.com' ORDER BY id LIMIT 1`,
    );
    let supplierSourceId = supplierRows[0]?.id ? Number(supplierRows[0].id) : 0;
    if (!supplierSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('New Holland Rochester','newhollandrochester.com','supplier','secondary')`,
      );
      supplierSourceId = Number(result.insertId);
    }

    const primaryOemSourceId = await ensureSourceRecord(
      connection,
      officialSourceId,
      sourceExternalIds.primaryOem,
      MYCNH_PRIMARY_URL,
      'New Holland MyCNH 87682994 primary engine air filter',
      {
        partNumber: NEW_PRIMARY,
        description: 'Primary Engine Air Filter - 81 mm ID x 128 mm OD x 313 mm L',
        role: 'OEM part identity and primary-filter function',
      },
    );
    const secondaryOemSourceId = await ensureSourceRecord(
      connection,
      officialSourceId,
      sourceExternalIds.secondaryOem,
      MYCNH_SECONDARY_URL,
      'New Holland MyCNH 87682991 secondary engine air filter',
      {
        partNumber: NEW_SECONDARY,
        description: 'Secondary Engine Air Filter - 65 mm ID x 84 mm OD x 298 mm L',
        role: 'OEM part identity and secondary/safety-filter function',
      },
    );

    const oldPrimarySourceId = await ensureSourceRecord(
      connection,
      supplierSourceId,
      sourceExternalIds.oldPrimary,
      ROCHESTER_OLD_PRIMARY_URL,
      'New Holland Rochester MT40007576 Boomer model-use and replacement record',
      {
        partNumber: OLD_PRIMARY,
        role: 'Tier 4B North America Boomer model-use and documented replacement direction',
        models: MACHINE_SLUGS,
        replacement: NEW_PRIMARY,
        modelConfiguration: 'Boomer 35 ROPS; Boomer 40/45/50/55 ROPS and cab where cataloged',
      },
    );
    const newPrimarySourceId = await ensureSourceRecord(
      connection,
      supplierSourceId,
      sourceExternalIds.newPrimary,
      ROCHESTER_NEW_PRIMARY_URL,
      'New Holland Rochester 87682994 Boomer model-use record',
      {
        partNumber: NEW_PRIMARY,
        role: 'Direct Tier 4B North America Boomer model-use evidence for the replacement primary air filter',
        models: MACHINE_SLUGS,
        replaces: OLD_PRIMARY,
        oemSourceRecordId: primaryOemSourceId,
      },
    );
    const oldSecondarySourceId = await ensureSourceRecord(
      connection,
      supplierSourceId,
      sourceExternalIds.oldSecondary,
      ROCHESTER_OLD_SECONDARY_URL,
      'New Holland Rochester MT40049446 Boomer model-use and replacement record',
      {
        partNumber: OLD_SECONDARY,
        role: 'Tier 4B North America Boomer model-use and documented replacement direction',
        models: MACHINE_SLUGS,
        replacement: NEW_SECONDARY,
        modelConfiguration: 'Boomer 35 ROPS; Boomer 40/45/50/55 ROPS and cab where cataloged',
      },
    );
    const newSecondarySourceId = await ensureSourceRecord(
      connection,
      supplierSourceId,
      sourceExternalIds.newSecondary,
      ROCHESTER_NEW_SECONDARY_URL,
      'New Holland Rochester 87682991 Boomer model-use record',
      {
        partNumber: NEW_SECONDARY,
        role: 'Direct Tier 4B North America Boomer model-use evidence for the replacement secondary air filter',
        models: MACHINE_SLUGS,
        replaces: OLD_SECONDARY,
        oemSourceRecordId: secondaryOemSourceId,
      },
    );

    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
       VALUES (?,?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),description=VALUES(description),data_status='verified'`,
      [manufacturerId, airCategoryId, NEW_PRIMARY, NEW_PRIMARY, 'Primary Engine Air Filter', 'New Holland OEM primary engine air filter. Current replacement for MT40007576; direct Boomer 35-55 model-use is documented by the New Holland dealer catalog.'],
    );
    await connection.query(
      `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
       VALUES (?,?,?,?,?,?,'verified')
       ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),description=VALUES(description),data_status='verified'`,
      [manufacturerId, airCategoryId, NEW_SECONDARY, NEW_SECONDARY, 'Secondary Engine Air Filter', 'New Holland OEM secondary/safety engine air filter. Current replacement for MT40049446; direct Boomer 35-55 model-use is documented by the New Holland dealer catalog.'],
    );

    const oldPrimaryId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, OLD_PRIMARY]);
    const newPrimaryId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, NEW_PRIMARY]);
    const oldSecondaryId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, OLD_SECONDARY]);
    const newSecondaryId = await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, NEW_SECONDARY]);

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [oldPrimaryId, newPrimaryId, oldPrimarySourceId],
    );
    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [oldSecondaryId, newSecondaryId, oldSecondarySourceId],
    );

    const partIds: Record<FilterKind, { oldId: number; newId: number; oldSourceId: number; newSourceId: number }> = {
      primary: { oldId: oldPrimaryId, newId: newPrimaryId, oldSourceId: oldPrimarySourceId, newSourceId: newPrimarySourceId },
      secondary: { oldId: oldSecondaryId, newId: newSecondaryId, oldSourceId: oldSecondarySourceId, newSourceId: newSecondarySourceId },
    };

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
      const config = configurationNote(machineSlug);

      for (const kind of ['primary', 'secondary'] as FilterKind[]) {
        const ids = partIds[kind];

        if (machineSlug === 'boomer-35' || machineSlug === 'boomer-45' || machineSlug === 'boomer-55') {
          const oldNote = kind === 'primary'
            ? `Legacy primary/outer engine air filter for ${machineSlug.replace('boomer-', 'Boomer ')} Tier 4B North America; dealer catalog model-use also documents replacement by ${NEW_PRIMARY}.`
            : `Legacy secondary/safety engine air filter for ${machineSlug.replace('boomer-', 'Boomer ')} Tier 4B North America; dealer catalog model-use also documents replacement by ${NEW_SECONDARY}.`;
          const [existingOld] = await connection.query<IdRow[]>(
            `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
            [machineId, ids.oldId, machineVersionId, config],
          );
          if (!existingOld[0]) {
            await connection.query(
              `INSERT INTO machine_parts
               (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
               VALUES (?,?,?,?,?,'high',?)`,
              [machineId, ids.oldId, machineVersionId, config, oldNote, ids.oldSourceId],
            );
          }
        }

        const newNote = kind === 'primary'
          ? `Replacement primary engine air filter for ${machineSlug.replace('boomer-', 'Boomer ')} Tier 4B North America. Direct model-use is documented for ${NEW_PRIMARY}; ${OLD_PRIMARY} is separately documented as replaced by this number.`
          : `Replacement secondary/safety engine air filter for ${machineSlug.replace('boomer-', 'Boomer ')} Tier 4B North America. Direct model-use is documented for ${NEW_SECONDARY}; ${OLD_SECONDARY} is separately documented as replaced by this number.`;
        const [existingNew] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, ids.newId, machineVersionId, config],
        );
        if (!existingNew[0]) {
          await connection.query(
            `INSERT INTO machine_parts
             (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
             VALUES (?,?,?,?,?,'high',?)`,
            [machineId, ids.newId, machineVersionId, config, newNote, ids.newSourceId],
          );
        }
      }
    }
  },
};
