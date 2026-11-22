// Sound, all synthesized — no audio files. Engine hum follows speed, the
// siren wails in two tones, gunshots are noise bursts, and three radio
// stations play procedural loops (synthwave, latin, talk + police band).
import { RADIO } from './config.js';

export function createAudio() {
  let ctx = null, master = null, engineOsc = null, engineGain = null;
  let radioNodes = null, radioTimer = null, muted = false, station = 0;

  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 50;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass'; lp.frequency.value = 900;
      engineOsc.connect(lp); lp.connect(engineGain); engineGain.connect(master);
      engineOsc.start();
      return true;
    } catch { return false; }
  }
  function note(freq, when, dur, type, vol) {
    const o = ctx.createOscillator();
    o.type = type || 'square';
    o.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol || 0.12, when + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.connect(g); g.connect(master);
    o.start(when); o.stop(when + dur + 0.05);
  }
  const WAVE = [110, 130.8, 164.8, 196, 220, 164.8, 130.8, 98];
  const SOL = [220, 261.6, 329.6, 392, 329.6, 261.6, 220, 196];
  function radioTick() {
    if (!ctx || muted) return;
    const st = RADIO[station];
    const now = ctx.currentTime + 0.05;
    if (st.id === 'talk') {
      // Police-band chatter: short blips and a low murmur tone.
      note(660, now, 0.06, 'square', 0.05);
      note(520, now + 0.12, 0.05, 'square', 0.04);
      note(180, now + 0.3, 0.4, 'sine', 0.05);
      return;
    }
    const seq = st.id === 'wave' ? WAVE : SOL;
    const step = st.id === 'wave' ? 0.22 : 0.16;
    for (let i = 0; i < 8; i += 1) {
      note(seq[i % seq.length], now + i * step, step * 0.9, st.id === 'wave' ? 'sawtooth' : 'triangle', 0.07);
      if (i % 2 === 0) note(seq[i % seq.length] / 2, now + i * step, step, 'sine', 0.1);
    }
  }
  return {
    unlock() { if (ensure() && ctx.state === 'suspended') ctx.resume(); },
    setEngine(speed01, on) {
      if (!ctx || muted) return;
      engineOsc.frequency.value = 45 + speed01 * 140;
      engineGain.gain.value = on ? 0.05 + speed01 * 0.06 : 0;
    },
    siren(on) {
      if (!ctx || muted) return;
      if (on && !radioNodes) {
        const o = ctx.createOscillator();
        o.type = 'sine';
        const g = ctx.createGain(); g.gain.value = 0.035;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.6;
        const lg = ctx.createGain(); lg.gain.value = 320;
        lfo.connect(lg); lg.connect(o.frequency);
        o.frequency.value = 750;
        o.connect(g); g.connect(master);
        o.start(); lfo.start();
        radioNodes = { o, lfo, g };
      } else if (!on && radioNodes) {
        try { radioNodes.o.stop(); radioNodes.lfo.stop(); } catch { /* already stopped */ }
        radioNodes = null;
      }
    },
    shot() {
      if (!ctx || muted) return;
      const dur = 0.12;
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain(); g.gain.value = 0.25;
      src.connect(g); g.connect(master);
      src.start();
    },
    cash() {
      if (!ctx || muted) return;
      const now = ctx.currentTime;
      note(880, now, 0.12, 'sine', 0.12);
      note(1318, now + 0.1, 0.2, 'sine', 0.12);
    },
    nextStation() {
      station = (station + 1) % RADIO.length;
      return RADIO[station];
    },
    station() { return RADIO[station]; },
    startRadio() {
      if (!ensure()) return;
      if (radioTimer) return;
      radioTimer = window.setInterval(radioTick, 1800);
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
  };
}
