# ka-mirror-img worker

Tiny Cloudflare Worker that re-serves keycap images from
cdn.keycap-archivist.com with `access-control-allow-origin: *`.

Why: the CDN sends no CORS header, so drawing its images into a canvas
(the wishlist PNG export) taints the canvas and `toBlob` throws. Same
bytes, one extra header, problem solved.

## Deploy

1. `npm install -g wrangler`
2. `wrangler login`
3. `cd worker && wrangler deploy`
4. Copy the printed `*.workers.dev` origin (no trailing slash) into
   `PROXY_BASE` in `src/scripts/share-image.js`
5. Rebuild and redeploy the site (`npm run build`)

## Notes

- Free tier allows 100k requests/day. Responses are edge-cached
  (`cache-control: public, max-age=31536000, immutable`), so repeat
  exports of the same caps cost nothing.
- Path whitelist: only `/250/<id>.jpg`, `/720/<id>.jpg`, and `/<id>.jpg`
  with `id` matching `[a-z0-9-]+` are proxied. Nothing else, so this is
  never an open proxy.
- No npm project, no dependencies; `wrangler deploy` reads
  `wrangler.toml` and ships `src/index.js` as-is.
