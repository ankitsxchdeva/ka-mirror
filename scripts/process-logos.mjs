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
// Double-threshold hysteresis: the fill SEEDS on confident white at the image
// edge, then GROWS through JPEG-noised near-white, so sticker-style outlines
// are removed cleanly instead of half-eaten.
const SEED_LUM = 235;
const SEED_SPREAD = 26;
const GROW_LUM = 208;
const GROW_SPREAD = 34;

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
  const isSeed = (i) => lum(i) >= SEED_LUM && spread(i) <= SEED_SPREAD;
  const isGrow = (i) => lum(i) >= GROW_LUM && spread(i) <= GROW_SPREAD;

  // Hysteresis BFS: seed on confident white at the edge, grow through
  // near-white (JPEG noise, sticker-border shading).
  const removed = new Uint8Array(w * h);
  const stack = [];
  const trySeed = (p) => {
    if (!removed[p] && isSeed(p * 4)) {
      removed[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    trySeed(x);
    trySeed((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    trySeed(y * w);
    trySeed(y * w + w - 1);
  }
  while (stack.length) {
    const p = stack.pop();
    const x = p % w;
    const y = (p / w) | 0;
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const np = ny * w + nx;
      if (!removed[np] && isGrow(np * 4)) {
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
  // Feather the cut edge: boundary pixels get alpha proportional to how many
  // kept neighbors they have (3x3), anti-aliasing the silhouette.
  const alphaOut = new Uint8Array(w * h).fill(255);
  for (let p = 0; p < w * h; p++) {
    if (removed[p]) {
      alphaOut[p] = 0;
      continue;
    }
    const x = p % w;
    const y = (p / w) | 0;
    let kept = 0;
    let total = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        total++;
        if (!removed[ny * w + nx]) kept++;
      }
    }
    if (kept < total) alphaOut[p] = Math.round((255 * kept) / total);
  }
  for (let p = 0; p < w * h; p++) {
    data[p * 4 + 3] = Math.min(data[p * 4 + 3], alphaOut[p]);
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
