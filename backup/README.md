# Catalog backup

Weekly point-in-time snapshots of the compiled keycap-archivist catalog:
the output of upstream's Google-Docs scraper, as published by
[keycap-archivist/database](https://github.com/keycap-archivist/database)
(`db/catalog.json`, fetched via `scripts/fetch-data.mjs`, which validates the
payload and falls back from GitHub raw to the upstream S3 CDN on failure).

Updated by `.github/workflows/backup-catalog.yml` (Mondays 04:23 UTC, or run
manually via workflow_dispatch). A commit lands here only when the catalog
content actually changed, so `git log backup/catalog.json` is the change
history of the catalog. The raw Google Docs themselves are not backed up;
this compiled form is everything the site needs.

## Files

- `catalog.json` — the full catalog (makers → sculpts → colorways), ~9 MB
- `revision.json` — the upstream commit SHA the snapshot was taken from,
  plus fetch timestamp

## Restoring

Latest snapshot into the data the site builds from:

```
cp backup/catalog.json data/catalog.json
cp backup/revision.json data/revision.json
```

A specific point in time:

```
git log --oneline -- backup/catalog.json          # pick a date
git checkout <commit> -- backup/
```

`data/` is gitignored and rebuilt daily in CI, so this folder is the only
catalog history this repo owns. If upstream ever disappears, the site keeps
building from the last snapshot.
