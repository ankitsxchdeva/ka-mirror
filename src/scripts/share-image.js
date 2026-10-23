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
 *   downloadWishlistPng(
 *     lists: { want: Item[], have: Item[] },
 *     socials?: { discord?: string, instagram?: string },
 *   ): Promise<'ok' | 'error'>  ('error' also covers a failed canvas/blob step)
 *   Item = the wishlist store's item shape (see src/scripts/wishlist.js)
 */

// The deployed ka-mirror-img worker origin (no trailing slash).
const PROXY_BASE = 'https://ka-mirror-img.ankitsachdeva001.workers.dev';

export const PNG_EXPORT_AVAILABLE = PROXY_BASE.length > 0;

/** @returns {Promise<'ok'|'error'>} */
export async function downloadWishlistPng(lists, socials = {}) {
  try {
    const want = lists?.want ?? [];
    const have = lists?.have ?? [];
    if (!PROXY_BASE || (want.length === 0 && have.length === 0)) return 'error';

    const socialsList = [
      { path: DISCORD_PATH, handle: cleanHandle(socials.discord) },
      { path: INSTAGRAM_PATH, handle: cleanHandle(socials.instagram) },
    ].filter((s) => s.handle);

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

    // Height first (title + sections + footer band); the footer rule and
    // marks live inside the bottom band.
    let content = PAD + TITLE_H;
    for (const s of sections) {
      content += SECTION_GAP + HEAD_ADV;
      const rows = Math.ceil(s.items.length / COLS);
      content += rows * CELL_H + (rows - 1) * ROW_GAP;
    }
    const H = content + FOOTER_H;
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
      // Section mark: the two-inks rule gives decorative marks the
      // editorial ink; the heading itself stays full ink.
      ctx.font = FONT(14, 700);
      ctx.fillStyle = c.editorial;
      ctx.fillText('//', PAD, y);
      ctx.fillStyle = c.ink;
      ctx.fillText(s.heading, PAD + ctx.measureText('// ').width, y);
      y += HEAD_ADV;
      s.items.forEach((item, i) => {
        const x = PAD + (i % COLS) * (CELL_W + GAP);
        const row = Math.floor(i / COLS);
        drawCell(ctx, c, images.get(item.id), item, x, y + row * (CELL_H + ROW_GAP));
      });
      const rows = Math.ceil(s.items.length / COLS);
      y += rows * CELL_H + (rows - 1) * ROW_GAP;
    }

    // Footer: hairline, then socials bottom-left, the mandatory site mark
    // bottom-right. Both sit on the same baseline.
    const ruleY = content + 14;
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD, ruleY + 0.5);
    ctx.lineTo(W - PAD, ruleY + 0.5);
    ctx.stroke();

    const baseline = H - 20;
    ctx.textBaseline = 'bottom';
    ctx.font = FONT(11);
    let sx = PAD;
    for (const s of socialsList) {
      drawIcon(ctx, s.path, sx, baseline - ICON, c.mid);
      sx += ICON + 6;
      const label = fitText(ctx, s.handle, 220);
      ctx.fillStyle = c.mid;
      ctx.fillText(label, sx, baseline);
      sx += ctx.measureText(label).width + 18;
    }

    ctx.fillStyle = c.dim;
    ctx.textAlign = 'right';
    ctx.fillText('ka-mirror.com', W - PAD, baseline);
    ctx.textAlign = 'left';

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) return 'error';

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ka-mirror-wishlist.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Safari aborts the download if the object URL dies too early.
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
const TILE_PAD = 10; // panel padding inside a cap tile
const IMG = CELL_W - 2 * TILE_PAD; // 244, square image inside the tile
const RADIUS = 8; // media-tile radius (site card language)
const TITLE_H = 32; // display tier advance
const HEAD_ADV = 14 + 16; // heading line + gap to grid
const CAP_GAP = 8; // image bottom to name top
const NAME_ADV = 18; // name line advance (13px tier)
const META_ADV = 16; // maker/sculpt line advance (11px tier)
const CELL_H = TILE_PAD + IMG + CAP_GAP + NAME_ADV + META_ADV + TILE_PAD; // 306
const ROW_GAP = 28;
const SECTION_GAP = 40; // after a section (and title) before the next heading
const FOOTER_H = 64; // hairline + marks band at the bottom
const ICON = 11; // social icon square, matches the 11px meta tier

const FONT = (px, weight = 400) => `${weight} ${px}px Lato, Verdana, sans-serif`;

// Monochrome brand marks (Simple Icons, 24x24 viewBox), drawn at ICON size
// in muted ink next to the user's handle.
const DISCORD_PATH =
  'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z';
const INSTAGRAM_PATH =
  'M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077';

// A handle is short plain text: trim, drop a leading @, cap the length.
function cleanHandle(v) {
  if (typeof v !== 'string') return '';
  return v.trim().replace(/^@+/, '').slice(0, 32);
}

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
    editorial: pick('--editorial'),
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

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (typeof ctx.roundRect === 'function') ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

// A 24x24-viewBox icon path drawn at (x, y) scaled to ICON, in `color`.
function drawIcon(ctx, pathData, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  const k = ICON / 24;
  ctx.scale(k, k);
  ctx.fillStyle = color;
  ctx.fill(new Path2D(pathData));
  ctx.restore();
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

// A cap tile: the site's card language (panel fill, 1px hairline, media-tile
// radius) with the photo inset in panel padding, captions inside the tile.
function drawCell(ctx, c, img, item, x, y) {
  roundRectPath(ctx, x, y, CELL_W, CELL_H, RADIUS);
  ctx.fillStyle = c.panel;
  ctx.fill();
  ctx.strokeStyle = c.line;
  ctx.lineWidth = 1;
  ctx.stroke();

  const ix = x + TILE_PAD;
  const iy = y + TILE_PAD;
  if (img) {
    drawCover(ctx, img, ix, iy, IMG);
  } else {
    // missing photo: an inset panel keeps the tile honest
    ctx.fillStyle = c.bg;
    ctx.fillRect(ix, iy, IMG, IMG);
  }

  ctx.textBaseline = 'top';
  ctx.fillStyle = c.ink;
  ctx.font = FONT(13, 700);
  ctx.fillText(fitText(ctx, item.n || '', IMG), ix, iy + IMG + CAP_GAP);
  ctx.fillStyle = c.mid;
  ctx.font = FONT(11);
  ctx.fillText(
    fitText(ctx, [item.m, item.s].filter(Boolean).join(' / '), IMG),
    ix,
    iy + IMG + CAP_GAP + NAME_ADV,
  );
}
