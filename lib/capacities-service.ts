import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export type MachineCapacity = {
  id: number;
  systemKey: string;
  label: string;
  configuration: string;
  valueNumber: number;
  unit: string;
  fluidName: string | null;
  notes: string | null;
  machineVersionId: number | null;
  versionSlug: string | null;
  versionMarketName: string | null;
  versionModelYearStart: number | null;
  versionModelYearEnd: number | null;
  versionConfiguration: string | null;
  versionIsCurrent: boolean | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  sourcePublishedDate: string | null;
};

type CapacityRow = RowDataPacket & {
  id: number;
  system_key: string;
  label: string;
  configuration: string;
  value_number: string | number;
  unit: string;
  fluid_name: string | null;
  notes: string | null;
  machine_version_id: number | null;
  version_slug: string | null;
  version_market_name: string | null;
  version_model_year_start: number | null;
  version_model_year_end: number | null;
  version_configuration: string | null;
  version_is_current: number | null;
  source_title: string | null;
  source_url: string | null;
  source_published_date: string | null;
};

export async function getMachineCapacities(machineId: string, machineVersionId?: number): Promise<MachineCapacity[]> {
  if (!/^\d+$/.test(machineId)) return [];

  try {
    const db = await getDbReady();
    const versionFilter = machineVersionId ? 'AND (mc.machine_version_id IS NULL OR mc.machine_version_id = ?)' : '';
    const params: number[] = [Number(machineId)];
    if (machineVersionId) params.push(machineVersionId);

    const [rows] = await db.query<CapacityRow[]>(`
      SELECT
        mc.id,
        mc.system_key,
        mc.label,
        mc.configuration,
        mc.value_number,
        mc.unit,
        mc.fluid_name,
        mc.notes,
        mc.machine_version_id,
        mv.slug AS version_slug,
        mv.market_name AS version_market_name,
        mv.model_year_start AS version_model_year_start,
        mv.model_year_end AS version_model_year_end,
        mv.configuration AS version_configuration,
        mv.is_current AS version_is_current,
        sr.title AS source_title,
        sr.url AS source_url,
        DATE_FORMAT(sr.published_date, '%Y-%m-%d') AS source_published_date
      FROM machine_capacities mc
      LEFT JOIN machine_versions mv ON mv.id = mc.machine_version_id
      LEFT JOIN source_records sr ON sr.id = mc.source_record_id
      WHERE mc.machine_id = ?
        ${versionFilter}
      ORDER BY
        CASE WHEN mc.machine_version_id IS NULL THEN 0 WHEN mv.is_current = 1 THEN 1 ELSE 2 END,
        CASE mc.label
          WHEN 'Fuel tank' THEN 10
          WHEN 'Cooling system' THEN 20
          WHEN 'Engine oil' THEN 30
          WHEN 'Transmission and hydraulic system' THEN 40
          WHEN 'MFWD axle housing' THEN 50
          WHEN 'MFWD wheel hub' THEN 60
          ELSE 90
        END,
        mc.configuration ASC,
        mc.id ASC
    `, params);

    return rows.map((row) => ({
      id: Number(row.id),
      systemKey: row.system_key,
      label: row.label,
      configuration: row.configuration,
      valueNumber: Number(row.value_number),
      unit: row.unit,
      fluidName: row.fluid_name,
      notes: row.notes,
      machineVersionId: row.machine_version_id === null ? null : Number(row.machine_version_id),
      versionSlug: row.version_slug,
      versionMarketName: row.version_market_name,
      versionModelYearStart: row.version_model_year_start === null ? null : Number(row.version_model_year_start),
      versionModelYearEnd: row.version_model_year_end === null ? null : Number(row.version_model_year_end),
      versionConfiguration: row.version_configuration,
      versionIsCurrent: row.version_is_current === null ? null : Boolean(row.version_is_current),
      sourceTitle: row.source_title,
      sourceUrl: row.source_url,
      sourcePublishedDate: row.source_published_date,
    }));
  } catch (error) {
    console.error('Unable to load machine capacity variants:', error);
    return [];
  }
}
