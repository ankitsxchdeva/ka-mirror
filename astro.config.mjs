// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { fileURLToPath } from 'node:url';
import { buildSharePages } from './scripts/build-shares.mjs';

// Served at the custom domain (public/CNAME); SITE_URL/BASE_PATH env vars
// can override for other deploy targets (see .github/workflows/deploy.yml).
const site = process.env.SITE_URL ?? 'https://ka-mirror.com';
const base = process.env.BASE_PATH ?? '/';
// Captured in astro:config:done for the build:done share-page writer.
let shareCfg = { site, base };

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  integrations: [
    sitemap(),
    // Per-colorway share pages with correct og:image previews, written into
    // dist/ post-build (outside the router so ~70k routes don't slow it and
    // the sitemap never lists these noindex redirect pages).
    {
      name: 'ka-share-pages',
      hooks: {
        'astro:config:done': ({ config }) => {
          shareCfg = { site: config.site ?? site, base: config.base };
        },
        'astro:build:done': async ({ dir, logger }) => {
          const count = await buildSharePages({
            outDir: fileURLToPath(dir),
            ...shareCfg,
          });
          logger.info(`share pages: wrote ${count} colorway pages`);
        },
      },
    },
  ],
  // Hover-prefetch every internal link; in Chromium, prerender it via the
  // Speculation Rules API (falls back to plain prefetch elsewhere).
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'hover',
  },
  experimental: {
    clientPrerender: true,
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
