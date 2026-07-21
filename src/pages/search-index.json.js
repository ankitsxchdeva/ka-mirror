/**
 * Light search index: makers + sculpts (~3.4k entries). Fetched when the
 * search box gains focus. URLs are base-relative; the client prepends
 * BASE_URL.
 */
import { getCatalog } from '../lib/catalog.js';

export async function GET() {
  const { makers } = await getCatalog();
  const index = {
    makers: makers.map((m) => ({ n: m.name, u: m.url })),
    sculpts: makers.flatMap((m) =>
      m.sculpts.map((s) => ({ n: s.name, m: m.name, u: s.url }))
    ),
  };
  return new Response(JSON.stringify(index), {
    headers: { 'content-type': 'application/json' },
  });
}
