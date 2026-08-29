import type { DbMigration } from '@/lib/db-migration-types';

export const johnDeereUnitNormalizationCorrectionsMigration: DbMigration = {
  id: '20260829_284_john_deere_unit_normalization_corrections',
  description: 'Normalize John Deere DEF tank and hydraulic pump output units for cross-model comparison',
  async apply(c) {
    await c.query(`UPDATE spec_definitions SET canonical_unit='L' WHERE spec_key='capacities.def_tank'`);
    await c.query(`UPDATE spec_definitions SET canonical_unit='L/min' WHERE spec_key='hydraulics.pump_rated_output'`);

    await c.query(`
      UPDATE machine_specs ms
      JOIN machines m ON m.id=ms.machine_id
      JOIN machine_versions mv ON mv.id=ms.machine_version_id
      JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
      SET ms.value_number=12.1133177088, ms.unit='L'
      WHERE m.slug IN ('5085m','5090m','5100m')
        AND mv.slug='united-states-current-2026-08'
        AND sd.spec_key='capacities.def_tank'
    `);

    await c.query(`
      UPDATE machine_specs ms
      JOIN machines m ON m.id=ms.machine_id
      JOIN machine_versions mv ON mv.id=ms.machine_version_id
      JOIN spec_definitions sd ON sd.id=ms.spec_definition_id
      SET ms.value_number=CASE m.slug
        WHEN '5090el' THEN 85.17176514
        WHEN '6120eh' THEN 75.7
        WHEN '6mh-155' THEN 114
        ELSE ms.value_number END,
        ms.unit='L/min'
      WHERE m.slug IN ('5090el','6120eh','6mh-155')
        AND mv.slug='united-states-current-2026-08'
        AND sd.spec_key='hydraulics.pump_rated_output'
    `);
  },
};
