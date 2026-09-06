import {
  getIndexableEquipmentCategoricalFacet,
  getIndexableEquipmentFacetRoutes,
  type IndexableEquipmentFacetRoute,
} from '@/lib/equipment-facet-service';

export type ManufacturerEquipmentFacetRoute = IndexableEquipmentFacetRoute & {
  manufacturerModelCount: number;
};

export async function getIndexableEquipmentFacetRoutesForManufacturer(
  equipmentTypeSlug: string,
  manufacturerSlug: string,
): Promise<ManufacturerEquipmentFacetRoute[]> {
  const normalizedType = equipmentTypeSlug.trim().toLowerCase();
  const normalizedManufacturer = manufacturerSlug.trim().toLowerCase();
  if (!normalizedType || !normalizedManufacturer) return [];

  const routes = await getIndexableEquipmentFacetRoutes(normalizedType);
  const resolved = await Promise.all(
    routes.map(async (route) => {
      const entry = await getIndexableEquipmentCategoricalFacet(
        route.equipmentTypeSlug,
        route.facetSlug,
        route.valueSlug,
      );
      const manufacturerModelCount = entry?.machines.filter(
        (machine) => machine.brandSlug === normalizedManufacturer,
      ).length || 0;

      return manufacturerModelCount > 0
        ? { ...route, manufacturerModelCount }
        : null;
    }),
  );

  return resolved
    .filter((route): route is ManufacturerEquipmentFacetRoute => Boolean(route))
    .sort((a, b) => b.manufacturerModelCount - a.manufacturerModelCount || a.value.localeCompare(b.value));
}
