import { readdir } from 'node:fs/promises';
import path from 'node:path';

const appDir = path.resolve(process.cwd(), 'app');
const routeFilePattern = /^(?:page|layout|route|default|template|loading|error|not-found)\.(?:js|jsx|ts|tsx)$/;

function isTransparentSegment(segment) {
  return segment.startsWith('@') || /^\(.+\)$/.test(segment);
}

function isPrivateSegment(segment) {
  return segment.startsWith('_') || segment.startsWith('.');
}

function parseDynamicSegment(segment) {
  const optionalCatchAll = segment.match(/^\[\[\.\.\.(.+)\]\]$/);
  if (optionalCatchAll) return { name: optionalCatchAll[1], kind: 'optional-catch-all' };

  const catchAll = segment.match(/^\[\.\.\.(.+)\]$/);
  if (catchAll) return { name: catchAll[1], kind: 'catch-all' };

  const dynamic = segment.match(/^\[(.+)\]$/);
  if (dynamic) return { name: dynamic[1], kind: 'dynamic' };

  return null;
}

async function collectRouteFiles(directory, segments = [], routes = []) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isFile() && routeFilePattern.test(entry.name)) {
      routes.push({
        file: path.relative(process.cwd(), path.join(directory, entry.name)),
        segments: [...segments],
      });
      continue;
    }

    if (!entry.isDirectory() || isPrivateSegment(entry.name)) continue;

    await collectRouteFiles(
      path.join(directory, entry.name),
      [...segments, entry.name],
      routes,
    );
  }

  return routes;
}

function findDynamicRouteConflicts(routes) {
  const positions = new Map();

  for (const route of routes) {
    const logicalSegments = route.segments.filter((segment) => !isTransparentSegment(segment));
    const normalizedPrefix = [];

    for (const segment of logicalSegments) {
      const dynamic = parseDynamicSegment(segment);

      if (!dynamic) {
        normalizedPrefix.push(segment);
        continue;
      }

      const positionKey = `/${[...normalizedPrefix, ':dynamic'].join('/')}`;
      const descriptor = `${dynamic.kind}:${dynamic.name}`;
      const descriptors = positions.get(positionKey) ?? new Map();
      const files = descriptors.get(descriptor) ?? new Set();
      files.add(route.file);
      descriptors.set(descriptor, files);
      positions.set(positionKey, descriptors);

      normalizedPrefix.push(':dynamic');
    }
  }

  return Array.from(positions.entries())
    .filter(([, descriptors]) => descriptors.size > 1)
    .map(([position, descriptors]) => ({ position, descriptors }));
}

const routes = await collectRouteFiles(appDir);
const conflicts = findDynamicRouteConflicts(routes);

if (conflicts.length > 0) {
  console.error('Dynamic route parameter conflicts detected. Next.js requires one parameter name per dynamic URL position.');

  for (const conflict of conflicts) {
    console.error(`\n${conflict.position}`);
    for (const [descriptor, files] of conflict.descriptors) {
      const [kind, ...nameParts] = descriptor.split(':');
      console.error(`  ${kind} [${nameParts.join(':')}]`);
      for (const file of files) console.error(`    - ${file}`);
    }
  }

  process.exitCode = 1;
} else {
  console.log(`Route check passed: ${routes.length} route files scanned with no dynamic parameter conflicts.`);
}
