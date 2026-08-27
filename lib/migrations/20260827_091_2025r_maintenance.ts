import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

const SOURCE_URL = 'https://www.deere.com/assets/pdfs/common/parts-and-service/manuals-training/2025r-compact-utility-tractor-hh100001-worldwide-edition.pdf';
const SOURCE_EXTERNAL_ID = 'jd-rpg-2025r-hh100001-worldwide-2023-10';

type IdRow = RowDataPacket & { id: number };

async function selectId(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Expected database row was not found during 2025R maintenance migration.');
  return Number(rows[0].id);
}

export const johnDeere2025RMaintenanceMigration: DbMigration = {
  id: '20260827_091_2025r_maintenance',
  description: 'Add official John Deere 2025R maintenance intervals, fluids and capacities',
  async apply(connection) {
    const manufacturerId = await selectId(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const machineId = await selectId(
      connection,
      `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug='2025r' LIMIT 1`,
    );

    let [sourceRows] = await connection.query<IdRow[]>(`SELECT id FROM sources WHERE name='John Deere' AND domain='deere.com' ORDER BY id LIMIT 1`);
    let sourceId = sourceRows[0]?.id ? Number(sourceRows[0].id) : 0;
    if (!sourceId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO sources (name,domain,source_type,authority_level) VALUES ('John Deere','deere.com','manufacturer','official')`,
      );
      sourceId = Number(result.insertId);
    }

    const [existingSource] = await connection.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? ORDER BY id LIMIT 1`, [SOURCE_EXTERNAL_ID]);
    let sourceRecordId = existingSource[0]?.id ? Number(existingSource[0].id) : 0;
    if (!sourceRecordId) {
      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO source_records (source_id,url,external_id,title,published_date) VALUES (?,?,?,?,?)`,
        [sourceId, SOURCE_URL, SOURCE_EXTERNAL_ID, 'John Deere 2025R Compact Utility Tractor Replacement Parts Guide - HH100001 and later', '2023-10-01'],
      );
      sourceRecordId = Number(result.insertId);
    }

    async function partId(number: string) {
      return selectId(connection, `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [manufacturerId, number]);
    }

    const fluidParts = [
      ['TY26669','Plus-50 II 10W-30 Engine Oil'],
      ['TY22000','Low Viscosity Hy-Gard Transmission / Hydraulic Oil'],
    ];
    for (const [number, name] of fluidParts) {
      const categorySlug = number === 'TY26669' ? 'engine-oils' : 'transmission-hydraulic-fluids';
      const categoryId = await selectId(connection, `SELECT id FROM part_categories WHERE slug=? LIMIT 1`, [categorySlug]);
      await connection.query(
        `INSERT INTO parts (manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES (?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),name=VALUES(name),data_status='verified'`,
        [manufacturerId, categoryId, number, number, name],
      );
    }

    async function linkPart(number: string, note: string) {
      const pid = await partId(number);
      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
        [machineId, pid, note],
      );
      if (!existing[0]) {
        await connection.query(`INSERT INTO machine_parts (machine_id,part_id,fitment_note,source_record_id) VALUES (?,?,?,?)`, [machineId, pid, note, sourceRecordId]);
      }
    }

    await linkPart('TY26669', '2025R engine oil: Plus-50 II 10W-30; 2.7 L (2.9 qt) with filter');
    await linkPart('TY22000', '2025R transmission/hydraulic oil: 14.4 L (3.8 gal); front axle oil: 2.8 L (3.0 qt)');

    type Task = {
      key: string;
      section: string;
      action: string;
      title: string;
      partNumber?: string;
      intervalHours?: number;
      intervalMonths?: number;
      capacityValue?: number;
      capacityUnit?: string;
      intervalText: string;
      notes?: string;
    };

    const tasks: Task[] = [
      { key:'engine-oil', section:'Engine', action:'Change', title:'Engine oil', partNumber:'TY26669', intervalHours:200, intervalMonths:12, capacityValue:2.7, capacityUnit:'L', intervalText:'Every 200 hours or annually, whichever comes first', notes:'John Deere Plus-50 II 10W-30; capacity with filter 2.7 L (2.9 qt).' },
      { key:'engine-oil-filter', section:'Engine', action:'Replace', title:'Engine oil filter', partNumber:'M806418', intervalHours:200, intervalMonths:12, intervalText:'Every 200 hours or annually, whichever comes first' },
      { key:'fuel-filter', section:'Fuel & Air', action:'Replace', title:'Fuel filter', partNumber:'AM116304', intervalHours:400, intervalMonths:12, intervalText:'Every 400 hours or annually' },
      { key:'fuel-filter-element', section:'Fuel & Air', action:'Replace', title:'Fuel filter element', partNumber:'MIU804763', intervalHours:400, intervalMonths:12, intervalText:'Every 400 hours or annually, whichever comes first' },
      { key:'air-filters', section:'Fuel & Air', action:'Replace', title:'Primary / secondary air filters', intervalText:'600 / 1200 hours per John Deere guide', notes:'Guide lists M131802/M131803 for serial HH100001-JJ103920 and LVU34503/LVU34504 for JJ103921 and later. The source presents the combined interval as 600/1200 hours.' },
      { key:'transmission-hydraulic-oil', section:'Transmission', action:'Change', title:'Transmission / hydraulic oil', partNumber:'TY22000', intervalHours:200, intervalMonths:12, capacityValue:14.4, capacityUnit:'L', intervalText:'Every 200 hours or annually, whichever comes first', notes:'John Deere Low Viscosity Hy-Gard; capacity 14.4 L (3.8 gal).' },
      { key:'hydraulic-filter', section:'Transmission', action:'Replace', title:'Hydraulic oil filter', partNumber:'LVA16054', intervalHours:200, intervalMonths:12, intervalText:'Every 200 hours or annually, whichever comes first' },
      { key:'front-axle-oil', section:'Axle', action:'Change', title:'Front axle oil', partNumber:'TY22000', intervalHours:200, intervalMonths:12, capacityValue:2.8, capacityUnit:'L', intervalText:'Every 200 hours or annually, whichever comes first', notes:'John Deere Low Viscosity Hy-Gard; capacity 2.8 L (3.0 qt).' },
    ];

    for (const task of tasks) {
      const pid = task.partNumber ? await partId(task.partNumber) : null;
      await connection.query(
        `INSERT INTO maintenance_tasks (
          machine_id,task_key,section,action,title,part_id,interval_hours,interval_months,
          capacity_value,capacity_unit,interval_text,notes,source_record_id,confidence
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'official')
        ON DUPLICATE KEY UPDATE
          section=VALUES(section),action=VALUES(action),title=VALUES(title),part_id=VALUES(part_id),
          interval_hours=VALUES(interval_hours),interval_months=VALUES(interval_months),capacity_value=VALUES(capacity_value),
          capacity_unit=VALUES(capacity_unit),interval_text=VALUES(interval_text),notes=VALUES(notes),confidence='official'`,
        [
          machineId, task.key, task.section, task.action, task.title, pid,
          task.intervalHours ?? null, task.intervalMonths ?? null, task.capacityValue ?? null,
          task.capacityUnit ?? null, task.intervalText, task.notes ?? null, sourceRecordId,
        ],
      );
    }
  },
};
