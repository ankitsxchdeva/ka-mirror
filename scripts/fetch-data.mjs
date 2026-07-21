/**
 * Fetches the latest keycap-archivist catalog into data/.
 *
 * The upstream database repo regenerates db/catalog.json daily from the
 * makers' Google Doc catalogs, so pulling that one file gives us the same
 * Google-Docs-sourced structure without running their scraper. We record the
 * upstream commit SHA alongside it (shown on the About page), mirroring how
 * the original website's update scripts worked.
 *
 * Usage: node scripts/fetch-data.mjs [--force]
 * Skips the download if data/catalog.json is younger than 6 hours.
 */
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'data');
const catalogPath = path.join(dataDir, 'catalog.json');
const revisionPath = path.join(dataDir, 'revision.json');

const COMMITS_API =
  'https://api.github.com/repos/keycap-archivist/database/commits?path=db/catalog.json&per_page=1';
const RAW_URL = (rev) =>
  `https://raw.githubusercontent.com/keycap-archivist/database/${rev}/db/catalog.json`;
// S3 copy published by the upstream pipeline; fallback if GitHub raw fails.
const CDN_URL = 'https://cdn.keycap-archivist.com/db/catalog.json';
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

const force = process.argv.includes('--force');

async function isFresh() {
  try {
    const s = await stat(catalogPath);
    return s.size > 1_000_000 && Date.now() - s.mtimeMs < MAX_AGE_MS;
  } catch {
    return false;
  }
}

if (!force && (await isFresh())) {
  console.log('data/catalog.json is fresh (<6h), skipping. Use --force to refetch.');
  process.exit(0);
}

await mkdir(dataDir, { recursive: true });

let revision = 'master';
try {
  const headers = { accept: 'application/vnd.github+json' };
  // In CI a token avoids the low unauthenticated rate limit.
  if (process.env.GITHUB_TOKEN) {
    headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(COMMITS_API, { headers });
  if (res.ok) {
    const commits = await res.json();
    revision = commits[0]?.sha ?? 'master';
  }
} catch {
  // unauthenticated API can be rate-limited; 'master' still works below
}

let body = null;
for (const url of [RAW_URL(revision), CDN_URL]) {
  try {
    console.log(`Downloading ${url}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    body = await res.text();
    break;
  } catch (e) {
    console.warn(`  failed: ${e.message}`);
  }
}
if (!body) throw new Error('Could not download catalog.json from any source');

const catalog = JSON.parse(body); // validate before writing
if (!Array.isArray(catalog) || catalog.length < 100) {
  throw new Error(`Catalog looks wrong: ${catalog.length ?? 'not an'} array entries`);
}

await writeFile(catalogPath, body);
await writeFile(
  revisionPath,
  JSON.stringify({ revision, fetchedAt: new Date().toISOString() }, null, 2) + '\n'
);
console.log(`Done: ${catalog.length} makers, revision ${revision.slice(0, 8)}`);
