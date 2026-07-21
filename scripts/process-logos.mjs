/**
 * Makes maker logos dark-mode friendly. For each logo in src/assets/logos:
 *
 * 1. Flood-fills near-white pixels connected to the image edge to transparent
 *    (interior whites are kept, photo-style logos are left untouched).
 * 2. Measures the luminance of the surviving art. Logos whose art is mostly
 *    dark ink would vanish on a dark card, so they're flagged `chip: true`
 *    and the site renders them on a soft light tile instead.
 *
 * Outputs PNGs to src/assets/logos-processed/ plus manifest.json.
 * Re-run after adding new logos: npm run process-logos
 */
import sharp from 'sharp';
import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = path.join(root, 'src/assets/logos');
const outDir = path.join(root, 'src/assets/logos-processed');
const SIZE = 320;
const WHITE_LUM = 235; // edge-connected pixels at least this bright get removed
const NEUTRAL_SPREAD = 26; // and this close to gray (avoids eating pale colors)
const HALO_LUM = 215; // softening threshold next to removed areas

await mkdir(outDir, { recursive: true });
const files = (await readdir(srcDir)).filter((f) => /\.(jpg|png)$/.test(f));
const manifest = {};

for (const file of files) {
  const id = file.replace(/\.(jpg|png)$/, '');
  const img = sharp(path.join(srcDir, file))
    .resize(SIZE, SIZE, { fit: 'inside', withoutEnlargement: true })
    .ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;

  const lum = (i) => 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  const spread = (i) =>
    Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
  const isWhite = (i) => lum(i) >= WHITE_LUM && spread(i) <= NEUTRAL_SPREAD;

  // BFS from all edge pixels over near-white territory.
  const removed = new Uint8Array(w * h);
  const queue = [];
  for (let x = 0; x < w; x++) queue.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) queue.push(y * w, y * w + w - 1);
  for (const p of queue) {
    if (!removed[p] && isWhite(p * 4)) removed[p] = 1;
    else removed[p] = removed[p] || 0;
  }
  // seed queue properly: only near-white edge pixels
  const stack = queue.filter((p) => removed[p]);
  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    const y = (p / w) | 0;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const np = ny * w + nx;
      if (!removed[np] && isWhite(np * 4)) {
        removed[np] = 1;
        stack.push(np);
      }
    }
  }

  let removedCount = 0;
  for (let p = 0; p < w * h; p++) {
    if (removed[p]) {
      data[p * 4 + 3] = 0;
      removedCount++;
    }
  }
  // Soften JPEG halos: bright pixels bordering removed areas go translucent.
  for (let p = 0; p < w * h; p++) {
    if (removed[p]) continue;
    const x = p % w;
    const y = (p / w) | 0;
    const nearRemoved = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].some(
      ([nx, ny]) => nx >= 0 && ny >= 0 && nx < w && ny < h && removed[ny * w + nx]
    );
    if (nearRemoved && lum(p * 4) >= HALO_LUM && spread(p * 4) <= NEUTRAL_SPREAD) {
      data[p * 4 + 3] = 90;
    }
  }

  // Luminance of surviving art decides whether the logo needs a light chip.
  let sum = 0;
  let count = 0;
  for (let p = 0; p < w * h; p++) {
    if (data[p * 4 + 3] > 128) {
      sum += lum(p * 4);
      count++;
    }
  }
  const artLum = count ? sum / count : 255;
  const removedRatio = removedCount / (w * h);
  // chip when we actually cut a background away and the art is dark ink
  const chip = removedRatio > 0.15 && artLum < 110;

  await sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(outDir, `${id}.png`));
  manifest[id] = { chip, removed: +removedRatio.toFixed(3) };
}

await writeFile(
  path.join(outDir, 'manifest.json'),
  JSON.stringify(manifest, null, 1)
);
const chips = Object.values(manifest).filter((m) => m.chip).length;
console.log(`${files.length} logos processed, ${chips} flagged for light chip`);
