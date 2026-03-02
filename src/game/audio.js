// ── AUDIO ────────────────────────────────────────────────────────────────────
let audioCtx;

export function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return audioCtx;
}

export function playTone(freq, type, dur, gain, sf) {
  try {
    const ac = getAudio(), o = ac.createOscillator(), g = ac.createGain();
    o.connect(g); g.connect(ac.destination); o.type = type;
    if (sf) { o.frequency.setValueAtTime(sf, ac.currentTime); o.frequency.exponentialRampToValueAtTime(freq, ac.currentTime + dur); }
    else o.frequency.setValueAtTime(freq, ac.currentTime);
    g.gain.setValueAtTime(gain, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    o.start(); o.stop(ac.currentTime + dur);
  } catch (e) {}
}

export function playNoise(dur, gain, ff) {
  try {
    const ac = getAudio(), buf = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = ff;
    const g = ac.createGain(); src.connect(f); f.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(gain, ac.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    src.start(); src.stop(ac.currentTime + dur);
  } catch (e) {}
}

export function sfxFire()    { playTone(180, 'sawtooth', 0.22, 0.3, 340); playNoise(0.15, 0.25, 1200); }
export function sfxHit()     { playNoise(0.1, 0.35, 600); playTone(100, 'sine', 0.1, 0.2); }
export function sfxBump()    { playNoise(0.12, 0.3, 300); playTone(70, 'sine', 0.15, 0.18); }
export function sfxExplode() { playNoise(0.7, 0.6, 280); playNoise(0.4, 0.35, 140); playTone(55, 'sine', 0.6, 0.25, 110); }
export function sfxRespawn() { playTone(330, 'sine', 0.1, 0.1); playTone(550, 'sine', 0.1, 0.1); playTone(770, 'sine', 0.18, 0.15); }
export function sfxCrumble() { playNoise(0.35, 0.4, 400); playTone(90, 'sawtooth', 0.3, 0.2, 160); }

export function sfxRepair() {
  try {
    const ac = getAudio();
    [440, 554, 660, 880].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination); o.type = 'sine'; o.frequency.value = f;
      const t = ac.currentTime + i * 0.07;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      o.start(t); o.stop(t + 0.18);
    });
  } catch (e) {}
}

export function sfxFuel() {
  try {
    const ac = getAudio();
    [220, 277, 330, 415].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination); o.type = 'triangle'; o.frequency.value = f;
      const t = ac.currentTime + i * 0.08;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.14, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
      o.start(t); o.stop(t + 0.22);
    });
  } catch (e) {}
}

export function sfxMintSuccess() {
  try {
    const ac = getAudio();
    [523, 659, 784, 1047].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination); o.type = 'sine'; o.frequency.value = f;
      const t = ac.currentTime + i * 0.1;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2, t + 0.04); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
      o.start(t); o.stop(t + 0.35);
    });
  } catch (e) {}
}
