import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type FilterSeed = {
  partNumber: string;
  normalizedPartNumber: string;
  name: string;
  categoryName: string;
  categorySlug: string;
  description: string;
  versions: Array<'us-current-gear-2wd' | 'us-current-gear-4wd' | 'us-current-hst-4wd'>;
};

const filters: FilterSeed[] = [
  {
    partNumber: 'HH164-32430',
    normalizedPartNumber: 'HH16432430',
    name: 'Engine Oil Filter',
    categoryName: 'Engine Oil Filters',
    categorySlug: 'engine-oil-filters',
    description: 'Engine oil filter listed in Kubota L2502 parts catalogs.',
    versions: ['us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd'],
  },
  {
    partNumber: '6A320-59930',
    normalizedPartNumber: '6A32059930',
    name: 'Fuel Filter Element',
    categoryName: 'Fuel Filters',
    categorySlug: 'fuel-filters',
    description: 'Fuel filter element listed for L2502F, L2502DT and L2502HST service diagrams.',
    versions: ['us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd'],
  },
  {
    partNumber: 'HH3A0-82623',
    normalizedPartNumber: 'HH3A082623',
    name: 'Hydraulic Oil Filter (Inlet/Suction)',
    categoryName: 'Hydraulic Filters',
    categorySlug: 'hydraulic-filters',
    description: 'Hydraulic inlet/suction filter listed for L2502 gear and HST configurations.',
    versions: ['us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd'],
  },
  {
    partNumber: 'TC820-93230',
    normalizedPartNumber: 'TC82093230',
    name: 'Outer Air Cleaner Element',
    categoryName: 'Engine Air Filters',
    categorySlug: 'engine-air-filters',
    description: 'Outer engine air-cleaner element for Kubota L02 Series including all L2502 configurations.',
    versions: ['us-current-gear-2wd','us-current-gear-4wd','us-current-hst-4wd'],
  },
  {
    partNumber: 'HHK70-14073',
    normalizedPartNumber: 'HHK7014073',
    name: 'HST Oil Filter Cartridge',
    categoryName: 'Transmission Filters',
    categorySlug: 'transmission-filters',
    description: 'Hydrostatic transmission oil filter cartridge listed for Kubota L2502HST.',
    versions: ['us-current-hst-4wd'],
  },
];

const VERSION_SOURCES = {
  'us-current-gear-2wd': {
    url: 'https://www.messicks.com/catalogs/kubota/l2502f/engine/000401-gear-case-new',
    externalId: 'messicks-kubota-l2502f-service-filters',
    title: 'Kubota L2502F parts catalog - service filters',
  },
  'us-current-gear-4wd': {
    url: 'https://www.messicks.com/catalogs/kubota/l2502dt/engine/000200-oil-pan',
    externalId: 'messicks-kubota-l2502dt-service-filters',
    title: 'Kubota L2502DT parts catalog - service filters',
  },
  'us-current-hst-4wd': {
    url: 'https://www.messicks.com/catalogs/kubota/l2502hst/cooling-water-system/a40100-fan',
    externalId: 'messicks-kubota-l2502hst-service-filters',
    title: 'Kubota L2502HST parts catalog - service filters',
  },
} as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota L2502 service-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  source: (typeof VERSION_SOURCES)[keyof typeof VERSION_SOURCES],
) {
  const [existing] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
    [source.externalId],
  );
  if (existing[0]) return Number(existing[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId, source.url, source.externalId, source.title],
  );
  return Number(result.insertId);
}

async function upsertVersionFitment(
  connection: Parameters<DbMigration['apply']>[0],
  machineId: number,
  machineVersionId: number,
  partId: number,
  sourceRecordId: number,
  fitmentNote: string,
  configurationNote: string,
) {
  const [existing] = await connection.query<IdRow[]>(
    `SELECT id FROM machine_parts
     WHERE machine_id=? AND machine_version_id=? AND part_id=?
       AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL
     ORDER BY id DESC LIMIT 1`,
    [machineId, machineVersionId, partId],
  );

  if (existing[0]) {
    await connection.query(
      `UPDATE machine_parts
       SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='high'
       WHERE id=?`,
      [fitmentNote, configurationNote, sourceRecordId, Number(existing[0].id)],
    );
  } else {
    await connection.query(
      `INSERT INTO machine_parts
        (machine_id,machine_version_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence)
       VALUES (?,?,?,?,?,?,'high')`,
      [machineId, machineVersionId, partId, fitmentNote, configurationNote, sourceRecordId],
    );
  }
}

export const kubotaL2502ServiceFiltersMigration: DbMigration = {
  id: '20260827_152_kubota_l2502_service_filters',
  description: 'Add source-backed Kubota L2502 service filters with configuration-specific gear and HST fitment',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const machineId = await selectId(connection, `
      SELECT m.id FROM machines m
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='kubota' AND m.slug='l2502' LIMIT 1
    `);

    let [sourceRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name='Messicks' AND domain='messicks.com' ORDER BY id LIMIT 1`,
    );
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level)
         VALUES ('Messicks','messicks.com','supplier','secondary')`,
      );
      sourceId = Number(result.insertId);
    }

    const versionIds = new Map<string, number>();
    const sourceRecordIds = new Map<string, number>();
    for (const [versionSlug, source] of Object.entries(VERSION_SOURCES)) {
      versionIds.set(
        versionSlug,
        await selectId(connection, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, versionSlug]),
      );
      sourceRecordIds.set(versionSlug, await ensureSourceRecord(connection, sourceId, source));
    }

    for (const filter of filters) {
      await connection.query(
        `INSERT INTO part_categories (name,slug) VALUES (?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [filter.categoryName, filter.categorySlug],
      );
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [filter.categorySlug]);

      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE
           category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),
           data_status=IF(data_status='verified','verified','partial')`,
        [manufacturerId, categoryId, filter.partNumber, filter.normalizedPartNumber, filter.name, filter.description],
      );
      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, filter.normalizedPartNumber],
      );

      for (const versionSlug of filter.versions) {
        const versionId = versionIds.get(versionSlug);
        const sourceRecordId = sourceRecordIds.get(versionSlug);
        if (!versionId || !sourceRecordId) throw new Error(`Missing L2502 version/source ${versionSlug}`);
        const isHstOnly = filter.normalizedPartNumber === 'HHK7014073';
        await upsertVersionFitment(
          connection,
          machineId,
          versionId,
          partId,
          sourceRecordId,
          `Messicks' Kubota L2502 parts catalog lists ${filter.partNumber} for this ${versionSlug.replace('us-current-','').replaceAll('-',' ')} configuration. Confirm exact serial number before ordering.`,
          isHstOnly ? 'L2502HST hydrostatic-transmission service filter' : 'L2502 configuration-specific service-filter reference',
        );
      }
    }
  },
};
