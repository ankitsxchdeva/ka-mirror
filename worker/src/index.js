/**
 * CORS proxy for keycap images on cdn.keycap-archivist.com.
 *
 * The CDN sends no access-control-allow-origin header, so drawing its
 * images into a client-side canvas (the wishlist PNG export) taints the
 * canvas and toBlob throws. This worker re-serves the same bytes with
 * ACAO * and edge caching.
 *
 * The path whitelist keeps it from being an open proxy: only
 * /250/<id>.jpg, /720/<id>.jpg, or /<id>.jpg, with id in [a-z0-9-]+.
 * Deploy steps: worker/README.md.
 */

const CDN = 'https://cdn.keycap-archivist.com/keycaps';
const PATH = /^\/(?:250\/|720\/)?[a-z0-9-]+\.jpg$/;

function text(status, body) {
  return new Response(body, {
    status,
    headers: { 'content-type': 'text/plain', 'access-control-allow-origin': '*' },
  });
}

export default {
  async fetch(request, _env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, OPTIONS',
          'access-control-allow-headers': '*',
          'access-control-max-age': '86400',
        },
      });
    }
    if (request.method !== 'GET') return text(405, 'method not allowed');

    const { pathname } = new URL(request.url);
    if (!PATH.test(pathname)) return text(404, 'not found');

    const cache = caches.default;
    const hit = await cache.match(request);
    if (hit) return hit;

    let upstream;
    try {
      upstream = await fetch(CDN + pathname);
    } catch {
      return text(502, 'upstream unavailable');
    }

    if (upstream.status !== 200) {
      const headers = new Headers({ 'access-control-allow-origin': '*' });
      const ct = upstream.headers.get('content-type');
      if (ct) headers.set('content-type', ct);
      return new Response(upstream.body, { status: upstream.status, headers });
    }

    const res = new Response(upstream.body, {
      headers: {
        'content-type': upstream.headers.get('content-type') || 'image/jpeg',
        'cache-control': 'public, max-age=31536000, immutable',
        'access-control-allow-origin': '*',
      },
    });
    ctx.waitUntil(cache.put(request, res.clone()));
    return res;
  },
};
