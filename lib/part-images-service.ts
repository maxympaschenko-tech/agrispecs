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

const manifest = partImageManifest as ManifestPartImage[];

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

export function getPartImages(normalizedPartNumber: string, brandSlug?: string | null): PartImage[] {
  const images = manifest
    .filter((image) =>
      image.normalizedPartNumber.toLowerCase() === normalizedPartNumber.toLowerCase()
      && (!brandSlug || image.brandSlug === brandSlug),
    )
    .map((image) => ({
      imageUrl: image.publicUrl,
      sourcePageUrl: image.sourcePageUrl,
      author: image.author,
      licenseName: image.licenseName,
      licenseUrl: image.licenseUrl,
      caption: image.caption,
      altText: image.altText,
      imageKind: image.imageKind,
    } satisfies PartImage));

  return images.length > 0 ? images : [fallbackImage(normalizedPartNumber)];
}
