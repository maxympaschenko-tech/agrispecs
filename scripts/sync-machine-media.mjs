import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

if (process.env.SKIP_MEDIA_SYNC === '1') {
  console.log('[media] Skipping external media sync for CI build.');
  process.exit(0);
}

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
  { kind: 'part', path: path.join(root, 'data', 'part-images.json') },
];
const buildManifestPath = path.join(root, 'public', 'media', 'media-build-manifest.json');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function readManifest(entry) {
  try {
    const items = JSON.parse(await readFile(entry.path, 'utf8'));
    return items.map((item) => ({ ...item, kind: entry.kind }));
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
const built = [];

for (const image of manifest) {
  const target = path.resolve(root, image.outputPath);
  const publicRoot = path.resolve(root, 'public');

  if (!target.startsWith(`${publicRoot}${path.sep}`)) {
    throw new Error(`Refusing to write media outside public/: ${image.outputPath}`);
  }

  const label = image.kind === 'part'
    ? `${image.brandSlug || 'part'} ${image.partNumber || image.normalizedPartNumber}`
    : `${image.brandSlug} ${image.modelSlug}`;
  console.log(`[media] Downloading ${image.kind}: ${label}`);

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
}

await mkdir(path.dirname(buildManifestPath), { recursive: true });
await writeFile(buildManifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), images: built }, null, 2)}\n`);
console.log(`[media] Synced ${built.length} licensed/source-tracked catalog images to local public storage.`);
