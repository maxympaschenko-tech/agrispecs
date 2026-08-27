import type { DbMigration } from '@/lib/db-migration-types';

export const kubotaB2401DTNPtoConflictMigration:DbMigration={
  id:'20260827_180_kubota_b2401dtn_pto_conflict',
  description:'Mark B2401DTN current PTO power as high-confidence because current Kubota technical tables list 19.2 HP while the Compact Narrow marketing page lists 19.4 HP',
  async apply(connection){
    await connection.query(`
      UPDATE machine_specs ms
      JOIN machines m ON m.id=ms.machine_id
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      JOIN machine_versions mv ON mv.id=ms.machine_version_id
      JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
      SET ms.confidence='high'
      WHERE mf.slug='kubota' AND m.slug='b2401dtn'
        AND mv.slug='us-current-gear-narrow-4wd'
        AND sd.spec_key='pto.rated_power'
        AND ms.value_number=19.2
    `);

    await connection.query(`
      UPDATE machine_versions mv
      JOIN machines m ON m.id=mv.machine_id
      JOIN manufacturers mf ON mf.id=m.manufacturer_id
      SET mv.notes='Current Kubota 2026 Full Product Line and current B01 technical brochure list B2401 gear PTO power at 19.2 HP. The current Compact Narrow marketing page lists B2401N at 19.4 PTO HP. The 19.2 technical-table value is retained with high confidence and the conflict is explicitly documented.'
      WHERE mf.slug='kubota' AND m.slug='b2401dtn'
        AND mv.slug='us-current-gear-narrow-4wd'
    `);
  },
};
