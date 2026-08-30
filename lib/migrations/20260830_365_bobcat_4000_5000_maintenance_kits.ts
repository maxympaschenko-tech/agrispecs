import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type KitSeed = {
  partNumber: string;
  hours: number;
  url: string;
  includedParts: string[];
  machineSlugs: string[];
};

const VERSION = 'united-states-current-2026-08';

const current4000 = [
  'ct4045-hst', 'ct4045-sst', 'ct4050-hst', 'ct4050-sst', 'ct4058-hst', 'ct4545-hst-cab', 'ct4558-hst-cab',
];
const current5000 = ['ct5545-hst-cab', 'ct5550-hst-cab', 'ct5555-hst-cab', 'ct5558-hst-cab'];
const current4000And5000 = [...current4000, ...current5000];

const kits: KitSeed[] = [
  {
    partNumber: '7402379',
    hours: 50,
    url: 'https://shop.bobcat.com/50-hour-maintenance-kit-7402379',
    includedParts: ['7002299 hydrostatic filter', '7379332 hydraulic oil filter'],
    machineSlugs: current4000And5000,
  },
  {
    partNumber: '7402380',
    hours: 200,
    url: 'https://shop.bobcat.com/200-hour-maintenance-kit-7402380',
    includedParts: ['7002299 hydrostatic filter', '7379332 hydraulic oil filter', '7380039 fuel filter'],
    machineSlugs: current4000And5000,
  },
  {
    partNumber: '7402381',
    hours: 400,
    url: 'https://shop.bobcat.com/400-hour-maintenance-kit-7402381',
    includedParts: ['7002299 hydrostatic filter', '7379332 hydraulic oil filter', '7380039 fuel filter', '7384298 engine oil filter'],
    machineSlugs: current4000And5000,
  },
  {
    partNumber: '7402383',
    hours: 800,
    url: 'https://shop.bobcat.com/800-hour-maintenance-kit-7402383',
    includedParts: ['7002299 hydrostatic filter', '7379332 hydraulic oil filter', '7380039 fuel filter', '7384298 engine oil filter', '7384396 seal gasket'],
    machineSlugs: current4000And5000,
  },
  {
    partNumber: '7402384',
    hours: 1000,
    url: 'https://shop.bobcat.com/1000-hour-maintenance-kit-7402384',
    includedParts: ['7002299 hydrostatic filter', '7373981 outer air filter', '7379332 hydraulic oil filter', '7380039 fuel filter'],
    machineSlugs: current4000,
  },
];

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Bobcat maintenance-kit migration dependency missing');
  return Number(rows[0].id);
}

async function ensureSourceRecord(
  c: Parameters<DbMigration['apply']>[0],
  sourceId: number,
  kit: KitSeed,
) {
  const externalId = `bobcat-${kit.partNumber}-${kit.hours}h-maintenance-kit-current-us-2026-08`;
  const [rows] = await c.query<IdRow[]>(`SELECT id FROM source_records WHERE external_id=? LIMIT 1`, [externalId]);
  if (rows[0]) return Number(rows[0].id);
  const [inserted] = await c.query<ResultSetHeader>(
    `INSERT INTO source_records(source_id,url,external_id,title,raw_reference) VALUES(?,?,?,?,?)`,
    [
      sourceId,
      kit.url,
      externalId,
      `Bobcat ${kit.hours} Hour Maintenance Kit ${kit.partNumber}`,
      JSON.stringify({
        market: 'United States',
        captured: '2026-08-30',
        serviceMilestoneHours: kit.hours,
        includedParts: kit.includedParts,
        machineSlugs: kit.machineSlugs,
        sourcePolicy: 'Bobcat Shop explicitly states that a compact tractor at this hour milestone is due for routine maintenance and that the kit is sourced from the service manual. Kit contents are recorded as kit contents only; they are not converted into independent recurring component replacement intervals.',
      }),
    ],
  );
  return Number(inserted.insertId);
}

export const bobcat40005000MaintenanceKitsMigration: DbMigration = {
  id: '20260830_365_bobcat_4000_5000_maintenance_kits',
  description: 'Add official Bobcat US maintenance-kit parts and service milestones for current 4000 and 5000 Platform tractors',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='bobcat' LIMIT 1`);
    const sourceId = await id(c, `SELECT id FROM sources WHERE name='Bobcat' AND domain='bobcat.com' LIMIT 1`);

    await c.query(`INSERT INTO part_categories(name,slug) VALUES('Filters','filters') ON DUPLICATE KEY UPDATE name=VALUES(name)`);
    const filtersId = await id(c, `SELECT id FROM part_categories WHERE slug='filters' LIMIT 1`);
    await c.query(
      `INSERT INTO part_categories(parent_id,name,slug) VALUES(?,'Maintenance Kits','maintenance-kits')
       ON DUPLICATE KEY UPDATE parent_id=VALUES(parent_id),name=VALUES(name)`,
      [filtersId],
    );
    const maintenanceKitsId = await id(c, `SELECT id FROM part_categories WHERE slug='maintenance-kits' LIMIT 1`);

    for (const kit of kits) {
      const sourceRecordId = await ensureSourceRecord(c, sourceId, kit);

      await c.query(
        `INSERT INTO parts(manufacturer_id,category_id,part_number,normalized_part_number,name,data_status)
         VALUES(?,?,?,?,?,'verified')
         ON DUPLICATE KEY UPDATE category_id=VALUES(category_id),part_number=VALUES(part_number),name=VALUES(name),data_status='verified'`,
        [manufacturerId, maintenanceKitsId, kit.partNumber, kit.partNumber, `${kit.hours} Hour Maintenance Kit`],
      );
      const partId = await id(
        c,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`,
        [manufacturerId, kit.partNumber],
      );

      for (const machineSlug of kit.machineSlugs) {
        const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug=? LIMIT 1`, [manufacturerId, machineSlug]);
        const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);
        const fitmentNote = `Official Bobcat ${kit.hours}-hour maintenance kit; verify serial-number-specific contents in the Bobcat Online Parts Catalog.`;

        const [existingFitment] = await c.query<IdRow[]>(
          `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND fitment_note=? LIMIT 1`,
          [machineId, partId, fitmentNote],
        );
        if (!existingFitment[0]) {
          await c.query(
            `INSERT INTO machine_parts(machine_id,part_id,fitment_note,source_record_id) VALUES(?,?,?,?)`,
            [machineId, partId, fitmentNote, sourceRecordId],
          );
        }

        await c.query(
          `INSERT INTO maintenance_tasks(
             machine_id,machine_version_id,task_key,section,action,title,part_id,interval_hours,interval_months,
             initial_interval_hours,interval_text,notes,source_record_id,confidence
           ) VALUES(?,? ,?,'Maintenance','Service',?,?,NULL,NULL,?,?,?,?,'official')
           ON DUPLICATE KEY UPDATE
             machine_version_id=VALUES(machine_version_id),action=VALUES(action),title=VALUES(title),part_id=VALUES(part_id),
             interval_hours=NULL,interval_months=NULL,initial_interval_hours=VALUES(initial_interval_hours),
             interval_text=VALUES(interval_text),notes=VALUES(notes),confidence='official'`,
          [
            machineId,
            versionId,
            `scheduled-service-${kit.hours}h`,
            `${kit.hours}-hour routine maintenance`,
            partId,
            kit.hours,
            `At ${kit.hours} hours`,
            `Bobcat Shop identifies this as a routine-maintenance milestone and lists maintenance kit ${kit.partNumber}. Included kit components: ${kit.includedParts.join('; ')}. The kit contents are not treated here as separate recurring replacement intervals. Parts can vary by tractor serial number.`,
            sourceRecordId,
          ],
        );
      }
    }
  },
};
