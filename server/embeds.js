/**
 * Discord embed builders — pure functions returning raw embed JSON, so they
 * can be exercised without a gateway connection. Wired up in bot.js.
 *
 * The image grid uses Discord's same-URL trick: embeds sharing one `url`
 * have their images merged into a single grid (what CapBot did).
 */
import { img, flagEmoji, SITE } from './catalog.js';

// Site accent (vermilion, matching global.css) as a Discord color int.
const ACCENT = 0xd95d39;
// Shared URL that makes Discord merge embed images into one grid.
const GRID_URL = 'https://ka-mirror.com/';

/** Single colorway: large image + full metadata. */
export function colorwayEmbeds(cw) {
  const lines = [`[${cw.maker}](${makerUrl(cw)}) / [${cw.sculpt}](${galleryBase(cw)})`];
  if (cw.releaseDate) lines.push(`**Released** ${cw.releaseDate}`);
  if (cw.totalCount) lines.push(`**Made** ${cw.totalCount}`);
  if (cw.stemType) lines.push(`**Stem** ${cw.stemType}`);
  if (cw.commissioned) lines.push(`**Type** Commissioned`);
  if (cw.giveaway) lines.push(`**Type** Giveaway`);
  if (cw.note) lines.push(`**Note** ${cw.note}`);
  if (cw.photoCredit) lines.push(`**Photo** ${cw.photoCredit}`);
  return [
    {
      color: ACCENT,
      title: cw.name,
      url: cw.url,
      description: lines.join('\n'),
      image: { url: img.large(cw.id) },
      footer: { text: `ID ${cw.id}` },
    },
  ];
}

const galleryBase = (cw) => `${SITE}/maker/${cw.makerSlug}/${cw.sculptSlug}/`;
const makerUrl = (cw) => `${SITE}/maker/${cw.makerSlug}/`;

const line = (cw) =>
  `**[${[cw.maker, cw.sculpt, cw.name].join(' ')}](${cw.url})**  \`${cw.id}\`` +
  (cw.releaseDate ? `  ·  ${cw.releaseDate}` : '');

/** 2–10 results: linked list + thumbnail grid (CapBot's ≤10 layout). */
export function resultsEmbeds(query, results, total) {
  const main = {
    color: ACCENT,
    title: `${total} result${total === 1 ? '' : 's'} for "${query}"`,
    url: GRID_URL,
    description: results.map(line).join('\n'),
    // First thumb lives on the main embed so 10 results still fit Discord's
    // 10-embeds-per-message cap: 1 main + 9 extra = 10 images.
    image: { url: img.thumb(results[0].id) },
  };
  const rest = results.slice(1, 10).map((cw) => ({ url: GRID_URL, image: { url: img.thumb(cw.id) } }));
  return [main, ...rest];
}

/** >10 results: compact list, no images. */
export function listEmbeds(query, results, total) {
  return [
    {
      color: ACCENT,
      title: `${total} results for "${query}"`,
      description: results.map(line).join('\n'),
      footer: { text: `Showing ${results.length} of ${total} — refine your search` },
    },
  ];
}

/** Single maker: links + counts. */
export function makerEmbeds(m) {
  const links = [];
  if (m.instagram) links.push(`[Instagram](${m.instagram})`);
  if (m.website) links.push(`[Website](${m.website})`);
  if (m.discord) links.push(`[Discord](${m.discord})`);
  links.push(`[Catalog](${m.url})`);
  const flag = flagEmoji(m.nationality);
  return [
    {
      color: ACCENT,
      title: `${flag ? `${flag} ` : ''}${m.name}`,
      url: m.url,
      description:
        links.join('  ·  ') +
        `\n\n**Sculpts** ${m.sculptCount}  ·  **Colorways** ${m.colorwayCount}`,
    },
  ];
}

/** Several makers: one line each with whatever links they have. */
export function makerListEmbeds(query, makers, total) {
  const row = (m) => {
    const links = [
      m.instagram && `[IG](${m.instagram})`,
      m.website && `[Web](${m.website})`,
      m.discord && `[Discord](${m.discord})`,
      `[Catalog](${m.url})`,
    ].filter(Boolean);
    return `**[${m.name}](${m.url})**  ${links.join(' · ')}`;
  };
  return [
    {
      color: ACCENT,
      title: `${total} maker${total === 1 ? '' : 's'} matching "${query}"`,
      description: makers.map(row).join('\n'),
      ...(total > makers.length && {
        footer: { text: `Showing ${makers.length} of ${total} — refine your search` },
      }),
    },
  ];
}
