import type { RowDataPacket } from 'mysql2';
import type { DbMigration } from '@/lib/db-migration-types';

type IdRow = RowDataPacket & { id: number };

const VERSION = 'united-states-current-2026-08';

async function id(c: Parameters<DbMigration['apply']>[0], sql: string, params: unknown[] = []) {
  const [rows] = await c.query<IdRow[]>(sql, params);
  if (!rows[0]) throw new Error('Case IH Farmall 110M strict-current dependency missing');
  return Number(rows[0].id);
}

export const caseIHFarmall110MStrictCurrentCorrectionMigration: DbMigration = {
  id: '20260829_290_case_ih_farmall_110m_strict_current_correction',
  description: 'Remove Farmall 110M current transmission and emissions values not explicitly published on the current US individual product page',
  async apply(c) {
    const manufacturerId = await id(c, `SELECT id FROM manufacturers WHERE slug='case-ih' LIMIT 1`);
    const machineId = await id(c, `SELECT id FROM machines WHERE manufacturer_id=? AND slug='farmall-110m' LIMIT 1`, [manufacturerId]);
    const versionId = await id(c, `SELECT id FROM machine_versions WHERE machine_id=? AND slug=? LIMIT 1`, [machineId, VERSION]);

    await c.query(
      `DELETE ms FROM machine_specs ms
       INNER JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
       WHERE ms.machine_id=? AND ms.machine_version_id=?
         AND sd.spec_key IN ('transmission.options','emissions.compliance')`,
      [machineId, versionId],
    );

    await c.query(
      `UPDATE machine_versions
       SET notes='Current US individual Farmall 110M page explicitly publishes 110 hp, 93 PTO hp, Cab and 4WD. Family-level 3.6 L engine information remains separate; transmission and emissions are intentionally unpublished unless the individual US record states them.'
       WHERE id=?`,
      [versionId],
    );
  },
};
