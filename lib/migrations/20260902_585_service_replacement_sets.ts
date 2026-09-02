import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const LEGACY_PART = 'MT40271228';
const REPLACEMENT_COMPONENTS = [
  { number: 'MT40416089', name: 'Fuel Filter Element', category: 'fuel-filters', role: 'Filter element', oemUrl: 'https://www.mycnhstore.com/ca/en/caseih/category/filters/air-filters/element/p/MT40416089' },
  { number: 'MT40416097', name: 'Fuel Filter Bowl', category: 'fuel-filters', role: 'Filter bowl', oemUrl: 'https://www.mycnhstore.com/gb/en/newhollandag/category/filters/filters-components/filter-bowl/p/MT40416097' },
  { number: 'MT40416102', name: 'Fuel Filter Cover', category: 'fuel-filters', role: 'Filter cover', oemUrl: 'https://www.mycnhstore.com/us/en/newhollandag/category/filters/filters-components/filter-cover/p/MT40416102' },
] as const;
const DEALER_URL = 'https://www.newhollandrochester.com/shop/mt40271228/';
const DEALER_EXTERNAL_ID = 'new-holland-rochester-mt40271228-three-part-service-replacement-2026-09';
const CURRENT_VERSION = 'united-states-current-2026-08';
const MACHINE_SLUGS = ['boomer-35', 'boomer-40', 'boomer-45', 'boomer-50', 'boomer-55'] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing service replacement-set migration dependency.');
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

export const serviceReplacementSetsMigration: DbMigration = {
  id: '20260902_585_service_replacement_sets',
  description: 'Add multi-part service replacement sets and seed the New Holland MT40271228 three-component replacement',
  async apply(connection) {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS part_replacement_sets (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        legacy_part_id BIGINT UNSIGNED NOT NULL,
        title VARCHAR(255) NOT NULL,
        notes VARCHAR(1000) NULL,
        source_record_id BIGINT UNSIGNED NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_part_replacement_set_source (legacy_part_id, source_record_id),
        KEY idx_part_replacement_sets_source (source_record_id),
        CONSTRAINT fk_part_replacement_sets_legacy FOREIGN KEY (legacy_part_id) REFERENCES parts(id),
        CONSTRAINT fk_part_replacement_sets_source FOREIGN KEY (source_record_id) REFERENCES source_records(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS part_replacement_set_items (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        replacement_set_id BIGINT UNSIGNED NOT NULL,
        part_id BIGINT UNSIGNED NOT NULL,
        quantity DECIMAL(10,2) NULL,
        role VARCHAR(255) NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uq_part_replacement_set_item (replacement_set_id, part_id),
        KEY idx_part_replacement_set_items_part (part_id),
        CONSTRAINT fk_part_replacement_set_items_set FOREIGN KEY (replacement_set_id) REFERENCES part_replacement_sets(id),
        CONSTRAINT fk_part_replacement_set_items_part FOREIGN KEY (part_id) REFERENCES parts(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const fuelCategoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='fuel-filters' LIMIT 1`);
    const legacyPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
      [manufacturerId, LEGACY_PART],
    );
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

    const dealerSourceRecordId = await ensureSourceRecord(
      connection,
      dealerSourceId,
      DEALER_EXTERNAL_ID,
      DEALER_URL,
      'New Holland Rochester MT40271228 three-component service replacement',
      {
        role: 'Multi-part service replacement and exact legacy Boomer model fitment evidence',
        legacyPartNumber: LEGACY_PART,
        replacementComponents: REPLACEMENT_COMPONENTS.map((component) => ({ partNumber: component.number, role: component.role })),
        statement: 'MT40271228 is replaced by three components: MT40416089 filter element, MT40416097 filter bowl, and MT40416102 filter cover.',
        boomerModels: ['Boomer 35', 'Boomer 40', 'Boomer 45', 'Boomer 50', 'Boomer 55'],
      },
    );

    const componentIds = new Map<string, number>();
    for (const component of REPLACEMENT_COMPONENTS) {
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, fuelCategoryId, component.number, component.number, component.name],
      );
      const componentId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, component.number],
      );
      componentIds.set(component.number, componentId);
      await ensureSourceRecord(
        connection,
        officialSourceId,
        `new-holland-mycnh-${component.number.toLowerCase()}-2026-09`,
        component.oemUrl,
        `New Holland MyCNH ${component.number} ${component.name}`,
        { role: 'Official OEM identity for service replacement component', partNumber: component.number, name: component.name },
      );
    }

    const [setRows] = await connection.query<IdRow[]>(
      `SELECT id FROM part_replacement_sets WHERE legacy_part_id=? AND source_record_id=? LIMIT 1`,
      [legacyPartId, dealerSourceRecordId],
    );
    let replacementSetId = setRows[0]?.id ? Number(setRows[0].id) : 0;
    if (!replacementSetId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO part_replacement_sets (legacy_part_id,title,notes,source_record_id) VALUES (?,?,?,?)`,
        [
          legacyPartId,
          'Three-component fuel-filter service replacement',
          'The legacy MT40271228 cartridge is not replaced by one part number. The documented service replacement consists of an element, bowl, and cover; all three items are shown together to avoid a misleading one-to-one supersession.',
          dealerSourceRecordId,
        ],
      );
      replacementSetId = Number(result.insertId);
    }

    for (const component of REPLACEMENT_COMPONENTS) {
      const componentId = componentIds.get(component.number);
      if (!componentId) throw new Error(`Missing replacement component ${component.number}.`);
      await connection.query(
        `INSERT INTO part_replacement_set_items (replacement_set_id,part_id,quantity,role)
         VALUES (?,?,1,?)
         ON DUPLICATE KEY UPDATE quantity=VALUES(quantity),role=VALUES(role)`,
        [replacementSetId, componentId, component.role],
      );
    }

    const elementPartId = componentIds.get('MT40416089');
    if (!elementPartId) throw new Error('Missing MT40416089 fuel-filter element.');
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
      const configurationNote = 'Tier 4B North America fuel-filter service replacement; verify serial/build date before ordering';
      const fitmentNote = `MT40416089 is the filter-element component of the documented three-part replacement for legacy ${LEGACY_PART} on ${machineSlug.replace('boomer-', 'Boomer ')}. The replacement also requires MT40416097 bowl and MT40416102 cover when converting from the legacy cartridge assembly.`;
      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
        [machineId, elementPartId, machineVersionId, configurationNote],
      );
      if (!existing[0]) {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
           VALUES (?,?,?,?,?,'high',?)`,
          [machineId, elementPartId, machineVersionId, configurationNote, fitmentNote, dealerSourceRecordId],
        );
      }
    }
  },
};
