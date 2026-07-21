// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Served at the custom domain (public/CNAME); SITE_URL/BASE_PATH env vars
// can override for other deploy targets (see .github/workflows/deploy.yml).
const site = process.env.SITE_URL ?? 'https://ka-mirror.com';
const base = process.env.BASE_PATH ?? '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'ignore',
  integrations: [sitemap()],
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
