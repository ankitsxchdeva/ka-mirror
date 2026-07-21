# Design

Faithful modernization of the original Keycap Archivist layout. Super simple,
zero fluff: no stats lines, no taglines, no decorative chrome, no extra
panels. Header, grids, lightbox, footer. Nothing else.

## Theme

Dark default (photography pops, matches the hobby), light as first-class
alternative via toggle plus prefers-color-scheme override on first visit.

## Color

OKLCH cool graphite neutrals (hue 250, chroma 0.005-0.01), no pure black or
white. One accent, vermilion, for state only: focus, active pin, hover
emphasis, selection. Never decoration.

Dark: bg 0.16 / panel 0.19 / hover 0.225 / line 0.28 / ink 0.92 / accent 0.64 0.17 30
Light: bg 0.965 / panel 0.99 / hover 0.925 / line 0.87 / ink 0.24 / accent 0.54 0.18 30

## Typography

IBM Plex Sans for everything (400/500/600). IBM Plex Mono only for accession
ids inside the lightbox and code. Fixed rem scale: 12px small, 13px card
text, 14px body, 16px section, 20px page title (600). No display face, no
uppercase microlabels.

## Shape & Space

Cards: radius 8px, 1px line border, panel background, hover raises border
color and background only (no transforms, no shadows). Grid gap 12-16px,
minmax 150-180px columns. Page gutter clamp(16px, 3vw, 32px), max-width
1240px.

## Components

- Maker card: square logo (or cover photo fallback), name, muted count line.
- Sculpt card: square cover photo, name, colorway count.
- Colorway card: square photo, name, muted id; anchor link that opens the
  lightbox (falls back to :target jump without JS).
- Lightbox dialog: image left, name + details right, copy link, prev/next.
- Pin star on maker cards, hover-reveal, accent when active.
- Inline filter input only on colorway galleries over 24 entries.

## Motion

150ms color/background transitions on hover and focus only.
prefers-reduced-motion disables all.

## Copy

As little as possible. No em or en dashes. Errors state cause and action
plainly ("search is unavailable, reload to retry").
