/**
 * Image URL helpers. Full-size images live on cdn.keycap-archivist.com;
 * thumbnails go through the wsrv.nl image proxy (free, Cloudflare-backed)
 * for on-the-fly resize + WebP. Pages set onerror fallbacks to the original
 * URL in case the proxy is ever unavailable.
 */
export function thumb(url, width = 320) {
  if (!url) return '';
  const bare = url.replace(/^https?:\/\//, '');
  return `https://wsrv.nl/?url=${encodeURIComponent(bare)}&w=${width}&output=webp&q=75`;
}

export function thumbSrcset(url, widths = [320, 640]) {
  if (!url) return '';
  return widths.map((w) => `${thumb(url, w)} ${w}w`).join(', ');
}
