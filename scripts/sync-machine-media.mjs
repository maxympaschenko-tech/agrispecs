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
  { kind: 'part', path: path.join(root, 'data', 'part-images.json') },
];
const buildManifestPath = path.join(root, 'public', 'media', 'media-build-manifest.json');

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
