/**
 * Wishlist store. The only writer/reader of the 'ka-wishlist' localStorage
 * key; every UI (card buttons, lightbox, /wishlist page, image export) goes
 * through this module so shape changes stay in one place.
 *
 * Shape: { v: 1, want: Item[], have: Item[] }
 * Item:  { id, n, m, s, u, t }
 *   id = colorway id (CDN image key)
 *   n  = colorway name        m = maker name
 *   s  = sculpt name          u = root-relative sculpt path ('/maker/x/y/')
 *   t  = Date.now() when saved (insertion order = display order)
 *
 * Two independent lists: 'want' (caps to buy/trade for) and 'have' (caps up
 * for trade). A cap may sit in both. Reads are validated and never throw
 * (Fallback-Chain Rule); corrupt or foreign data falls back to empty.
 *
 * subscribe(fn) fires on every write from this tab AND on cross-tab changes
 * via the storage event. Subscribers should no-op when their DOM is gone
 * (check el.isConnected) because ClientRouter swaps pages without
 * unsubscribing dead closures.
 */

const KEY = 'ka-wishlist';
export const LISTS = ['want', 'have'];

const empty = () => ({ v: 1, want: [], have: [] });

function cleanItem(x) {
  if (!x || typeof x !== 'object' || typeof x.id !== 'string' || !x.id.trim()) return null;
  const str = (v) => (typeof v === 'string' ? v : '');
  return {
    id: x.id.trim(),
    n: str(x.n),
    m: str(x.m),
    s: str(x.s),
    u: str(x.u),
    t: Number.isFinite(x.t) ? x.t : Date.now(),
  };
}

function cleanList(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const item = cleanItem(x);
    if (item && !seen.has(item.id)) {
      seen.add(item.id);
      out.push(item);
    }
  }
  return out;
}

function cleanState(x) {
  if (!x || typeof x !== 'object') return empty();
  return { v: 1, want: cleanList(x.want), have: cleanList(x.have) };
}

/** Current state, validated. Never throws; corrupt storage reads as empty. */
export function read() {
  try {
    return cleanState(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
  } catch {
    return empty();
  }
}

// ---- subscriptions ---------------------------------------------------------

const subs = new Set();

function notify() {
  const state = read();
  for (const fn of subs) {
    try {
      fn(state);
    } catch {
      /* a dead listener must not break the others */
    }
  }
}

/** Subscribe to all changes (this tab and others). Returns an unsubscribe fn. */
export function subscribe(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY || e.key === null) notify();
  });
}

// ---- writes ----------------------------------------------------------------

function checkList(list) {
  if (!LISTS.includes(list)) throw new Error(`wishlist: unknown list "${list}"`);
}

function write(state) {
  localStorage.setItem(KEY, JSON.stringify(state));
  notify();
}

export function has(list, id) {
  checkList(list);
  return read()[list].some((i) => i.id === id);
}

export function get(list, id) {
  checkList(list);
  return read()[list].find((i) => i.id === id);
}

/**
 * Add or remove a cap. meta = { n, m, s, u } captured where the button
 * lives (card data attributes); ignored when removing. Returns true if the
 * cap is in the list after the call.
 */
export function toggle(list, id, meta = {}) {
  checkList(list);
  const state = read();
  const i = state[list].findIndex((x) => x.id === id);
  if (i >= 0) {
    state[list].splice(i, 1);
    write(state);
    return false;
  }
  state[list].push(cleanItem({ id, ...meta }));
  write(state);
  return true;
}

export function remove(list, id) {
  checkList(list);
  const state = read();
  const next = state[list].filter((x) => x.id !== id);
  if (next.length === state[list].length) return;
  state[list] = next;
  write(state);
}

export function clear(list) {
  checkList(list);
  const state = read();
  state[list] = [];
  write(state);
}

/** Merge an imported state into the current one (union by id; imports never
 *  delete). Returns the number of caps actually added. */
export function merge(imported) {
  const inc = cleanState(imported);
  const state = read();
  let added = 0;
  for (const list of LISTS) {
    const seen = new Set(state[list].map((i) => i.id));
    for (const item of inc[list]) {
      if (!seen.has(item.id)) {
        state[list].push(item);
        added++;
      }
    }
  }
  write(state);
  return added;
}
