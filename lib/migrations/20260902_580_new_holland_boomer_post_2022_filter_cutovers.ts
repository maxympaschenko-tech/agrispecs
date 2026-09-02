import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type MachineSlug = 'boomer-35' | 'boomer-40' | 'boomer-45' | 'boomer-50' | 'boomer-55';

type CutoverPart = {
  number: string;
  name: string;
  category: 'engine-oil-filters' | 'fuel-filters' | 'hydraulic-filters';
  messicksUrl: string;
  externalId: string;
  machineSlugs: MachineSlug[];
  fitmentNote: string;
};

const MYCNH_URL = 'https://www.mycnhstore.com/es/es/newhollandag/na/traktoren/kompakt/naba17com227boomer/kompaktschlepper-wcab-stufe-4-b-na/service-wartung/filter/cn/ABC2895516';
const MYCNH_EXTERNAL_ID = 'new-holland-boomer-tier4b-modern-filter-diagram-abc2895516-2026-09';
const CURRENT_VERSION = 'united-states-current-2026-08';
const CONFIGURATION_NOTE = 'Tier 4B North America; production date after 01-Sep-2022';
const ALL_MACHINE_SLUGS: MachineSlug[] = ['boomer-35', 'boomer-40', 'boomer-45', 'boomer-50', 'boomer-55'];

const parts: CutoverPart[] = [
  {
    number: 'MT40409065',
    name: 'Engine Oil Filter',
    category: 'engine-oil-filters',
    messicksUrl: 'https://www.messicks.com/parts/new-holland/mt40409065',
    externalId: 'messicks-new-holland-mt40409065-boomer-post-2022-09',
    machineSlugs: ALL_MACHINE_SLUGS,
    fitmentNote: 'Engine oil filter shown for Boomer 35, 40, 45, 50 and 55 Tier 4B North America applications with production dates after 01-Sep-2022. Exact production-date fitment is secondary dealer-catalog evidence; OEM part identity is corroborated by the current MyCNH filter diagram.',
  },
  {
    number: 'MT40407354',
    name: 'Fuel Filter',
    category: 'fuel-filters',
    messicksUrl: 'https://www.messicks.com/parts/new-holland/mt40407354',
    externalId: 'messicks-new-holland-mt40407354-boomer-post-2022-09',
    machineSlugs: ALL_MACHINE_SLUGS,
    fitmentNote: 'Fuel filter shown for Boomer 35, 40, 45, 50 and 55 Tier 4B North America applications with production dates after 01-Sep-2022. Exact production-date fitment is secondary dealer-catalog evidence; OEM part identity is corroborated by the current MyCNH filter diagram.',
  },
  {
    number: 'MT40347273',
    name: 'Hydraulic Oil Filter',
    category: 'hydraulic-filters',
    messicksUrl: 'https://www.messicks.com/parts/new-holland/MT40347273',
    externalId: 'messicks-new-holland-mt40347273-boomer-post-2022-09',
    machineSlugs: ['boomer-35', 'boomer-40', 'boomer-45', 'boomer-50'],
    fitmentNote: 'Hydraulic oil/suction filter shown for Boomer 35, 40, 45 and 50 Tier 4B North America applications with production dates after 01-Sep-2022. Boomer 55 is intentionally excluded from this dated relation until equally explicit model-specific evidence is available. OEM part identity and the MT40007638 replacement relationship are separately supported by MyCNH data.',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing New Holland post-2022 Boomer filter dependency.');
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

export const newHollandBoomerPost2022FilterCutoversMigration: DbMigration = {
  id: '20260902_580_new_holland_boomer_post_2022_filter_cutovers',
  description: 'Add production-date-specific New Holland Boomer 35-55 filter cutovers after 1 Sep 2022 with separated OEM and dealer provenance',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);

    const officialSourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name='New Holland Parts' AND domain='mycnhstore.com' ORDER BY id LIMIT 1`,
    );
    await ensureSourceRecord(
      connection,
      officialSourceId,
      MYCNH_EXTERNAL_ID,
      MYCNH_URL,
      'New Holland MyCNH Tier 4B Boomer modern filter diagram 05.100.010[01]',
      {
        diagramId: 'ABC2895516',
        diagram: '05.100.010[01] - FILTERS',
        role: 'OEM part identity and current-family filter-set corroboration',
        parts: [
          { partNumber: 'MT40007563', name: 'Hydraulic Oil Filter' },
          { partNumber: 'MT40007576', name: 'Primary Air Filter' },
          { partNumber: 'MT40347273', name: 'Hydraulic Oil Filter' },
          { partNumber: 'MT40407354', name: 'Fuel Filter' },
          { partNumber: 'MT40409065', name: 'Engine Oil Filter' },
          { partNumber: 'MT40032863', name: 'Cab Air Filter' },
        ],
        caution: 'Exact model/date cutover is intentionally sourced separately rather than inferred from this family diagram alone.',
      },
    );

    let [supplierRows] = await connection.query<IdRow[]>(
      `SELECT id FROM sources WHERE name=? AND domain='messicks.com' ORDER BY id LIMIT 1`,
      ["Messick's"],
    );
    let supplierSourceId = supplierRows[0]?.id ? Number(supplierRows[0].id) : 0;
    if (!supplierSourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES (?, 'messicks.com', 'supplier', 'secondary')`,
        ["Messick's"],
      );
      supplierSourceId = Number(result.insertId);
    }

    const categoryIds = new Map<string, number>();
    for (const slug of ['engine-oil-filters', 'fuel-filters', 'hydraulic-filters'] as const) {
      categoryIds.set(slug, await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [slug]));
    }

    const fitmentSourceIds = new Map<string, number>();
    for (const part of parts) {
      const categoryId = categoryIds.get(part.category);
      if (!categoryId) throw new Error(`Missing New Holland part category ${part.category}.`);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, part.number, part.number.toUpperCase(), part.name],
      );

      const sourceRecordId = await ensureSourceRecord(
        connection,
        supplierSourceId,
        part.externalId,
        part.messicksUrl,
        `Messick's New Holland ${part.number} Boomer fitment catalog`,
        {
          role: 'Exact model and production-date fitment evidence',
          models: part.machineSlugs.map((slug) => slug.replace('boomer-', 'Boomer ')),
          productionDateRule: 'After 01-Sep-2022',
          oemCorroboration: MYCNH_URL,
          note: part.number === 'MT40347273'
            ? 'The dated supplier-catalog relation is stored only for Boomer 35/40/45/50. Boomer 55 is excluded until equally explicit post-2022 hydraulic-filter evidence is available.'
            : 'Supplier catalog explicitly lists the post-01-Sep-2022 Boomer filter diagrams for this part.',
        },
      );
      fitmentSourceIds.set(part.number, sourceRecordId);
    }

    for (const machineSlug of ALL_MACHINE_SLUGS) {
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

      for (const part of parts) {
        if (!part.machineSlugs.includes(machineSlug)) continue;

        const partId = await selectId(
          connection,
          `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
          [manufacturerId, part.number.toUpperCase()],
        );
        const sourceRecordId = fitmentSourceIds.get(part.number);
        if (!sourceRecordId) throw new Error(`Missing fitment source for ${part.number}.`);

        const [existing] = await connection.query<IdRow[]>(
          `SELECT id FROM machine_parts
           WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
          [machineId, partId, machineVersionId, CONFIGURATION_NOTE],
        );
        if (!existing[0]) {
          await connection.query(
            `INSERT INTO machine_parts
             (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
             VALUES (?,?,?,?,?,'high',?)`,
            [machineId, partId, machineVersionId, CONFIGURATION_NOTE, part.fitmentNote, sourceRecordId],
          );
        }
      }
    }
  },
};
