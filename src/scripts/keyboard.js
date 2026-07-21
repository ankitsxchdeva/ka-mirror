/**
 * Site-wide keyboard navigation. One delegated listener, so it survives
 * client-side navigations without re-binding:
 *
 * - Arrow keys / Home / End move focus through card grids (column-aware,
 *   skipping cards hidden by a filter).
 * - "p" toggles the pin on the focused maker card.
 * - Escape clears the inline colorway filter.
 * - After a client-side navigation, focus moves to <main> so Tab continues
 *   into the new page's content.
 */
const CARD_LINKS = '.grid a.cover-link, .grid a.cw-open';

// ---- floating shortcuts help (bottom right) --------------------------------
function helpPanel() {
  return document.getElementById('kb-help-panel');
}

function setHelpOpen(open) {
  const panel = helpPanel();
  const btn = document.getElementById('kb-help-btn');
  if (!panel || !btn) return;
  panel.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
}

document.addEventListener('click', (e) => {
  const inHelp = e.target instanceof Element && e.target.closest('.kb-help');
  if (inHelp && e.target.closest('#kb-help-btn')) {
    setHelpOpen(helpPanel()?.hidden ?? false);
  } else if (!inHelp) {
    setHelpOpen(false);
  }
});

function gridLinks(grid) {
  return [...grid.querySelectorAll('a.cover-link, a.cw-open')].filter(
    (a) => !a.closest('[hidden]')
  );
}

function columnsOf(grid) {
  return getComputedStyle(grid).gridTemplateColumns.split(' ').length || 1;
}

document.addEventListener('keydown', (e) => {
  const active = document.activeElement;
  const typing =
    active instanceof HTMLElement &&
    (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

  // "?" toggles the shortcuts help; Escape closes it.
  if (e.key === '?' && !typing) {
    e.preventDefault();
    setHelpOpen(helpPanel()?.hidden ?? false);
    return;
  }
  if (e.key === 'Escape' && helpPanel() && !helpPanel().hidden) {
    setHelpOpen(false);
    return;
  }

  // Escape clears the colorway filter (then keeps focus for retyping).
  if (e.key === 'Escape' && active instanceof HTMLInputElement && active.id === 'cw-filter') {
    if (active.value) {
      active.value = '';
      active.dispatchEvent(new Event('input', { bubbles: true }));
      e.preventDefault();
    }
    return;
  }

  if (!(active instanceof HTMLElement) || !active.matches(CARD_LINKS)) return;

  // "p" pins/unpins the focused maker card. Pinning re-orders the grid DOM,
  // which drops focus to <body>, so put it back on the same card.
  if (e.key === 'p' && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const pin = active.closest('.card')?.querySelector('[data-star]');
    if (pin instanceof HTMLElement) {
      e.preventDefault();
      pin.click();
      active.focus();
      active.scrollIntoView({ block: 'nearest' });
    }
    return;
  }

  const moves = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
  if (!moves.includes(e.key)) return;

  const grid = active.closest('.grid');
  if (!grid) return;
  const links = gridLinks(grid);
  const i = links.indexOf(active);
  if (i < 0) return;

  const cols = columnsOf(grid);
  let next = i;
  if (e.key === 'ArrowLeft') next = i - 1;
  else if (e.key === 'ArrowRight') next = i + 1;
  else if (e.key === 'ArrowUp') next = i - cols;
  else if (e.key === 'ArrowDown') next = i + cols;
  else if (e.key === 'Home') next = 0;
  else if (e.key === 'End') next = links.length - 1;

  if (next < 0 || next >= links.length) {
    // vertical moves clamp to the edge rows instead of dying
    if (e.key === 'ArrowUp') next = 0;
    else if (e.key === 'ArrowDown') next = links.length - 1;
    else return;
  }
  e.preventDefault();
  links[next].focus();
  links[next].scrollIntoView({ block: 'nearest' });
});

// After a client-side navigation, land focus on the page content.
let firstLoad = true;
document.addEventListener('astro:page-load', () => {
  if (firstLoad) {
    firstLoad = false;
    return;
  }
  document.getElementById('main')?.focus({ preventScroll: true });
});
