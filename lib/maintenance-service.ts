import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';

export type MaintenanceTask = {
  id: number;
  taskKey: string;
  section: string;
  action: string;
  title: string;
  partNumber: string | null;
  partName: string | null;
  intervalHours: number | null;
  intervalMonths: number | null;
  initialIntervalHours: number | null;
  capacityValue: number | null;
  capacityUnit: string | null;
  intervalText: string;
  notes: string | null;
  sourceTitle: string | null;
  sourceUrl: string | null;
  sourcePublishedDate: string | null;
};

type MaintenanceRow = RowDataPacket & {
  id: number;
  task_key: string;
  section: string;
  action: string;
  title: string;
  part_number: string | null;
  part_name: string | null;
  interval_hours: number | null;
  interval_months: number | null;
  initial_interval_hours: number | null;
  capacity_value: string | number | null;
  capacity_unit: string | null;
  interval_text: string;
  notes: string | null;
  source_title: string | null;
  source_url: string | null;
  source_published_date: string | null;
};

export async function getMachineMaintenance(machineId: string): Promise<MaintenanceTask[]> {
  if (!/^\d+$/.test(machineId)) return [];

  try {
    const db = await getDbReady();
    const [rows] = await db.query<MaintenanceRow[]>(`
      SELECT
        mt.id,
        mt.task_key,
        mt.section,
        mt.action,
        mt.title,
        p.part_number,
        p.name AS part_name,
        mt.interval_hours,
        mt.interval_months,
        mt.initial_interval_hours,
        mt.capacity_value,
        mt.capacity_unit,
        mt.interval_text,
        mt.notes,
        sr.title AS source_title,
        sr.url AS source_url,
        DATE_FORMAT(sr.published_date, '%Y-%m-%d') AS source_published_date
      FROM maintenance_tasks mt
      LEFT JOIN parts p ON p.id = mt.part_id
      LEFT JOIN source_records sr ON sr.id = mt.source_record_id
      WHERE mt.machine_id = ?
      ORDER BY
        CASE mt.section
          WHEN 'Engine' THEN 10
          WHEN 'Fuel & Air' THEN 20
          WHEN 'Transmission' THEN 30
          WHEN 'PTO' THEN 35
          WHEN 'Hydraulics' THEN 40
          WHEN 'Axle' THEN 45
          WHEN 'Cab' THEN 50
          ELSE 90
        END,
        COALESCE(mt.interval_hours, 999999),
        mt.title ASC
    `, [Number(machineId)]);

    return rows.map((row) => ({
      id: Number(row.id),
      taskKey: row.task_key,
      section: row.section,
      action: row.action,
      title: row.title,
      partNumber: row.part_number,
      partName: row.part_name,
      intervalHours: row.interval_hours === null ? null : Number(row.interval_hours),
      intervalMonths: row.interval_months === null ? null : Number(row.interval_months),
      initialIntervalHours: row.initial_interval_hours === null ? null : Number(row.initial_interval_hours),
      capacityValue: row.capacity_value === null ? null : Number(row.capacity_value),
      capacityUnit: row.capacity_unit,
      intervalText: row.interval_text,
      notes: row.notes,
      sourceTitle: row.source_title,
      sourceUrl: row.source_url,
      sourcePublishedDate: row.source_published_date,
    }));
  } catch (error) {
    console.error('Unable to load machine maintenance schedule:', error);
    return [];
  }
}
