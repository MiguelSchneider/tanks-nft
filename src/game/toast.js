// ── TOAST ────────────────────────────────────────────────────────────────────
let toastTimer = null;

export function showToast(msg, duration = 2500, color = '#fa0') {
  const el = document.getElementById('mintToast');
  el.textContent = msg; el.style.color = color; el.style.borderColor = color + '66';
  el.style.display = 'block';
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.style.display = 'none', duration);
}
