import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type SourceSpec = {
  name: string;
  domain: string;
  sourceType: 'supplier';
  authorityLevel: 'primary' | 'secondary';
  url: string;
  externalId: string;
  title: string;
};

const MB_TRACTOR: SourceSpec = {
  name: 'Kubota Parts Depot at MB Tractor',
  domain: 'parts.mbtractor.com',
  sourceType: 'supplier',
  authorityLevel: 'primary',
  url: '',
  externalId: '',
  title: '',
};

const FRIDAY_PARTS: SourceSpec = {
  name: 'FridayParts',
  domain: 'fridayparts.com',
  sourceType: 'supplier',
  authorityLevel: 'secondary',
  url: 'https://www.fridayparts.com/filter-kit-for-kubota-engine-v3307-tractor-m6060-m7060',
  externalId: 'fridayparts-kubota-v3307-m6060-m7060-filter-kit',
  title: 'Filter Kit for Kubota Engine V3307 Tractor M6060 M7060',
};

const filters = [
  {
    categoryName: 'Fuel Filters',
    categorySlug: 'fuel-filters',
    partNumber: '1J800-43170',
    normalizedPartNumber: '1J80043170',
    name: 'Fuel Filter Cartridge',
    description: 'Fuel filter cartridge referenced for Kubota V3307-CR-TE4 applications including M6060 and M7060 tractors.',
    source: FRIDAY_PARTS,
    fitmentNote: 'Supplier filter-kit catalog explicitly lists Kubota M6060 and M7060 with V3307-CR-TE4 for 1J800-43170. Confirm serial number before ordering.',
  },
  {
    categoryName: 'Engine Air Filters',
    categorySlug: 'engine-air-filters',
    partNumber: '59800-26110',
    normalizedPartNumber: '5980026110',
    name: 'Outer Air Filter Element',
    description: 'Primary outer engine air-cleaner element used on Kubota M6060 and M7060 tractor configurations.',
    source: {
      ...MB_TRACTOR,
      url: 'https://parts.mbtractor.com/item/59800-26110/',
      externalId: 'mbtractor-59800-26110',
      title: 'Kubota 59800-26110 ELEMENT, OUTER A/C',
    },
    fitmentNote: 'Kubota Parts Depot lists M6060HD/HDC/HFC and M7060HD/HD12/HDC/HDC12/HFC as applicable models. Confirm serial number before ordering.',
  },
  {
    categoryName: 'Engine Air Filters',
    categorySlug: 'engine-air-filters',
    partNumber: '3A111-19130',
    normalizedPartNumber: '3A11119130',
    name: 'Inner Air Filter Element',
    description: 'Inner safety engine air-filter element referenced for Kubota V3307-CR-TE4 applications including M6060 and M7060 tractors.',
    source: FRIDAY_PARTS,
    fitmentNote: 'Supplier filter-kit catalog explicitly lists Kubota M6060 and M7060 with V3307-CR-TE4 for 3A111-19130. Confirm serial number before ordering.',
  },
  {
    categoryName: 'Hydraulic Filters',
    categorySlug: 'hydraulic-filters',
    partNumber: 'HHTA0-37710',
    normalizedPartNumber: 'HHTA037710',
    name: 'Hydraulic Oil Filter',
    description: 'Hydraulic oil filter cartridge used on Kubota M6060 and M7060 tractor configurations.',
    source: {
      ...MB_TRACTOR,
      url: 'https://parts.mbtractor.com/item/HHTA0-37710/',
      externalId: 'mbtractor-hhta0-37710',
      title: 'Kubota HHTA0-37710 CARTRIDGE, OIL FILTER (HYD)',
    },
    fitmentNote: 'Kubota Parts Depot lists M6060HD/HDC/HFC and M7060HD/HD12/HDC/HDC12/HFC as applicable models. Confirm serial number before ordering.',
  },
] as const;

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Kubota M60 service-filter migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  source: SourceSpec,
) {
  let [sourceRows] = await connection.query<IdRow[]>(
    `SELECT id FROM sources WHERE name=? AND domain=? ORDER BY id LIMIT 1`,
    [source.name, source.domain],
  );
  let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;

  if (!sourceId) {
    const [result] = await connection.query<ResultSetHeader>(
      `INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?,?,?,?)`,
      [source.name, source.domain, source.sourceType, source.authorityLevel],
    );
    sourceId = Number(result.insertId);
  }

  const [existingRecord] = await connection.query<IdRow[]>(
    `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
    [source.externalId],
  );
  if (existingRecord[0]) return Number(existingRecord[0].id);

  const [recordResult] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title) VALUES (?,?,?,?)`,
    [sourceId, source.url, source.externalId, source.title],
  );
  return Number(recordResult.insertId);
}

export const kubotaM6060M7060ServiceFiltersMigration: DbMigration = {
  id: '20260827_144_kubota_m6060_m7060_service_filters',
  description: 'Add high-confidence Kubota M6060/M7060 fuel, air and hydraulic service-filter fitments from model-specific supplier catalogs',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='kubota' LIMIT 1`);
    const machineIds = new Map<string, number>();

    for (const modelSlug of ['m6060', 'm7060']) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='kubota' AND m.slug=? LIMIT 1`,
        [modelSlug],
      );
      machineIds.set(modelSlug, machineId);
    }

    for (const filter of filters) {
      await connection.query(
        `INSERT INTO part_categories (name,slug)
         VALUES (?,?)
         ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [filter.categoryName, filter.categorySlug],
      );
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [filter.categorySlug]);
      const sourceRecordId = await ensureSourceRecord(connection, filter.source);

      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'partial')
         ON DUPLICATE KEY UPDATE
           category_id=VALUES(category_id),
           part_number=VALUES(part_number),
           name=VALUES(name),
           description=VALUES(description),
           data_status=IF(data_status='verified','verified','partial')`,
        [
          manufacturerId,
          categoryId,
          filter.partNumber,
          filter.normalizedPartNumber,
          filter.name,
          filter.description,
        ],
      );

      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, filter.normalizedPartNumber],
      );

      for (const modelSlug of ['m6060', 'm7060']) {
        const machineId = machineIds.get(modelSlug);
        if (!machineId) throw new Error(`Missing Kubota machine ${modelSlug}.`);

        const [existingFitment] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? LIMIT 1`,
          [machineId, partId],
        );

        if (existingFitment[0]) {
          await connection.query(
            `UPDATE machine_parts
             SET fitment_note=?, configuration_note='Model-family service filter; verify tractor serial/configuration',
                 source_record_id=?, fitment_confidence='high'
             WHERE id=?`,
            [filter.fitmentNote, sourceRecordId, Number(existingFitment[0].id)],
          );
        } else {
          await connection.query(
            `INSERT INTO machine_parts
              (machine_id,part_id,fitment_note,configuration_note,source_record_id,fitment_confidence)
             VALUES (?,?,?,'Model-family service filter; verify tractor serial/configuration',?,'high')`,
            [machineId, partId, filter.fitmentNote, sourceRecordId],
          );
        }
      }
    }
  },
};
