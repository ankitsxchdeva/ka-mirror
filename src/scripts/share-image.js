/**
 * Wishlist PNG export. Renders the saved caps to a canvas and downloads it
 * as 'ka-mirror-wishlist.png' — the share artifact modeled on
 * keycap-archivist's generated wishlist image, with 'ka-mirror.com' in the
 * bottom-right corner.
 *
 * The CDN (cdn.keycap-archivist.com) sends no CORS headers, so images must
 * be fetched through the small Cloudflare Worker proxy in worker/ (see
 * worker/README.md). Until the worker is deployed and PROXY_BASE below is
 * set to its origin, PNG_EXPORT_AVAILABLE stays false and callers must not
 * show export UI at all (Honest UI Rule: no dead affordances).
 *
 * CONTRACT (consumed by src/pages/wishlist.astro — do not change):
 *   PNG_EXPORT_AVAILABLE: boolean
 *   downloadWishlistPng(lists: { want: Item[], have: Item[] }):
 *     Promise<'ok' | 'error'>  ('error' also covers a failed canvas/blob step)
 *   Item = the wishlist store's item shape (see src/scripts/wishlist.js)
 */

// Set to the deployed worker origin, e.g.
// 'https://ka-mirror-img.<subdomain>.workers.dev' (no trailing slash).
const PROXY_BASE = 'https://ka-mirror-img.ankitsachdeva001.workers.dev';

export const PNG_EXPORT_AVAILABLE = PROXY_BASE.length > 0;

/** @returns {Promise<'ok'|'error'>} */
export async function downloadWishlistPng(lists) {
  try {
    const want = lists?.want ?? [];
    const have = lists?.have ?? [];
    if (!PROXY_BASE || (want.length === 0 && have.length === 0)) return 'error';

    const sections = [];
    if (want.length) sections.push({ heading: `Want (${want.length})`, items: want });
    if (have.length) sections.push({ heading: `For trade (${have.length})`, items: have });

    // Lato 400 and 700 must both be loaded before any text is measured.
    await document.fonts.ready;
    await Promise.allSettled([document.fonts.load(FONT(32)), document.fonts.load(FONT(14, 700))]);

    // Load every distinct thumb once; a failed image becomes an empty cell
    // and never fails the export.
    const ids = [...new Set(sections.flatMap((s) => s.items.map((i) => i.id)))];
    const images = new Map();
    await Promise.allSettled(
      ids.map(async (id) => {
        images.set(id, await loadImage(`${PROXY_BASE}/250/${id}.jpg`));
      }),
    );

    // Height first (title + sections + bottom padding); the footer lives
    // inside the bottom padding band.
    let content = PAD + TITLE_H;
    for (const s of sections) {
      content += SECTION_GAP + HEAD_ADV;
      const rows = Math.ceil(s.items.length / COLS);
      content += rows * CELL_H + (rows - 1) * ROW_GAP;
    }
    const H = content + PAD;
    if (H * SCALE > 32767) return 'error'; // browser canvas height cap

    const canvas = document.createElement('canvas');
    canvas.width = W * SCALE;
    canvas.height = H * SCALE;
    const ctx = canvas.getContext('2d');
    ctx.scale(SCALE, SCALE);

    const c = resolvePalette();
    ctx.fillStyle = c.bg;
    ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'top';

    // Title: display tier, lowercase, display tracking.
    ctx.fillStyle = c.ink;
    ctx.font = FONT(32);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '-0.5px';
    ctx.fillText('wishlist', PAD, PAD);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';

    let y = PAD + TITLE_H;
    for (const s of sections) {
      y += SECTION_GAP;
      ctx.fillStyle = c.ink;
      ctx.font = FONT(14, 700);
      ctx.fillText(s.heading, PAD, y);
      y += HEAD_ADV;
      s.items.forEach((item, i) => {
        const x = PAD + (i % COLS) * (CELL_W + GAP);
        const row = Math.floor(i / COLS);
        drawCell(ctx, c, images.get(item.id), item, x, y + row * (CELL_H + ROW_GAP));
      });
      const rows = Math.ceil(s.items.length / COLS);
      y += rows * CELL_H + (rows - 1) * ROW_GAP;
    }

    // Mandatory site mark, bottom-right, centered in the bottom band.
    ctx.fillStyle = c.dim;
    ctx.font = FONT(11);
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('ka-mirror.com', W - PAD, H - PAD / 2);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return 'error';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ka-mirror-wishlist.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return 'ok';
  } catch {
    return 'error';
  }
}

// ---- private helpers -------------------------------------------------------

// Layout constants, CSS pixels. The canvas renders at 2x device scale.
const W = 1200;
const PAD = 48;
const SCALE = 2;
const COLS = 4;
const GAP = 16;
const CELL_W = (W - 2 * PAD - (COLS - 1) * GAP) / COLS; // 264
const IMG = CELL_W; // square image cell
const TITLE_H = 32; // display tier advance
const HEAD_ADV = 14 + 16; // heading line + gap to grid
const CAP_GAP = 10; // image bottom to name top
const NAME_ADV = 18; // name line advance (13px tier)
const META_ADV = 16; // maker/sculpt line advance (11px tier)
const CELL_H = IMG + CAP_GAP + NAME_ADV + META_ADV;
const ROW_GAP = 28;
const SECTION_GAP = 40; // after a section (and title) before the next heading

const FONT = (px, weight = 400) => `${weight} ${px}px Lato, Verdana, sans-serif`;

// Spec 5: canvas resolves tokens from computed style at call time, never a
// hardcoded hex. Custom properties keep color-mix()/oklch() source text, so
// each value is routed through a real property on a probe element to get a
// computed color canvas parses.
function resolvePalette() {
  const root = getComputedStyle(document.documentElement);
  const probe = document.createElement('span');
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const pick = (name) => {
    const raw = root.getPropertyValue(name).trim();
    probe.style.color = raw;
    return probe.style.color ? getComputedStyle(probe).color : raw;
  };
  const palette = {
    bg: pick('--bg'),
    panel: pick('--bg-panel'),
    line: pick('--line'),
    ink: pick('--ink'),
    mid: pick('--ink-mid'),
    dim: pick('--ink-dim'),
  };
  probe.remove();
  return palette;
}

function loadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Truncate to maxW with an ellipsis. Binary search on the prefix length.
function fitText(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (ctx.measureText(text.slice(0, mid) + '…').width <= maxW) lo = mid;
    else hi = mid - 1;
  }
  return text.slice(0, lo) + '…';
}

// Cover-fit, matching the site tiles' object-fit: cover.
function drawCover(ctx, img, x, y, size) {
  const s = Math.max(size / img.naturalWidth, size / img.naturalHeight);
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, size, size);
  ctx.clip();
  ctx.drawImage(img, x + (size - w) / 2, y + (size - h) / 2, w, h);
  ctx.restore();
}

function drawCell(ctx, c, img, item, x, y) {
  ctx.fillStyle = c.panel;
  ctx.fillRect(x, y, CELL_W, IMG);
  if (img) drawCover(ctx, img, x, y, IMG);
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, CELL_W - 1, IMG - 1);

  ctx.fillStyle = c.ink;
  ctx.font = FONT(13, 700);
  ctx.fillText(fitText(ctx, item.n || '', CELL_W), x, y + IMG + CAP_GAP);
  ctx.fillStyle = c.mid;
  ctx.font = FONT(11);
  ctx.fillText(
    fitText(ctx, [item.m, item.s].filter(Boolean).join(' / '), CELL_W),
    x,
    y + IMG + CAP_GAP + NAME_ADV,
  );
}
