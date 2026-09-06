import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
import { withServerTtlCache } from '@/lib/server-ttl-cache';

const EQUIPMENT_FACET_TTL_MS = 5 * 60 * 1000;

type NumericFacetConfig = {
  slug: string;
  label: string;
  canonicalUnit: string;
  specKeys: string[];
};

type FacetRow = RowDataPacket & {
  machine_id: number;
  spec_key: string;
  value_number: string | number;
  unit: string | null;
};

export type EquipmentNumericFacetCoverage = {
  slug: string;
  label: string;
  unit: string;
  modelCount: number;
  minValue: number;
  maxValue: number;
};

const NUMERIC_FACETS_BY_TYPE: Record<string, NumericFacetConfig[]> = {
  'mini-excavator': [
    {
      slug: 'engine-power',
      label: 'Published engine power',
      canonicalUnit: 'hp',
      specKeys: [
        'mini_excavator.engine_power',
        'kubota.excavator.published_power',
      ],
    },
    {
      slug: 'operating-weight',
      label: 'Operating weight',
      canonicalUnit: 'lb',
      specKeys: [
        'mini_excavator.operating_weight',
        'kubota.excavator.operating_weight',
      ],
    },
  ],
};

export async function getEquipmentNumericFacetCoverage(
  equipmentTypeSlug: string,
): Promise<EquipmentNumericFacetCoverage[]> {
  const normalizedType = equipmentTypeSlug.trim().toLowerCase();
  const facets = NUMERIC_FACETS_BY_TYPE[normalizedType] || [];
  if (facets.length === 0) return [];

  return withServerTtlCache(
    `equipment:numeric-facets:${normalizedType}`,
    EQUIPMENT_FACET_TTL_MS,
    async () => {
      try {
        const specKeys = Array.from(new Set(facets.flatMap((facet) => facet.specKeys)));
        const placeholders = specKeys.map(() => '?').join(',');
        const db = await getDbReady();
        const [rows] = await db.query<FacetRow[]>(`
          SELECT
            m.id AS machine_id,
            sd.spec_key,
            ms.value_number,
            ms.unit
          FROM machines m
          INNER JOIN equipment_types et ON et.id = m.equipment_type_id
          INNER JOIN machine_versions mv ON mv.machine_id = m.id AND mv.is_current = TRUE
          INNER JOIN machine_specs ms ON ms.machine_id = m.id AND ms.machine_version_id = mv.id
          INNER JOIN spec_definitions sd ON sd.id = ms.spec_definition_id
          WHERE et.slug = ?
            AND m.data_status IN ('partial','verified')
            AND ms.value_number IS NOT NULL
            AND ms.confidence IN ('official','high')
            AND sd.spec_key IN (${placeholders})
        `, [normalizedType, ...specKeys]);

        return facets.flatMap((facet) => {
          const matchingKeys = new Set(facet.specKeys);
          const valuesByMachine = new Map<number, number>();

          for (const row of rows) {
            if (!matchingKeys.has(row.spec_key)) continue;
            if (row.unit !== facet.canonicalUnit) continue;
            const value = Number(row.value_number);
            if (!Number.isFinite(value)) continue;
            if (!valuesByMachine.has(row.machine_id)) valuesByMachine.set(row.machine_id, value);
          }

          const values = Array.from(valuesByMachine.values());
          if (values.length < 2) return [];

          return [{
            slug: facet.slug,
            label: facet.label,
            unit: facet.canonicalUnit,
            modelCount: values.length,
            minValue: Math.min(...values),
            maxValue: Math.max(...values),
          }];
        });
      } catch (error) {
        console.error('Unable to load equipment numeric facet coverage:', error);
        return [];
      }
    },
  );
}
