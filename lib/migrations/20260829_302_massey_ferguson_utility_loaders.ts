import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type LoaderSeed = {
  model: string;
  slug: string;
  leveling: string;
  liftHeightIn: number;
  liftCapacityLb: number;
  compatibility: string;
  machineSlugs: string[];
  compatibilityNote: string;
};

const SOURCE_URL = 'https://www.masseyferguson.com/en_us/products/materials-handling/utility-loaders.html';
const loaders: LoaderSeed[] = [
  {
    model: 'MF 911X',
    slug: 'mf-911x',
    leveling: 'Non self leveling',
    liftHeightIn: 114,
    liftCapacityLb: 1500,
    compatibility: 'MF 2600 H Series (4WD)',
    machineSlugs: ['mf-2604h', 'mf-2606h', 'mf-2607h'],
    compatibilityNote: 'Official Massey Ferguson MF 911X compatibility for 4WD configurations of the MF 2600 H Series. MF 2605H is excluded because the current US tractor page lists it as 2WD only.',
  },
  {
    model: 'MF 931X',
    slug: 'mf-931x',
    leveling: 'Non self leveling',
    liftHeightIn: 136,
    liftCapacityLb: 2140,
    compatibility: 'MF 4700 Series',
    machineSlugs: ['mf-4707', 'mf-4709', 'mf-4710'],
    compatibilityNote: 'Official Massey Ferguson MF 931X compatibility for the current US MF 4700 Series.',
  },
  {
    model: 'MF 936X',
    slug: 'mf-936x',
    leveling: 'Mechanical self leveling',
    liftHeightIn: 136,
    liftCapacityLb: 3340,
    compatibility: 'MF 4700 Series',
    machineSlugs: ['mf-4707', 'mf-4709', 'mf-4710'],
    compatibilityNote: 'Official Massey Ferguson MF 936X compatibility for the current US MF 4700 Series.',
  },
];

async function selectId(
  connection: Parameters<DbMigration['apply']>[0],
  sql: string,
  params: unknown[] = [],
) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing Massey Ferguson utility loader migration dependency.');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  connection: Parameters<DbMigration['apply']>[0],
  sourceId: number,
) {
  const externalId = 'massey-ferguson-utility-loaders-current-us-2026-08';
  const [rows] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [result] = await connection.query<ResultSetHeader>(
    `INSERT INTO source_records (source_id,url,external_id,title,raw_reference) VALUES (?,?,?,?,?)`,
    [
      sourceId,
      SOURCE_URL,
      externalId,
      'Massey Ferguson US Utility Loaders official current specifications and compatibility',
      JSON.stringify({ market: 'United States', captured: '2026-08-29', loaders }),
    ],
  );
  return Number(result.insertId);
}

export const masseyFergusonUtilityLoadersMigration: DbMigration = {
  id: '20260829_302_massey_ferguson_utility_loaders',
  description: 'Add verified Massey Ferguson MF 911X, MF 931X and MF 936X utility loaders with official US fitment',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='massey-ferguson' LIMIT 1`);
    const sourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='Massey Ferguson' AND domain='masseyferguson.com' ORDER BY id LIMIT 1`,
    );
    const sourceRecordId = await ensureSourceRecord(connection, sourceId);

    for (const loader of loaders) {
      await connection.query(
        `INSERT INTO attachments (
          manufacturer_id,attachment_type,model_name,slug,lift_capacity_text,lift_height_text,configuration_text,data_status
        ) VALUES (?,'front-loader',?,?,?,?,?,'verified')
        ON DUPLICATE KEY UPDATE
          model_name=VALUES(model_name),
          lift_capacity_text=VALUES(lift_capacity_text),
          lift_height_text=VALUES(lift_height_text),
          configuration_text=VALUES(configuration_text),
          data_status='verified'`,
        [
          manufacturerId,
          loader.model,
          loader.slug,
          `${loader.liftCapacityLb.toLocaleString('en-US')} lb @ 31.5 in forward of pivot pin`,
          `${loader.liftHeightIn} in @ pivot pin`,
          `${loader.leveling}; official compatibility: ${loader.compatibility}`,
        ],
      );
      const attachmentId = await selectId(
        connection,
        `SELECT id FROM attachments WHERE manufacturer_id=? AND slug=? LIMIT 1`,
        [manufacturerId, loader.slug],
      );

      for (const machineSlug of loader.machineSlugs) {
        const machineId = await selectId(
          connection,
          `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`,
          [manufacturerId, machineSlug],
        );
        await connection.query(
          `INSERT INTO machine_attachments (machine_id,attachment_id,compatibility_note,source_record_id,confidence)
           VALUES (?,?,?,?, 'official')
           ON DUPLICATE KEY UPDATE
             compatibility_note=VALUES(compatibility_note),
             source_record_id=VALUES(source_record_id),
             confidence='official'`,
          [machineId, attachmentId, loader.compatibilityNote, sourceRecordId],
        );
      }
    }
  },
};
