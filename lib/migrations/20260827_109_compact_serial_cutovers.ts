import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

type SourceSeed = {
  externalId: string;
  url: string;
  title: string;
  publishedDate?: string | null;
};

type FitmentRule = {
  machine: '1023e' | '1025r' | '2025r' | '3032e';
  part: string;
  source: string;
  serialPrefix?: string | null;
  serialFrom?: string | null;
  serialTo?: string | null;
  note: string;
  configuration?: string | null;
};

const sources: SourceSeed[] = [
  {
    externalId: 'jd-1e-1r-filter-overview-2021-02',
    url: 'https://www.deere.com/assets/pdfs/common/qrg/1e-1r-series-compact-utility-tractors-1023e-hj100001-1025r-hj100001-1026r-hj200001-g.pdf',
    title: 'John Deere 1E and 1R Series compact utility tractor filter overview',
    publishedDate: '2021-02-01',
  },
  {
    externalId: 'jd-rpg-1025r-worldwide-2024-01',
    url: 'https://www.deere.com/assets/pdfs/common/qrg/rpg-1025r-cut-ww-edition.pdf',
    title: 'John Deere 1025R Compact Utility Tractor Replacement Parts Guide - Worldwide Edition',
    publishedDate: '2024-01-01',
  },
  {
    externalId: 'jd-rpg-2025r-hh100001-worldwide-2023-10',
    url: 'https://www.deere.com/assets/pdfs/common/parts-and-service/manuals-training/2025r-compact-utility-tractor-hh100001-worldwide-edition.pdf',
    title: 'John Deere 2025R Compact Utility Tractor HH100001- Replacement Parts Guide - Worldwide Edition',
    publishedDate: '2023-10-01',
  },
  {
    externalId: 'jd-rpg-1023e-my22-np100000-na-2024-03',
    url: 'https://www.deere.com/assets/pdfs/common/qrg/rpg-1023e-tractor-my22-na-edition.pdf',
    title: 'John Deere 1023E Tractor MY22- NP100000- Replacement Parts Guide - North America Edition',
    publishedDate: '2024-03-01',
  },
  {
    externalId: 'jd-rpg-3032e-dh-cutover-2023-07',
    url: 'https://www.deere.com/assets/pdfs/common/qrg/3032e-compact-utility-tractor.pdf',
    title: 'John Deere 3032E Compact Utility Tractor Replacement Parts Guide - DH serial cutover',
    publishedDate: '2023-07-01',
  },
  {
    externalId: 'jd-rpg-3032e-my22-np100000-worldwide-2024-03',
    url: 'https://www.deere.com/assets/pdfs/common/qrg/rpg-3032e-tractor-my22-ww-edition.pdf',
    title: 'John Deere 3032E Tractor MY22- NP100000- Replacement Parts Guide - Worldwide Edition',
    publishedDate: '2024-03-01',
  },
  {
    externalId: 'jd-shop-ta25769-filter-pak-current-2026-08',
    url: 'https://shop.deere.com/us/product/TA25769%3A-Filter-Pak/p/TA25769',
    title: 'John Deere TA25769 Filter Pak - compatible equipment',
    publishedDate: null,
  },
  {
    externalId: 'jd-shop-ta15270-substitute-2026-08',
    url: 'https://shop.deere.com/us/product/TA15270%3A%2BFilter%2BPak/p/TA15270',
    title: 'John Deere TA15270 Filter Pak - substitute part TA25769',
    publishedDate: null,
  },
];

const partSeeds = [
  ['LVA21035','Filter Pak','maintenance-kits'],
  ['LVA21036','Filter Pak','maintenance-kits'],
  ['TA15270','Filter Pak','maintenance-kits'],
  ['TA25769','Filter Pak','maintenance-kits'],
  ['M113621','Primary Air Filter','air-filters'],
  ['M123378','Secondary Air Filter','air-filters'],
  ['M131802','Primary Air Filter','air-filters'],
  ['M131803','Secondary Air Filter','air-filters'],
  ['LVU34503','Primary Air Filter','air-filters'],
  ['LVU34504','Secondary Air Filter','air-filters'],
  ['MIU800645','Primary Fuel Filter','fuel-filters'],
  ['MIU803127','Final Fuel Filter','fuel-filters'],
  ['AM881823','Fuel / Water Separator Kit','fuel-filters'],
  ['M811032','Fuel / Water Separator Filter Element','fuel-filters'],
  ['MIU802421','Fuel / Water Separator Filter Element','fuel-filters'],
] as const;

const rules: FitmentRule[] = [
  // 1023E legacy numeric serial family.
  { machine:'1023e', part:'LVA21035', source:'jd-1e-1r-filter-overview-2021-02', serialTo:'117913', note:'1023E legacy Filter Pak through serial 117913.' },
  { machine:'1023e', part:'M113621', source:'jd-1e-1r-filter-overview-2021-02', serialTo:'117913', note:'1023E legacy primary air filter through serial 117913.' },
  { machine:'1023e', part:'M123378', source:'jd-1e-1r-filter-overview-2021-02', serialTo:'117913', note:'1023E legacy secondary air filter through serial 117913.' },
  { machine:'1023e', part:'TA15270', source:'jd-1e-1r-filter-overview-2021-02', serialFrom:'117914', note:'1023E later legacy Filter Pak from serial 117914; this kit is now superseded by TA25769.' },
  { machine:'1023e', part:'TA25769', source:'jd-shop-ta25769-filter-pak-current-2026-08', serialFrom:'117914', note:'Current Deere Filter Pak listed for 1023E serial 117914 and later.' },
  { machine:'1023e', part:'LVU34503', source:'jd-1e-1r-filter-overview-2021-02', serialFrom:'117914', note:'1023E later legacy primary air filter from serial 117914.' },
  { machine:'1023e', part:'LVU34504', source:'jd-1e-1r-filter-overview-2021-02', serialFrom:'117914', note:'1023E later legacy secondary air filter from serial 117914.' },
  // 1023E MY22-current NP family is intentionally separate from the legacy numeric family.
  { machine:'1023e', part:'TA25769', source:'jd-rpg-1023e-my22-np100000-na-2024-03', serialPrefix:'NP', serialFrom:'100000', note:'1023E MY22-current NP100000- Filter Pak.' },
  { machine:'1023e', part:'LVU34503', source:'jd-rpg-1023e-my22-np100000-na-2024-03', serialPrefix:'NP', serialFrom:'100000', note:'1023E MY22-current NP100000- primary air filter.' },
  { machine:'1023e', part:'LVU34504', source:'jd-rpg-1023e-my22-np100000-na-2024-03', serialPrefix:'NP', serialFrom:'100000', note:'1023E MY22-current NP100000- secondary air filter.' },

  // 1025R cutover. Numeric suffix is used because Deere documentation spans HJ/JJ PIN families.
  { machine:'1025r', part:'LVA21036', source:'jd-1e-1r-filter-overview-2021-02', serialTo:'153036', note:'1025R Filter Pak through serial 153036.' },
  { machine:'1025r', part:'M131802', source:'jd-rpg-1025r-worldwide-2024-01', serialTo:'153036', note:'1025R primary air filter through serial 153036.' },
  { machine:'1025r', part:'M131803', source:'jd-rpg-1025r-worldwide-2024-01', serialTo:'153036', note:'1025R secondary air filter through serial 153036.' },
  { machine:'1025r', part:'TA15270', source:'jd-1e-1r-filter-overview-2021-02', serialFrom:'153037', note:'1025R later legacy Filter Pak from serial 153037; this kit is now superseded by TA25769.' },
  { machine:'1025r', part:'TA25769', source:'jd-shop-ta25769-filter-pak-current-2026-08', serialFrom:'153037', note:'Current Deere Filter Pak listed for 1025R serial 153037 and later.' },
  { machine:'1025r', part:'LVU34503', source:'jd-rpg-1025r-worldwide-2024-01', serialFrom:'153037', note:'1025R primary air filter from serial 153037.' },
  { machine:'1025r', part:'LVU34504', source:'jd-rpg-1025r-worldwide-2024-01', serialFrom:'153037', note:'1025R secondary air filter from serial 153037.' },

  // 2025R HH/JJ generation cutover.
  { machine:'2025r', part:'LVA21036', source:'jd-rpg-2025r-hh100001-worldwide-2023-10', serialTo:'103920', note:'2025R Filter Pak through serial 103920.' },
  { machine:'2025r', part:'M131802', source:'jd-rpg-2025r-hh100001-worldwide-2023-10', serialTo:'103920', note:'2025R primary air filter through serial 103920.' },
  { machine:'2025r', part:'M131803', source:'jd-rpg-2025r-hh100001-worldwide-2023-10', serialTo:'103920', note:'2025R secondary air filter through serial 103920.' },
  { machine:'2025r', part:'TA25769', source:'jd-rpg-2025r-hh100001-worldwide-2023-10', serialFrom:'103921', note:'2025R Filter Pak from serial 103921.' },
  { machine:'2025r', part:'LVU34503', source:'jd-rpg-2025r-hh100001-worldwide-2023-10', serialFrom:'103921', note:'2025R primary air filter from serial 103921.' },
  { machine:'2025r', part:'LVU34504', source:'jd-rpg-2025r-hh100001-worldwide-2023-10', serialFrom:'103921', note:'2025R secondary air filter from serial 103921.' },

  // 3032E legacy DH generation.
  { machine:'3032e', part:'MIU800645', source:'jd-rpg-3032e-dh-cutover-2023-07', serialPrefix:'DH', serialTo:'610000', note:'3032E legacy primary fuel filter through DH610000. The older guide renders this once as MU800645; current Deere catalog identifies the part as MIU800645.' },
  { machine:'3032e', part:'MIU803127', source:'jd-rpg-3032e-dh-cutover-2023-07', serialPrefix:'DH', serialFrom:'610001', note:'3032E final fuel filter from DH610001.' },
  { machine:'3032e', part:'AM881823', source:'jd-rpg-3032e-dh-cutover-2023-07', serialPrefix:'DH', serialTo:'610000', note:'3032E fuel/water separator kit through DH610000.' },
  { machine:'3032e', part:'M811032', source:'jd-rpg-3032e-dh-cutover-2023-07', serialPrefix:'DH', serialTo:'610000', note:'3032E fuel/water separator element through DH610000.' },
  { machine:'3032e', part:'MIU802421', source:'jd-rpg-3032e-dh-cutover-2023-07', serialPrefix:'DH', serialFrom:'610001', note:'3032E fuel/water separator element from DH610001.' },
  // 3032E MY22-current NP generation.
  { machine:'3032e', part:'MIU800645', source:'jd-rpg-3032e-my22-np100000-worldwide-2024-03', serialPrefix:'NP', serialFrom:'100000', note:'3032E MY22-current NP100000- primary fuel filter.' },
  { machine:'3032e', part:'MIU803127', source:'jd-rpg-3032e-my22-np100000-worldwide-2024-03', serialPrefix:'NP', serialFrom:'100000', note:'3032E MY22-current NP100000- final fuel filter.' },
  { machine:'3032e', part:'AM881823', source:'jd-rpg-3032e-my22-np100000-worldwide-2024-03', serialPrefix:'NP', serialFrom:'100000', note:'3032E MY22-current NP100000- fuel/water separator kit.' },
  { machine:'3032e', part:'M811032', source:'jd-rpg-3032e-my22-np100000-worldwide-2024-03', serialPrefix:'NP', serialFrom:'100000', note:'3032E MY22-current NP100000- fuel/water separator element.' },
];

const normalize = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected row was not found during compact serial cutover migration.');
  return Number(rows[0].id);
}

export const johnDeereCompactSerialCutoversMigration: DbMigration = {
  id: '20260827_109_compact_serial_cutovers',
  description: 'Add source-backed serial cutovers for John Deere 1023E, 1025R, 2025R and 3032E maintenance parts',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);

    for (const [name,slug] of [['Maintenance Kits','maintenance-kits'],['Air Filters','air-filters'],['Fuel Filters','fuel-filters']] as const) {
      await connection.query(`INSERT INTO part_categories (name,slug) VALUES (?,?) ON DUPLICATE KEY UPDATE name=VALUES(name)`, [name,slug]);
    }

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(`INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`);
      sourceId = Number(result.insertId);
    }

    const sourceIds = new Map<string,number>();
    for (const source of sources) {
      const [existing] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [source.externalId]);
      let recordId = existing[0]?.id ? Number(existing[0].id) : 0;
      if (!recordId) {
        const [result] = await connection.query<ResultSetHeader>(
          `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
          [sourceId,source.url,source.externalId,source.title,source.publishedDate ?? null],
        );
        recordId = Number(result.insertId);
      }
      sourceIds.set(source.externalId,recordId);
    }

    for (const [number,name,categorySlug] of partSeeds) {
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [categorySlug]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId,categoryId,number,normalize(number),name],
      );
    }

    const machineIds = new Map<string,number>();
    for (const slug of ['1023e','1025r','2025r','3032e']) {
      machineIds.set(slug,await selectId(connection, `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`, [slug]));
    }

    const partIds = new Map<string,number>();
    for (const [number] of partSeeds) {
      partIds.set(number,await selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId,normalize(number)]));
    }

    // Remove generic rows only for the exact part/model pairs that are fully replaced below by source-backed serial rules.
    const constrainedPairs = Array.from(new Set(rules.map((rule) => `${rule.machine}|${rule.part}`)));
    for (const pair of constrainedPairs) {
      const [machine,part] = pair.split('|');
      const machineId = machineIds.get(machine);
      const partId = partIds.get(part);
      if (!machineId || !partId) continue;
      await connection.query(
        `DELETE FROM machine_parts
         WHERE machine_id=? AND part_id=?
           AND serial_prefix IS NULL AND serial_from IS NULL AND serial_to IS NULL`,
        [machineId,partId],
      );
    }

    for (const rule of rules) {
      const machineId = machineIds.get(rule.machine);
      const partId = partIds.get(rule.part);
      const sourceRecordId = sourceIds.get(rule.source);
      if (!machineId || !partId || !sourceRecordId) throw new Error(`Missing compact serial cutover dependency for ${rule.machine} ${rule.part}`);

      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts
         WHERE machine_id=? AND part_id=?
           AND COALESCE(serial_prefix,'')=COALESCE(?,'')
           AND COALESCE(serial_from,'')=COALESCE(?,'')
           AND COALESCE(serial_to,'')=COALESCE(?,'')
         ORDER BY id LIMIT 1`,
        [machineId,partId,rule.serialPrefix ?? null,rule.serialFrom ?? null,rule.serialTo ?? null],
      );

      if (existing[0]?.id) {
        await connection.query(
          `UPDATE machine_parts
           SET fitment_note=?, configuration_note=?, source_record_id=?
           WHERE id=?`,
          [rule.note,rule.configuration ?? null,sourceRecordId,Number(existing[0].id)],
        );
      } else {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,fitment_note,serial_prefix,serial_from,serial_to,configuration_note,source_record_id)
           VALUES (?,?,?,?,?,?,?,?)`,
          [machineId,partId,rule.note,rule.serialPrefix ?? null,rule.serialFrom ?? null,rule.serialTo ?? null,rule.configuration ?? null,sourceRecordId],
        );
      }
    }

    const ta15270Id = partIds.get('TA15270');
    const ta25769Id = partIds.get('TA25769');
    const substitutionSourceId = sourceIds.get('jd-shop-ta15270-substitute-2026-08');
    if (!ta15270Id || !ta25769Id || !substitutionSourceId) throw new Error('Missing TA15270 substitution dependency.');

    await connection.query(
      `INSERT INTO part_cross_references (part_id,cross_part_id,relation_type,source_record_id)
       VALUES (?,?,'replaces',?)
       ON DUPLICATE KEY UPDATE source_record_id=VALUES(source_record_id)`,
      [ta15270Id,ta25769Id,substitutionSourceId],
    );
  },
};
