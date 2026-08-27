import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type KitSeed = {
  number: string;
  name: string;
  category: string;
  categoryName: string;
  configuration?: string;
  note: string;
};

const SOURCE_EXTERNAL_ID = 'john-deere-5000m-pricebook-2025-11-05';

const kits: KitSeed[] = [
  {
    number: 'BXX10535',
    name: 'Front PTO Mounting Parts Kit',
    category: 'pto-kits',
    categoryName: 'PTO Kits',
    configuration: 'Cab · front PTO',
    note: '5130M front PTO mounting parts kit. John Deere notes that front PTO kits are applicable to cab tractors only.',
  },
  {
    number: 'BSJ10520',
    name: 'Front PTO Case and Shaft - 21 Tooth Spline',
    category: 'pto-kits',
    categoryName: 'PTO Kits',
    configuration: 'North America · Cab · 21-tooth spline',
    note: '5130M North America front PTO case and shaft. Deere specifies the 21-tooth spline for North American tractors and requires the mounting parts separately.',
  },
  {
    number: 'BSJ10563',
    name: 'PTO Fender Switch Kit',
    category: 'pto-kits',
    categoryName: 'PTO Kits',
    configuration: 'PowrReverser · Cab',
    note: '5130M PTO fender switch kit for MY21 and newer 5M tractors. Deere states it is compatible with PowrReverser transmissions and not available on open-station tractors.',
  },
  {
    number: 'BSJ10327',
    name: 'Remote PTO Fender Switch Kit',
    category: 'pto-kits',
    categoryName: 'PTO Kits',
    configuration: 'Remote PTO control',
    note: '5130M remote PTO fender switch kit. Deere states installation requires additional software and references AL206063 through parts.',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing 5130M accessory-kit migration dependency.');
  return Number(rows[0].id);
}

export const johnDeere5130MVerifiedAccessoryKitsMigration: DbMigration = {
  id: '20260827_124_5130m_verified_accessory_kits',
  description: 'Add source-backed North America 5130M front PTO and PTO-control accessory kit fitments from the November 2025 John Deere price book',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const machineId = await selectId(connection, `
      SELECT m.id FROM machines m
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE mf.slug='john-deere' AND m.slug='5130m'
      LIMIT 1
    `);
    const sourceRecordId = await selectId(
      connection,
      `SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,
      [SOURCE_EXTERNAL_ID],
    );

    for (const kit of kits) {
      await connection.query(
        `INSERT INTO part_categories (name,slug) VALUES (?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`,
        [kit.categoryName,kit.category],
      );
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [kit.category]);

      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,kit.number,kit.number,kit.name],
      );
      const partId = await selectId(
        connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId,kit.number],
      );

      const [existing] = await connection.query<IdRow[]>(`
        SELECT id FROM machine_parts
        WHERE machine_id=? AND part_id=?
          AND COALESCE(configuration_note,'')=COALESCE(?,'')
          AND fitment_note=?
        LIMIT 1
      `, [machineId,partId,kit.configuration ?? null,kit.note]);

      if (existing[0]) {
        await connection.query(
          `UPDATE machine_parts SET source_record_id=? WHERE id=?`,
          [sourceRecordId,Number(existing[0].id)],
        );
      } else {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,fitment_note,configuration_note,source_record_id)
           VALUES (?,?,?,?,?)`,
          [machineId,partId,kit.note,kit.configuration ?? null,sourceRecordId],
        );
      }
    }
  },
};
