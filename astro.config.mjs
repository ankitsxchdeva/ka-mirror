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
  build: {
    inlineStylesheets: 'auto',
  },
});
