/**
 * Floating cover preview for table rows. Any row with data-preview="<img url>"
 * shows a fixed panel near the pointer while hovered. Desktop pointer only
 * (gated in CSS via media query on #row-preview.show).
 */
export function initRowPreview() {
  const panel = document.createElement('div');
  panel.id = 'row-preview';
  const img = document.createElement('img');
  img.alt = '';
  panel.appendChild(img);
  document.body.appendChild(panel);

  let raf = 0;

  function place(e) {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      const w = 214;
      const x = Math.min(e.clientX + 20, window.innerWidth - w - 12);
      const y = Math.min(e.clientY - 40, window.innerHeight - w - 12);
      panel.style.left = `${x}px`;
      panel.style.top = `${Math.max(y, 8)}px`;
    });
  }

  document.querySelectorAll('tr[data-preview]').forEach((row) => {
    row.addEventListener('mouseenter', (e) => {
      img.src = row.dataset.preview;
      panel.classList.add('show');
      place(e);
    });
    row.addEventListener('mousemove', place);
    row.addEventListener('mouseleave', () => {
      panel.classList.remove('show');
      img.removeAttribute('src');
    });
  });
}
