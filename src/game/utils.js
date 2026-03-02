// ── UTILS ────────────────────────────────────────────────────────────────────
export function rand(a, b) { return a + Math.random() * (b - a); }
export function randi(a, b) { return Math.floor(rand(a, b + 1)); }
export function dist(a, b) { return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2); }
export function angleDiff(a, b) { return ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI; }
export function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
export function lerpColor(c1, c2, t) { return [c1[0] + (c2[0] - c1[0]) * t | 0, c1[1] + (c2[1] - c1[1]) * t | 0, c1[2] + (c2[2] - c1[2]) * t | 0]; }
export function shortenAddr(addr) { return addr.slice(0, 4) + '...' + addr.slice(-4); }
export function randHsl(hmin, hmax, s, l) { return `hsl(${randi(hmin, hmax)},${s}%,${l}%)`; }

const _TANK_ADJ = {
  any:    ['Iron', 'Steel', 'Thunder', 'Shadow', 'Blazing', 'Arctic', 'Desert', 'Phantom',
           'Ghost', 'Titan', 'Crimson', 'Midnight', 'Silent', 'Wild', 'Fury', 'Infernal',
           'Scorched', 'Frozen', 'Grim', 'Raging', 'Deadly', 'Ruthless', 'Battered', 'Gilded'],
  heavy:  ['Iron', 'Steel', 'Armored', 'Heavy', 'Titan', 'Colossal', 'Massive', 'Fortified'],
  speed:  ['Swift', 'Phantom', 'Ghost', 'Silent', 'Racing', 'Rapid', 'Blurred', 'Flash'],
  sniper: ['Silent', 'Phantom', 'Shadow', 'Cold', 'Precise', 'Unseen', 'Distant', 'Lone'],
};
const _TANK_NOUN = {
  any:    ['Panther', 'Tiger', 'Eagle', 'Wolf', 'Bear', 'Cobra', 'Viper', 'Stallion',
           'Hawk', 'Falcon', 'Tempest', 'Fang', 'Crusher', 'Hunter', 'Juggernaut',
           'Reaper', 'Specter', 'Marauder', 'Rhino', 'Sentinel', 'Warden', 'Rex', 'Claw'],
  heavy:  ['Juggernaut', 'Bear', 'Rhino', 'Crusher', 'Titan', 'Warden', 'Mammoth', 'Colossus'],
  speed:  ['Viper', 'Falcon', 'Fox', 'Hawk', 'Streak', 'Dart', 'Racer', 'Bolt'],
  sniper: ['Eagle', 'Hawk', 'Reaper', 'Specter', 'Falcon', 'Lynx', 'Wraith', 'Shade'],
};
export function randomTankName(type) {
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const adj  = pick(_TANK_ADJ[type]  || _TANK_ADJ.any);
  const noun = pick(_TANK_NOUN[type] || _TANK_NOUN.any);
  const suffix = Math.random() < 0.22 ? ` Mk.${Math.floor(Math.random() * 5) + 2}` : '';
  return adj + ' ' + noun + suffix;
}

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
