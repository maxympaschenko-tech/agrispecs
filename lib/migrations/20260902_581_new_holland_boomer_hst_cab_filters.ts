import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type SourceKey = 'hst' | 'cab';
type FitmentSeed = {
  machineSlug: 'boomer-35' | 'boomer-45' | 'boomer-55';
  partNumber: 'MT40007563' | 'MT40032863';
  source: SourceKey;
  configurationNote: string;
  fitmentNote: string;
};

const CURRENT_VERSION = 'united-states-current-2026-08';
const OEM_SOURCE_EXTERNAL_ID = 'new-holland-boomer-tier4b-na-initial-stocking-filters-2026-09';
const HST_URL = 'https://www.messicks.com/parts/new-holland/mt40007563';
const CAB_URL = 'https://www.messicks.com/parts/new-holland/mt40032863';
const HST_EXTERNAL_ID = 'messicks-new-holland-mt40007563-boomer-hst-post-2022-09';
const CAB_EXTERNAL_ID = 'messicks-new-holland-mt40032863-boomer-cab-post-2022-09';

const fitments: FitmentSeed[] = [
  {
    machineSlug: 'boomer-35',
    partNumber: 'MT40007563',
    source: 'hst',
    configurationNote: 'HST Tier 4B North America; production date after 01-Sep-2022',
    fitmentNote: 'HST hydraulic oil filter for Boomer 35 Tier 4B North America. Messick’s catalog shows the post-01-Sep-2022 filter diagram together with hydrostatic-transmission oil-cooler diagrams; MyCNH identifies MT40007563 as the Hydraulic, HST Transmission filter.',
  },
  {
    machineSlug: 'boomer-45',
    partNumber: 'MT40007563',
    source: 'hst',
    configurationNote: 'HST Tier 4B North America; production date after 01-Sep-2022',
    fitmentNote: 'HST hydraulic oil filter for Boomer 45 Tier 4B North America. Messick’s catalog shows the post-01-Sep-2022 filter diagram together with hydrostatic-transmission oil-cooler diagrams; MyCNH identifies MT40007563 as the Hydraulic, HST Transmission filter.',
  },
  {
    machineSlug: 'boomer-45',
    partNumber: 'MT40032863',
    source: 'cab',
    configurationNote: 'Cab-equipped Tier 4B North America; production date after 01-Sep-2022',
    fitmentNote: 'Cabin-air filter for cab-equipped Boomer 45 Tier 4B North America. Messick’s catalog shows MT40032863 in the post-01-Sep-2022 filter and cab/roof catalog paths; MyCNH identifies MT40032863 specifically as CAB FILTER; Cabin Air.',
  },
  {
    machineSlug: 'boomer-55',
    partNumber: 'MT40032863',
    source: 'cab',
    configurationNote: 'Cab-equipped Tier 4B North America; production date after 01-Sep-2022',
    fitmentNote: 'Cabin-air filter for cab-equipped Boomer 55 Tier 4B North America. Messick’s catalog shows MT40032863 in the post-01-Sep-2022 filter and cab/roof catalog paths; MyCNH identifies MT40032863 specifically as CAB FILTER; Cabin Air.',
  },
];

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing New Holland Boomer HST/cab filter migration dependency.');
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

export const newHollandBoomerHstCabFiltersMigration: DbMigration = {
  id: '20260902_581_new_holland_boomer_hst_cab_filters',
  description: 'Add configuration-specific Boomer 35/45 HST and Boomer 45/55 cab filter fitment without duplicating existing Boomer 40/50 relations',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='new-holland' LIMIT 1`);
    const hstPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='MT40007563' LIMIT 1`,
      [manufacturerId],
    );
    const cabPartId = await selectId(
      connection,
      `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number='MT40032863' LIMIT 1`,
      [manufacturerId],
    );

    const oemSourceRecordId = await selectId(
      connection,
      `SELECT id FROM source_records WHERE external_id=? LIMIT 1`,
      [OEM_SOURCE_EXTERNAL_ID],
    );

    const supplierSourceId = await selectId(
      connection,
      `SELECT id FROM sources WHERE name=? AND domain='messicks.com' AND source_type='supplier' ORDER BY id LIMIT 1`,
      ["Messick's"],
    );

    const sourceRecordIds: Record<SourceKey, number> = {
      hst: await ensureSourceRecord(
        connection,
        supplierSourceId,
        HST_EXTERNAL_ID,
        HST_URL,
        `Messick's New Holland MT40007563 Boomer HST post-2022 fitment catalog`,
        {
          role: 'Exact model/configuration/production-date fitment evidence',
          partNumber: 'MT40007563',
          supportedModelsAddedHere: ['Boomer 35', 'Boomer 45'],
          productionDateRule: 'After 01-Sep-2022',
          configuration: 'HST / hydrostatic transmission',
          catalogEvidence: ['05.100.010[01] FILTERS', '21.109.010 OIL COOLER, HYDROSTATIC TRANSMISSION', '35.100.050 T/M OIL COOLER'],
          oemSourceRecordId,
          oemMeaning: 'MyCNH lists MT40007563 as HYDRAULIC OIL FILTER; Hydraulic, HST Transmission.',
          duplicateAvoidance: 'Boomer 40 and Boomer 50 already have MT40007563 relations from migrations 578 and 577 and are intentionally not re-added here.',
        },
      ),
      cab: await ensureSourceRecord(
        connection,
        supplierSourceId,
        CAB_EXTERNAL_ID,
        CAB_URL,
        `Messick's New Holland MT40032863 Boomer cab post-2022 fitment catalog`,
        {
          role: 'Exact model/configuration/production-date fitment evidence',
          partNumber: 'MT40032863',
          supportedModelsAddedHere: ['Boomer 45', 'Boomer 55'],
          productionDateRule: 'After 01-Sep-2022',
          configuration: 'Cab-equipped machines only',
          oemSourceRecordId,
          oemMeaning: 'MyCNH lists MT40032863 as CAB FILTER; Cabin Air.',
          interpretationGuardrail: 'Generic ROPS filter-diagram appearances are not treated as cabin-air fitment; only cab-equipped machine relations are added.',
          duplicateAvoidance: 'Boomer 40 and Boomer 50 already have cab-only MT40032863 relations from migrations 578 and 577 and are intentionally not re-added here.',
        },
      ),
    };

    const partIds: Record<FitmentSeed['partNumber'], number> = {
      MT40007563: hstPartId,
      MT40032863: cabPartId,
    };

    for (const fitment of fitments) {
      const machineId = await selectId(
        connection,
        `SELECT m.id FROM machines m INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='new-holland' AND m.slug=? LIMIT 1`,
        [fitment.machineSlug],
      );
      const machineVersionId = await selectId(
        connection,
        `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`,
        [machineId, CURRENT_VERSION],
      );
      const partId = partIds[fitment.partNumber];

      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts
         WHERE machine_id=? AND part_id=? AND machine_version_id=? AND configuration_note=? LIMIT 1`,
        [machineId, partId, machineVersionId, fitment.configurationNote],
      );
      if (!existing[0]) {
        await connection.query(
          `INSERT INTO machine_parts
           (machine_id,part_id,machine_version_id,configuration_note,fitment_note,fitment_confidence,source_record_id)
           VALUES (?,?,?,?,?,'high',?)`,
          [machineId, partId, machineVersionId, fitment.configurationNote, fitment.fitmentNote, sourceRecordIds[fitment.source]],
        );
      }
    }
  },
};
