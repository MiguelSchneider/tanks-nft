// ── UTILS ────────────────────────────────────────────────────────────────────
export function rand(a, b) { return a + Math.random() * (b - a); }
export function randi(a, b) { return Math.floor(rand(a, b + 1)); }
export function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
export function angleDiff(a, b) { return ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; }
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function lerpColor(c1, c2, t) { return [c1[0] + (c2[0] - c1[0]) * t | 0, c1[1] + (c2[1] - c1[1]) * t | 0, c1[2] + (c2[2] - c1[2]) * t | 0]; }
export function shortenAddr(addr) { return addr.slice(0, 4) + '...' + addr.slice(-4); }
export function randHsl(hmin, hmax, s, l) { return `hsl(${randi(hmin, hmax)},${s}%,${l}%)`; }

const _rgbCache = new Map(), _shadeCache = new Map();

export function hexToRgb(hex) {
  if (_rgbCache.has(hex)) return _rgbCache.get(hex);
  const t = document.createElement('canvas'); t.width = 1; t.height = 1;
  const c = t.getContext('2d'); c.fillStyle = hex; c.fillRect(0, 0, 1, 1);
  const d = c.getImageData(0, 0, 1, 1).data; const r = [d[0], d[1], d[2]];
  _rgbCache.set(hex, r); return r;
}

export function shadeColor(hex, amt) {
  const k = hex + '|' + amt; if (_shadeCache.has(k)) return _shadeCache.get(k);
  const [r, g, b] = hexToRgb(hex);
  const s = `rgb(${clamp(r + amt, 0, 255)},${clamp(g + amt, 0, 255)},${clamp(b + amt, 0, 255)})`;
  _shadeCache.set(k, s); return s;
}
