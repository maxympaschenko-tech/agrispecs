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
  source_title: string | null;
  source_url: string | null;
  source_published_date: string | null;
};

export async function getMachineCapacities(machineId: string): Promise<MachineCapacity[]> {
  if (!/^\d+$/.test(machineId)) return [];

  try {
    const db = await getDbReady();
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
        sr.title AS source_title,
        sr.url AS source_url,
        DATE_FORMAT(sr.published_date, '%Y-%m-%d') AS source_published_date
      FROM machine_capacities mc
      LEFT JOIN source_records sr ON sr.id = mc.source_record_id
      WHERE mc.machine_id = ?
      ORDER BY
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
    `, [Number(machineId)]);

    return rows.map((row) => ({
      id: Number(row.id),
      systemKey: row.system_key,
      label: row.label,
      configuration: row.configuration,
      valueNumber: Number(row.value_number),
      unit: row.unit,
      fluidName: row.fluid_name,
      notes: row.notes,
      sourceTitle: row.source_title,
      sourceUrl: row.source_url,
      sourcePublishedDate: row.source_published_date,
    }));
  } catch (error) {
    console.error('Unable to load machine capacity variants:', error);
    return [];
  }
}
