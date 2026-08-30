/**
 * Shared catalog data layer for the API and Discord bot.
 *
 * Loads data/catalog.json (same file the static site builds from — refresh
 * it with `node scripts/fetch-data.mjs` in the repo root) and builds a flat
 * search index. The file is watched and the index rebuilt in place, so a
 * daily fetch cron needs no process restart.
 *
 * Self-contained on purpose (slugify duplicated from src/lib/catalog.js):
 * this folder deploys standalone. Override the data file with KA_DATA.
 */
import { readFile } from 'node:fs/promises';
import { watch } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DATA_FILE =
  process.env.KA_DATA ?? fileURLToPath(new URL('../data/catalog.json', import.meta.url));

const CDN = 'https://cdn.keycap-archivist.com/keycaps';
export const img = {
  thumb: (id) => `${CDN}/250/${id}.jpg`,
  large: (id) => `${CDN}/720/${id}.jpg`,
  full: (id) => `${CDN}/${id}.jpg`,
};

export const SITE = (process.env.SITE_URL ?? 'https://ka-mirror.com').replace(/\/+$/, '');

export function slugify(name) {
  return (
    name
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'unnamed'
  );
}

/** "ka_from_XX" nationality code → flag emoji. */
export function flagEmoji(code) {
  if (!code || !/^[a-z]{2}$/i.test(code)) return '';
  return String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

let state = null;

function build(makersRaw) {
  // Same normalization as the site: skip malformed entries, stable slugs.
  const makers = makersRaw.filter((m) => m && typeof m === 'object' && m.id);
  makers.sort((a, b) => a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id));

  const colorways = [];
  const byId = new Map();
  const makerById = new Map();
  const makerSlugs = new Set();

  for (const maker of makers) {
    let slug = slugify(maker.name);
    if (makerSlugs.has(slug)) slug = `${slug}-${maker.id}`;
    makerSlugs.add(slug);

    const entry = {
      id: maker.id,
      name: maker.name,
      slug,
      url: `${SITE}/maker/${slug}/`,
      instagram: maker.instagram || null,
      website: maker.website || null,
      discord: maker.discord || null,
      src: maker.src || null,
      nationality: maker.nationality || null,
      sculptCount: 0,
      colorwayCount: 0,
      sculpts: [],
    };

    const sculpts = (Array.isArray(maker.sculpts) ? maker.sculpts : []).filter(
      (s) => s && typeof s === 'object' && s.id
    );
    sculpts.sort((a, b) => a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id));
    const sculptSlugs = new Set();

    for (const sculpt of sculpts) {
      let sSlug = slugify(sculpt.name);
      if (sculptSlugs.has(sSlug)) sSlug = `${sSlug}-${sculpt.id}`;
      sculptSlugs.add(sSlug);
      const sculptUrl = `${SITE}/maker/${slug}/${sSlug}/`;
      entry.sculpts.push({ id: sculpt.id, name: sculpt.name, slug: sSlug, url: sculptUrl });
      entry.sculptCount++;

      for (const c of Array.isArray(sculpt.colorways) ? sculpt.colorways : []) {
        if (!c || typeof c !== 'object' || !c.id) continue;
        const cw = {
          id: c.id,
          name: c.name || 'Unnamed',
          maker: maker.name,
          makerSlug: slug,
          sculpt: sculpt.name,
          sculptSlug: sSlug,
          releaseDate: c.releaseDate || null,
          totalCount: c.totalCount || null,
          stemType: Array.isArray(c.stemType) ? c.stemType.join(', ') : null,
          note: c.note || null,
          photoCredit: c.photoCredit || null,
          commissioned: !!c.commissioned,
          giveaway: !!c.giveaway,
          // Share page (correct og:image) and gallery deep link, matching the
          // static site's URL scheme.
          url: `${sculptUrl}${c.id}/`,
          galleryUrl: `${sculptUrl}#${c.id}`,
          haystack: `${c.name || ''} ${sculpt.name} ${maker.name}`.toLowerCase(),
        };
        colorways.push(cw);
        byId.set(c.id, cw);
        entry.colorwayCount++;
      }
    }
    makerById.set(maker.id, entry);
  }

  return {
    makers: [...makerById.values()],
    colorways,
    byId,
    makerById,
    stats: { makers: makerById.size, sculpts: makers.reduce((n, m) => n + m.sculpts.length, 0), colorways: colorways.length },
  };
}

async function load(force = false) {
  if (state && !force) return state;
  // build() before swapping: a bad file keeps the previous index in place.
  const next = build(JSON.parse(await readFile(DATA_FILE, 'utf8')));
  state = next;
  console.log(`catalog: ${state.stats.colorways} colorways, ${state.stats.makers} makers loaded`);
  return state;
}
export const loadCatalog = () => load(false);

/** Rebuild the index when the data file changes (e.g. daily fetch cron). */
let watching = false;
export function watchCatalog() {
  if (watching) return;
  watching = true;
  let timer = null;
  watch(DATA_FILE, () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        await load(true);
      } catch (err) {
        console.error('catalog reload failed, keeping previous data:', err.message);
      }
    }, 500);
  });
}

export function getState() {
  if (!state) throw new Error('catalog not loaded — call loadCatalog() first');
  return state;
}

/**
 * Multi-term AND search across "colorway sculpt maker". Ranked: colorway
 * name match > sculpt > maker, shorter names first within a tier.
 */
export function searchColorways(query, limit = 25) {
  const q = query.toLowerCase().trim();
  if (!q) return { total: 0, results: [] };
  const terms = q.split(/\s+/);
  const hits = [];
  for (const cw of getState().colorways) {
    if (!terms.every((t) => cw.haystack.includes(t))) continue;
    const name = cw.name.toLowerCase();
    const tier = name.startsWith(q)
      ? 0
      : name.includes(q)
        ? 1
        : cw.sculpt.toLowerCase().includes(q)
          ? 2
          : 3;
    hits.push({ cw, tier });
  }
  hits.sort(
    (a, b) => a.tier - b.tier || a.cw.name.length - b.cw.name.length || a.cw.name.localeCompare(b.cw.name, 'en')
  );
  return { total: hits.length, results: hits.slice(0, limit).map((h) => h.cw) };
}

export function searchMakers(query, limit = 25) {
  const q = query.toLowerCase().trim();
  if (!q) return { total: 0, results: [] };
  const hits = getState().makers.filter((m) => m.name.toLowerCase().includes(q));
  hits.sort((a, b) => a.name.length - b.name.length || a.name.localeCompare(b.name, 'en'));
  return { total: hits.length, results: hits.slice(0, limit) };
}
