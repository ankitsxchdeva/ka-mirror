/**
 * Full colorway search index (~70k entries), fetched lazily on the first
 * real query. Kept compact by referencing sculpts by index:
 *   { sculpts: [name, makerName, url][], colorways: [sculptIdx, name, id][] }
 */
import { getCatalog } from '../lib/catalog.js';

export async function GET() {
  const { makers } = await getCatalog();
  const sculpts = [];
  const colorways = [];
  for (const m of makers) {
    for (const s of m.sculpts) {
      const si = sculpts.length;
      sculpts.push([s.name, m.name, s.url]);
      for (const c of s.colorways) {
        if (c.name) colorways.push([si, c.name, c.id]);
      }
    }
  }
  return new Response(JSON.stringify({ sculpts, colorways }), {
    headers: { 'content-type': 'application/json' },
  });
}
