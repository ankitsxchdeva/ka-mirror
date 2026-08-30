/**
 * Read-only JSON API over the catalog. Zero dependencies (node:http).
 *
 *   GET /api/stats            catalog + revision summary
 *   GET /api/search?q=&limit= colorway search (default limit 25, max 100)
 *   GET /api/colorway/:id     one colorway, full detail
 *   GET /api/makers?q=&limit= maker search with links
 *   GET /api/maker/:slug      one maker with sculpt list
 *
 * CORS is open; responses are cacheable for 5 minutes.
 */
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import {
  loadCatalog,
  watchCatalog,
  getState,
  searchColorways,
  searchMakers,
  img,
} from './catalog.js';

const PORT = Number(process.env.PORT ?? 8484);

const json = (res, status, body) => {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'cache-control': 'public, max-age=300',
  });
  res.end(JSON.stringify(body));
};

const cwSummary = (cw) => ({
  id: cw.id,
  name: cw.name,
  maker: cw.maker,
  sculpt: cw.sculpt,
  releaseDate: cw.releaseDate,
  url: cw.url,
  thumb: img.thumb(cw.id),
});

const cwDetail = (cw) => ({
  ...cwSummary(cw),
  totalCount: cw.totalCount,
  stemType: cw.stemType,
  note: cw.note,
  photoCredit: cw.photoCredit,
  commissioned: cw.commissioned,
  giveaway: cw.giveaway,
  makerUrl: cw.url.replace(/\/maker\/([^/]+)\/.*$/, '/maker/$1/'),
  galleryUrl: cw.galleryUrl,
  images: { thumb: img.thumb(cw.id), large: img.large(cw.id), full: img.full(cw.id) },
});

const makerSummary = (m) => ({
  id: m.id,
  name: m.name,
  slug: m.slug,
  url: m.url,
  instagram: m.instagram,
  website: m.website,
  discord: m.discord,
  nationality: m.nationality,
  sculptCount: m.sculptCount,
  colorwayCount: m.colorwayCount,
});

const clampLimit = (u, def = 25) =>
  Math.min(Math.max(Number(u.searchParams.get('limit')) || def, 1), 100);

const routes = [
  {
    match: /^\/api\/stats\/?$/,
    handler: (req, res) => json(res, 200, getState().stats),
  },
  {
    match: /^\/api\/search\/?$/,
    handler: (req, res, url) => {
      const q = url.searchParams.get('q') ?? '';
      const { total, results } = searchColorways(q, clampLimit(url));
      json(res, 200, { query: q, total, results: results.map(cwSummary) });
    },
  },
  {
    match: /^\/api\/colorway\/([0-9a-z]+)\/?$/i,
    handler: (req, res, url, id) => {
      const cw = getState().byId.get(id);
      if (!cw) return json(res, 404, { error: 'colorway not found', id });
      json(res, 200, cwDetail(cw));
    },
  },
  {
    match: /^\/api\/makers\/?$/,
    handler: (req, res, url) => {
      const q = url.searchParams.get('q') ?? '';
      const { total, results } = searchMakers(q, clampLimit(url));
      json(res, 200, { query: q, total, results: results.map(makerSummary) });
    },
  },
  {
    match: /^\/api\/maker\/([a-z0-9-]+)\/?$/,
    handler: (req, res, url, slug) => {
      const m = getState().makers.find((x) => x.slug === slug);
      if (!m) return json(res, 404, { error: 'maker not found', slug });
      json(res, 200, { ...makerSummary(m), sculpts: m.sculpts });
    },
  },
  {
    match: /^\/?$/,
    handler: (req, res) =>
      json(res, 200, {
        name: 'ka-mirror API',
        routes: [
          '/api/stats',
          '/api/search?q=',
          '/api/colorway/:id',
          '/api/makers?q=',
          '/api/maker/:slug',
        ],
      }),
  },
];

export function startApi() {
  const server = http.createServer((req, res) => {
    if (req.method === 'OPTIONS') {
      res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET' });
      return res.end();
    }
    const url = new URL(req.url, 'http://localhost');
    const route = routes.find((r) => r.match.test(url.pathname));
    if (!route || req.method !== 'GET') return json(res, 404, { error: 'not found' });
    try {
      route.handler(req, res, url, ...url.pathname.match(route.match).slice(1));
    } catch (err) {
      console.error(err);
      json(res, 500, { error: 'internal error' });
    }
  });
  server.listen(PORT, () => console.log(`api: listening on :${PORT}`));
  return server;
}

// Run standalone (`node api.js`) or imported by start.js.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await loadCatalog();
  watchCatalog();
  startApi();
}
