# ka-mirror

A static mirror of [Keycap Archivist](https://keycap-archivist.com), the
community archive of artisan keycaps. Browsing only — no wishlist, no accounts,
no servers.

All catalog data comes from
[keycap-archivist/database](https://github.com/keycap-archivist/database),
which regenerates `db/catalog.json` daily from each maker's own Google Doc
catalog. This mirror pulls that file at build time, so it stays current without
running any scraper of its own. Keycap images are served from the upstream CDN
(`cdn.keycap-archivist.com`), which hosts pre-resized 250px/720px variants.
Full credit for the data, images, and archiving work belongs to the Keycap
Archivist maintainers and the makers.

## How it works

- **[Astro](https://astro.build) static build** — one page per maker and per
  sculpt (~3,300 pages, builds in a few seconds). Colorways open in a
  permalinked lightbox (`/maker/<maker>/<sculpt>/#<colorwayId>`) instead of the
  original's ~70k per-colorway pages.
- **`scripts/fetch-data.mjs`** downloads the upstream catalog (pinned to the
  latest database commit, with the S3 copy as fallback) into `data/`
  (gitignored).
- **Search** is fully client-side: a light makers+sculpts index loads when the
  search box is focused; the full ~70k-entry colorway index loads lazily on the
  first query.
- **Deploys** via GitHub Actions to GitHub Pages: on push, manually, and on a
  daily cron shortly after the upstream database sync — replacing the original
  site's multi-repo, multi-server pipeline.

## Commands

```sh
npm install
npm run fetch-data   # download latest catalog into data/ (use -- --force to refetch)
npm run dev          # dev server
npm run build        # production build into dist/
npm run preview      # serve dist/ locally
```

## Deploy configuration

Deploys to GitHub Pages at the custom domain **ka-mirror.com** (`public/CNAME`).
Setup checklist:

1. Repo Settings → Pages → Source: "GitHub Actions", then enter
   `ka-mirror.com` as the custom domain and enable "Enforce HTTPS" once the
   certificate is issued.
2. Namecheap DNS (Advanced DNS) for `ka-mirror.com`:
   - Four `A` records, host `@`, pointing to `185.199.108.153`,
     `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - One `CNAME` record, host `www`, pointing to `ankitsxchdeva.github.io.`

To deploy elsewhere, override the `SITE_URL` and `BASE_PATH` repository
variables (project pages need `BASE_PATH=/<repo>`).
