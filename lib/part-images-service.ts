import { existsSync } from 'node:fs';
import path from 'node:path';
import partImageManifest from '@/data/part-images.json';

export type PartImage = {
  imageUrl: string;
  sourcePageUrl: string | null;
  author: string | null;
  licenseName: string | null;
  licenseUrl: string | null;
  caption: string | null;
  altText: string | null;
  imageKind: 'exact' | 'representative' | 'fallback';
};

type ManifestPartImage = {
  brandSlug: string;
  partNumber: string;
  normalizedPartNumber: string;
  sourceKey: string;
  remoteUrl: string;
  outputPath: string;
  publicUrl: string;
  sourcePageUrl: string;
  author: string | null;
  licenseName: string | null;
  licenseUrl: string | null;
  caption: string | null;
  altText: string | null;
  imageKind: 'exact' | 'representative';
};

type RepresentativeSeed = { normalizedPartNumber: string; label: string };

const manifest = partImageManifest as ManifestPartImage[];

const categoryRepresentativeSeeds: Record<string, Record<string, RepresentativeSeed>> = {
  kubota: {
    'engine-oil-filters': { normalizedPartNumber: 'HH16432430', label: 'engine oil filter' },
    'fuel-filters': { normalizedPartNumber: '6A32059930', label: 'fuel filter' },
    'hydraulic-filters': { normalizedPartNumber: 'HH3A082623', label: 'hydraulic filter' },
    'engine-air-filters': { normalizedPartNumber: 'TC82093230', label: 'engine air filter' },
    'transmission-filters': { normalizedPartNumber: 'HHK7014073', label: 'transmission filter' },
  },
  'john-deere': {
    'engine-oil-filters': { normalizedPartNumber: 'RE519626', label: 'engine oil filter' },
    'fuel-filters': { normalizedPartNumber: 'MIU804763', label: 'fuel filter' },
    'hydraulic-filters': { normalizedPartNumber: 'RE45864', label: 'hydraulic / transmission filter' },
    'air-filters': { normalizedPartNumber: 'M113621', label: 'air filter' },
  },
};

function localMediaExists(publicUrl: string) {
  if (!publicUrl.startsWith('/media/')) return true;
  return existsSync(path.join(process.cwd(), 'public', publicUrl.replace(/^\/+/, '')));
}

function fallbackImage(normalizedPartNumber: string): PartImage {
  return {
    imageUrl: '/media/fallbacks/part.svg',
    sourcePageUrl: null,
    author: null,
    licenseName: null,
    licenseUrl: null,
    caption: `Exact product photo for ${normalizedPartNumber} is being sourced.`,
    altText: `Farm equipment part ${normalizedPartNumber} image pending`,
    imageKind: 'fallback',
  };
}

function mapManifestImage(image: ManifestPartImage): PartImage {
  return {
    imageUrl: image.publicUrl,
    sourcePageUrl: image.sourcePageUrl,
    author: image.author,
    licenseName: image.licenseName,
    licenseUrl: image.licenseUrl,
    caption: image.caption,
    altText: image.altText,
    imageKind: image.imageKind,
  };
}

function categoryRepresentative(
  normalizedPartNumber: string,
  brandSlug?: string | null,
  categorySlug?: string | null,
): PartImage | null {
  if (!brandSlug || !categorySlug) return null;
  const seed = categoryRepresentativeSeeds[brandSlug]?.[categorySlug];
  if (!seed) return null;

  const source = manifest.find((image) =>
    image.brandSlug === brandSlug
    && image.normalizedPartNumber.toLowerCase() === seed.normalizedPartNumber.toLowerCase()
    && localMediaExists(image.publicUrl),
  );
  if (!source) return null;

  return {
    imageUrl: source.publicUrl,
    sourcePageUrl: source.sourcePageUrl,
    author: source.author,
    licenseName: source.licenseName,
    licenseUrl: source.licenseUrl,
    caption: `Representative ${brandSlug.replace(/-/g, ' ')} ${seed.label} image; not asserted as an exact product photo of part ${normalizedPartNumber}.`,
    altText: `${brandSlug.replace(/-/g, ' ')} ${normalizedPartNumber} ${seed.label} representative image`,
    imageKind: 'representative',
  };
}

export function getPartImages(
  normalizedPartNumber: string,
  brandSlug?: string | null,
  categorySlug?: string | null,
): PartImage[] {
  const images = manifest
    .filter((image) =>
      image.normalizedPartNumber.toLowerCase() === normalizedPartNumber.toLowerCase()
      && (!brandSlug || image.brandSlug === brandSlug)
      && localMediaExists(image.publicUrl),
    )
    .map(mapManifestImage);

  if (images.length > 0) return images;

  const representative = categoryRepresentative(normalizedPartNumber, brandSlug, categorySlug);
  return representative ? [representative] : [fallbackImage(normalizedPartNumber)];
}
