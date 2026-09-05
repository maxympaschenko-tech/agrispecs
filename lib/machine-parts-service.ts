import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
import { withServerTtlCache } from '@/lib/server-ttl-cache';
import type { FitmentConfidence, PartSummary } from '@/lib/parts-service';

const MACHINE_DETAIL_TTL_MS = 5 * 60 * 1000;

export type MachinePartEvidence = {
  confidence: FitmentConfidence;
  sourceTitle: string;
  sourceUrl: string | null;
};

export type MachinePartSummary = PartSummary & {
  configurationNotes: string[];
  fitmentEvidence: MachinePartEvidence[];
};

type MachinePartRow = RowDataPacket & {
  id: number;
  part_number: string;
  normalized_part_number: string;
  name: string | null;
  data_status: 'seed' | 'partial' | 'verified' | 'review';
  category_name: string | null;
  category_slug: string | null;
  manufacturer_name: string | null;
  manufacturer_slug: string | null;
  fitment_count: number;
  configuration_notes: string | null;
  replacement_numbers: string | null;
  fitment_evidence: string | null;
};

function evidenceRank(confidence: FitmentConfidence) {
  if (confidence === 'official') return 0;
  if (confidence === 'high') return 1;
  if (confidence === 'medium') return 2;
  return 3;
}

export async function getMachinePartsWithConfigurations(
  machineId: string,
  machineVersionId?: number,
): Promise<MachinePartSummary[]> {
  if (!/^\d+$/.test(machineId)) return [];

  const versionKey = machineVersionId ? String(machineVersionId) : 'all';

  try {
    return await withServerTtlCache(
      `machine-parts:${machineId}:${versionKey}`,
      MACHINE_DETAIL_TTL_MS,
      async () => {
        const db = await getDbReady();
        const versionFilter = machineVersionId ? 'AND (mp.machine_version_id IS NULL OR mp.machine_version_id = ?)' : '';
        const params: Array<number> = [Number(machineId)];
        if (machineVersionId) params.push(machineVersionId);

        const [rows] = await db.query<MachinePartRow[]>(`
          SELECT
            p.id,
            p.part_number,
            p.normalized_part_number,
            p.name,
            p.data_status,
            pc.name AS category_name,
            pc.slug AS category_slug,
            mf.name AS manufacturer_name,
            mf.slug AS manufacturer_slug,
            (
              SELECT COUNT(DISTINCT mp_count.machine_id)
              FROM machine_parts mp_count
              INNER JOIN machines m_count ON m_count.id=mp_count.machine_id
                AND m_count.data_status IN ('partial','verified')
              INNER JOIN source_records source_count ON source_count.id=mp_count.source_record_id
              WHERE mp_count.part_id = p.id
            ) AS fitment_count,
            GROUP_CONCAT(
              DISTINCT NULLIF(TRIM(mp.configuration_note), '')
              ORDER BY mp.configuration_note
              SEPARATOR ' || '
            ) AS configuration_notes,
            GROUP_CONCAT(
              DISTINCT CONCAT(
                mp.fitment_confidence,
                ' ~~ ',
                COALESCE(NULLIF(TRIM(sr.title), ''), 'Fitment source'),
                ' ~~ ',
                COALESCE(sr.url, '')
              )
              ORDER BY
                CASE mp.fitment_confidence
                  WHEN 'official' THEN 0
                  WHEN 'high' THEN 1
                  WHEN 'medium' THEN 2
                  ELSE 3
                END,
                sr.title
              SEPARATOR ' || '
            ) AS fitment_evidence,
            (
              SELECT GROUP_CONCAT(DISTINCT replacement.part_number ORDER BY replacement.part_number SEPARATOR ' || ')
              FROM part_cross_references pcr
              INNER JOIN parts replacement ON replacement.id = pcr.cross_part_id
                AND replacement.data_status IN ('partial','verified')
              INNER JOIN source_records replacement_source ON replacement_source.id=pcr.source_record_id
              WHERE pcr.part_id = p.id
                AND pcr.relation_type IN ('replaces','supersedes')
            ) AS replacement_numbers
          FROM machine_parts mp
          INNER JOIN parts p ON p.id = mp.part_id
            AND p.data_status IN ('partial','verified')
          LEFT JOIN part_categories pc ON pc.id = p.category_id
          LEFT JOIN manufacturers mf ON mf.id = p.manufacturer_id
          INNER JOIN source_records sr ON sr.id = mp.source_record_id
          WHERE mp.machine_id = ?
            ${versionFilter}
          GROUP BY p.id, p.part_number, p.normalized_part_number, p.name, p.data_status,
                   pc.name, pc.slug, mf.name, mf.slug
          ORDER BY pc.name ASC, p.part_number ASC
        `, params);

        return rows.map((row) => {
          const replacementNumbers = row.replacement_numbers
            ? row.replacement_numbers.split(' || ').map((number) => number.trim()).filter(Boolean)
            : [];
          const baseName = row.name || row.category_name || 'OEM part';
          const fitmentEvidence = row.fitment_evidence
            ? row.fitment_evidence
                .split(' || ')
                .map((entry) => {
                  const [confidenceRaw, sourceTitleRaw, sourceUrlRaw] = entry.split(' ~~ ');
                  const confidence: FitmentConfidence = confidenceRaw === 'official' || confidenceRaw === 'high' || confidenceRaw === 'medium'
                    ? confidenceRaw
                    : 'low';
                  return {
                    confidence,
                    sourceTitle: sourceTitleRaw?.trim() || 'Fitment source',
                    sourceUrl: sourceUrlRaw?.trim() || null,
                  };
                })
                .sort((a, b) => evidenceRank(a.confidence) - evidenceRank(b.confidence) || a.sourceTitle.localeCompare(b.sourceTitle))
            : [];

          return {
            id: Number(row.id),
            partNumber: row.part_number,
            normalizedPartNumber: row.normalized_part_number,
            name: replacementNumbers.length > 0
              ? `${baseName} · Legacy number — replaced by ${replacementNumbers.join(', ')}`
              : row.name,
            categoryName: row.category_name,
            categorySlug: row.category_slug,
            manufacturerName: row.manufacturer_name,
            manufacturerSlug: row.manufacturer_slug,
            dataStatus: row.data_status,
            fitmentCount: Number(row.fitment_count || 0),
            configurationNotes: row.configuration_notes
              ? row.configuration_notes.split(' || ').map((note) => note.trim()).filter(Boolean)
              : [],
            fitmentEvidence,
          };
        });
      },
    );
  } catch (error) {
    console.error('Unable to load machine parts with configuration context:', error);
    return [];
  }
}
