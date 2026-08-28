import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type PartSeed = { number: string; name: string; category: string; note: string };

const GUIDE_URL = 'https://www.deere.com/assets/pdfs/common/qrg/rpg-9r-tractors-final-tier-4-ft4-9r390-9r440-9r490-9r540-9r590-9r640.pdf';
const GUIDE_EXTERNAL_ID = 'john-deere-rx571082-9r-ft4-service-guide';
const VERSION_SLUG = 'united-states-current-2026-08';
const models = ['9r-390','9r-440','9r-490','9r-540','9r-590','9r-640'] as const;

const currentParts: PartSeed[] = [
  { number:'TA17973', name:'Primary Air Filter Element', category:'air-filters', note:'Primary engine air filter element for current 13.6 L 9R service reference.' },
  { number:'RE230985', name:'Secondary Air Filter Element', category:'air-filters', note:'Secondary engine air filter element for current 13.6 L 9R service reference.' },
  { number:'DZ124761', name:'Primary Fuel Filter', category:'fuel-filters', note:'Primary fuel filter for the 13.6 L engine.' },
  { number:'DZ124786', name:'Secondary Fuel Filter', category:'fuel-filters', note:'Secondary fuel filter for the 13.6 L engine.' },
  { number:'RE572785', name:'Engine Oil Filter', category:'engine-oil-filters', note:'Engine oil filter for the 13.6 L engine.' },
  { number:'AT365869', name:'Fuel Water Separator Filter', category:'fuel-water-separators', note:'Fuel-water separator filter for the 13.6 L engine when equipped.' },
  { number:'RE577612', name:'Hydraulic Oil Filter', category:'hydraulic-filters', note:'Hydraulic oil filter element; Deere guide lists three hydraulic elements in the service overview.' },
  { number:'RE577250', name:'System Hydraulic Oil Filter', category:'hydraulic-filters', note:'Hydraulic system filter for current 9R service reference.' },
  { number:'TA21586', name:'SCV / Pilot Oil Filter - Current Serial', category:'hydraulic-filters', note:'SCV/pilot oil filter for serial 085001 and later.' },
  { number:'RE284091', name:'Cab Fresh Air Filter', category:'cabin-air-filters', note:'Cab fresh-air filter.' },
  { number:'RE593819', name:'Cab Recirculation Air Filter', category:'cabin-air-filters', note:'Cab recirculation-air filter.' },
  { number:'DZ110513', name:'DEF Inline Filter', category:'def-filters', note:'DEF inline filter.' },
  { number:'DZ114640', name:'DEF Supply Module Filter', category:'def-filters', note:'DEF supply-module filter.' },
  { number:'H216169', name:'Fuel / DEF / Transmission Vent Filter', category:'vent-filters', note:'Vent filter used in the Deere 9R service guide for DEF tank and transmission vent service points.' },
  { number:'RE597019', name:'Fuel Tank Vent Filter', category:'vent-filters', note:'Fuel-tank vent filter; Deere guide lists quantity two.' },
];

const legacyScv: PartSeed = {
  number:'RE269061',
  name:'SCV / Pilot Oil Filter - Early Serial',
  category:'hydraulic-filters',
  note:'SCV/pilot oil filter for serial through 084999.',
};

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing John Deere 9R service migration dependency.');
  return Number(rows[0].id);
}

async function ensureCategory(connection: Parameters<DbMigration['apply']>[0], filtersId: number, name: string, slug: string) {
  await connection.query(
    `INSERT INTO part_categories (parent_id,name,slug) VALUES (?,?,?)
     ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`,
    [filtersId,name,slug],
  );
  return selectId(connection,`SELECT id FROM part_categories WHERE slug=? LIMIT 1`,[slug]);
}

async function upsertFitment(
  connection: Parameters<DbMigration['apply']>[0],
  machineId: number,
  versionId: number | null,
  partId: number,
  sourceRecordId: number,
  note: string,
  serialFrom: string | null = null,
  serialTo: string | null = null,
) {
  const [rows] = await connection.query<IdRow[]>(
    `SELECT id FROM machine_parts
     WHERE machine_id=?
       AND ((machine_version_id=?) OR (machine_version_id IS NULL AND ? IS NULL))
       AND part_id=?
       AND serial_prefix IS NULL
       AND ((serial_from=?) OR (serial_from IS NULL AND ? IS NULL))
       AND ((serial_to=?) OR (serial_to IS NULL AND ? IS NULL))
     ORDER BY id DESC LIMIT 1`,
    [machineId,versionId,versionId,partId,serialFrom,serialFrom,serialTo,serialTo],
  );
  const configurationNote = versionId
    ? 'Current US 9R 390-640 JD14 13.6 L service reference from John Deere RX571082; confirm exact tractor serial and installed options before ordering.'
    : 'Historical 9R serial-specific SCV/pilot filter reference from John Deere RX571082; confirm exact tractor serial before ordering.';
  if (rows[0]) {
    await connection.query(
      `UPDATE machine_parts
       SET fitment_note=?,configuration_note=?,source_record_id=?,fitment_confidence='official',serial_from=?,serial_to=?
       WHERE id=?`,
      [note,configurationNote,sourceRecordId,serialFrom,serialTo,Number(rows[0].id)],
    );
  } else {
    await connection.query(
      `INSERT INTO machine_parts
       (machine_id,machine_version_id,part_id,serial_from,serial_to,fitment_note,configuration_note,source_record_id,fitment_confidence)
       VALUES (?,?,?,?,?,?,?,?,'official')`,
      [machineId,versionId,partId,serialFrom,serialTo,note,configurationNote,sourceRecordId],
    );
  }
}

export const johnDeere9RServiceFiltersMigration: DbMigration = {
  id:'20260828_224_john_deere_9r_service_filters',
  description:'Add official John Deere RX571082 service-filter fitments and SCV serial cutover for current 9R 390-640 tractors',
  async apply(connection) {
    const manufacturerId = await selectId(connection,`SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Filters','filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const filtersId = await selectId(connection,`SELECT id FROM part_categories WHERE slug='filters' LIMIT 1`);

    const categoryDefinitions = [
      ['Air Filters','air-filters'],
      ['Fuel Filters','fuel-filters'],
      ['Engine Oil Filters','engine-oil-filters'],
      ['Fuel / Water Separators','fuel-water-separators'],
      ['Hydraulic Filters','hydraulic-filters'],
      ['Cabin Air Filters','cabin-air-filters'],
      ['DEF Filters','def-filters'],
      ['Vent Filters','vent-filters'],
    ] as const;
    const categoryIds = new Map<string,number>();
    for (const [name,slug] of categoryDefinitions) categoryIds.set(slug,await ensureCategory(connection,filtersId,name,slug));

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`,[GUIDE_EXTERNAL_ID]);
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
        [sourceId,GUIDE_URL,GUIDE_EXTERNAL_ID,'John Deere RX571082 9R FT4 Replacement Parts Guide - 9R 390/440/490/540/590/640','2024-04-01'],
      );
      sourceRecordId = Number(result.insertId);
    }

    const allParts = [...currentParts,legacyScv];
    const partIds = new Map<string,number>();
    for (const part of allParts) {
      const categoryId = categoryIds.get(part.category);
      if (!categoryId) throw new Error(`Missing 9R part category ${part.category}`);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,description,data_status)
         VALUES (?,?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),description=VALUES(description),data_status='verified'`,
        [manufacturerId,categoryId,part.number,part.number.toUpperCase(),part.name,`John Deere RX571082 official 9R service reference. ${part.note}`],
      );
      partIds.set(part.number,await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,part.number.toUpperCase()]));
    }

    for (const slug of models) {
      const machineId = await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`,[slug]);
      const versionId = await selectId(connection,`SELECT id FROM machine_versions WHERE machine_id=? AND slug=? AND is_current=1 LIMIT 1`,[machineId,VERSION_SLUG]);
      for (const part of currentParts) {
        await upsertFitment(
          connection,
          machineId,
          versionId,
          partIds.get(part.number)!,
          sourceRecordId,
          part.note,
          part.number === 'TA21586' ? '085001' : null,
          null,
        );
      }
      await upsertFitment(connection,machineId,null,partIds.get(legacyScv.number)!,sourceRecordId,legacyScv.note,null,'084999');
    }
  },
};
