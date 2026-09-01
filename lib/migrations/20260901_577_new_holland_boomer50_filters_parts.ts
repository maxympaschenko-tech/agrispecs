import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type PartSeed = { number: string; name: string; category: string; fitmentNote: string };

const MYCNH_URL = 'https://www.mycnhstore.com/na/tractores/compacto/naba17com227boomer/tractor-compacto-wrops-tier-4b-na/servicio-de-mantenimiento/lista-de-inventario-inicial-lista-a/cn/DDA1CD92-148D-487F-A9E2-58C76CDDF168';
const MYCNH_EXTERNAL_ID = 'new-holland-boomer-tier4b-na-initial-stocking-filters-2026-09';

const parts: PartSeed[] = [
  {
    number: 'MT40318591',
    name: 'Engine Oil Filter',
    category: 'engine-oil-filters',
    fitmentNote: 'Engine oil filter listed in the official MyCNH North America Tier 4B Boomer service/initial stocking list. Verify serial/build date before ordering because CNH may supersede catalog numbers.',
  },
  {
    number: 'MT40271228',
    name: 'Fuel Filter',
    category: 'fuel-filters',
    fitmentNote: 'Fuel filter listed in the official MyCNH North America Tier 4B Boomer service/initial stocking list. Verify serial/build date before ordering because CNH may supersede catalog numbers.',
  },
  {
    number: 'MT40007576',
    name: 'Primary Engine Air Filter',
    category: 'air-filters',
    fitmentNote: 'Primary/outer engine air filter for Tier 4B Boomer 50 applications. Official CNH catalog identity; verify serial/build date before ordering.',
  },
  {
    number: 'MT40049446',
    name: 'Safety Engine Air Filter',
    category: 'air-filters',
    fitmentNote: 'Inner/safety engine air filter listed for Tier 4B Boomer 50 applications in CNH service parts data. Verify serial/build date before ordering.',
  },
  {
    number: 'MT40007563',
    name: 'HST Hydraulic Oil Filter',
    category: 'hydraulic-filters',
    fitmentNote: 'Hydraulic/HST transmission filter listed in the official MyCNH Tier 4B Boomer service list; applies to the relevant HST configuration. Verify transmission and serial/build date.',
  },
  {
    number: 'MT40007638',
    name: 'Hydraulic Suction / Transmission Filter',
    category: 'hydraulic-filters',
    fitmentNote: 'Hydraulic suction/transmission filter listed in the official MyCNH Tier 4B Boomer service list. Verify transmission and serial/build date because CNH service replacements can change.',
  },
  {
    number: 'MT40032863',
    name: 'Cab Air Filter',
    category: 'cab-filters',
    fitmentNote: 'Cab air filter listed in the official MyCNH Tier 4B Boomer initial stocking list; applies only to cab-equipped Boomer 50 configurations.',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing New Holland Boomer 50 parts migration dependency.');
  return Number(rows[0].id);
}

export const newHollandBoomer50FiltersPartsMigration: DbMigration = {
  id: '20260901_577_new_holland_boomer50_filters_parts',
  description: 'Add manufacturer-verified New Holland Boomer 50 Tier 4B maintenance filters and machine fitment from MyCNH parts data',
  async apply(connection) {
    await connection.query(`INSERT INTO manufacturers (name,slug) VALUES ('New Holland','new-holland') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);

    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Filters','filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const filtersId = await selectId(connection, `SELECT id FROM part_categories WHERE slug='filters' LIMIT 1`);
    const childCategories = [
      ['Engine Oil Filters','engine-oil-filters'],
      ['Fuel Filters','fuel-filters'],
      ['Air Filters','air-filters'],
      ['Hydraulic Filters','hydraulic-filters'],
      ['Cab Filters','cab-filters'],
    ] as const;
    for (const [name, slug] of childCategories) {
      await connection.query(
        `INSERT INTO part_categories (parent_id,name,slug) VALUES (?,?,?) ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`,
        [filtersId, name, slug],
      );
    }

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='New Holland Parts' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('New Holland Parts','mycnhstore.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [sourceRecordRows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [MYCNH_EXTERNAL_ID]);
    let sourceRecordId = sourceRecordRows[0]?.id ? Number(sourceRecordRows[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
        [
          sourceId,
          MYCNH_URL,
          MYCNH_EXTERNAL_ID,
          'New Holland MyCNH North America Tier 4B Boomer initial stocking and service filter list',
          JSON.stringify({
            modelScope: 'Tier 4B North America Boomer compact tractors; Boomer 50 fitment retained with configuration/serial cautions',
            filters: parts.map((part) => ({ partNumber: part.number, name: part.name })),
          }),
        ],
      );
      sourceRecordId = Number(result.insertId);
    }

    const categoryIds = new Map<string, number>();
    for (const [, slug] of childCategories) {
      categoryIds.set(slug, await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [slug]));
    }

    for (const part of parts) {
      const categoryId = categoryIds.get(part.category);
      if (!categoryId) throw new Error(`Missing New Holland part category ${part.category}`);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, part.number, part.number.toUpperCase(), part.name],
      );
    }

    const machineId = await selectId(
      connection,
      `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug='boomer-50' LIMIT 1`,
    );

    for (const part of parts) {
      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, part.number.toUpperCase()],
      );
      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
        [machineId, partId, part.fitmentNote],
      );
      if (!existing[0]) {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`,
          [machineId, partId, part.fitmentNote, sourceRecordId],
        );
      }
    }
  },
};
