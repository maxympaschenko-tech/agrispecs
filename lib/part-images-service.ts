import partImageManifest from '@/data/part-images.json';

export type PartImage = {
  imageUrl: string;
  sourcePageUrl: string;
  author: string | null;
  licenseName: string | null;
  licenseUrl: string | null;
  caption: string | null;
  altText: string | null;
  imageKind: 'exact' | 'representative';
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

export function getPartImages(normalizedPartNumber: string, brandSlug?: string | null): PartImage[] {
  return manifest
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
    }));
}
