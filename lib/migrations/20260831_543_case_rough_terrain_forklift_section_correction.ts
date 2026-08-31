import type { DbMigration } from '@/lib/db-migration-types';

export const caseRoughTerrainForkliftSectionCorrectionMigration: DbMigration = {
  id: '20260831_543_case_rough_terrain_forklift_section_correction',
  description: 'Place CASE rough terrain forklift material-handling specs in the existing Loader Performance section',
  async apply(connection) {
    await connection.query(
      `UPDATE spec_definitions
       SET section='Loader Performance'
       WHERE spec_key IN (
         'rough_terrain_forklift.lift_capacity',
         'rough_terrain_forklift.mast_range',
         'rough_terrain_forklift.forward_mast_tilt',
         'rough_terrain_forklift.rear_mast_tilt',
         'rough_terrain_forklift.side_shift'
       )`,
    );
  },
};
