# ka-mirror

[ka-mirror.com](https://ka-mirror.com): a static mirror of
[Keycap Archivist](https://keycap-archivist.com), the community archive of
artisan keycaps. Browsing only. No wishlist, no accounts, no servers.

All catalog data comes from
[keycap-archivist/database](https://github.com/keycap-archivist/database),
which regenerates its catalog daily from each maker's own Google Doc. This
site pulls that catalog at build time and rebuilds once a day, so it stays
current without running any scraper of its own. Keycap images are served from
the upstream CDN. Full credit for the data, images, and archiving work belongs
to the Keycap Archivist maintainers and the makers.

## Running locally

```sh
npm install
npm run fetch-data   # download the latest catalog into data/
npm run dev          # dev server at localhost:4321
```

`npm run build` produces the full static site in `dist/`; `npm run preview`
serves it.
