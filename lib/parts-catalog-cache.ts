import { getPartCategories, getPartCategory } from '@/lib/part-category-service';
import { getPartCatalogStats } from '@/lib/parts-catalog-service';
import { withServerTtlCache } from '@/lib/server-ttl-cache';

const PARTS_AGGREGATE_TTL_MS = 5 * 60 * 1000;

export function getCachedPartCategories() {
  return withServerTtlCache(
    'parts:categories',
    PARTS_AGGREGATE_TTL_MS,
    () => getPartCategories(),
    (categories) => categories.length > 0,
  );
}

export function getCachedPartCategory(slug: string) {
  const cacheKey = slug.trim().toLowerCase();
  return withServerTtlCache(
    `parts:category:${cacheKey}`,
    PARTS_AGGREGATE_TTL_MS,
    () => getPartCategory(slug),
    (category) => Boolean(category),
  );
}

export function getCachedPartCatalogStats(categorySlug?: string) {
  const cacheKey = categorySlug?.trim().toLowerCase() || 'all';
  return withServerTtlCache(
    `parts:stats:${cacheKey}`,
    PARTS_AGGREGATE_TTL_MS,
    () => getPartCatalogStats(categorySlug),
    (stats) => stats.total > 0,
  );
}
