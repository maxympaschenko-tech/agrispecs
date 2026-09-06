import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
import { withServerTtlCache } from '@/lib/server-ttl-cache';

const EQUIPMENT_FACET_TTL_MS = 5 * 60 * 1000;
export const MIN_INDEXABLE_EQUIPMENT_FACET_MODELS = 2;

type NumericFacetConfig = {
  slug: string;
  label: string;
  canonicalUnit: string;
  specKeys: string[];
};

type CategoricalFacetConfig = {
  slug: string;
  label: string;
  specKey: string;
  indexableValues: string[];
};

type NumericFacetRow = RowDataPacket & {
  machine_id: number;
  spec_key: string;
  value_number: string | number;
  unit: string | null;
};

type CategoricalFacetRow = RowDataPacket & {
  machine_id: number;
  model_name: string;
  model_slug: string;
  data_status: 'partial' | 'verified';
  manufacturer_name: string;
  manufacturer_slug: string;
  equipment_type_name: string;
  equipment_type_slug: string;
  value_text: string;
};

export type EquipmentNumericFacetCoverage = {
  slug: string;
  label: string;
  unit: string;
  modelCount: number;
  minValue: number;
  maxValue: number;
};

export type EquipmentFacetMachine = {
  id: string;
  equipmentType: string;
  equipmentTypeSlug: string;
  brand: string;
  brandSlug: string;
  model: string;
  modelSlug: string;
  title: string;
  dataStatus: 'partial' | 'verified';
};

export type EquipmentCategoricalFacetEntry = {
  facetSlug: string;
  facetLabel: string;
  value: string;
  valueSlug: string;
  machines: EquipmentFacetMachine[];
};

export type IndexableEquipmentFacetRoute = {
  equipmentTypeSlug: string;
  facetSlug: string;
  facetLabel: string;
  value: string;
  valueSlug: string;
  modelCount: number;
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
  'skid-steer-loader': [
    {
      slug: 'net-engine-power',
      label: 'Net engine power',
      canonicalUnit: 'hp',
      specKeys: [
        'skid_steer.net_engine_power',
        'kubota.ssv.net_power',
      ],
    },
    {
      slug: 'gross-engine-power',
      label: 'Gross engine power',
      canonicalUnit: 'hp',
      specKeys: [
        'new_holland.skid_steer.gross_power',
        'kubota.ssv.gross_power',
      ],
    },
    {
      slug: 'rated-operating-capacity-50-percent-tipping-load',
      label: 'Rated operating capacity at 50% tipping load',
      canonicalUnit: 'lb',
      specKeys: [
        'new_holland.skid_steer.rated_operating_capacity',
        'kubota.ssv.rated_operating_capacity',
      ],
    },
    {
      slug: 'operating-weight',
      label: 'Operating weight',
      canonicalUnit: 'lb',
      specKeys: [
        'skid_steer.operating_weight',
        'new_holland.skid_steer.operating_weight',
      ],
    },
  ],
};

const CATEGORICAL_FACETS_BY_TYPE: Record<string, CategoricalFacetConfig[]> = {
  'mini-excavator': [
    {
      slug: 'powertrain',
      label: 'Powertrain',
      specKey: 'mini_excavator.powertrain',
      indexableValues: ['electric', 'diesel'],
    },
  ],
};

function slugifyFacetValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function getCategoricalFacetConfig(equipmentTypeSlug: string, facetSlug: string) {
  return (CATEGORICAL_FACETS_BY_TYPE[equipmentTypeSlug] || [])
    .find((facet) => facet.slug === facetSlug);
}

async function loadCategoricalFacetEntries(
  equipmentTypeSlug: string,
  facetSlug: string,
): Promise<EquipmentCategoricalFacetEntry[]> {
  const config = getCategoricalFacetConfig(equipmentTypeSlug, facetSlug);
  if (!config) return [];

  return withServerTtlCache(
    `equipment:categorical-facet:${equipmentTypeSlug}:${facetSlug}`,
    EQUIPMENT_FACET_TTL_MS,
    async () => {
      try {
        const db = await getDbReady();
        const [rows] = await db.query<CategoricalFacetRow[]>(`
          SELECT DISTINCT
            m.id AS machine_id,
            m.model_name,
            m.slug AS model_slug,
            m.data_status,
            mf.name AS manufacturer_name,
            mf.slug AS manufacturer_slug,
            et.name AS equipment_type_name,
            et.slug AS equipment_type_slug,
            ms.value_text
          FROM machines m
          INNER JOIN manufacturers mf ON mf.id = m.manufacturer_id
          INNER JOIN equipment_types et ON et.id = m.equipment_type_id
          INNER JOIN machine_versions mv ON mv.machine_id = m.id AND mv.is_current = TRUE
          INNER JOIN machine_specs ms ON ms.machine_id = m.id AND ms.machine_version_id = mv.id
          INNER JOIN spec_definitions sd ON sd.id = ms.spec_definition_id
          WHERE et.slug = ?
            AND m.data_status IN ('partial','verified')
            AND ms.value_text IS NOT NULL
            AND ms.confidence IN ('official','high')
            AND sd.spec_key = ?
          ORDER BY mf.name ASC, m.model_name ASC
        `, [equipmentTypeSlug, config.specKey]);

        const groups = new Map<string, EquipmentCategoricalFacetEntry>();
        const seenMachines = new Map<string, Set<number>>();

        for (const row of rows) {
          const value = row.value_text.trim();
          const valueSlug = slugifyFacetValue(value);
          if (!value || !valueSlug) continue;

          const existing = groups.get(valueSlug) || {
            facetSlug: config.slug,
            facetLabel: config.label,
            value,
            valueSlug,
            machines: [],
          };
          const seen = seenMachines.get(valueSlug) || new Set<number>();
          if (!seen.has(row.machine_id)) {
            existing.machines.push({
              id: String(row.machine_id),
              equipmentType: row.equipment_type_name,
              equipmentTypeSlug: row.equipment_type_slug,
              brand: row.manufacturer_name,
              brandSlug: row.manufacturer_slug,
              model: row.model_name,
              modelSlug: row.model_slug,
              title: `${row.manufacturer_name} ${row.model_name}`,
              dataStatus: row.data_status,
            });
            seen.add(row.machine_id);
          }
          groups.set(valueSlug, existing);
          seenMachines.set(valueSlug, seen);
        }

        return Array.from(groups.values())
          .sort((a, b) => b.machines.length - a.machines.length || a.value.localeCompare(b.value));
      } catch (error) {
        console.error('Unable to load categorical equipment facet:', error);
        return [];
      }
    },
  );
}

export async function getEquipmentNumericFacetCoverage(
  equipmentTypeSlug: string,
  manufacturerSlug?: string,
): Promise<EquipmentNumericFacetCoverage[]> {
  const normalizedType = equipmentTypeSlug.trim().toLowerCase();
  const normalizedManufacturer = manufacturerSlug?.trim().toLowerCase() || null;
  const facets = NUMERIC_FACETS_BY_TYPE[normalizedType] || [];
  if (facets.length === 0) return [];

  return withServerTtlCache(
    `equipment:numeric-facets:${normalizedType}:${normalizedManufacturer || 'all'}`,
    EQUIPMENT_FACET_TTL_MS,
    async () => {
      try {
        const specKeys = Array.from(new Set(facets.flatMap((facet) => facet.specKeys)));
        const placeholders = specKeys.map(() => '?').join(',');
        const manufacturerClause = normalizedManufacturer ? 'AND mf.slug = ?' : '';
        const queryParams: unknown[] = [normalizedType];
        if (normalizedManufacturer) queryParams.push(normalizedManufacturer);
        queryParams.push(...specKeys);

        const db = await getDbReady();
        const [rows] = await db.query<NumericFacetRow[]>(`
          SELECT
            m.id AS machine_id,
            sd.spec_key,
            ms.value_number,
            ms.unit
          FROM machines m
          INNER JOIN manufacturers mf ON mf.id = m.manufacturer_id
          INNER JOIN equipment_types et ON et.id = m.equipment_type_id
          INNER JOIN machine_versions mv ON mv.machine_id = m.id AND mv.is_current = TRUE
          INNER JOIN machine_specs ms ON ms.machine_id = m.id AND ms.machine_version_id = mv.id
          INNER JOIN spec_definitions sd ON sd.id = ms.spec_definition_id
          WHERE et.slug = ?
            ${manufacturerClause}
            AND m.data_status IN ('partial','verified')
            AND ms.value_number IS NOT NULL
            AND ms.confidence IN ('official','high')
            AND sd.spec_key IN (${placeholders})
        `, queryParams);

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

export async function getIndexableEquipmentCategoricalFacet(
  equipmentTypeSlug: string,
  facetSlug: string,
  valueSlug: string,
): Promise<EquipmentCategoricalFacetEntry | undefined> {
  const normalizedType = equipmentTypeSlug.trim().toLowerCase();
  const normalizedFacet = facetSlug.trim().toLowerCase();
  const normalizedValue = valueSlug.trim().toLowerCase();
  const config = getCategoricalFacetConfig(normalizedType, normalizedFacet);
  if (!config || !config.indexableValues.includes(normalizedValue)) return undefined;

  const entries = await loadCategoricalFacetEntries(normalizedType, normalizedFacet);
  const entry = entries.find((item) => item.valueSlug === normalizedValue);
  return entry && entry.machines.length >= MIN_INDEXABLE_EQUIPMENT_FACET_MODELS ? entry : undefined;
}

export async function getIndexableEquipmentFacetRoutes(
  equipmentTypeSlug?: string,
): Promise<IndexableEquipmentFacetRoute[]> {
  const requestedType = equipmentTypeSlug?.trim().toLowerCase();
  const typeEntries = Object.entries(CATEGORICAL_FACETS_BY_TYPE)
    .filter(([typeSlug]) => !requestedType || typeSlug === requestedType);
  const routes: IndexableEquipmentFacetRoute[] = [];

  for (const [typeSlug, configs] of typeEntries) {
    for (const config of configs) {
      const entries = await loadCategoricalFacetEntries(typeSlug, config.slug);
      for (const entry of entries) {
        if (!config.indexableValues.includes(entry.valueSlug)) continue;
        if (entry.machines.length < MIN_INDEXABLE_EQUIPMENT_FACET_MODELS) continue;
        routes.push({
          equipmentTypeSlug: typeSlug,
          facetSlug: config.slug,
          facetLabel: config.label,
          value: entry.value,
          valueSlug: entry.valueSlug,
          modelCount: entry.machines.length,
        });
      }
    }
  }

  return routes;
}
