import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };
type Rule = [string, string, string, string | null, string | null];

const rules: Rule[] = [
  ['1023e','LVA21035','HJ','100001',null], ['1023e','LVA21035','JJ',null,'117913'],
  ['1023e','M113621','HJ','100001',null], ['1023e','M113621','JJ',null,'117913'],
  ['1023e','M123378','HJ','100001',null], ['1023e','M123378','JJ',null,'117913'],
  ['1023e','TA15270','JJ','117914',null], ['1023e','TA25769','JJ','117914',null],
  ['1023e','LVU34503','JJ','117914',null], ['1023e','LVU34504','JJ','117914',null],

  ['1025r','LVA21036','HJ','100001',null], ['1025r','LVA21036','JJ',null,'153036'],
  ['1025r','M131802','HJ','100001',null], ['1025r','M131802','JJ',null,'153036'],
  ['1025r','M131803','HJ','100001',null], ['1025r','M131803','JJ',null,'153036'],
  ['1025r','TA15270','JJ','153037',null], ['1025r','TA25769','JJ','153037',null],
  ['1025r','LVU34503','JJ','153037',null], ['1025r','LVU34504','JJ','153037',null],

  ['2025r','LVA21036','HH','100001',null], ['2025r','LVA21036','JJ',null,'103920'],
  ['2025r','M131802','HH','100001',null], ['2025r','M131802','JJ',null,'103920'],
  ['2025r','M131803','HH','100001',null], ['2025r','M131803','JJ',null,'103920'],
  ['2025r','TA25769','JJ','103921',null],
  ['2025r','LVU34503','JJ','103921',null], ['2025r','LVU34504','JJ','103921',null],
];

async function id(connection: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await connection.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Missing compact PIN correction dependency.');
  return Number(rows[0].id);
}

export const compactPinGenerationCorrectionMigration: DbMigration = {
  id: '20260827_110_compact_pin_generation_correction',
  description: 'Separate HJ, HH and JJ compact tractor PIN generations from newer NP serial rules',
  async apply(connection) {
    await connection.query(
      `UPDATE source_records
       SET url='https://www.deere.com/assets/pdfs/common/qrg/rpg-1023e-cut-my22-na-edition.pdf'
       WHERE external_id='jd-rpg-1023e-my22-np100000-na-2024-03'`,
    );

    const johnDeereId = await id(connection, `SELECT id FROM manufacturers WHERE slug='john-deere' LIMIT 1`);
    const sourceIds = new Map<string,number>([
      ['1023e', await id(connection, `SELECT id FROM source_records WHERE external_id='jd-1e-1r-filter-overview-2021-02' ORDER BY id LIMIT 1`)],
      ['1025r', await id(connection, `SELECT id FROM source_records WHERE external_id='jd-rpg-1025r-worldwide-2024-01' ORDER BY id LIMIT 1`)],
      ['2025r', await id(connection, `SELECT id FROM source_records WHERE external_id='jd-rpg-2025r-hh100001-worldwide-2023-10' ORDER BY id LIMIT 1`)],
    ]);

    const machineIds = new Map<string,number>();
    for (const slug of ['1023e','1025r','2025r']) {
      machineIds.set(slug, await id(connection,
        `SELECT m.id FROM machines m JOIN manufacturers mf ON mf.id=m.manufacturer_id WHERE mf.slug='john-deere' AND m.slug=? LIMIT 1`, [slug]));
    }

    const partIds = new Map<string,number>();
    for (const number of Array.from(new Set(rules.map((rule) => rule[1])))) {
      partIds.set(number, await id(connection,
        `SELECT id FROM parts WHERE manufacturer_id=? AND normalized_part_number=? LIMIT 1`, [johnDeereId,number]));
    }

    for (const pair of Array.from(new Set(rules.map((rule) => `${rule[0]}|${rule[1]}`)))) {
      const [machine,part] = pair.split('|');
      await connection.query(
        `DELETE FROM machine_parts
         WHERE machine_id=? AND part_id=? AND serial_prefix IS NULL
           AND (serial_from IS NOT NULL OR serial_to IS NOT NULL)`,
        [machineIds.get(machine),partIds.get(part)],
      );
    }

    for (const [machine,part,prefix,from,to] of rules) {
      const machineId = machineIds.get(machine);
      const partId = partIds.get(part);
      const sourceRecordId = sourceIds.get(machine);
      if (!machineId || !partId || !sourceRecordId) throw new Error('Missing compact PIN rule dependency.');

      const note = `${machine.toUpperCase()} verified ${prefix} PIN fitment range${from ? ` from ${prefix}${from}` : ''}${to ? ` through ${prefix}${to}` : ''}.`;
      const [existing] = await connection.query<IdRow[]>(
        `SELECT id FROM machine_parts WHERE machine_id=? AND part_id=? AND serial_prefix=?
         AND COALESCE(serial_from,'')=COALESCE(?,'') AND COALESCE(serial_to,'')=COALESCE(?,'') LIMIT 1`,
        [machineId,partId,prefix,from,to],
      );

      if (existing[0]) {
        await connection.query(`UPDATE machine_parts SET fitment_note=?,source_record_id=? WHERE id=?`,
          [note,sourceRecordId,Number(existing[0].id)]);
      } else {
        await connection.query(
          `INSERT INTO machine_parts (machine_id,part_id,fitment_note,serial_prefix,serial_from,serial_to,source_record_id)
           VALUES (?,?,?,?,?,?,?)`, [machineId,partId,note,prefix,from,to,sourceRecordId]);
      }
    }
  },
};
