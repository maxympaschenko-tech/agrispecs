import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

const CUT_GUIDE_URL = 'https://www.deere.com/assets/pdfs/common/qrg/rpg-1025r-cut-ww-edition.pdf';
const FILTER_PAK_URL = 'https://shop.deere.com/us/product/TA25769%3A-Filter-Pak/p/TA25769';
const E_GUIDE_URL = 'https://www.deere.com/assets/pdfs/common/parts-and-service/manuals-training/5e-tier-2-tier-3-it4-and-ft4-series-utility-tractors-north-american-version-5045e-5055e.pdf';

type IdRow = RowDataPacket & { id: number };

type PartSeed = {
  number: string;
  name: string;
  category: string;
};

const parts: PartSeed[] = [
  { number: 'M806418', name: 'Engine Oil Filter', category: 'engine-oil-filters' },
  { number: 'AM116304', name: 'Inline Fuel Filter', category: 'fuel-filters' },
  { number: 'MIU804763', name: 'Fuel Filter Element', category: 'fuel-filters' },
  { number: 'LVA16054', name: 'Hydraulic Oil Filter', category: 'hydraulic-filters' },
  { number: 'LVU34503', name: 'Primary Air Cleaner Element', category: 'air-filters' },
  { number: 'LVU34504', name: 'Secondary Air Cleaner Element', category: 'air-filters' },
  { number: 'TA25769', name: 'Filter Pak', category: 'maintenance-kits' },
  { number: 'RE519626', name: 'Engine Oil Filter', category: 'engine-oil-filters' },
  { number: 'R536698', name: 'Fuel Filter', category: 'fuel-filters' },
  { number: 'SU29300', name: 'Primary Air Filter', category: 'air-filters' },
  { number: 'SU29301', name: 'Secondary Air Filter', category: 'air-filters' },
  { number: 'RE45864', name: 'Hydraulic / Transmission Oil Filter', category: 'hydraulic-filters' },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during John Deere filters migration.');
  return Number(rows[0].id);
}

export const johnDeereFiltersPartsMigration: DbMigration = {
  id: '20260827_070_john_deere_filters_parts',
  description: 'Add first verified John Deere maintenance filters, kits and machine fitment',
  async apply(connection) {
    await connection.query(`INSERT INTO manufacturers (name,slug) VALUES ('John Deere','john-deere') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const manufacturerId = await selectId(connection,`SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

    await connection.query(`INSERT INTO part_categories (name,slug) VALUES ('Filters','filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const filtersId = await selectId(connection,`SELECT id FROM part_categories WHERE slug='filters' LIMIT 1`);
    const childCategories = [
      ['Engine Oil Filters','engine-oil-filters'],
      ['Fuel Filters','fuel-filters'],
      ['Air Filters','air-filters'],
      ['Hydraulic Filters','hydraulic-filters'],
      ['Maintenance Kits','maintenance-kits'],
    ];
    for (const [name,slug] of childCategories) {
      await connection.query(`INSERT INTO part_categories (parent_id,name,slug) VALUES (?,?,?) ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`,[filtersId,name,slug]);
    }

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    async function ensureSource(externalId: string, url: string, title: string, publishedDate: string | null) {
      const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`,[externalId]);
      if (existing[0]?.id) return Number(existing[0].id);
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,[sourceId,url,externalId,title,publishedDate]);
      return Number(result.insertId);
    }

    const cutGuideId = await ensureSource('jd-rpg-1025r-worldwide-2024-01',CUT_GUIDE_URL,'John Deere 1025R Compact Utility Tractor Replacement Parts Guide','2024-01-01');
    const filterPakId = await ensureSource('jd-ta25769-filter-pak-current-2026-08',FILTER_PAK_URL,'John Deere TA25769 Filter Pak - compatible equipment',null);
    const eGuideId = await ensureSource('jd-5e-na-filter-overview-2020-03',E_GUIDE_URL,'John Deere 5E North American Filter Overview and Service Intervals','2020-03-01');

    const categoryIds = new Map<string,number>();
    for (const [,slug] of childCategories) categoryIds.set(slug,await selectId(connection,`SELECT id FROM part_categories WHERE slug=? LIMIT 1`,[slug]));

    for (const part of parts) {
      const categoryId = categoryIds.get(part.category);
      if (!categoryId) throw new Error(`Missing part category ${part.category}`);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,part.number,part.number.toUpperCase(),part.name],
      );
    }

    async function link(machineSlug: string, partNumber: string, note: string, sourceRecordId: number) {
      const machineId = await selectId(connection,`SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`,[machineSlug]);
      const partId = await selectId(connection,`SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,[manufacturerId,partNumber.toUpperCase()]);
      const [existing] = await connection.query<IdRow[]>(`SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,[machineId,partId,note]);
      if (!existing[0]) {
        await connection.query(`INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`,[machineId,partId,note,sourceRecordId]);
      }
    }

    for (const machineSlug of ['1023e','1025r','2025r']) {
      const serialNote = machineSlug === '1023e' ? 'TA25769 kit compatibility: serial number 117914 and later' : machineSlug === '1025r' ? 'TA25769 kit compatibility: serial number 153037 and later' : 'TA25769 kit compatibility: serial number 103921 and later';
      await link(machineSlug,'TA25769',serialNote,filterPakId);
      await link(machineSlug,'M806418','Engine oil filter; included in TA25769 maintenance kit',filterPakId);
      await link(machineSlug,'AM116304','Inline fuel filter; included in TA25769 maintenance kit',filterPakId);
      await link(machineSlug,'MIU804763','Fuel filter element; included in TA25769 maintenance kit',filterPakId);
      await link(machineSlug,'LVA16054','Hydraulic oil filter; included in TA25769 maintenance kit',filterPakId);
      await link(machineSlug,'LVU34503','Primary air cleaner element; included in TA25769 maintenance kit',filterPakId);
    }
    await link('1025r','LVU34504','Secondary air cleaner element, serial JJ153037 and later',cutGuideId);

    for (const machineSlug of ['5045e','5055e','5065e','5075e']) {
      await link(machineSlug,'RE519626','Engine oil filter; North American 5E filter guide',eGuideId);
      await link(machineSlug,'RE45864','Hydraulic / transmission oil filter; North American 5E filter guide',eGuideId);
      await link(machineSlug,'SU29300','Primary air filter for Final Tier 4 engine; North American 5E guide',eGuideId);
      await link(machineSlug,'SU29301','Secondary air filter for Final Tier 4 engine; North American 5E guide',eGuideId);
      await link(machineSlug,'R536698','Fuel filter for Final Tier 4 engine; North American 5E guide',eGuideId);
    }
  },
};
