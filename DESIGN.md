# Design

Lane: catalog — all design decisions follow ~/Documents/design/DESIGN.md
(spec v0.5); where this file and the spec disagree, the spec wins.

Identity: canonical (spec §2). Lavender-paper / night-plum palette in the
plum-lavender OKLCH family, Lato 400/700, system mono for ids and kbd hints,
signal indigo accent for state only, coral editorial ink for decorative
marks. No project-specific colors, fonts, spacing, or motion.

## Theme

Dark default (photography pops, matches the hobby), light as first-class
alternative via toggle plus prefers-color-scheme fallback without JS. Both
themes are the same canonical identity.

## Catalog lane notes

- Cards: square media, 1px border, panel background, radius 8px; hover
  raises border/background color only. Makers without a logo get a
  circle-backslash SVG mark.
- Dark mode dims white-ground logo tiles (brightness 0.85) so they don't
  glare.
- Grid keyboard navigation: arrows, Home/End, `/` search, `?` shortcuts.
- Inline filter input only on colorway galleries over 24 entries. Sort is a
  native `<select>`.
- Deep-linkable everything: state in the URL, share links that resolve.
- Lane exception to the One Accent Rule: the pinned star uses vermilion
  (`--star`, the pre-spec accent) because indigo-on-dim is indistinguishable
  on night plum. Star state only; focus and all other state stay indigo.

Everything else (color mechanics, type tiers, motion, focus, components,
copy) follows the spec; nothing project-specific overrides it.
