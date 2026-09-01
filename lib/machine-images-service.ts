import type { RowDataPacket } from 'mysql2';
import { getDbReady } from '@/lib/db-migrations';
import coreMachineImageManifest from '@/data/machine-images.json';
import kubotaUtilityMachineImageManifest from '@/data/machine-images-kubota-utility.json';

export type MachineImage = {
  id: number;
  imageUrl: string;
  sourcePageUrl: string;
  author: string | null;
  licenseName: string | null;
  licenseUrl: string | null;
  caption: string | null;
  altText: string | null;
  isPrimary: boolean;
};

type MachineImageRow = RowDataPacket & {
  id: number;
  image_url: string;
  source_page_url: string;
  author: string | null;
  license_name: string | null;
  license_url: string | null;
  caption: string | null;
  alt_text: string | null;
  is_primary: number;
};

type MachineIdentityRow = RowDataPacket & {
  brand_slug: string;
  model_slug: string;
};

type ManifestImage = {
  brandSlug: string;
  modelSlug: string;
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
};

const manifest = [
  ...(coreMachineImageManifest as ManifestImage[]),
  ...(kubotaUtilityMachineImageManifest as ManifestImage[]),
];

function manifestToImage(image: ManifestImage, id = -1): MachineImage {
  return {
    id,
    imageUrl: image.publicUrl,
    sourcePageUrl: image.sourcePageUrl,
    author: image.author,
    licenseName: image.licenseName,
    licenseUrl: image.licenseUrl,
    caption: image.caption,
    altText: image.altText,
    isPrimary: true,
  };
}

function rowToImage(row: MachineImageRow): MachineImage {
  return {
    id: Number(row.id),
    imageUrl: row.image_url,
    sourcePageUrl: row.source_page_url,
    author: row.author,
    licenseName: row.license_name,
    licenseUrl: row.license_url,
    caption: row.caption,
    altText: row.alt_text,
    isPrimary: Boolean(row.is_primary),
  };
}

export function getManifestMachinePrimaryImage(brandSlug: string, modelSlug: string): MachineImage | null {
  const image = manifest.find((item) => item.brandSlug === brandSlug && item.modelSlug === modelSlug);
  return image ? manifestToImage(image) : null;
}

export async function getMachineImages(machineId: string): Promise<MachineImage[]> {
  if (!/^\d+$/.test(machineId)) return [];

  try {
    const db = await getDbReady();
    const [rows] = await db.query<MachineImageRow[]>(`
      SELECT id,image_url,source_page_url,author,license_name,license_url,caption,alt_text,is_primary
      FROM machine_images
      WHERE machine_id=?
      ORDER BY is_primary DESC,display_order ASC,id ASC
    `,[Number(machineId)]);

    const images = rows.map(rowToImage);

    const [identityRows] = await db.query<MachineIdentityRow[]>(`
      SELECT mf.slug AS brand_slug,m.slug AS model_slug
      FROM machines m
      INNER JOIN manufacturers mf ON mf.id=m.manufacturer_id
      WHERE m.id=?
      LIMIT 1
    `,[Number(machineId)]);

    const identity = identityRows[0];
    if (!identity) return images;

    const localImages = manifest.filter(
      (image) => image.brandSlug === identity.brand_slug && image.modelSlug === identity.model_slug,
    );
    const existingUrls = new Set(images.map((image) => image.imageUrl));

    localImages.forEach((image, index) => {
      if (existingUrls.has(image.publicUrl)) return;
      const manifestImage = manifestToImage(image, -(index + 1));
      manifestImage.isPrimary = images.length === 0 && index === 0;
      images.push(manifestImage);
      existingUrls.add(image.publicUrl);
    });

    return images.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  } catch (error) {
    console.error('Unable to load machine images:', error);
    return [];
  }
}
