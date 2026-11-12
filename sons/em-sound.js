/* Moteur de sons de l'écran mural : tout est synthétisé (Web Audio), aucun fichier audio.
   Trois ambiances : lounge (piano électrique feutré), jarvis (interface futuriste), cristal (verre).
   Événements : ring, tap, arm, disarm, error, arming, pending, pending_fast, alarm. */
class EmSound {
  constructor(theme) { this.theme = theme || 'lounge'; }

  // ctx : contexte audio fourni (ex. OfflineAudioContext pour enregistrer les sons), sinon créé au premier son.
  _ctx(ctx) {
    if (ctx && this.c !== ctx) { this.c = ctx; this.out = null; }
    if (!this.c) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.c = new AC();
    }
    if (!this.out) {
      const c = this.c;
      this.out = c.createGain(); this.out.gain.value = 0.9;
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -16; comp.ratio.value = 3; comp.attack.value = 0.005; comp.release.value = 0.2;
      this.out.connect(comp); comp.connect(c.destination);
      // Réverbération de salle (réponse impulsionnelle générée)
      this.rev = c.createConvolver(); this.rev.buffer = this._ir(3.2, 2.6);
      const rg = c.createGain(); rg.gain.value = 0.55; this.rev.connect(rg); rg.connect(this.out);
      // Écho ping-pong filtré
      this.dly = c.createDelay(1.5); this.dly.delayTime.value = 0.27;
      const fb = c.createGain(); fb.gain.value = 0.35;
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
      this.dly.connect(lp); lp.connect(fb); fb.connect(this.dly);
      const dg = c.createGain(); dg.gain.value = 0.5; lp.connect(dg); dg.connect(this.out); dg.connect(this.rev);
    }
    if (this.c.state === 'suspended' && this.c.resume) this.c.resume();
    return this.c;
  }

  _ir(sec, decay) {
    const c = this.c, n = Math.floor(c.sampleRate * sec), b = c.createBuffer(2, n, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay) * (i < 200 ? i / 200 : 1);
    }
    return b;
  }

  // Bus de sortie : niveau sec, envoi réverbération, envoi écho
  _bus(t, wet, echo) {
    const c = this.c, g = c.createGain();
    g.connect(this.out);
    const r = c.createGain(); r.gain.value = wet || 0; g.connect(r); r.connect(this.rev);
    if (echo) { const e = c.createGain(); e.gain.value = echo; g.connect(e); e.connect(this.dly); }
    if (!(c instanceof (window.OfflineAudioContext || Object))) setTimeout(() => { try { g.disconnect(); r.disconnect(); } catch (x) { /* noop */ } }, (t - c.currentTime + 8) * 1000);
    return g;
  }

  _env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  /* Piano électrique (FM type Rhodes) */
  ep(f, t, dur, vol, bus, bright) {
    const c = this.c;
    const car = c.createOscillator(), mod = c.createOscillator(), mg = c.createGain(), g = c.createGain(), lp = c.createBiquadFilter();
    car.frequency.value = f; mod.frequency.value = f;
    mg.gain.setValueAtTime(f * (bright || 1.6), t); mg.gain.exponentialRampToValueAtTime(f * 0.08, t + 0.6);
    mod.connect(mg); mg.connect(car.frequency);
    lp.type = 'lowpass'; lp.frequency.value = bright ? 2600 * bright : 2600;
    car.connect(lp); lp.connect(g); g.connect(bus);
    // « tine » : petite attaque métallique
    const tine = c.createOscillator(), tg = c.createGain();
    tine.frequency.value = f * 7.1; tine.connect(tg); tg.connect(bus);
    this._env(tg, t, 0.002, vol * 0.08, 0.12);
    this._env(g, t, 0.006, vol, dur);
    [car, mod, tine].forEach((o) => { o.start(t); o.stop(t + dur + 0.05); });
  }

  /* Verre / bol chantant : partiels inharmoniques */
  glass(f, t, dur, vol, bus) {
    const c = this.c;
    [[1, 1, 1], [2.76, 0.45, 0.6], [5.4, 0.22, 0.35], [8.93, 0.1, 0.2]].forEach(([r, a, d]) => {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = f * r; o.connect(g); g.connect(bus);
      this._env(g, t, 0.003, vol * a, dur * d);
      o.start(t); o.stop(t + dur * d + 0.05);
    });
  }

  /* Bip d'interface avec glissando */
  blip(f, t, dur, vol, bus, to) {
    const c = this.c, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(f, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.6);
    o.connect(g); g.connect(bus);
    this._env(g, t, 0.004, vol, dur);
    o.start(t); o.stop(t + dur + 0.05);
  }

  /* Nappe : dents de scie désaccordées, filtrées, attaque lente */
  pad(freqs, t, dur, vol, bus, cutoff) {
    const c = this.c, lp = c.createBiquadFilter(), g = c.createGain();
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(cutoff || 1400, t); lp.Q.value = 0.7;
    lp.connect(g); g.connect(bus);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + Math.min(0.5, dur * 0.35));
    g.gain.setValueAtTime(vol, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    freqs.forEach((f) => [-6, 6].forEach((dt) => {
      const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
    }));
  }

  /* Souffle filtré qui balaie (montée / descente) */
  sweep(t, dur, vol, bus, from, to) {
    const c = this.c, n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = b; bp.type = 'bandpass'; bp.Q.value = 3;
    bp.frequency.setValueAtTime(from, t); bp.frequency.exponentialRampToValueAtTime(to, t + dur);
    s.connect(bp); bp.connect(g); g.connect(bus);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + dur * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.start(t); s.stop(t + dur);
  }

  /* Impact grave feutré */
  thump(t, vol, bus) {
    const c = this.c, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.3);
    o.connect(g); g.connect(bus || this.out);
    this._env(g, t, 0.004, vol, 0.45);
    o.start(t); o.stop(t + 0.5);
  }

  /* Petit clic boisé */
  tick(t, vol, bus, f) {
    const c = this.c, o = c.createOscillator(), g = c.createGain(), hp = c.createBiquadFilter();
    o.type = 'triangle'; o.frequency.setValueAtTime(f || 2200, t); o.frequency.exponentialRampToValueAtTime((f || 2200) * 0.6, t + 0.03);
    hp.type = 'highpass'; hp.frequency.value = 900;
    o.connect(hp); hp.connect(g); g.connect(bus);
    this._env(g, t, 0.001, vol, 0.05);
    o.start(t); o.stop(t + 0.08);
  }

  /* Sirène d'alarme sérieuse (commune aux ambiances, timbre adapté) */
  siren(t, vol, warm) {
    const c = this.c, bus = this._bus(t, 0.15);
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6;
    lp.frequency.setValueAtTime(warm ? 900 : 1400, t);
    lp.frequency.linearRampToValueAtTime(warm ? 3200 : 4200, t + 0.45);
    lp.frequency.linearRampToValueAtTime(warm ? 900 : 1400, t + 0.95);
    const g = c.createGain(); lp.connect(g); g.connect(bus);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.05);
    g.gain.setValueAtTime(vol, t + 0.85); g.gain.linearRampToValueAtTime(0.0001, t + 0.98);
    [[1, 'sawtooth'], [1.5, 'square'], [0.5, 'sine']].forEach(([m, type]) => {
      const o = c.createOscillator(); o.type = type;
      o.frequency.setValueAtTime(440 * m, t);
      o.frequency.exponentialRampToValueAtTime(660 * m, t + 0.45);
      o.frequency.exponentialRampToValueAtTime(440 * m, t + 0.95);
      o.connect(lp); o.start(t); o.stop(t + 1);
    });
    this.thump(t, vol * 1.4, bus);
  }

  play(ev, vol, at, ctx) {
    const c = this._ctx(ctx);
    if (!c) return;
    const t = c.currentTime + 0.03 + (at || 0), v = vol == null ? 1 : vol, th = this.theme;
    const N = (n) => 440 * Math.pow(2, (n - 69) / 12); // numéro MIDI → Hz
    if (th === 'jarvis') {
      if (ev === 'ring') {
        const b = this._bus(t, 0.5, 0.35);
        this.sweep(t, 0.45, 0.08 * v, b, 1500, 7000);
        this.blip(N(81), t + 0.4, 0.5, 0.26 * v, b, N(88));
        this.blip(N(88), t + 0.62, 0.7, 0.21 * v, b, N(93));
        this.pad([N(57), N(64), N(69), N(76)], t + 0.4, 2.6, 0.05 * v, b, 2400);
        this.blip(N(88), t + 1.7, 0.45, 0.16 * v, b, N(93));
        this.blip(N(93), t + 1.9, 0.9, 0.15 * v, b, N(100));
      } else if (ev === 'tap') {
        this.blip(2600, t, 0.05, 0.05 * v, this._bus(t, 0.1, 0.12), 3000);
      } else if (ev === 'arm') {
        const b = this._bus(t, 0.4, 0.25);
        this.sweep(t, 0.5, 0.05 * v, b, 6000, 600);
        this.blip(1200, t, 0.45, 0.12 * v, b, 300);
        this.thump(t + 0.32, 0.4 * v, b);
        this.pad([N(45), N(52)], t + 0.3, 1.4, 0.04 * v, b, 900);
      } else if (ev === 'disarm') {
        const b = this._bus(t, 0.45, 0.25);
        this.blip(300, t, 0.4, 0.1 * v, b, 1200);
        this.pad([N(57), N(64), N(73)], t + 0.15, 1.8, 0.045 * v, b, 2200);
        this.blip(N(85), t + 0.3, 0.6, 0.08 * v, b);
      } else if (ev === 'error') {
        const b = this._bus(t, 0.2);
        this.blip(260, t, 0.16, 0.12 * v, b, 220);
        this.blip(220, t + 0.2, 0.28, 0.12 * v, b, 180);
      } else if (ev === 'arming') {
        this.blip(1480, t, 0.08, 0.05 * v, this._bus(t, 0.25, 0.2), 1500);
      } else if (ev === 'pending' || ev === 'pending_fast') {
        const b = this._bus(t, 0.2, 0.15);
        this.blip(ev === 'pending' ? 1760 : 2093, t, 0.09, 0.11 * v, b, ev === 'pending' ? 1760 : 2200);
      } else if (ev === 'alarm') this.siren(t, 0.2 * v, false);
      return;
    }
    if (th === 'cristal') {
      if (ev === 'ring') {
        const b = this._bus(t, 0.6);
        [[N(88), 0], [N(83), 0.32], [N(80), 0.64], [N(76), 1.05]].forEach(([f, d]) => this.glass(f, t + d, 3.2, 0.14 * v, b));
        this.glass(N(64), t + 1.05, 4, 0.08 * v, b);
      } else if (ev === 'tap') {
        this.glass(N(96), t, 0.4, 0.035 * v, this._bus(t, 0.2));
      } else if (ev === 'arm') {
        const b = this._bus(t, 0.55);
        [N(83), N(76), N(71)].forEach((f, i) => this.glass(f, t + i * 0.16, 2.4, 0.11 * v, b));
      } else if (ev === 'disarm') {
        const b = this._bus(t, 0.55);
        [N(76), N(80), N(83), N(88)].forEach((f, i) => this.glass(f, t + i * 0.11, 2.4, 0.1 * v, b));
      } else if (ev === 'error') {
        const b = this._bus(t, 0.3);
        this.glass(N(58), t, 1, 0.12 * v, b); this.glass(N(59), t + 0.02, 1, 0.1 * v, b);
      } else if (ev === 'arming') {
        this.glass(N(88), t, 0.6, 0.04 * v, this._bus(t, 0.4));
      } else if (ev === 'pending' || ev === 'pending_fast') {
        this.glass(ev === 'pending' ? N(93) : N(100), t, 0.5, 0.12 * v, this._bus(t, 0.25));
      } else if (ev === 'alarm') this.siren(t, 0.2 * v, true);
      return;
    }
    // lounge (par défaut)
    if (ev === 'ring') {
      const b = this._bus(t, 0.5, 0.12);
      // Accord Ré maj9 arpégé, puis réponse Si m11 : un « ding-dong » de bar d'hôtel
      [N(62), N(66), N(69), N(73), N(76)].forEach((f, i) => this.ep(f, t + i * 0.055, 2.4, 0.13 * v, b));
      [N(59), N(62), N(66), N(69), N(76)].forEach((f, i) => this.ep(f, t + 1.0 + i * 0.05, 3.0, 0.12 * v, b));
      this.pad([N(38), N(45)], t + 1.0, 2.6, 0.03 * v, b, 500);
    } else if (ev === 'tap') {
      this.tick(t, 0.05 * v, this._bus(t, 0.12), 1900);
    } else if (ev === 'arm') {
      const b = this._bus(t, 0.45, 0.1);
      this.ep(N(69), t, 1.2, 0.13 * v, b); this.ep(N(62), t + 0.18, 2, 0.14 * v, b);
      this.pad([N(38), N(45)], t + 0.18, 1.8, 0.04 * v, b, 600);
      this.thump(t + 0.18, 0.25 * v, b);
    } else if (ev === 'disarm') {
      const b = this._bus(t, 0.45, 0.1);
      [N(62), N(66), N(69), N(73)].forEach((f, i) => this.ep(f, t + i * 0.075, 2.2, 0.12 * v, b));
    } else if (ev === 'error') {
      const b = this._bus(t, 0.25);
      this.ep(N(58), t, 0.6, 0.12 * v, b, 0.5); this.ep(N(57), t + 0.18, 0.9, 0.12 * v, b, 0.5);
    } else if (ev === 'arming') {
      this.ep(N(81), t, 0.5, 0.05 * v, this._bus(t, 0.35));
    } else if (ev === 'pending' || ev === 'pending_fast') {
      const b = this._bus(t, 0.25);
      this.ep(N(88), t, 0.4, 0.11 * v, b, 1.4);
      if (ev === 'pending_fast') this.ep(N(93), t + 0.12, 0.4, 0.09 * v, b, 1.4);
    } else if (ev === 'alarm') this.siren(t, 0.2 * v, true);
  }
}
if (typeof module !== 'undefined') module.exports = EmSound;
