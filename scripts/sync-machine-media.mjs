import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const skipDownloads = process.env.SKIP_MEDIA_SYNC === '1';
const root = process.cwd();
const manifests = [
  { kind: 'machine', path: path.join(root, 'data', 'machine-images.json') },
  { kind: 'machine', path: path.join(root, 'data', 'machine-images-kubota-utility.json') },
  { kind: 'machine', path: path.join(root, 'data', 'machine-images-kubota-equipment.json') },
  { kind: 'machine', path: path.join(root, 'data', 'machine-images-kubota-excavators.json') },
  { kind: 'machine', path: path.join(root, 'data', 'machine-images-kubota-hay.json') },
  { kind: 'machine', path: path.join(root, 'data', 'machine-images-kubota-mowing.json') },
  { kind: 'machine', path: path.join(root, 'data', 'machine-images-kubota-square-balers.json') },
  { kind: 'machine', path: path.join(root, 'data', 'machine-images-kubota-spreaders.json') },
  { kind: 'machine', path: path.join(root, 'data', 'machine-images-john-deere.json') },
  { kind: 'machine', path: path.join(root, 'data', 'machine-images-case-ih.json') },
  { kind: 'machine', path: path.join(root, 'data', 'machine-images-massey-ferguson.json') },
  { kind: 'machine', path: path.join(root, 'data', 'machine-images-new-holland.json') },
  { kind: 'part', path: path.join(root, 'data', 'part-images.json') },
];
const buildManifestPath = path.join(root, 'public', 'media', 'media-build-manifest.json');
const allowedImageKinds = new Set(['exact', 'family', 'representative']);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readManifest(entry) {
  try {
    const items = JSON.parse(await readFile(entry.path, 'utf8'));
    if (!Array.isArray(items)) throw new Error(`Media manifest must contain an array: ${entry.path}`);
    return items.map((item) => ({ ...item, kind: entry.kind, manifestPath: entry.path }));
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

function validateHttpsUrl(field, value, image) {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:') {
      throw new Error(`Expected HTTPS URL, received ${parsed.protocol}`);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`[media] Invalid ${field} for ${image.sourceKey} in ${image.manifestPath}: ${reason}`);
  }
}

async function download(url, attempts = 3) {
  let lastError;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'follow',
        headers: {
          'User-Agent': 'FarmMachineSpecs/1.0 (https://farmmachinespecs.com)',
          Accept: 'image/avif,image/webp,image/jpeg,image/png,image/*;q=0.8,*/*;q=0.5',
        },
        signal: AbortSignal.timeout(45000),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().startsWith('image/')) {
        throw new Error(`Expected image response, received ${contentType || 'unknown content type'}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 5_000) {
        throw new Error(`Downloaded file is unexpectedly small (${bytes.length} bytes)`);
      }

      return { bytes, contentType, finalUrl: response.url };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 2500);
    }
  }

  throw lastError;
}

const manifest = (await Promise.all(manifests.map(readManifest))).flat();
const sourceKeys = new Map();
const outputPaths = new Map();
const publicUrls = new Map();
const publicRoot = path.resolve(root, 'public');

for (const image of manifest) {
  for (const required of ['sourceKey', 'remoteUrl', 'outputPath', 'publicUrl']) {
    if (!image[required] || typeof image[required] !== 'string') {
      throw new Error(`[media] Missing ${required} in ${image.manifestPath}`);
    }
  }

  validateHttpsUrl('remoteUrl', image.remoteUrl, image);
  if (image.sourcePageUrl !== undefined && image.sourcePageUrl !== null) {
    if (typeof image.sourcePageUrl !== 'string' || !image.sourcePageUrl.trim()) {
      throw new Error(`[media] Invalid sourcePageUrl for ${image.sourceKey} in ${image.manifestPath}`);
    }
    validateHttpsUrl('sourcePageUrl', image.sourcePageUrl, image);
  }

  const hasLicenseName = typeof image.licenseName === 'string' && image.licenseName.trim().length > 0;
  const hasLicenseUrl = typeof image.licenseUrl === 'string' && image.licenseUrl.trim().length > 0;
  if (hasLicenseName !== hasLicenseUrl) {
    throw new Error(
      `[media] licenseName and licenseUrl must either both be present or both be omitted for ${image.sourceKey} in ${image.manifestPath}`,
    );
  }
  if (hasLicenseUrl) validateHttpsUrl('licenseUrl', image.licenseUrl, image);

  if (image.kind === 'machine') {
    for (const required of ['brandSlug', 'modelSlug']) {
      if (!image[required] || typeof image[required] !== 'string') {
        throw new Error(`[media] Missing machine ${required} for ${image.sourceKey} in ${image.manifestPath}`);
      }
    }
  }

  if (image.kind === 'part') {
    if (!image.brandSlug || typeof image.brandSlug !== 'string') {
      throw new Error(`[media] Missing part brandSlug for ${image.sourceKey} in ${image.manifestPath}`);
    }
    if (
      (!image.partNumber || typeof image.partNumber !== 'string')
      && (!image.normalizedPartNumber || typeof image.normalizedPartNumber !== 'string')
    ) {
      throw new Error(`[media] Missing part number for ${image.sourceKey} in ${image.manifestPath}`);
    }
  }

  if (image.imageKind !== undefined && !allowedImageKinds.has(image.imageKind)) {
    throw new Error(
      `[media] Unsupported imageKind ${String(image.imageKind)} for ${image.sourceKey}; expected exact, family or representative`,
    );
  }

  if (!image.outputPath.startsWith('public/media/')) {
    throw new Error(`[media] outputPath must live under public/media/: ${image.outputPath}`);
  }
  if (!image.publicUrl.startsWith('/media/')) {
    throw new Error(`[media] publicUrl must live under /media/: ${image.publicUrl}`);
  }

  const expectedPublicUrl = `/${image.outputPath.replaceAll('\\', '/').replace(/^public\//, '')}`;
  if (image.publicUrl !== expectedPublicUrl) {
    throw new Error(
      `[media] outputPath/publicUrl mismatch for ${image.sourceKey}: ${image.outputPath} should map to ${expectedPublicUrl}, received ${image.publicUrl}`,
    );
  }

  const previousSource = sourceKeys.get(image.sourceKey);
  if (previousSource) {
    throw new Error(`[media] Duplicate sourceKey ${image.sourceKey} in ${previousSource} and ${image.manifestPath}`);
  }
  sourceKeys.set(image.sourceKey, image.manifestPath);

  for (const [field, value, registry] of [
    ['outputPath', image.outputPath, outputPaths],
    ['publicUrl', image.publicUrl, publicUrls],
  ]) {
    const previous = registry.get(value);
    if (previous && previous.sourceKey !== image.sourceKey) {
      throw new Error(
        `[media] ${field} collision for ${value}: ${previous.sourceKey} (${previous.manifestPath}) vs ${image.sourceKey} (${image.manifestPath})`,
      );
    }
    registry.set(value, { sourceKey: image.sourceKey, manifestPath: image.manifestPath });
  }

  const target = path.resolve(root, image.outputPath);
  if (!target.startsWith(`${publicRoot}${path.sep}`)) {
    throw new Error(`Refusing to write media outside public/: ${image.outputPath}`);
  }
}

console.log(`[media] Validated ${manifest.length} source-tracked catalog image records with no path collisions.`);

if (skipDownloads) {
  console.log('[media] Skipping external media downloads for CI build after manifest validation.');
  process.exit(0);
}

const built = [];
const failed = [];

for (const image of manifest) {
  const target = path.resolve(root, image.outputPath);
  const label = image.kind === 'part'
    ? `${image.brandSlug || 'part'} ${image.partNumber || image.normalizedPartNumber}`
    : `${image.brandSlug} ${image.modelSlug}`;
  console.log(`[media] Downloading ${image.kind}: ${label}`);

  try {
    const result = await download(image.remoteUrl);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, result.bytes);

    const sha256 = createHash('sha256').update(result.bytes).digest('hex');
    built.push({
      kind: image.kind,
      sourceKey: image.sourceKey,
      publicUrl: image.publicUrl,
      sourcePageUrl: image.sourcePageUrl,
      author: image.author,
      licenseName: image.licenseName,
      licenseUrl: image.licenseUrl,
      caption: image.caption,
      altText: image.altText,
      imageKind: image.imageKind || 'exact',
      sha256,
      bytes: result.bytes.length,
      contentType: result.contentType,
      fetchedFrom: result.finalUrl,
    });

    console.log(`[media] Saved ${image.publicUrl} (${Math.round(result.bytes.length / 1024)} KB)`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failed.push({
      kind: image.kind,
      sourceKey: image.sourceKey,
      remoteUrl: image.remoteUrl,
      publicUrl: image.publicUrl,
      error: message,
    });
    console.warn(`[media] Failed ${label}: ${message}. Site will use the local fallback instead.`);
  }
}

await mkdir(path.dirname(buildManifestPath), { recursive: true });
await writeFile(
  buildManifestPath,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), images: built, failed }, null, 2)}\n`,
);
console.log(`[media] Synced ${built.length} catalog images to local public storage; ${failed.length} source downloads failed and will use fallbacks.`);
