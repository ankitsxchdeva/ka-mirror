# Design

Archival database tool. Dense, exact, quiet. The aesthetic reference is a
card catalog / film contact sheet, executed as a modern data UI. Dials:
variance 4, motion 2, density 8.

## Theme

Dark by default (hobbyists browse at night; artisan photography is shot on
dark grounds), light theme as a first-class alternative. Manual toggle plus
prefers-color-scheme. One theme per page, no section flips.

## Color

OKLCH. Cool graphite neutrals (hue 250, chroma 0.005-0.01), never pure black
or white. One accent used at well under 10% of the surface: vermilion stamp
red, the color of an accession stamp on an index card. Accent marks state
only: focus, selection, active pin, hover emphasis. Never decoration.

Dark:
- --bg: oklch(0.16 0.005 250)
- --bg-panel: oklch(0.19 0.006 250)
- --bg-hover: oklch(0.225 0.007 250)
- --line: oklch(0.28 0.008 250)
- --line-strong: oklch(0.4 0.01 250)
- --ink: oklch(0.92 0.004 250)
- --ink-mid: oklch(0.74 0.006 250)
- --ink-dim: oklch(0.6 0.008 250)
- --accent: oklch(0.64 0.17 30)

Light (index card):
- --bg: oklch(0.965 0.003 90)
- --bg-panel: oklch(0.99 0.002 90)
- --bg-hover: oklch(0.93 0.004 90)
- --line: oklch(0.87 0.004 90)
- --line-strong: oklch(0.75 0.006 90)
- --ink: oklch(0.24 0.005 250)
- --ink-mid: oklch(0.45 0.006 250)
- --ink-dim: oklch(0.55 0.006 250)
- --accent: oklch(0.54 0.18 30)

## Typography

IBM Plex Sans (UI: 400/500/600) + IBM Plex Mono (all data: ids, counts,
dates, column headers, breadcrumbs; 400/500). No display face. Fixed rem
scale, ratio ~1.2: 11px mono micro, 12px mono data, 13px row text, 14px body,
16px section, 22px page title (weight 600). Column headers: 10px mono
uppercase, letterspacing 0.08em. Numbers always mono, right-aligned in
columns.

## Shape & Space

Radius 0 everywhere (index-card sharpness). Hairline 1px rules organize;
no shadows except the lightbox overlay. Row height 40px (dense tables),
tile gutters 1-2px (contact sheet). Page gutter clamp(16px, 3vw, 32px),
content max-width 1200px.

## Components

- Data table rows: hairline-separated (bottom only), hover = bg shift,
  no cards.
- Contact sheet: flat photo tiles, caption below image inside tile
  (name 12px sans, id 11px mono dim), no borders, no radius, no shadow.
- Accession tags: colorway/maker/sculpt hex ids in mono, dim; accent on
  hover/focus only.
- Inline filter inputs above long tables/sheets: flat, mono placeholder.
- Lightbox: square dialog, image left, mono metadata table right, text
  buttons.
- Pin: star button, accent when active, functional state only.

## Motion

150ms ease-out background/color shifts on hover and focus. No transforms,
no lifts, no load choreography. prefers-reduced-motion disables everything.

## Copy

Plain, exact, lowercase-tolerant. No em or en dashes anywhere. Middle dots
rationed to one per line; prefer columns and slashes. No decorative dots,
no section numbering, no scroll cues.
