function normalizePartNumber(value: string) {
  try {
    return decodeURIComponent(value).trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  } catch {
    return '';
  }
}

function normalizeManufacturerSlug(value: string | null | undefined) {
  if (!value) return '';
  try {
    return decodeURIComponent(value).trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
  } catch {
    return '';
  }
}

export function getPartReferenceHref(
  partNumberOrSlug: string,
  manufacturerSlug: string | null | undefined,
  ambiguousPublishedPartNumbers: ReadonlySet<string>,
) {
  const normalizedPartNumber = normalizePartNumber(partNumberOrSlug);
  if (!normalizedPartNumber) return '/parts';

  const numberSegment = normalizedPartNumber.toLowerCase();
  const normalizedManufacturer = normalizeManufacturerSlug(manufacturerSlug);
  if (normalizedManufacturer && ambiguousPublishedPartNumbers.has(normalizedPartNumber)) {
    return `/parts/${normalizedManufacturer}/${numberSegment}`;
  }

  return `/parts/${numberSegment}`;
}
