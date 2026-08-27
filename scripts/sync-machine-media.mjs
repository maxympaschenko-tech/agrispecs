import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

if (process.env.SKIP_MEDIA_SYNC === '1') {
  console.log('[media] Skipping external media sync for CI build.');
  process.exit(0);
}

const root = process.cwd();
const manifestPath = path.join(root, 'data', 'machine-images.json');
const buildManifestPath = path.join(root, 'public', 'media', 'media-build-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.toLowerCase().startsWith('image/')) {
        throw new Error(`Expected image response, received ${contentType || 'unknown content type'}`);
      }

      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length < 10_000) {
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

const built = [];

for (const image of manifest) {
  const target = path.resolve(root, image.outputPath);
  const publicRoot = path.resolve(root, 'public');

  if (!target.startsWith(`${publicRoot}${path.sep}`)) {
    throw new Error(`Refusing to write media outside public/: ${image.outputPath}`);
  }

  console.log(`[media] Downloading ${image.brandSlug} ${image.modelSlug}`);
  const result = await download(image.remoteUrl);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, result.bytes);

  const sha256 = createHash('sha256').update(result.bytes).digest('hex');
  built.push({
    sourceKey: image.sourceKey,
    publicUrl: image.publicUrl,
    sourcePageUrl: image.sourcePageUrl,
    author: image.author,
    licenseName: image.licenseName,
    licenseUrl: image.licenseUrl,
    sha256,
    bytes: result.bytes.length,
    contentType: result.contentType,
    fetchedFrom: result.finalUrl,
  });

  console.log(`[media] Saved ${image.publicUrl} (${Math.round(result.bytes.length / 1024)} KB)`);
}

await mkdir(path.dirname(buildManifestPath), { recursive: true });
await writeFile(buildManifestPath, `${JSON.stringify({ generatedAt: new Date().toISOString(), images: built }, null, 2)}\n`);
console.log(`[media] Synced ${built.length} licensed machine images to local public storage.`);
