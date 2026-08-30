/**
 * Per-colorway share pages, written into dist/ after `astro build`.
 *
 * Why they exist: the gallery's "Copy link" used to produce URLs like
 * /maker/x/y/#<id>, but URL fragments never reach the server, so link-preview
 * crawlers (Discord, Slack, iMessage…) always saw the sculpt page's cover
 * image. These tiny pages give every colorway a crawlable URL with its own
 * og:image (served straight from the CDN — nothing to generate). Human
 * visitors are JS-redirected into the gallery with the lightbox open;
 * crawlers don't run JS and just read the meta tags.
 *
 * Generated outside Astro's router on purpose: ~70k extra routes would slow
 * the build down by minutes, and the sitemap never sees them (they're
 * noindex redirect pages anyway).
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getCatalog, img } from '../src/lib/catalog.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
// Absolute URL for a site-relative path, honoring SITE_URL/BASE_PATH.
const abs = (site, base, p) =>
  `${site.replace(/\/+$/, '')}${base === '/' ? '' : base.replace(/\/+$/, '')}${p}`;

function page({ title, description, selfUrl, galleryUrl, targetUrl, imageUrl, name, sculptName, makerName }) {
  const target = JSON.stringify(targetUrl);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex,follow">
<link rel="canonical" href="${esc(galleryUrl)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<meta property="og:url" content="${esc(selfUrl)}">
<meta property="og:image" content="${esc(imageUrl)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(imageUrl)}">
<script>location.replace(${target})</script>
<style>
body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#1c1e24;color:#e8e6e3;font:400 1rem/1.5 system-ui,sans-serif}
figure{margin:0;padding:24px;text-align:center}
img{max-width:min(80vmin,720px);max-height:70dvh;border-radius:8px}
figcaption{margin-top:12px}
a{color:#8ab4f8}
</style>
</head>
<body>
<figure>
<a href="${esc(targetUrl)}"><img src="${esc(imageUrl)}" alt="${esc(name)}"></a>
<figcaption><strong>${esc(name)}</strong> · ${esc(sculptName)} by ${esc(makerName)}<br><a href="${esc(targetUrl)}">View in gallery →</a></figcaption>
</figure>
</body>
</html>
`;
}

/**
 * @param {{outDir: string, site: string, base: string}} opts
 * @returns {Promise<number>} number of pages written
 */
export async function buildSharePages({ outDir, site, base }) {
  const { makers } = await getCatalog();

  // Colorway ids become path segments; hex hashes upstream, but never trust.
  const safeIds = (c) => /^[0-9a-z]+$/i.test(c.id);

  // One mkdir per sculpt directory, then files land directly inside.
  const sculptDirs = new Set();
  const tasks = [];
  for (const maker of makers) {
    for (const sculpt of maker.sculpts) {
      sculptDirs.add(path.join(outDir, ...sculpt.url.split('/').filter(Boolean)));
      for (const c of sculpt.colorways) {
        if (!safeIds(c)) continue;
        const name = c.name || 'Unnamed';
        const galleryUrl = abs(site, base, sculpt.url);
        tasks.push({
          file: path.join(outDir, ...sculpt.url.split('/').filter(Boolean), c.id, 'index.html'),
          html: page({
            title: `${name} · ${sculpt.name} by ${maker.name} · Keycap Archivist Mirror`,
            description:
              `${name} — ${sculpt.name} colorway by ${maker.name}` +
              (c.releaseDate ? `, released ${c.releaseDate}` : '') +
              '. Artisan keycap archive.',
            selfUrl: abs(site, base, `${sculpt.url}${c.id}/`),
            galleryUrl,
            // Canonical stays fragment-free; the redirect/links keep the
            // #<id> the lightbox deep-links on.
            targetUrl: `${galleryUrl}#${c.id}`,
            imageUrl: img.large(c.id),
            name,
            sculptName: sculpt.name,
            makerName: maker.name,
          }),
        });
      }
    }
  }

  await Promise.all([...sculptDirs].map((d) => mkdir(d, { recursive: true })));

  // Bounded concurrency: 70k parallel writes would exhaust file descriptors.
  let i = 0;
  const workers = Array.from({ length: 256 }, async () => {
    while (i < tasks.length) {
      const t = tasks[i++];
      await mkdir(path.dirname(t.file), { recursive: true });
      await writeFile(t.file, t.html);
    }
  });
  await Promise.all(workers);
  return tasks.length;
}
