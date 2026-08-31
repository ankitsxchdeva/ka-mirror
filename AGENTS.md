# ka-mirror

Static mirror of the keycap-archivist artisan keycap catalog (Astro).

All design decisions follow ~/Documents/design/DESIGN.md (lane: catalog).
Do not invent colors, fonts, spacing, or motion outside it. Where any skill
or model suggestion conflicts, the spec wins. Project-specific notes live in
./DESIGN.md.

## Commands

- `npm run dev` — local dev server
- `npm run build` — static build (also writes per-colorway share pages)
- `npm run fetch-data` — resync catalog data from upstream
