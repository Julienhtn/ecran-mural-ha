/*
 * Écran mural — carte Home Assistant plein écran (design « haut de gamme »)
 * Une seule carte : alarme (Alarmo), caméras, scènes, volets, thermostat,
 * météo, EDF Tempo, consommations, appel visio, écran de veille.
 * Licence MIT.
 */
const EM_VERSION = '0.2.0';

const EM_STRIP = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const EM_W = 1280;
const EM_H = 800;

const EM_ICONS = {
  shield: '<path d="M12 3l7 3v6c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3z"></path><path d="M9.5 12l1.8 1.8L15 10"></path>',
  away: '<path d="M3 11l9-7 9 7"></path><path d="M5 10v10h14V10"></path><path d="M10 20v-5h4v5"></path>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"></path>',
  video: '<rect x="3" y="6" width="12" height="12" rx="2"></rect><path d="M15 10l6-3v10l-6-3"></path>',
  thermo: '<path d="M14 14.76V4a2 2 0 1 0-4 0v10.76a4 4 0 1 0 4 0z"></path>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"></path>',
  power: '<path d="M12 3v9"></path><path d="M6.3 6.3a8 8 0 1 0 11.4 0"></path>',
  up: '<path d="M6 15l6-6 6 6"></path>',
  down: '<path d="M6 9l6 6 6-6"></path>',
  close: '<path d="M6 6l12 12M18 6L6 18"></path>',
  minus: '<path d="M5 12h14"></path>',
  plus: '<path d="M12 5v14M5 12h14"></path>',
  flame: '<path d="M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.5 1 2.5 2 3 0-3 0-5.5 1-8.5z"></path>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"></path>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"></path>',
  back: '<path d="M9 6h11v12H9l-6-6 6-6z"></path><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"></path>',
  hangup: '<path d="M3 15c5-4.5 13-4.5 18 0l-2.5 2.5-3.5-1.5v-2.5c-2-.7-4-.7-6 0V16l-3.5 1.5z"></path>'
};

function emIcon(name, size, stroke, sw) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke || 'currentColor'}" stroke-width="${sw || 1.8}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${EM_ICONS[name] || ''}</svg>`;
}

function emEsc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function emWeatherIcon(cond, h) {
  const night = h < 7 || h >= 19;
  const sun = '<circle cx="12" cy="12" r="4" stroke="#F2B544"></circle><path stroke="#F2B544" d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"></path>';
  const moon = '<path stroke="#A9B5FF" d="M19 14.5A7.5 7.5 0 0 1 9.5 5 7.5 7.5 0 1 0 19 14.5z"></path>';
  const cloud = (col) => `<path stroke="${col}" d="M7 18h10a4 4 0 0 0 .5-7.97A5.5 5.5 0 0 0 7 9.5 4.25 4.25 0 0 0 7 18z"></path>`;
  const small = (n) => (night ? '<path stroke="#A9B5FF" d="M11 6.5A3.5 3.5 0 0 1 6.5 2 3.5 3.5 0 1 0 11 6.5z"></path>' : '<circle cx="7" cy="7" r="2.6" stroke="#F2B544"></circle><path stroke="#F2B544" d="M7 1.8v1M1.8 7h1M3.3 3.3l.7.7M10.7 3.3l-.7.7"></path>');
  let body;
  switch (cond) {
    case 'sunny': body = night ? moon : sun; break;
    case 'clear-night': body = moon; break;
    case 'partlycloudy': body = small() + '<g transform="translate(3 3) scale(.85)">' + cloud('#C9CBD0') + '</g>'; break;
    case 'cloudy': case 'fog': body = cloud('#C9CBD0') + (cond === 'fog' ? '<path stroke="#8A8E97" d="M5 21h14"></path>' : ''); break;
    case 'rainy': case 'pouring': body = '<g transform="translate(0 -3)">' + cloud('#C9CBD0') + '</g><path stroke="#7FB0FF" d="M9 18.5l-1 2.5M13 18.5l-1 2.5' + (cond === 'pouring' ? 'M17 18.5l-1 2.5' : '') + '"></path>'; break;
    case 'snowy': case 'snowy-rainy': body = '<g transform="translate(0 -3)">' + cloud('#C9CBD0') + '</g><path stroke="#E8F0FF" d="M9 19.5h.01M13 21h.01M16 19.5h.01"></path>'; break;
    case 'lightning': case 'lightning-rainy': body = '<g transform="translate(0 -3)">' + cloud('#C9CBD0') + '</g><path stroke="#F2B544" d="M12.5 15.5l-2 3.5h3l-2 3.5"></path>'; break;
    case 'windy': case 'windy-variant': body = '<path stroke="#C9CBD0" d="M3 9h11a2.5 2.5 0 1 0-2.5-2.5M3 13h15a2.5 2.5 0 1 1-2.5 2.5M3 17h8"></path>'; break;
    default: body = cloud('#8A8E97');
  }
  return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
}

function emFr(n, d) {
  if (n == null || isNaN(n)) return '–';
  return Number(n).toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });
}

const EM_DEFAULT_CONFIG = {
  alarm: 'alarm_control_panel.alarmo',
  weather: 'weather.maison',
  outdoor_temperature: null,
  code_length: 4,
  idle_timeout: 60,
  sounds: true,
  accent: '#F2B544',
  moment: 'auto',
  doors: [],
  cameras: [],
  doorbell_camera: null,
  scenes: [],
  covers: [],
  thermostat: null,
  tempo: null,
  energy: [],
  call: null
};

class EcranMuralCard extends HTMLElement {
  static getStubConfig() {
    return { alarm: 'alarm_control_panel.alarmo', weather: 'weather.maison' };
  }

  setConfig(config) {
    if (!config) throw new Error('Configuration manquante');
    this._config = Object.assign({}, EM_DEFAULT_CONFIG, config);
    this._built = false;
    if (this._hass) this._build();
  }

  set hass(hass) {
    const first = !this._hass;
    this._hass = hass;
    if (!this._config) return;
    if (!this._built) this._build();
    this._update();
    if (first) this._initAsync();
  }

  get hass() { return this._hass; }

  getCardSize() { return 14; }

  connectedCallback() {
    this._last = Date.now();
    this._clock = setInterval(() => this._tickClock(), 5000);
    this._idleTimer = setInterval(() => this._checkIdle(), 3000);
    this._camTimer = setInterval(() => this._refreshCams(), 10000);
    this._onDown = () => { this._last = Date.now(); };
    window.addEventListener('pointerdown', this._onDown, true);
    if (this._ro && this._viewport) this._ro.observe(this._viewport);
    if (this._hass && this._built) this._initAsync();
  }

  disconnectedCallback() {
    clearInterval(this._clock);
    clearInterval(this._idleTimer);
    clearInterval(this._camTimer);
    clearInterval(this._energyTimer);
    clearTimeout(this._coverTimer);
    clearTimeout(this._beepTimer);
    this._beepState = null;
    window.removeEventListener('pointerdown', this._onDown, true);
    if (this._ro) this._ro.disconnect();
    this._unsubAll();
  }

  /* ------------------------------------------------------------------ */
  /* Construction                                                        */
  /* ------------------------------------------------------------------ */

  _build() {
    const c = this._config;
    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._state = this._state || {
      pad: false, code: '', padMode: 'armed_away', padError: '', cam: null, camRing: false,
      idle: false, call: null, period: 'month', scene: this._loadScene(), pulse: null
    };

    const doorsHTML = (c.doors || []).map((d, i) => `<span class="chip" data-ref="door${i}"><span class="dot"></span>${emEsc(d.name || d.entity)}</span>`).join('');

    const camsHTML = [0, 1].map((i) => {
      const cam = (c.cameras || [])[i];
      if (!cam) return '';
      return `<button class="cam press" data-act="cam" data-i="${i}" aria-label="Agrandir ${emEsc(cam.name)}">
        <img data-ref="camimg${i}" data-i="${i}" alt="" onload="this.style.display='block';this.nextElementSibling.style.display='none'" />
        <span class="cam-live" data-ref="camlive${i}"></span>
        <span class="cam-empty" data-ref="camempty${i}">${emIcon('video', 34, 'rgba(255,255,255,0.22)', 1.5)}<span>${emEsc(cam.empty || 'Caméra non connectée')}</span></span>
        <span class="cam-tag">${cam.live === false ? 'Dernière image' : '<span class="live"></span>Direct'}</span>
        <span class="cam-time" data-ref="camtime${i}"></span>
        <span class="cam-label"><b>${emEsc(cam.name)}</b><span>${emEsc(cam.sub || '')}</span></span>
      </button>`;
    }).join('');

    const scenesHTML = (c.scenes || []).slice(0, 3).map((s, i) => `<button class="scene press" data-act="scene" data-i="${i}" data-ref="scene${i}" aria-pressed="false">
        ${emIcon(s.icon || 'bulb', 26, 'currentColor', 1.7)}
        <span><b>${emEsc(s.name)}</b><span>${emEsc(s.sub || '')}</span></span>
      </button>`).join('');

    const coversHTML = (c.covers || []).slice(0, 5).map((g, i) => `<div class="cv">
        <div class="cv-pill" role="group" aria-label="Volets ${emEsc(g.name)}" data-ref="cvpill${i}">
          <span class="cv-sweep" data-ref="cvsweep${i}" aria-hidden="true"></span>
          <button class="cv-btn" data-act="cover" data-i="${i}" data-dir="up" data-ref="cvup${i}" aria-label="Ouvrir les volets ${emEsc(g.name)}">${emIcon('up', 22, 'currentColor', 2)}</button>
          <span class="cv-sep" aria-hidden="true"></span>
          <button class="cv-btn" data-act="cover" data-i="${i}" data-dir="down" data-ref="cvdown${i}" aria-label="Fermer les volets ${emEsc(g.name)}">${emIcon('down', 22, 'currentColor', 2)}</button>
        </div>
        <span class="cv-label" data-ref="cvlabel${i}" aria-live="polite">${emEsc(g.name)}</span>
      </div>`).join('');

    const energyHTML = (c.energy || []).slice(0, 3).map((e, i) => {
      const kind = e.kind || ['elec', 'gas', 'water'][i] || 'elec';
      const meta = { elec: ['bolt', '#F2B544', 'rgba(242,181,68,0.14)'], gas: ['flame', '#FF8A6E', 'rgba(255,138,110,0.14)'], water: ['drop', '#7FB0FF', 'rgba(127,176,255,0.14)'] }[kind] || ['bolt', '#F2B544', 'rgba(242,181,68,0.14)'];
      return `<div class="en-row">
        <span class="en-ico" style="background:${meta[2]};box-shadow:0 0 22px -8px ${meta[1]}">${emIcon(meta[0], 18, meta[1], 1.8)}</span>
        <span class="en-txt"><span class="en-name">${emEsc(e.name)}</span><span class="en-cost" data-ref="encost${i}">–</span><span class="en-vol" data-ref="envol${i}">non connecté</span></span>
        <span class="en-side"><span class="en-bars" data-ref="enbars${i}" data-color="${meta[1]}" aria-hidden="true"></span><span class="en-delta" data-ref="endelta${i}"></span></span>
      </div>`;
    }).join('') || '<p class="muted small">Ajoutez vos compteurs (électricité, gaz, eau) dans la configuration.</p>';

    const keysHTML = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'cancel', '0', 'back'].map((k) => {
      if (k === 'back') return `<button class="key key-ghost press" data-act="key" data-k="back" aria-label="Effacer le dernier chiffre">${emIcon('back', 30, 'currentColor', 1.6)}</button>`;
      if (k === 'cancel') return `<button class="key key-ghost key-small press" data-act="key" data-k="cancel">Annuler</button>`;
      return `<button class="key press" data-act="key" data-k="${k}">${k}</button>`;
    }).join('');

    const dots = Array.from({ length: c.code_length }, (_, i) => `<span class="pin-dot" data-ref="dot${i}"></span>`).join('');

    const callTargets = ((c.call && c.call.targets) || []).map((t, i) => `<button class="call-target press" data-act="calltarget" data-i="${i}">
        <span class="avatars"><span class="avatar" style="background:${t.color || '#F2B544'};box-shadow:0 0 30px -8px ${t.color || '#F2B544'}">${emEsc(t.initial || (t.name || '?')[0])}</span></span>
        <span><b>${emEsc(t.name)}</b><span>${emEsc(t.sub || 'iPhone')}</span></span>
      </button>`).join('') + (((c.call && c.call.targets) || []).length > 1 ? `<button class="call-target press" data-act="calltarget" data-i="all">
        <span class="avatars">${c.call.targets.map((t, j) => `<span class="avatar" style="background:${t.color || '#F2B544'};margin-left:${j ? '-18px' : '0'}">${emEsc(t.initial || t.name[0])}</span>`).join('')}</span>
        <span><b>Tout le monde</b><span>Le premier qui répond</span></span>
      </button>` : '');

    this.shadowRoot.innerHTML = `<style>${EM_CSS}</style>
<div class="viewport" data-ref="viewport">
 <div class="stage" data-ref="stage" style="--accent:${emEsc(c.accent)}">
  <div class="bg" aria-hidden="true">
    <div class="blob b1" data-ref="b1"></div><div class="blob b2" data-ref="b2"></div><div class="blob b3" data-ref="b3"></div>
    <div class="tint" data-ref="tint"></div>
  </div>

  <div class="grid">
    <div class="col">
      <section class="card clock">
        <div class="clock-head">
          <p class="muted" data-ref="date"></p>
          <div class="clock-btns">
            <button class="sq press" data-act="sleep" aria-label="Mettre en veille">${emIcon('moon', 19)}</button>
            ${c.call ? `<button class="sq sq-green press" data-act="call" aria-label="Appel visio">${emIcon('video', 20)}</button>` : ''}
          </div>
        </div>
        <p class="time" data-ref="time" aria-live="off"></p>
        <div class="outdoor">${emIcon('thermo', 17, '#F2B544')}<span class="outdoor-t" data-ref="outT">–</span><span class="muted small" data-ref="outF">Extérieur</span></div>
      </section>

      <section class="card weather">
        <div class="row-between"><h2 data-ref="wTitle">Aujourd’hui</h2><p class="small"><span class="warm" data-ref="wmax"></span>  <span class="cool" data-ref="wmin"></span></p></div>
        <div class="wicons" data-ref="wicons" aria-hidden="true"></div>
        <svg viewBox="0 0 248 108" width="100%" height="108" data-ref="wchart" role="img" aria-label="Température heure par heure"></svg>
        <div class="row-between"><h3>Précipitations</h3><p class="small cool" data-ref="rainTotal"></p></div>
        <div class="rain" data-ref="rain" role="img" aria-label="Précipitations heure par heure"></div>
        <div class="axis" data-ref="axis"></div>
      </section>

      <section class="card tempo">
        <div class="row-between"><h2>EDF Tempo</h2><p class="small faint">HC 22h – 6h</p></div>
        <div class="tempo-grid">
          <div class="tempo-tile" data-ref="tempo0"><p class="small muted">Aujourd’hui</p><p class="tempo-v"><span class="tdot"></span><span data-ref="tempo0v">–</span></p></div>
          <div class="tempo-tile" data-ref="tempo1"><p class="small muted">Demain</p><p class="tempo-v"><span class="tdot"></span><span data-ref="tempo1v">–</span></p></div>
        </div>
      </section>
    </div>

    <div class="col span2">
      <section class="card alarm">
        <button class="alarm-btn press" data-act="pad" data-ref="alarmBtn">
          <span class="ring" data-ref="alarmRing" aria-hidden="true"></span>
          ${emIcon('shield', 44, 'currentColor', 1.6)}
          <span class="alarm-action" data-ref="alarmAction">Armer</span>
        </button>
        <div class="alarm-info">
          <p class="eyebrow">Alarme</p>
          <h1 data-ref="alarmLabel">–</h1>
          <p class="muted" data-ref="alarmSub"></p>
          <div class="chips">${doorsHTML}</div>
        </div>
      </section>

      <div class="cams">${camsHTML || '<p class="muted small">Ajoutez vos caméras dans la configuration.</p>'}</div>

      <div class="scenes">${scenesHTML}</div>

      <section class="card covers">
        <div class="row-between"><h2>Volets</h2><p class="small faint">Haut : ouvrir · Bas : fermer</p></div>
        <div class="cv-grid" style="grid-template-columns:repeat(${Math.max(1, Math.min(5, (c.covers || []).length))},minmax(0,1fr))">${coversHTML}</div>
      </section>
    </div>

    <div class="col">
      <section class="card thermo">
        <div class="thermo-glow" data-ref="thermoGlow" aria-hidden="true"></div>
        <div class="row-between rel"><h2>${emEsc((c.thermostat && c.thermostat.name) || 'Thermostat')}</h2>
          <span class="chip-s" data-ref="thermoChip">${emIcon('flame', 13, 'currentColor', 2)}<span data-ref="thermoStatus">–</span></span></div>
        <div class="dial">
          <svg width="200" height="200" viewBox="0 0 200 200" aria-hidden="true">
            <path data-ref="ticks" stroke="rgba(255,255,255,0.14)" stroke-width="2" stroke-linecap="round"></path>
            <circle cx="100" cy="100" r="84" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="12" stroke-linecap="round" stroke-dasharray="395.84 527.79" transform="rotate(135 100 100)"></circle>
            <circle data-ref="arc" cx="100" cy="100" r="84" fill="none" stroke="var(--accent)" stroke-width="12" stroke-linecap="round" stroke-dasharray="0 527.79" transform="rotate(135 100 100)" class="arc"></circle>
            <circle data-ref="cur" cx="100" cy="100" r="7" fill="#F2F1EE" stroke="rgba(10,12,16,0.9)" stroke-width="3"></circle>
            <text x="22" y="186" class="svgt">15°</text><text x="178" y="186" class="svgt" text-anchor="end">28°</text>
          </svg>
          <div class="dial-center">
            <span class="small faint">Consigne</span>
            <span class="odo setp" data-ref="setp"></span>
            <span class="small muted" data-ref="curT">–</span>
          </div>
        </div>
        <div class="thermo-btns">
          <button class="tbtn tbtn-cool press" data-act="temp" data-d="-0.5" aria-label="Baisser la consigne">${emIcon('minus', 24, 'currentColor', 2.4)}</button>
          <button class="tbtn tbtn-hot press" data-act="temp" data-d="0.5" data-ref="tUp" aria-label="Augmenter la consigne">${emIcon('plus', 24, 'currentColor', 2.4)}</button>
        </div>
      </section>

      <section class="card energy">
        <div class="row-between"><h2>Consommations</h2>
          <div class="seg" role="group" aria-label="Période">
            <button data-act="period" data-p="month" data-ref="perMonth">Mois</button>
            <button data-act="period" data-p="year" data-ref="perYear">Année</button>
          </div></div>
        <div class="row-between"><p class="small faint" data-ref="enCaption">Depuis le 1er du mois</p><p class="en-total" data-ref="enTotal">–</p></div>
        <div class="en-list">${energyHTML}</div>
      </section>
    </div>
  </div>

  <div class="halo" data-ref="halo" aria-hidden="true"></div>

  <div class="overlay" data-ref="padOv" hidden>
    <div class="dialog pad" data-ref="padDialog" role="dialog" aria-modal="true" aria-label="Code alarme">
      <button class="xbtn press" data-act="closepad" aria-label="Fermer">${emIcon('close', 20, 'currentColor', 2)}</button>
      <div class="pad-left">
        <p class="eyebrow" data-ref="padEyebrow">Alarme</p>
        <h2 class="big" data-ref="padTitle">Armer la maison</h2>
        <p class="muted lg" data-ref="padSub"></p>
        <div class="modes" data-ref="padModes">
          <button class="mode press" data-act="mode" data-m="armed_away" data-ref="modeAway">Absent</button>
          <button class="mode press" data-act="mode" data-m="armed_night" data-ref="modeNight">Nuit</button>
        </div>
        <div class="pin" data-ref="pin" aria-live="polite">${dots}</div>
        <p class="pin-err" data-ref="padErr"></p>
      </div>
      <div class="keys" data-ref="keys">${keysHTML}</div>
      <div class="arm-choices" data-ref="armChoices" hidden>
        <button class="arm-tile arm-night press" data-act="mode" data-m="armed_night">
          <span class="arm-ico">${emIcon('moon', 56, 'currentColor', 1.6)}</span>
          <span class="arm-name">Nuit</span>
          <span class="arm-sub">Périmètre seulement</span>
        </button>
        <button class="arm-tile arm-away press" data-act="mode" data-m="armed_away">
          <span class="arm-ico">${emIcon('away', 56, 'currentColor', 1.6)}</span>
          <span class="arm-name">Absent</span>
          <span class="arm-sub">Toute la maison</span>
        </button>
      </div>
    </div>
  </div>

  <div class="overlay" data-ref="camOv" hidden>
    <div class="dialog camfull" role="dialog" aria-modal="true">
      <div class="camfull-media" data-ref="camMedia"></div>
      <div class="camfull-head">
        <span class="ringing" data-ref="camRing" hidden><span class="dot warm-bg"></span>On sonne à la porte</span>
        <p class="camfull-title" data-ref="camTitle"></p>
        <p class="muted" data-ref="camSub"></p>
      </div>
      <button class="xbtn xbtn-lg press" data-act="closecam" aria-label="Fermer">${emIcon('close', 22, 'currentColor', 2)}</button>
      <div class="camfull-actions">
        <button class="pill pill-ghost press" data-act="closecam">Retour</button>
      </div>
    </div>
  </div>

  <div class="overlay" data-ref="callOv" hidden>
    <div class="dialog callbox" role="dialog" aria-modal="true" aria-label="Appel visio">
      <button class="xbtn press" data-act="hangup" aria-label="Fermer">${emIcon('close', 20, 'currentColor', 2)}</button>
      <div data-ref="callPick">
        <p class="eyebrow">Appel visio</p>
        <h2 class="big">Qui appeler ?</h2>
        <p class="muted lg">Ça sonne sur l’iPhone, il suffit de répondre.</p>
        <div class="call-grid">${callTargets}</div>
      </div>
      <div class="call-live" data-ref="callLive" hidden>
        <div class="call-frame" data-ref="callFrame"></div>
        <div class="call-bar"><span class="muted" data-ref="callText"></span><button class="pill pill-red press" data-act="hangup">${emIcon('hangup', 22, 'currentColor', 1.8)}Raccrocher</button></div>
      </div>
    </div>
  </div>

  <button class="idle" data-ref="idleOv" data-act="wake" aria-label="Réveiller l’écran" hidden>
    <span class="idle-glow" data-ref="idleGlow" aria-hidden="true"></span>
    <span class="idle-in">
      <span class="idle-time" data-ref="idleTime"></span>
      <span class="idle-date" data-ref="idleDate"></span>
      <span class="idle-alarm" data-ref="idleAlarm"><span class="dot" data-ref="idleDot"></span><span data-ref="idleAlarmTxt"></span></span>
    </span>
  </button>

  <div class="toast" data-ref="toast" hidden></div>
 </div>
</div>`;

    this.$ = {};
    this.shadowRoot.querySelectorAll('[data-ref]').forEach((el) => { this.$[el.dataset.ref] = el; });
    this._viewport = this.$.viewport;
    this._timeOdo = new EmOdo(this.$.time);
    this._setOdo = new EmOdo(this.$.setp);

    if (!this._bound) {
      this.shadowRoot.addEventListener('click', (e) => this._onClick(e));
      this._bound = true;
    }
    if (this._ro) this._ro.disconnect();
    this._ro = new ResizeObserver(() => this._fit());
    this._ro.observe(this._viewport);

    [0, 1].forEach((i) => { const im = this.$['camimg' + i]; if (im) im.addEventListener('error', () => this._camFallback(i)); });
    this._buildTicks();
    this._built = true;
    this._tickClock();
  }

  _buildTicks() {
    const lo = 15, hi = 28, cx = 100, cy = 100;
    let d = '';
    for (let t = lo; t <= hi; t++) {
      const a = (135 + 270 * (t - lo) / (hi - lo)) * Math.PI / 180;
      const r1 = t % 5 === 0 ? 62 : 66, r2 = 71;
      d += `M${(cx + r1 * Math.cos(a)).toFixed(1)} ${(cy + r1 * Math.sin(a)).toFixed(1)}L${(cx + r2 * Math.cos(a)).toFixed(1)} ${(cy + r2 * Math.sin(a)).toFixed(1)}`;
    }
    this.$.ticks.setAttribute('d', d);
  }

  _isMobile() {
    const l = this._config.layout || 'auto';
    if (l === 'mobile') return true;
    if (l === 'wall') return false;
    return (this.clientWidth || window.innerWidth) < 760;
  }

  _fit() {
    const vp = this._viewport;
    if (!vp) return;
    const mobile = this._isMobile();
    if (vp.classList.contains('mobile') !== mobile) vp.classList.toggle('mobile', mobile);
    if (mobile) { this.$.stage.style.transform = 'none'; return; }
    const w = vp.clientWidth, h = vp.clientHeight;
    if (!w || !h) return;
    const s = Math.min(w / EM_W, h / EM_H);
    const x = (w - EM_W * s) / 2, y = (h - EM_H * s) / 2;
    this.$.stage.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
  }

  /* ------------------------------------------------------------------ */
  /* Abonnements asynchrones                                             */
  /* ------------------------------------------------------------------ */

  async _initAsync() {
    if (this._initDone || !this._hass || !this.isConnected) return;
    this._initDone = true;
    this._unsubs = [];
    const c = this._config;
    const conn = this._hass.connection;
    if (c.weather && this._hass.states[c.weather]) {
      try {
        const un = await conn.subscribeMessage((msg) => { this._forecast = msg.forecast || []; this._renderWeather(); },
          { type: 'weather/subscribe_forecast', forecast_type: 'hourly', entity_id: c.weather });
        this._unsubs.push(un);
      } catch (e) { this._forecast = []; this._renderWeather(); }
    }
    if (c.doorbell_camera) {
      try {
        const un = await conn.subscribeEvents((ev) => {
          const d = (ev.data && ev.data.data) || {};
          const push = String(d.push_type || ev.data.push_type || '');
          if (/NDB/i.test(push) && /incoming_call|rtc/i.test(push + (d.type || ''))) this._openCam(this._camIndex(c.doorbell_camera), true);
        }, 'netatmo_event');
        this._unsubs.push(un);
      } catch (e) { /* netatmo absent */ }
    }
    try {
      const un = await conn.subscribeEvents(() => { this._ringing = false; clearTimeout(this._ringTimer); if (this.$ && this.$.callText && !this.$.callOv.hidden) this.$.callText.textContent = 'En ligne'; }, 'ecran_mural_decroche');
      this._unsubs.push(un);
    } catch (e) { /* noop */ }
    this._loadWeatherHistory();
    this._loadEnergy();
    clearInterval(this._energyTimer);
    this._energyTimer = setInterval(() => this._loadEnergy(), 15 * 60 * 1000);
    this._refreshCams();
  }

  _unsubAll() {
    (this._unsubs || []).forEach((u) => { try { u(); } catch (e) { /* noop */ } });
    this._unsubs = [];
    this._initDone = false;
  }

  /* ------------------------------------------------------------------ */
  /* Mise à jour à chaque changement d'état                              */
  /* ------------------------------------------------------------------ */

  _st(id) { return id && this._hass ? this._hass.states[id] : undefined; }

  _update() {
    if (!this.$) return;
    this._updateMoment();
    this._updateAlarm();
    this._updateDoors();
    this._updateOutdoor();
    this._updateThermo();
    this._updateTempo();
    this._updateScenes();
    this._updateCams();
  }

  _moment() {
    const m = this._config.moment;
    if (m && m !== 'auto') return m;
    const h = new Date().getHours();
    return h < 6 || h >= 21 ? 'nuit' : h < 10 ? 'matin' : h < 18 ? 'jour' : 'soir';
  }

  _updateMoment() {
    const pal = {
      nuit: ['#05070E', 'rgba(242,150,60,0.20)', 'rgba(60,80,200,0.34)', 'rgba(120,70,190,0.18)'],
      matin: ['#0B0E15', 'rgba(255,165,120,0.28)', 'rgba(120,175,255,0.26)', 'rgba(255,210,150,0.14)'],
      jour: ['#0C1017', 'rgba(242,181,68,0.18)', 'rgba(100,170,255,0.34)', 'rgba(80,200,190,0.14)'],
      soir: ['#0A0910', 'rgba(255,120,70,0.30)', 'rgba(130,80,210,0.30)', 'rgba(242,181,68,0.16)']
    }[this._moment()];
    this.$.stage.style.background = pal[0];
    this.$.viewport.style.background = pal[0];
    this.$.b1.style.background = `radial-gradient(circle, ${pal[1]} 0%, transparent 62%)`;
    this.$.b2.style.background = `radial-gradient(circle, ${pal[2]} 0%, transparent 62%)`;
    this.$.b3.style.background = `radial-gradient(circle, ${pal[3]} 0%, transparent 65%)`;
    const sc = (this._config.scenes || [])[this._state.scene];
    const tint = sc && sc.tint ? sc.tint : 'transparent';
    this.$.tint.style.background = tint;
  }

  _alarmInfo() {
    const s = this._st(this._config.alarm);
    const state = s ? s.state : 'unavailable';
    const map = {
      disarmed: { label: 'Désarmée', sub: 'Appuyer pour armer', action: 'Armer', bg: 'rgba(61,214,140,0.12)', border: '#3DD68C', fg: '#3DD68C', glow: 'rgba(61,214,140,0.35)', title: '#F2F1EE', halo: null, ring: false },
      arming: { label: 'Armement…', sub: 'Vous pouvez sortir', action: 'Annuler', bg: 'rgba(242,181,68,0.16)', border: '#F2B544', fg: '#F2B544', glow: 'rgba(242,181,68,0.5)', title: '#F2B544', halo: 'rgba(242,181,68,0.22)', ring: true },
      armed_away: { label: 'Absent', sub: 'Délai d’entrée · sirène active', action: 'Désarmer', bg: '#FF6B4A', border: '#FF6B4A', fg: '#1A0B07', glow: 'rgba(255,107,74,0.75)', title: '#FF8A6E', halo: 'rgba(255,107,74,0.30)', ring: true },
      armed_night: { label: 'Nuit', sub: 'Périmètre protégé · intérieur libre', action: 'Désarmer', bg: '#8B9CFF', border: '#8B9CFF', fg: '#0D1030', glow: 'rgba(139,156,255,0.75)', title: '#A9B5FF', halo: 'rgba(139,156,255,0.28)', ring: true },
      armed_home: { label: 'Présence', sub: 'Périmètre protégé', action: 'Désarmer', bg: '#8B9CFF', border: '#8B9CFF', fg: '#0D1030', glow: 'rgba(139,156,255,0.75)', title: '#A9B5FF', halo: 'rgba(139,156,255,0.28)', ring: true },
      armed_vacation: { label: 'Vacances', sub: 'Maison protégée', action: 'Désarmer', bg: '#FF6B4A', border: '#FF6B4A', fg: '#1A0B07', glow: 'rgba(255,107,74,0.75)', title: '#FF8A6E', halo: 'rgba(255,107,74,0.30)', ring: true },
      pending: { label: 'Ouverture détectée', sub: 'Désarmez maintenant', action: 'Désarmer', bg: '#F2B544', border: '#F2B544', fg: '#1A1305', glow: 'rgba(242,181,68,0.85)', title: '#F2B544', halo: 'rgba(242,181,68,0.40)', ring: true },
      triggered: { label: 'ALARME', sub: 'Intrusion détectée', action: 'Désarmer', bg: '#E5484D', border: '#E5484D', fg: '#FFFFFF', glow: 'rgba(229,72,77,0.9)', title: '#FF6B6E', halo: 'rgba(229,72,77,0.50)', ring: true }
    };
    return Object.assign({ state }, map[state] || { label: 'Indisponible', sub: 'Alarmo ne répond pas', action: '–', bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.2)', fg: '#A3A6AD', glow: 'transparent', title: '#A3A6AD', halo: null, ring: false });
  }

  _updateAlarm() {
    const a = this._alarmInfo();
    const b = this.$.alarmBtn;
    b.style.background = a.bg;
    b.style.borderColor = a.border;
    b.style.color = a.fg;
    b.style.boxShadow = `0 0 70px -10px ${a.glow}, inset 0 1px 0 rgba(255,255,255,0.25)`;
    b.setAttribute('aria-label', `${a.action} l’alarme`);
    this.$.alarmRing.style.display = a.ring ? 'block' : 'none';
    this.$.alarmRing.style.borderColor = a.bg;
    this.$.alarmAction.textContent = a.action;
    this.$.alarmLabel.textContent = a.label;
    this.$.alarmLabel.style.color = a.title;
    this.$.alarmSub.textContent = a.state === 'disarmed' ? this._openSummary() : a.sub;
    this.$.halo.style.opacity = a.halo ? '1' : '0';
    if (a.halo) this.$.halo.style.boxShadow = `inset 0 0 180px 20px ${a.halo}`;
    this.$.halo.classList.toggle('fast', a.state === 'triggered' || a.state === 'pending');
    this.$.idleAlarmTxt.textContent = `Alarme · ${a.label}`;
    this.$.idleAlarm.style.color = a.title;
    this.$.idleDot.style.background = a.border;
    this.$.idleDot.style.boxShadow = `0 0 10px ${a.border}`;
    if (a.state === 'pending' && this._prevAlarm !== 'pending') { this._wake(); this._openPad(); }
    if (a.state === 'triggered' && this._prevAlarm !== 'triggered') { this._wake(); this._openPad(); }
    if (this._prevAlarm && this._prevAlarm !== a.state && this._state.pad && a.state === 'disarmed' && this._prevAlarm !== 'disarmed') this._closePad();
    this._beepFor(a.state);
    this._prevAlarm = a.state;
    if (this._state.pad && !this._submitting) this._renderPad();
  }

  _openSummary() {
    const doors = this._config.doors || [];
    const open = doors.filter((d) => { const s = this._st(d.entity); return s && s.state === 'on'; });
    if (!doors.length) return 'Appuyer pour armer';
    if (!open.length) return 'Toutes les ouvertures sont fermées';
    return `Ouvert : ${open.map((d) => d.name).join(', ')}`;
  }

  _updateDoors() {
    (this._config.doors || []).forEach((d, i) => {
      const el = this.$['door' + i];
      if (!el) return;
      const s = this._st(d.entity);
      const dot = el.querySelector('.dot');
      if (!s || s.state === 'unavailable' || s.state === 'unknown') { dot.style.background = '#6B6F78'; dot.style.boxShadow = 'none'; el.title = 'Indisponible'; return; }
      const open = s.state === 'on';
      const col = open ? '#FF6B4A' : '#3DD68C';
      dot.style.background = col;
      dot.style.boxShadow = `0 0 8px ${col}`;
      el.classList.toggle('chip-open', open);
      el.title = open ? 'Ouvert' : 'Fermé';
    });
  }

  _updateOutdoor() {
    const c = this._config;
    let t = null, feel = null;
    const os = this._st(c.outdoor_temperature);
    if (os && !isNaN(parseFloat(os.state))) t = parseFloat(os.state);
    const w = this._st(c.weather);
    if (w) {
      if (t == null && w.attributes.temperature != null) t = w.attributes.temperature;
      if (w.attributes.apparent_temperature != null) feel = w.attributes.apparent_temperature;
    }
    this.$.outT.textContent = t == null ? '–' : `${emFr(t, 1)}°`;
    this.$.outF.textContent = feel == null ? 'Extérieur' : `Extérieur · ressenti ${emFr(feel, 0)}°`;
  }

  _updateThermo() {
    const tc = this._config.thermostat;
    const s = tc ? this._st(tc.entity) : null;
    const lo = 15, hi = 28;
    const frac = (t) => Math.min(1, Math.max(0, (t - lo) / (hi - lo)));
    if (!s || s.state === 'unavailable') {
      this._setOdo.set('–');
      this.$.curT.textContent = tc ? 'Thermostat indisponible' : 'Netatmo non connecté';
      this.$.thermoStatus.textContent = 'Inactif';
      this.$.arc.setAttribute('stroke-dasharray', '0 527.79');
      this.$.cur.style.display = 'none';
      this.$.thermoGlow.style.opacity = '0';
      return;
    }
    const cur = parseFloat(s.attributes.current_temperature);
    if (this._pendingSetpoint != null && this._pendingSince && (Math.abs(parseFloat(s.attributes.temperature) - this._pendingSetpoint) < 0.05 || Date.now() - this._pendingSince > 180000)) { this._pendingSetpoint = null; this._pendingSince = null; }
    const sp = this._pendingSetpoint != null ? this._pendingSetpoint : parseFloat(s.attributes.temperature);
    const heating = s.attributes.hvac_action === 'heating' || (!isNaN(sp) && !isNaN(cur) && sp > cur + 0.2 && s.state !== 'off');
    this._setOdo.set(isNaN(sp) ? '–' : `${emFr(sp, 1)}°`);
    this.$.curT.textContent = isNaN(cur) ? '' : `Intérieur ${emFr(cur, 1)}°`;
    this.$.thermoStatus.textContent = s.state === 'off' ? 'Arrêt' : heating ? 'En chauffe' : 'Stable';
    this.$.thermoChip.classList.toggle('chip-warm', heating);
    this.$.thermoGlow.style.opacity = heating ? '1' : '0';
    this.$.tUp.classList.toggle('tbtn-warm', heating);
    this.$.arc.setAttribute('stroke-dasharray', `${(395.84 * frac(isNaN(sp) ? lo : sp)).toFixed(2)} 527.79`);
    if (!isNaN(cur)) {
      const a = (135 + 270 * frac(cur)) * Math.PI / 180;
      this.$.cur.style.display = '';
      this.$.cur.setAttribute('cx', (100 + 84 * Math.cos(a)).toFixed(1));
      this.$.cur.setAttribute('cy', (100 + 84 * Math.sin(a)).toFixed(1));
    } else this.$.cur.style.display = 'none';
  }

  _tempoColor(v) {
    const s = String(v || '').toLowerCase();
    if (/bleu|blue/.test(s)) return ['Bleu', 'rgba(76,128,255,0.12)', 'rgba(76,128,255,0.35)', '#A9C3FF', '#4C80FF'];
    if (/blanc|white/.test(s)) return ['Blanc', 'rgba(255,255,255,0.08)', 'rgba(255,255,255,0.30)', '#F2F1EE', '#F2F1EE'];
    if (/rouge|red/.test(s)) return ['Rouge', 'rgba(229,72,77,0.11)', 'rgba(229,72,77,0.35)', '#FF9EA1', '#E5484D'];
    return ['–', 'rgba(255,255,255,0.04)', 'rgba(255,255,255,0.10)', '#A3A6AD', '#6B6F78'];
  }

  _updateTempo() {
    const t = this._config.tempo || {};
    [t.today, t.tomorrow].forEach((id, i) => {
      const s = this._st(id);
      const c = this._tempoColor(s ? s.state : null);
      const tile = this.$['tempo' + i];
      tile.style.background = c[1];
      tile.style.borderColor = c[2];
      tile.style.color = c[3];
      tile.style.boxShadow = c[0] === '–' ? 'none' : `0 0 30px -12px ${c[4]}`;
      const dot = tile.querySelector('.tdot');
      dot.style.background = c[4];
      dot.style.boxShadow = c[0] === '–' ? 'none' : `0 0 10px ${c[4]}`;
      this.$['tempo' + i + 'v'].textContent = c[0];
    });
  }

  _updateScenes() {
    (this._config.scenes || []).slice(0, 3).forEach((s, i) => {
      const el = this.$['scene' + i];
      if (!el) return;
      const on = this._state.scene === i;
      el.classList.toggle('scene-on', on);
      el.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  _camIndex(entity) { return Math.max(0, (this._config.cameras || []).findIndex((c) => c.entity === entity)); }

  _updateCams() {
    (this._config.cameras || []).slice(0, 2).forEach((cam, i) => {
      const s = this._st(cam.entity);
      const img = this.$['camimg' + i];
      const empty = this.$['camempty' + i];
      if (!img) return;
      const ok = s && s.state !== 'unavailable' && s.attributes.entity_picture;
      if (!ok) { img.style.display = 'none'; empty.style.display = ''; }
      else if (!img.src) this._refreshCam(i);
    });
  }

  _refreshCams() { (this._config && this._config.cameras || []).slice(0, 2).forEach((_, i) => this._refreshCam(i)); }

  /* Image fixe indisponible (ex. Netatmo extérieure) : vignette en direct, coupée pendant la veille. */
  _camFallback(i) {
    const cam = (this._config.cameras || [])[i];
    const s = cam && this._st(cam.entity);
    const img = this.$['camimg' + i], empty = this.$['camempty' + i], live = this.$['camlive' + i];
    img.style.display = 'none';
    const canStream = cam.live_thumb && s && (s.attributes.supported_features & 2) && customElements.get('ha-camera-stream');
    if (!canStream) { empty.style.display = ''; empty.lastElementChild.textContent = 'Image indisponible · touchez pour le direct'; return; }
    this._liveThumb = this._liveThumb || {};
    this._liveThumb[i] = true;
    this._startLiveThumb(i);
  }

  _startLiveThumb(i) {
    const cam = (this._config.cameras || [])[i];
    const s = cam && this._st(cam.entity);
    const live = this.$['camlive' + i], empty = this.$['camempty' + i];
    if (!live || !s || this._state.idle) return;
    empty.style.display = 'none';
    if (live.firstChild) return;
    const st = document.createElement('ha-camera-stream');
    st.hass = this._hass; st.stateObj = s; st.muted = true; st.controls = false; st.className = 'stream';
    live.appendChild(st);
    empty.style.display = 'none';
    this.$['camtime' + i].textContent = '';
  }

  _stopLiveThumbs() { [0, 1].forEach((i) => { const l = this.$ && this.$['camlive' + i]; if (l) l.innerHTML = ''; }); }

  _refreshCam(i) {
    const cam = (this._config.cameras || [])[i];
    const s = cam && this._st(cam.entity);
    const img = this.$ && this.$['camimg' + i];
    if (this._liveThumb && this._liveThumb[i]) { this._startLiveThumb(i); return; }
    if (!img || !s || !s.attributes.entity_picture || this._state.idle) return;
    const url = s.attributes.entity_picture;
    img.src = `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`;
    const d = new Date();
    this.$['camtime' + i].textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  /* ------------------------------------------------------------------ */
  /* Horloge, météo, énergie                                             */
  /* ------------------------------------------------------------------ */

  _tickClock() {
    if (!this.$) return;
    const d = new Date();
    const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    let date = d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    date = date.charAt(0).toUpperCase() + date.slice(1);
    this._timeOdo.set(t);
    this.$.time.setAttribute('aria-label', t);
    this.$.date.textContent = date;
    this.$.idleTime.textContent = t;
    const out = this.$.outT.textContent;
    this.$.idleDate.textContent = out && out !== '–' ? `${date} · ${out} dehors` : date;
    if (this._lastHour !== d.getHours()) { this._lastHour = d.getHours(); if (this._hass) { this._updateMoment(); this._loadWeatherHistory(); } }
  }

  /* Fenêtre fixe 6h → minuit : aujourd'hui (demain à partir de 21h). Heures passées = historique, à venir = prévisions. */
  _weatherDay() {
    // Axe fixe : aujourd'hui, de 6h à minuit.
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  async _loadWeatherHistory() {
    const c = this._config;
    if (!c.weather || !this._hass) return;
    const now = new Date();
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 5);
    if (now <= start) { this._wHist = {}; return; }
    try {
      const r = await this._hass.callWS({ type: 'history/history_during_period', start_time: start.toISOString(), end_time: now.toISOString(), entity_ids: [c.weather], minimal_response: false, no_attributes: false, significant_changes_only: false });
      const list = (r && r[c.weather]) || [];
      const pts = list.map((x) => ({ t: (x.lu || x.lc || 0) * 1000, v: x.a && x.a.temperature != null ? Number(x.a.temperature) : null, c: x.s })).filter((x) => x.v != null);
      const out = {};
      const cond = {};
      for (let h = 6; h <= 24; h++) {
        const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h).getTime();
        if (t > now.getTime()) break;
        let v = null;
        let cc = null;
        pts.forEach((p) => { if (p.t <= t) { v = p.v; cc = p.c; } });
        if (v != null) out[t] = v;
        if (cc) cond[t] = cc;
      }
      this._wHist = out;
      this._wHistCond = cond;
    } catch (e) { this._wHist = this._wHist || {}; }
    this._renderWeather();
  }

  _renderWeather() {
    const svg = this.$.wchart;
    const day = this._weatherDay();
    const now = Date.now();
    const isToday = day.getDate() === new Date().getDate();
    this.$.wTitle.textContent = 'Aujourd’hui';
    const fcMap = {};
    (this._forecast || []).forEach((f) => { const t = new Date(f.datetime); t.setMinutes(0, 0, 0); fcMap[t.getTime()] = f; });
    const hist = this._wHist || {};
    const slots = [];
    for (let h = 6; h <= 24; h++) {
      const t = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h).getTime();
      const f = fcMap[t];
      const past = t + 3600000 <= now;
      let temp = f ? Number(f.temperature) : (hist[t] != null ? hist[t] : null);
      if (temp == null && !f && t <= now + 3600000) {
        const cur = this._st(this._config.weather);
        if (cur && t > now - 3600000) temp = Number(cur.attributes.temperature);
      }
      let cond = f ? f.condition : (this._wHistCond || {})[t];
      if (!cond && t <= now + 3600000 && t > now - 3600000) { const cur = this._st(this._config.weather); if (cur) cond = cur.state; }
      slots.push({ h, t, temp, cond, rain: f ? Number(f.precipitation || 0) : null, past: past && !f });
    }
    const known = slots.filter((x) => x.temp != null);
    if (known.length < 2) {
      svg.innerHTML = '<text x="124" y="58" class="svgt" text-anchor="middle">Prévisions indisponibles</text>';
      this.$.wicons.innerHTML = '';
      this.$.rain.innerHTML = '';
      this.$.axis.innerHTML = '';
      this.$.wmax.textContent = '';
      this.$.wmin.textContent = '';
      this.$.rainTotal.textContent = '';
      return;
    }
    const curSt = this._st(this._config.weather);
    const curT = curSt && curSt.attributes.temperature != null ? Number(curSt.attributes.temperature) : null;
    const temps = known.map((x) => x.temp).concat(isToday && curT != null ? [curT] : []);
    const tmin = Math.min(...temps), tmax = Math.max(...temps);
    const span = Math.max(1, tmax - tmin);
    const x0 = 10, x1 = 238, yT = 22, yB = 86, n = slots.length - 1;
    const X = (i) => x0 + i * (x1 - x0) / n;
    const Y = (v) => yT + (tmax - v) / span * (yB - yT);
    const idx = slots.map((x, i) => (x.temp != null ? i : -1)).filter((i) => i >= 0);
    const iMax = idx.find((i) => slots[i].temp === tmax), iMin = idx.find((i) => slots[i].temp === tmin);
    const nowX = isToday && now > slots[0].t && now < slots[n].t ? x0 + ((now - slots[0].t) / (slots[n].t - slots[0].t)) * (x1 - x0) : null;
    const nowTemp = nowX != null ? curT : null;
    const P = (i) => [X(i), Y(slots[i].temp)];
    const nowPt = nowX != null && nowTemp != null ? [nowX, Y(nowTemp)] : null;
    let pastPts = idx.filter((i) => slots[i].t <= now).map(P);
    let futPts = idx.filter((i) => slots[i].t > now).map(P);
    if (nowPt) { pastPts = pastPts.concat([nowPt]); futPts = [nowPt].concat(futPts); } else if (pastPts.length && futPts.length) futPts.unshift(pastPts[pastPts.length - 1]);
    const line = (arr) => arr.map((q) => `${q[0].toFixed(1)},${q[1].toFixed(1)}`).join(' ');
    svg.innerHTML = `${futPts.length > 1 ? `<polygon points="${line(futPts)} ${futPts[futPts.length - 1][0].toFixed(1)},96 ${futPts[0][0].toFixed(1)},96" fill="rgba(242,181,68,0.08)"></polygon>` : ''}
      ${pastPts.length > 1 ? `<polyline points="${line(pastPts)}" fill="none" stroke="rgba(242,181,68,0.45)" stroke-width="2" stroke-dasharray="3 4" stroke-linecap="round" stroke-linejoin="round"></polyline>` : ''}
      ${futPts.length > 1 ? `<polyline points="${line(futPts)}" fill="none" stroke="#F2B544" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></polyline>` : ''}
      ${nowX != null ? `<line x1="${nowX.toFixed(1)}" x2="${nowX.toFixed(1)}" y1="14" y2="96" stroke="rgba(255,255,255,0.22)" stroke-width="1" stroke-dasharray="2 3"></line>` : ''}
      ${nowPt ? `<circle cx="${nowPt[0].toFixed(1)}" cy="${nowPt[1].toFixed(1)}" r="8" fill="rgba(255,255,255,0.18)"></circle><circle cx="${nowPt[0].toFixed(1)}" cy="${nowPt[1].toFixed(1)}" r="4.5" fill="#F2F1EE"></circle>` : ''}
      <circle cx="${X(iMax).toFixed(1)}" cy="${Y(tmax).toFixed(1)}" r="4.5" fill="#F2B544"></circle>
      <text x="${X(iMax).toFixed(1)}" y="${(Y(tmax) - 9).toFixed(1)}" fill="#F2B544" class="svgt" text-anchor="middle">${emFr(tmax, 0)}°</text>
      <circle cx="${X(iMin).toFixed(1)}" cy="${Y(tmin).toFixed(1)}" r="4.5" fill="#7FB0FF"></circle>
      <text x="${X(iMin).toFixed(1)}" y="${(Y(tmin) + 18).toFixed(1)}" fill="#7FB0FF" class="svgt" text-anchor="middle">${emFr(tmin, 0)}°</text>`;
    svg.setAttribute('aria-label', `Température de 6 heures à minuit, maximum ${emFr(tmax, 0)} degrés, minimum ${emFr(tmin, 0)} degrés`);
    this.$.wmax.textContent = `↑ ${emFr(tmax, 0)}°`;
    this.$.wmin.textContent = `↓ ${emFr(tmin, 0)}°`;
    const bars = slots.slice(0, n);
    const rmax = Math.max(0.8, ...bars.map((x) => x.rain || 0));
    this.$.rain.innerHTML = bars.map((x) => {
      const v = x.rain;
      const bg = v == null ? 'rgba(255,255,255,0.04)' : v > 0 ? '#7FB0FF' : 'rgba(255,255,255,0.08)';
      return `<span style="height:${Math.max(3, Math.round((v || 0) / rmax * 56))}px;background:${bg}"></span>`;
    }).join('');
    const tot = bars.reduce((a, x) => a + (x.rain || 0), 0);
    this.$.rainTotal.textContent = `${emFr(tot, 1)} mm`;
    this.$.axis.innerHTML = ['6h', '12h', '18h', '24h'].map((l) => `<span>${l}</span>`).join('');
    this.$.wicons.innerHTML = slots.map((x, i) => (x.h % 2 === 0 && x.h < 24 && x.cond ? `<span style="left:${(X(i) / 248 * 100).toFixed(2)}%;opacity:${x.past ? 0.45 : 1}" title="${x.h}h">${emWeatherIcon(x.cond, x.h)}</span>` : '')).join('');
  }

  async _statChange(id, period) {
    const msg = { type: 'recorder/statistic_during_period', statistic_id: id, types: ['change'] };
    if (period.calendar) msg.calendar = period.calendar;
    if (period.fixed) msg.fixed_period = period.fixed;
    const r = await this._hass.callWS(msg);
    return r && r.change != null ? r.change : null;
  }

  async _loadEnergy() {
    const list = (this._config.energy || []).slice(0, 3);
    if (!list.length || !this._hass) { this._renderEnergy(); return; }
    const now = new Date();
    const lastYear = new Date(now); lastYear.setFullYear(now.getFullYear() - 1);
    const monthStartLY = new Date(lastYear.getFullYear(), lastYear.getMonth(), 1);
    const yearStartLY = new Date(lastYear.getFullYear(), 0, 1);
    const weekAgo = new Date(now); weekAgo.setDate(now.getDate() - 7); weekAgo.setHours(0, 0, 0, 0);
    const res = [];
    for (const e of list) {
      const stat = e.statistic || e.entity;
      const r = { month: null, year: null, monthLY: null, yearLY: null, days: [] };
      if (e.source === 'gazpar') {
        const a = (this._st(e.entity || 'sensor.gazpar') || {}).attributes || {};
        const kwh = (x) => (x && x.energy_kwh != null ? Number(x.energy_kwh) : null);
        const monthly = a.monthly || [], yearly = a.yearly || [], daily = a.daily || [];
        const pad = (n) => String(n).padStart(2, '0');
        const mKey = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
        const mKeyLY = `${now.getFullYear() - 1}-${pad(now.getMonth() + 1)}-01`;
        r.month = kwh(monthly.find((x) => x.start_date === mKey));
        r.year = kwh(yearly.find((x) => String(x.time_period) === String(now.getFullYear())));
        const ly = kwh(monthly.find((x) => x.start_date === mKeyLY));
        if (ly != null) r.monthLY = ly * now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const yly = kwh(yearly.find((x) => String(x.time_period) === String(now.getFullYear() - 1)));
        if (yly != null) r.yearLY = yly * ((now - new Date(now.getFullYear(), 0, 1)) / 31536000000);
        r.days = daily.slice(0, 7).map((x) => kwh(x) || 0).reverse();
      } else if (stat) {
        try {
          const rows = ((await this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: yearStartLY.toISOString(), statistic_ids: [stat], period: 'month', types: ['change'] })) || {})[stat] || [];
          const t0 = (x) => (typeof x.start === 'number' ? x.start : Date.parse(x.start));
          const firstInside = rows.length && t0(rows[0]) > yearStartLY.getTime() + 86400000;
          const clean = rows.map((x, j) => ({ t: t0(x), v: firstInside && j === 0 ? null : Number(x.change || 0) }));
          const yStart = new Date(now.getFullYear(), 0, 1).getTime();
          const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
          const cur = clean.find((x) => x.t === mStart);
          r.month = cur ? cur.v : 0;
          const yr = clean.filter((x) => x.t >= yStart && x.v != null);
          r.year = yr.length ? yr.reduce((acc, x) => acc + x.v, 0) : null;
          if (!firstInside) {
            try { r.monthLY = await this._statChange(stat, { fixed: { start_time: monthStartLY.toISOString(), end_time: lastYear.toISOString() } }); } catch (x) { /* noop */ }
            try { r.yearLY = await this._statChange(stat, { fixed: { start_time: yearStartLY.toISOString(), end_time: lastYear.toISOString() } }); } catch (x) { /* noop */ }
          }
        } catch (x) { /* noop */ }
        try {
          const d = await this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: weekAgo.toISOString(), statistic_ids: [stat], period: 'day', types: ['change'] });
          r.days = ((d && d[stat]) || []).map((x) => Number(x.change || 0)).slice(-7);
        } catch (x) { /* noop */ }
      }
      if (e.tempo && stat && e.source !== 'gazpar') {
        try { Object.assign(r, await this._tempoCost(stat, e.tempo, Number(e.price) || 0, Number(e.scale) || 1)); } catch (x) { /* noop */ }
      }
      const k = Number(e.scale) || 1;
      if (k !== 1) { ['month', 'year', 'monthLY', 'yearLY'].forEach((key) => { if (r[key] != null) r[key] *= k; }); r.days = r.days.map((x) => x * k); }
      res.push(r);
    }
    this._energy = res;
    this._renderEnergy();
  }

  /* Coût Tempo exact : chaque heure consommée × prix de la couleur du jour (6h→6h) et de la plage HP/HC. */
  async _tempoCost(stat, t, fallback, scale) {
    const now = new Date();
    const yStart = new Date(now.getFullYear(), 0, 1);
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const rows = ((await this._hass.callWS({ type: 'recorder/statistics_during_period', start_time: yStart.toISOString(), statistic_ids: [stat], period: 'hour', types: ['change'] })) || {})[stat] || [];
    const colors = {};
    if (t.calendar) {
      const evs = await this._hass.callApi('GET', `calendars/${t.calendar}?start=${encodeURIComponent(new Date(yStart.getTime() - 86400000).toISOString())}&end=${encodeURIComponent(new Date(now.getTime() + 86400000).toISOString())}`);
      (evs || []).forEach((ev) => {
        const sm = String(ev.summary || '');
        const c = /🔴|rouge|red/i.test(sm) ? 'rouge' : /⚪|blanc|white/i.test(sm) ? 'blanc' : /🔵|bleu|blue/i.test(sm) ? 'bleu' : null;
        const d = ev.start && (ev.start.date || String(ev.start.dateTime || ev.start).slice(0, 10));
        if (c && d) colors[d] = c;
      });
    }
    const hcStart = t.hc_start != null ? t.hc_start : 22, hcEnd = t.hc_end != null ? t.hc_end : 6;
    const pad = (n) => String(n).padStart(2, '0');
    let costYear = 0, costMonth = 0;
    const dayKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const perDay = {};
    rows.forEach((x) => { if (Number(x.change || 0)) { const k = dayKey(new Date(typeof x.start === 'number' ? x.start : Date.parse(x.start))); perDay[k] = (perDay[k] || 0) + 1; } });
    const hcShare = t.hc_share != null ? Number(t.hc_share) : 0.42;
    rows.forEach((x) => {
      const kwh = Number(x.change || 0) * scale;
      if (!kwh) return;
      const d = new Date(typeof x.start === 'number' ? x.start : Date.parse(x.start));
      if (perDay[dayKey(d)] <= 2) {
        // Donnée journalière (pas de détail horaire) : prix moyen HC/HP de la couleur du jour.
        const col = colors[dayKey(d)] || 'bleu';
        const pz = (t.prices && t.prices[col]) || [fallback, fallback];
        const c = kwh * (hcShare * Number(pz[0]) + (1 - hcShare) * Number(pz[1]));
        costYear += c;
        if (d >= mStart) costMonth += c;
        return;
      }
      const h = d.getHours();
      const tempoDay = new Date(d.getTime() - (h < 6 ? 86400000 : 0));
      const key = `${tempoDay.getFullYear()}-${pad(tempoDay.getMonth() + 1)}-${pad(tempoDay.getDate())}`;
      const col = colors[key] || 'bleu';
      const hc = hcStart > hcEnd ? (h >= hcStart || h < hcEnd) : (h >= hcStart && h < hcEnd);
      const pr = (t.prices && t.prices[col]) ? Number(t.prices[col][hc ? 0 : 1]) : fallback;
      const c = kwh * pr;
      costYear += c;
      if (d >= mStart) costMonth += c;
    });
    return rows.length ? { costMonth, costYear } : {};
  }

  _fixedShare(e, per) {
    const f = Number(e.fixed_month) || 0;
    if (!f) return 0;
    const now = new Date();
    if (per === 'month') return f * now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return f * 12 * (now - new Date(now.getFullYear(), 0, 1)) / (new Date(now.getFullYear() + 1, 0, 1) - new Date(now.getFullYear(), 0, 1));
  }

  _renderEnergy() {
    const list = (this._config.energy || []).slice(0, 3);
    const per = this._state.period;
    this.$.perMonth.classList.toggle('on', per === 'month');
    this.$.perYear.classList.toggle('on', per === 'year');
    this.$.perMonth.setAttribute('aria-pressed', per === 'month' ? 'true' : 'false');
    this.$.perYear.setAttribute('aria-pressed', per === 'year' ? 'true' : 'false');
    this.$.enCaption.textContent = per === 'month' ? 'Depuis le 1er du mois' : 'Depuis le 1er janvier';
    let total = 0, hasCost = false;
    list.forEach((e, i) => {
      const r = (this._energy || [])[i];
      const v = r ? (per === 'month' ? r.month : r.year) : null;
      const ly = r ? (per === 'month' ? r.monthLY : r.yearLY) : null;
      const unit = e.unit || (e.kind === 'water' ? 'm³' : 'kWh');
      const costEl = this.$['encost' + i], volEl = this.$['envol' + i], dEl = this.$['endelta' + i], barsEl = this.$['enbars' + i];
      if (v == null) { costEl.textContent = '–'; volEl.textContent = (e.statistic || e.entity) ? 'Pas encore de données' : 'Non connecté'; dEl.textContent = ''; dEl.style.display = 'none'; barsEl.innerHTML = ''; return; }
      const varCost = r && (per === 'month' ? r.costMonth : r.costYear) != null ? (per === 'month' ? r.costMonth : r.costYear) : (e.price != null ? v * Number(e.price) : null);
      const cost = varCost != null ? varCost + this._fixedShare(e, per) : null;
      if (cost != null) { total += cost; hasCost = true; }
      costEl.textContent = cost != null ? `${emFr(cost, cost < 100 ? 2 : 0)} €` : `${emFr(v, v < 100 ? 1 : 0)} ${unit}`;
      volEl.textContent = cost != null ? `${emFr(v, v < 100 ? 1 : 0)} ${unit}` : '';
      if (ly && ly > 0) {
        const pct = Math.round((v - ly) / ly * 100);
        const down = pct < 0;
        dEl.style.display = '';
        dEl.textContent = `${down ? '↓' : '↑'} ${Math.abs(pct)} % vs N-1`;
        dEl.style.background = down ? 'rgba(127,176,255,0.12)' : 'rgba(245,165,36,0.14)';
        dEl.style.color = down ? '#7FB0FF' : '#F5A524';
      } else { dEl.textContent = ''; dEl.style.display = 'none'; }
      const days = (r && r.days) || [];
      const mx = Math.max(0.0001, ...days);
      const col = barsEl.dataset.color;
      barsEl.innerHTML = days.map((x, j) => `<span style="height:${Math.max(3, Math.round(x / mx * 26))}px;background:${j === days.length - 1 ? col : 'rgba(255,255,255,0.16)'}"></span>`).join('');
    });
    this.$.enTotal.textContent = hasCost ? `${emFr(total, total < 100 ? 2 : 0)} €` : '';
  }

  /* ------------------------------------------------------------------ */
  /* Interactions                                                        */
  /* ------------------------------------------------------------------ */

  _onClick(e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    this._last = Date.now();
    const act = el.dataset.act;
    const i = el.dataset.i;
    switch (act) {
      case 'pad': this._openPad(); break;
      case 'closepad': this._closePad(); break;
      case 'mode':
        this._state.padMode = el.dataset.m;
        if (this._alarmInfo().state === 'disarmed' && !this._armNeedsCode()) { this._state.code = ''; this._submitCode(); } else this._renderPad();
        break;
      case 'key': this._key(el.dataset.k); break;
      case 'scene': this._scene(Number(i)); break;
      case 'cover': this._cover(Number(i), el.dataset.dir); break;
      case 'temp': this._temp(Number(el.dataset.d)); break;
      case 'period': this._state.period = el.dataset.p; this._renderEnergy(); break;
      case 'cam': this._openCam(Number(i), false); break;
      case 'closecam': this._closeCam(); break;
      case 'sleep': this._sleep(); break;
      case 'wake': this._wake(); break;
      case 'call': this._openCall(); break;
      case 'calltarget': this._startCall(i); break;
      case 'hangup': this._hangup(); break;
      default: break;
    }
  }

  _toast(msg) {
    const t = this.$.toast;
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => { t.hidden = true; }, 3500);
  }

  async _call(domain, service, data) {
    try {
      await this._hass.callService(domain, service, data);
      return true;
    } catch (err) {
      this._toast((err && err.message) || 'Commande refusée');
      return false;
    }
  }

  /* Alarme */
  _openPad() {
    this._state.pad = true;
    this._state.code = '';
    this._state.padError = '';
    this.$.padOv.hidden = false;
    this._renderPad();
  }

  _closePad() {
    this._state.pad = false;
    this._state.code = '';
    this.$.padOv.hidden = true;
  }

  _armNeedsCode() {
    if (this._config.code_to_arm === false) return false;
    const st = this._st(this._config.alarm);
    if (st && st.attributes.code_arm_required === false) return false;
    return true;
  }

  _renderPad() {
    const a = this._alarmInfo();
    const disarmed = a.state === 'disarmed';
    this.$.padEyebrow.textContent = a.state === 'triggered' ? 'Alarme déclenchée' : `Alarme · ${a.label}`;
    this.$.padTitle.textContent = disarmed ? 'Armer la maison' : (a.state === 'arming' ? 'Annuler l’armement' : 'Désarmer');
    const noCode = disarmed && !this._armNeedsCode();
    this.$.padSub.textContent = noCode ? 'Touchez un mode : l’alarme s’arme tout de suite.' : disarmed ? 'Choisissez le mode, puis saisissez votre code.' : `Saisissez votre code à ${this._config.code_length} chiffres.`;
    this.$.keys.hidden = noCode;
    this.$.armChoices.hidden = !noCode;
    this.$.padDialog.classList.toggle('pad-nocode', noCode);
    this.$.pin.style.display = noCode ? 'none' : '';
    this.$.padModes.style.display = disarmed && !noCode ? '' : 'none';
    this.$.modeAway.classList.toggle('on', this._state.padMode === 'armed_away');
    this.$.modeNight.classList.toggle('on', this._state.padMode === 'armed_night');
    for (let k = 0; k < this._config.code_length; k++) this.$['dot' + k].classList.toggle('on', k < this._state.code.length);
    this.$.padErr.textContent = this._state.padError;
  }

  _key(k) {
    const s = this._state;
    if (k === 'cancel') { this._closePad(); return; }
    if (k === 'back') { s.code = s.code.slice(0, -1); s.padError = ''; this._renderPad(); return; }
    if (s.code.length >= this._config.code_length) return;
    this._chime('tap');
    s.code += k;
    s.padError = '';
    this._renderPad();
    if (s.code.length === this._config.code_length) this._submitCode();
  }

  async _submitCode() {
    const s = this._state;
    const a = this._alarmInfo();
    const entity = this._config.alarm;
    const code = s.code;
    let service;
    if (a.state === 'disarmed') service = s.padMode === 'armed_night' ? 'alarm_arm_night' : 'alarm_arm_away';
    else service = 'alarm_disarm';
    try {
      const before = a.state;
      this._submitting = true;
      await this._hass.callService('alarm_control_panel', service, code ? { entity_id: entity, code } : { entity_id: entity });
      // Alarmo ne renvoie pas d'erreur sur un mauvais code : on vérifie que l'état change vraiment.
      const ok = await new Promise((resolve) => {
        const t0 = Date.now();
        const tick = () => {
          const st = this._st(entity);
          if (st && st.state !== before) return resolve(true);
          if (Date.now() - t0 > 2500) return resolve(false);
          setTimeout(tick, 150);
        };
        tick();
      });
      if (!ok) throw new Error('refused');
      this._chime(service === 'alarm_disarm' ? 'disarm' : 'arm');
      this._submitting = false;
      this._closePad();
    } catch (err) {
      this._submitting = false;
      this._chime('error');
      s.code = '';
      s.padError = code ? 'Code refusé par l’alarme, réessayez' : 'L’alarme ne s’est pas armée : une porte est peut-être ouverte';
      this._renderPad();
      this.$.pin.classList.remove('shake');
      void this.$.pin.offsetWidth;
      this.$.pin.classList.add('shake');
    }
  }

  /* Scènes */
  _scene(i) {
    const sc = (this._config.scenes || [])[i];
    if (!sc) return;
    const [domain, service] = String(sc.service || 'scene.turn_on').split('.');
    this._call(domain, service, Object.assign({}, sc.data || {}, sc.target ? { entity_id: sc.target } : {}));
    this._state.scene = i;
    try { localStorage.setItem('ecran-mural-scene', String(i)); } catch (e) { /* noop */ }
    this._updateScenes();
    this._updateMoment();
  }

  _loadScene() {
    try { const v = localStorage.getItem('ecran-mural-scene'); return v == null ? -1 : Number(v); } catch (e) { return -1; }
  }

  /* Volets */
  _cover(i, dir) {
    const g = (this._config.covers || [])[i];
    if (!g) return;
    const ents = [].concat(g.entities || g.entity || []);
    if (!ents.length) { this._toast(`Aucun volet associé à « ${g.name} »`); return; }
    this._chime('tap');
    this._call('cover', dir === 'up' ? 'open_cover' : 'close_cover', { entity_id: ents });
    this._pulseCover(i, dir);
  }

  _pulseCover(i, dir) {
    const prev = this._state.pulse;
    if (prev) this._resetCover(prev.i);
    this._state.pulse = { i, dir };
    const pill = this.$['cvpill' + i];
    const sweep = this.$['cvsweep' + i];
    const up = this.$['cvup' + i], down = this.$['cvdown' + i];
    const label = this.$['cvlabel' + i];
    pill.style.transform = `perspective(420px) rotateX(${dir === 'up' ? 9 : -9}deg)`;
    pill.style.borderColor = dir === 'up' ? 'rgba(242,181,68,0.45)' : 'rgba(127,176,255,0.45)';
    (dir === 'up' ? up : down).classList.add(dir === 'up' ? 'cv-on-up' : 'cv-on-down');
    sweep.className = `cv-sweep ${dir === 'up' ? 'sweep-up' : 'sweep-down'}`;
    label.textContent = dir === 'up' ? 'Ouverture' : 'Fermeture';
    label.style.color = dir === 'up' ? 'var(--accent)' : '#7FB0FF';
    clearTimeout(this._coverTimer);
    this._coverTimer = setTimeout(() => { this._resetCover(i); this._state.pulse = null; }, 2400);
  }

  _resetCover(i) {
    const g = (this._config.covers || [])[i];
    if (!g) return;
    this.$['cvpill' + i].style.transform = 'perspective(420px) rotateX(0deg)';
    this.$['cvpill' + i].style.borderColor = '';
    this.$['cvup' + i].classList.remove('cv-on-up');
    this.$['cvdown' + i].classList.remove('cv-on-down');
    this.$['cvsweep' + i].className = 'cv-sweep';
    this.$['cvlabel' + i].textContent = g.name;
    this.$['cvlabel' + i].style.color = '';
  }

  /* Thermostat */
  _temp(delta) {
    const tc = this._config.thermostat;
    const s = tc && this._st(tc.entity);
    if (!s || s.state === 'unavailable') { this._toast('Thermostat non connecté'); return; }
    const step = s.attributes.target_temp_step || 0.5;
    const base = this._pendingSetpoint != null ? this._pendingSetpoint : parseFloat(s.attributes.temperature);
    const min = s.attributes.min_temp != null ? s.attributes.min_temp : 7;
    const max = s.attributes.max_temp != null ? s.attributes.max_temp : 30;
    const next = Math.min(max, Math.max(min, Math.round((base + delta) / step) * step));
    this._pendingSetpoint = next;
    this._updateThermo();
    clearTimeout(this._tempTimer);
    this._tempTimer = setTimeout(async () => {
      await this._call('climate', 'set_temperature', { entity_id: tc.entity, temperature: next });
      this._pendingSince = Date.now();
    }, 900);
  }

  /* Caméras */
  _openCam(i, ringing) {
    const cam = (this._config.cameras || [])[i];
    if (!cam) return;
    const s = this._st(cam.entity);
    this._state.cam = i;
    this.$.camTitle.textContent = cam.name || '';
    this.$.camSub.textContent = cam.sub || '';
    this.$.camRing.hidden = !ringing;
    const media = this.$.camMedia;
    media.innerHTML = '';
    if (s && s.state !== 'unavailable') {
      // Direct vidéo seulement si la caméra le permet (la sonnette Netatmo n'a qu'une image fixe).
      if (customElements.get('ha-camera-stream') && cam.live !== false && (s.attributes.supported_features & 2)) {
        const st = document.createElement('ha-camera-stream');
        st.hass = this._hass;
        st.stateObj = s;
        st.muted = true;
        st.controls = false;
        st.className = 'stream';
        media.appendChild(st);
      } else {
        // Image entière (toute la hauteur), fond flouté de la même image pour remplir les côtés.
        const url = `${s.attributes.entity_picture}${s.attributes.entity_picture.includes('?') ? '&' : '?'}_=${Date.now()}`;
        media.innerHTML = `<div class="camfull-blur" style="background-image:url('${url}')"></div><img class="stream still" src="${url}" alt="">`;
        clearInterval(this._fullCamTimer);
        this._fullCamTimer = setInterval(() => {
          const im = media.querySelector('img.still');
          if (!im || this.$.camOv.hidden) { clearInterval(this._fullCamTimer); return; }
          const u2 = `${s.attributes.entity_picture}${s.attributes.entity_picture.includes('?') ? '&' : '?'}_=${Date.now()}`;
          const pre = new Image();
          pre.onload = () => { im.src = u2; const b = media.querySelector('.camfull-blur'); if (b) b.style.backgroundImage = `url('${u2}')`; };
          pre.src = u2;
        }, 3000);
      }
    } else {
      media.innerHTML = `<span class="cam-empty big-empty">${emIcon('video', 64, 'rgba(255,255,255,0.16)', 1.3)}<span>${emEsc(cam.empty || 'Caméra non connectée')}</span></span>`;
    }
    if (ringing) { this._wake(); this._chime('arm'); }
    this.$.camOv.hidden = false;
  }

  _closeCam() {
    clearInterval(this._fullCamTimer);
    this._state.cam = null;
    this.$.camMedia.innerHTML = '';
    this.$.camOv.hidden = true;
  }

  /* Visio */
  _openCall() {
    this.$.callPick.hidden = false;
    this.$.callLive.hidden = true;
    this.$.callOv.hidden = false;
  }

  async _startCall(which) {
    const call = this._config.call || {};
    const targets = which === 'all' ? (call.targets || []) : [(call.targets || [])[Number(which)]].filter(Boolean);
    if (!call.room) { this._toast('Aucune salle de visio configurée (call.room)'); return; }
    // Liens Jitsi : pas d'écran « Entrez votre nom », pas de renvoi vers l'appli, nom affiché pré-rempli.
    // VDO.Ninja : salle sans compte, s'intègre dans l'écran, démarre caméra + micro sans clic.
    const isVdo = /vdo\.ninja/.test(call.room);
    // Téléphone : caméra frontale (facingmode=user). Écran : premier périphérique trouvé.
    const vdo = (name, phone) => `${call.room}${call.room.includes('?') ? '&' : '?'}webcam&autostart&audiodevice=1&${phone ? 'facingmode=user' : 'videodevice=1&facingmode=user'}&label=${encodeURIComponent(name)}`;
    const direct = (name, phone) => isVdo ? vdo(name, phone) : `${call.room}#config.prejoinConfig.enabled=false&config.prejoinPageEnabled=false&config.disableDeepLinking=true&config.startWithAudioMuted=false&config.startWithVideoMuted=false&userInfo.displayName=${encodeURIComponent(JSON.stringify(name))}`;
    // Page relais https servie par Home Assistant (Nabu Casa) : allume micro et caméra à l'entrée.
    const base = call.relay ? await this._httpsBase() : null;
    const relayPath = call.relay_path || '/local/community/ecran-mural-ha/visio.html';
    const jitsi = (name, phone) => (base && call.relay ? `${base}${relayPath}?room=${encodeURIComponent(call.room)}&name=${encodeURIComponent(name)}` : direct(name, phone));
    this._callTargets = targets;
    // Sonnerie : la notification est renvoyée toutes les 4 s (son à chaque fois) jusqu'à la réponse, au raccroché ou 45 s.
    const critical = call.critical !== false;
    const hookBase = call.answer_webhook ? await this._httpsBase() : null;
    const ring = async (n) => {
      for (const t of targets) {
        if (!t.notify) continue;
        const [d, s] = t.notify.split('.');
        let link = jitsi(t.name || 'Invité', true);
        // Lien via la page relais de Home Assistant : elle signale « décroché » pour arrêter la sonnerie.
        if (hookBase && call.answer_webhook) link = `${hookBase}/local/community/ecran-mural-ha/repondre.html?hook=${encodeURIComponent(call.answer_webhook)}&to=${encodeURIComponent(link)}`;
        const push = critical ? { sound: { name: 'default', critical: 1, volume: Number(call.volume) || 0.8 }, 'interruption-level': 'critical' } : { sound: 'default', 'interruption-level': 'time-sensitive' };
        await this._call(d, s, { title: '📹 Appel visio', message: `${call.name || 'La maison'} vous appelle${n > 1 ? ' …' : ''}`, data: { url: link, clickAction: link, tag: 'ecran-visio', push, actions: [{ action: 'URI', title: 'Répondre', uri: link }] } });
      }
    };
    this._ringing = true;
    clearTimeout(this._ringTimer);
    let n = 0;
    const loop = async () => {
      if (!this._ringing) return;
      n += 1;
      await ring(n);
      if (n * 4 < (Number(call.ring_seconds) || 45)) this._ringTimer = setTimeout(loop, 4000);
      else this._ringing = false;
    };
    await loop();
    if (!this._onCallMsg) {
      // VDO.Ninja prévient la page quand quelqu'un rejoint : on arrête de sonner.
      this._onCallMsg = (ev) => {
        if (!/vdo\.ninja/.test(ev.origin || '')) return;
        const txt = typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data || {});
        if (/guest-connected|push-connection|new-view-connection|"connected"/i.test(txt)) { this._ringing = false; clearTimeout(this._ringTimer); }
      };
      window.addEventListener('message', this._onCallMsg);
    }
    this.$.callPick.hidden = true;
    this.$.callLive.hidden = false;
    this.$.callText.textContent = targets.length > 1 ? 'Ça sonne chez tout le monde · le premier qui répond' : `Ça sonne chez ${targets[0] ? targets[0].name : ''}`;
    if (window.isSecureContext) {
      this.$.callFrame.innerHTML = `<iframe src="${emEsc(jitsi(call.name || 'Maison'))}" allow="camera *; microphone *; fullscreen; display-capture; autoplay; screen-wake-lock" title="Appel visio"></iframe>`;
    } else {
      // Page en http : le navigateur bloque caméra et micro dans l'écran. On ouvre la salle (https) en plein écran à part.
      this.$.callFrame.innerHTML = '<div class="call-ext">La visio s’ouvre dans une fenêtre à part.<br>Revenez ici pour raccrocher.</div>';
      window.open(jitsi(call.name || 'Maison'), '_blank');
    }
  }

  async _httpsBase() {
    const call = this._config.call || {};
    if (call.relay_base) return String(call.relay_base).replace(/\/$/, '');
    if (location.protocol === 'https:') return location.origin;
    if (this._remoteBase !== undefined) return this._remoteBase;
    try {
      const st = await this._hass.callWS({ type: 'cloud/status' });
      this._remoteBase = st && st.remote_domain && st.remote_enabled !== false ? `https://${st.remote_domain}` : null;
    } catch (e) { this._remoteBase = null; }
    return this._remoteBase;
  }

  async _hangup() {
    this._ringing = false;
    clearTimeout(this._ringTimer);
    this.$.callFrame.innerHTML = '';
    this.$.callOv.hidden = true;
    for (const t of this._callTargets || []) {
      if (!t.notify) continue;
      const [d, s] = t.notify.split('.');
      try { await this._hass.callService(d, s, { message: 'clear_notification', data: { tag: 'ecran-visio' } }); } catch (e) { /* noop */ }
    }
    this._callTargets = [];
  }

  /* Veille */
  _checkIdle() {
    const timeout = Number(this._config && this._config.idle_timeout) || 0;
    if (!timeout || !this.$ || this._state.idle || this._isMobile()) return;
    if (this._state.pad || this._state.cam != null || !this.$.callOv.hidden) return;
    const a = this._alarmInfo();
    if (a.state === 'pending' || a.state === 'triggered') return;
    if (Date.now() - this._last > timeout * 1000) this._sleep();
  }

  _sleep() {
    this._state.idle = true;
    const glow = this._moment() === 'nuit' ? 'rgba(60,80,200,0.22)' : 'rgba(242,150,60,0.16)';
    this.$.idleGlow.style.background = `radial-gradient(circle, ${glow} 0%, transparent 60%)`;
    this.$.idleOv.hidden = false;
    this._stopLiveThumbs();
  }

  _wake() {
    this._last = Date.now();
    if (!this._state.idle) return;
    this._state.idle = false;
    this.$.idleOv.hidden = true;
    this._refreshCams();
  }

  /* Bips d'ambiance : délai d'entrée = 2 bips/s (plus rapides sur la fin), armement = 1 bip doux toutes les 2 s, alarme = sirène. */
  _beepFor(state) {
    if (this._beepState === state) return;
    this._beepState = state;
    clearTimeout(this._beepTimer);
    if (this._config.sounds === false || this._isMobile()) return;
    const st = this._st(this._config.alarm);
    const started = Date.now();
    const delay = st && st.attributes.delay ? Number(st.attributes.delay) * 1000 : 30000;
    const loop = () => {
      if (this._beepState !== state) return;
      let next = 1000;
      if (state === 'pending') {
        const left = delay - (Date.now() - started);
        this._tone([1760, 1760], 0.09, 0.12, 'square', 0.07);
        next = left < 10000 ? 500 : 1000;
      } else if (state === 'arming') {
        this._tone([1318], 0.12, 0, 'sine', 0.05);
        next = 2000;
      } else if (state === 'triggered') {
        this._tone([880, 1175, 880, 1175], 0.22, 0.02, 'sawtooth', 0.12);
        next = 1000;
      } else return;
      this._beepTimer = setTimeout(loop, next);
    };
    if (['pending', 'arming', 'triggered'].includes(state)) loop();
  }

  _tone(freqs, dur, gap, type, vol) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this._ctx || (this._ctx = new AC());
      if (ctx.state === 'suspended') ctx.resume();
      freqs.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        const t = ctx.currentTime + i * (dur + gap);
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
        g.gain.setValueAtTime(vol, t + dur - 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + dur + 0.02);
      });
    } catch (e) { /* noop */ }
  }

  /* Sons */
  _chime(kind) {
    if (this._config.sounds === false) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this._ctx || (this._ctx = new AC());
      const notes = kind === 'arm' ? [523.25, 783.99] : kind === 'disarm' ? [783.99, 523.25] : kind === 'tap' ? [1046.5] : [196, 174.6];
      notes.forEach((f, i) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        const t = ctx.currentTime + i * 0.13;
        o.type = kind === 'error' ? 'triangle' : 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(kind === 'tap' ? 0.03 : 0.12, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (kind === 'tap' ? 0.08 : 0.6));
        o.connect(g); g.connect(ctx.destination);
        o.start(t); o.stop(t + 0.7);
      });
    } catch (e) { /* noop */ }
  }
}

/* Compteur à rouleaux (odomètre) */
class EmOdo {
  constructor(el) { this.el = el; this.val = null; }
  set(str) {
    str = String(str);
    if (str === this.val) return;
    const same = this.val != null && this.val.length === str.length && [...str].every((ch, i) => /[0-9]/.test(ch) === /[0-9]/.test(this.val[i]));
    if (!same) {
      this.el.innerHTML = [...str].map((ch) => /[0-9]/.test(ch)
        ? `<span class="odo-d"><span class="odo-s">${EM_STRIP.map((n) => `<span>${n}</span>`).join('')}</span></span>`
        : `<span class="odo-c">${emEsc(ch)}</span>`).join('');
    }
    const strips = this.el.querySelectorAll('.odo-s');
    let k = 0;
    [...str].forEach((ch) => { if (/[0-9]/.test(ch)) { strips[k].style.transform = `translateY(${-parseInt(ch, 10)}em)`; k++; } });
    this.val = str;
  }
}

const EM_CSS = `
:host{display:block}
*{box-sizing:border-box}
button{font-family:inherit;cursor:pointer;-webkit-tap-highlight-color:transparent;color:inherit}
h1,h2,h3,p{margin:0}
.viewport{position:relative;width:100%;height:var(--ecran-mural-height,calc(100vh - var(--header-height,0px)));min-height:320px;overflow:hidden;background:#05070E;transition:background 2s ease}
.stage{position:absolute;left:0;top:0;width:1280px;height:800px;transform-origin:0 0;color:#F2F1EE;font-family:Geist,Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;overflow:hidden;transition:background 2s ease;--glass:rgba(255,255,255,0.045);--line:rgba(255,255,255,0.08)}
.bg{position:absolute;inset:0;pointer-events:none}
.blob{position:absolute;border-radius:50%;transition:background 2s ease}
.b1{width:1100px;height:1100px;left:-420px;top:220px;animation:drift 38s ease-in-out infinite}
.b2{width:1000px;height:1000px;right:-360px;top:-460px;animation:drift 46s ease-in-out infinite reverse}
.b3{width:700px;height:700px;right:120px;bottom:-420px}
.tint{position:absolute;inset:0;transition:background 1.2s ease}
.grid{position:relative;height:100%;padding:24px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}
.col{display:flex;flex-direction:column;gap:16px;min-height:0}
.span2{grid-column:span 2}
.card{border-radius:26px;padding:18px 20px;background:var(--glass);backdrop-filter:blur(28px) saturate(150%);-webkit-backdrop-filter:blur(28px) saturate(150%);border:1px solid var(--line);box-shadow:inset 0 1px 0 rgba(255,255,255,0.08),0 24px 48px -28px rgba(0,0,0,0.7);display:flex;flex-direction:column;gap:10px;min-height:0}
h2{font-size:15px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
h3{font-size:13px;font-weight:500;color:#A3A6AD}
.muted{color:#A3A6AD}.faint{color:#8A8E97;font-weight:400}.small{font-size:12px}.lg{font-size:17px}
.warm{color:#F2B544}.cool{color:#7FB0FF}.warm-bg{background:#F2B544}
.row-between{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.rel{position:relative}
.eyebrow{font-size:12px;letter-spacing:.16em;text-transform:uppercase;color:#8A8E97}
.press{transition:transform .5s cubic-bezier(.34,1.56,.64,1),background .4s ease,border-color .4s ease,box-shadow .5s ease,color .3s ease}
.press:active{transform:scale(.95);transition-duration:.08s}

.clock{padding:16px 16px 16px 24px;gap:2px}
.clock-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
.clock-head p{font-size:14px}
.clock-btns{display:flex;gap:8px}
.sq{width:44px;height:44px;border-radius:14px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.05);color:#C9CBD0;display:flex;align-items:center;justify-content:center;padding:0}
.sq-green{border-color:rgba(61,214,140,0.35);background:rgba(61,214,140,0.10);color:#3DD68C}
.time{margin-top:14px;font-size:100px;font-weight:200;letter-spacing:-0.06em;line-height:1;display:flex;font-variant-numeric:tabular-nums}
.odo-d{display:inline-block;height:1em;overflow:hidden;line-height:1em}
.odo-s{display:flex;flex-direction:column;transition:transform .9s cubic-bezier(.34,1.25,.64,1)}
.odo-s span{height:1em;line-height:1em}
.time .odo-c{opacity:.5}
.outdoor{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,0.07)}
.outdoor-t{font-size:20px;font-weight:300;letter-spacing:-0.02em;font-variant-numeric:tabular-nums}

.weather{flex:1}
.svgt{fill:#8A8E97;font-size:10px;font-family:"Geist Mono",ui-monospace,monospace}
.wicons{position:relative;height:20px;margin:2px 0 -4px}.wicons span{position:absolute;top:0;transform:translateX(-50%);display:flex}
.rain{display:flex;align-items:flex-end;gap:3px;height:56px}
.rain span{flex:1;border-radius:3px}
.axis{display:flex;justify-content:space-between;font-family:"Geist Mono",ui-monospace,monospace;font-size:10px;color:#8A8E97}

.tempo-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.tempo-tile{border-radius:16px;padding:12px 14px;border:1px solid;transition:all .6s ease}
.tempo-v{margin-top:2px;font-size:22px;font-weight:600;display:flex;align-items:center;gap:8px}
.tdot{width:9px;height:9px;border-radius:50%}

.alarm{height:208px;flex-direction:row;align-items:center;gap:28px;padding:20px 28px 20px 20px;border-radius:30px}
.alarm-btn{position:relative;flex:none;width:146px;height:146px;margin-left:11px;border-radius:50%;border:1.5px solid;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:0}
.alarm-action{font-size:19px;font-weight:600}
.ring{position:absolute;inset:-2px;border-radius:50%;border:2px solid;animation:ring 2.4s ease-out infinite}
.alarm-info{display:flex;flex-direction:column;gap:6px;min-width:0}
.alarm-info h1{font-size:52px;font-weight:300;letter-spacing:-0.045em;line-height:1.02;transition:color .6s ease}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.chip{display:inline-flex;align-items:center;gap:7px;padding:6px 11px;border-radius:999px;background:rgba(255,255,255,0.06);font-size:13px;color:#C9CBD0}
.chip-open{background:rgba(255,107,74,0.14);color:#FFB3A1}
.chip .dot,.dot{width:7px;height:7px;border-radius:50%;display:inline-block}

.cams{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
.cam{position:relative;height:166px;border-radius:24px;overflow:hidden;padding:0;text-align:left;background:rgba(8,10,14,0.55);border:1px solid var(--line);display:flex;align-items:center;justify-content:center}
.cam img{display:none;position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.cam-live{position:absolute;inset:0}.cam-live .stream{width:100%;height:100%;display:block;object-fit:cover;--video-max-height:100%}
.cam-empty{display:flex;flex-direction:column;align-items:center;gap:8px;font-size:12px;color:#8A8E97}
.cam-tag{position:absolute;top:12px;left:12px;display:inline-flex;align-items:center;gap:6px;padding:4px 9px;border-radius:999px;background:rgba(0,0,0,0.5);backdrop-filter:blur(8px);font-size:11px;font-weight:500;letter-spacing:.06em;text-transform:uppercase}
.live{width:6px;height:6px;border-radius:50%;background:#FF6B4A;animation:blink 1.6s ease-in-out infinite}
.cam-time{position:absolute;top:12px;right:14px;font-family:"Geist Mono",ui-monospace,monospace;font-size:11px;color:#C9CBD0;text-shadow:0 1px 4px rgba(0,0,0,.8)}
.cam-label{position:absolute;left:14px;bottom:12px;display:flex;flex-direction:column;text-shadow:0 1px 6px rgba(0,0,0,.8)}
.cam-label b{font-size:15px;font-weight:500}.cam-label span{font-size:12px;color:#C9CBD0}

.scenes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.scene{height:112px;border-radius:24px;padding:16px 18px;text-align:left;display:flex;flex-direction:column;justify-content:space-between;color:#A3A6AD;background:var(--glass);border:1px solid var(--line);box-shadow:inset 0 1px 0 rgba(255,255,255,0.07);backdrop-filter:blur(28px);-webkit-backdrop-filter:blur(28px)}
.scene b{display:block;font-size:16px;font-weight:500;color:#F2F1EE}.scene span span{display:block;font-size:12px;color:#A3A6AD;margin-top:2px}
.scene-on{background:rgba(242,181,68,0.14);border-color:rgba(242,181,68,0.55);box-shadow:0 0 46px -10px rgba(242,181,68,0.65),inset 0 1px 0 rgba(255,255,255,0.10);color:var(--accent)}

.covers{flex:1;padding:16px 18px 18px;gap:12px}
.cv-grid{flex:1;min-height:0;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:12px}
.cv{display:flex;flex-direction:column;gap:8px;min-height:0}
.cv-pill{position:relative;flex:1;min-height:0;border-radius:20px;overflow:hidden;display:flex;flex-direction:column;background:rgba(255,255,255,0.05);border:1px solid var(--line);box-shadow:inset 0 1px 0 rgba(255,255,255,0.08),0 12px 26px -16px rgba(0,0,0,0.85);transform:perspective(420px) rotateX(0deg);transition:transform .55s cubic-bezier(.34,1.56,.64,1),border-color .4s ease}
.cv-btn{position:relative;flex:1;min-height:44px;border:0;margin:0;padding:0;background:transparent;color:#C9CBD0;display:flex;align-items:center;justify-content:center;transition:background .4s ease,color .3s ease}
.cv-on-up{background:rgba(242,181,68,0.16);color:var(--accent)}.cv-on-up svg{animation:nudgeUp .6s ease-in-out 3}
.cv-on-down{background:rgba(127,176,255,0.16);color:#7FB0FF}.cv-on-down svg{animation:nudgeDown .6s ease-in-out 3}
.cv-sep{height:1px;margin:0 16px;background:rgba(255,255,255,0.10)}
.cv-sweep{position:absolute;inset:0;pointer-events:none;opacity:0}
.sweep-up{opacity:1;background:linear-gradient(to top,transparent 0%,rgba(242,181,68,0.30) 50%,transparent 100%);animation:sweepUp 1.1s cubic-bezier(.65,0,.35,1) 2}
.sweep-down{opacity:1;background:linear-gradient(to bottom,transparent 0%,rgba(127,176,255,0.30) 50%,transparent 100%);animation:sweepDown 1.1s cubic-bezier(.65,0,.35,1) 2}
.cv-label{text-align:center;font-size:14px;font-weight:500;white-space:nowrap;transition:color .3s ease}

.thermo{position:relative;overflow:hidden;padding:18px 20px 20px}
.thermo-glow{position:absolute;left:50%;top:150px;width:340px;height:340px;margin:-170px 0 0 -170px;border-radius:50%;background:radial-gradient(circle,rgba(242,181,68,0.38) 0%,transparent 60%);opacity:0;transition:opacity 1.4s ease;animation:breathe 4s ease-in-out infinite;pointer-events:none}
.chip-s{flex:none;white-space:nowrap;display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:12px;background:rgba(255,255,255,0.06);color:#A3A6AD;transition:all .6s ease}
.chip-warm{background:rgba(242,181,68,0.16);color:var(--accent)}
.dial{position:relative;width:200px;height:200px;align-self:center}
.arc{transition:stroke-dasharray .8s cubic-bezier(.34,1.3,.64,1);filter:drop-shadow(0 0 8px rgba(242,181,68,0.55))}
.dial-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;pointer-events:none}
.setp{font-size:50px;font-weight:200;letter-spacing:-0.05em;line-height:1;display:flex;font-variant-numeric:tabular-nums}
.setp .odo-s{transition:transform .7s cubic-bezier(.34,1.4,.64,1)}
.thermo-btns{position:relative;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:2px}
.tbtn{height:56px;border-radius:18px;padding:0;display:flex;align-items:center;justify-content:center;border:1px solid rgba(255,255,255,0.14);box-shadow:inset 0 1px 0 rgba(255,255,255,0.18),inset 0 -8px 16px rgba(0,0,0,0.18),0 14px 26px -14px rgba(0,0,0,0.9)}
.tbtn-cool{color:#9CC2FF;background:linear-gradient(180deg,rgba(127,176,255,0.20),rgba(127,176,255,0.06))}
.tbtn-hot{color:#FFD27A;background:linear-gradient(180deg,rgba(242,181,68,0.22),rgba(242,181,68,0.06))}
.tbtn-cool:active{box-shadow:0 0 28px -4px rgba(127,176,255,0.7),inset 0 1px 0 rgba(255,255,255,0.18)}
.tbtn-hot:active,.tbtn-warm{box-shadow:0 0 30px -4px rgba(242,181,68,0.65),inset 0 1px 0 rgba(255,255,255,0.2)}
.tbtn-warm{border-color:rgba(242,181,68,0.5)}

.energy{flex:1;padding:16px 18px}
.seg{display:flex;padding:3px;border-radius:999px;background:rgba(255,255,255,0.06)}
.seg button{border:0;padding:5px 11px;border-radius:999px;font-size:12px;background:transparent;color:#C9CBD0;transition:background .3s ease}
.seg button.on{background:#F2F1EE;color:#0B0C0E}
.en-total{font-size:20px;font-weight:300;letter-spacing:-0.03em;font-variant-numeric:tabular-nums}
.en-list{flex:1;display:flex;flex-direction:column;justify-content:space-between;gap:8px}
.en-row{display:flex;align-items:center;gap:12px}
.en-ico{flex:none;width:36px;height:36px;border-radius:12px;display:flex;align-items:center;justify-content:center}
.en-txt{flex:1;min-width:0;display:flex;flex-direction:column}
.en-name{font-size:12px;color:#A3A6AD}.en-cost{font-size:20px;letter-spacing:-0.02em;font-variant-numeric:tabular-nums}.en-vol{font-size:12px;color:#8A8E97;font-variant-numeric:tabular-nums}
.en-side{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.en-bars{display:flex;align-items:flex-end;gap:2px;height:26px}
.en-bars span{width:4px;border-radius:2px;transition:height .6s cubic-bezier(.34,1.4,.64,1)}
.en-delta{padding:2px 7px;border-radius:999px;font-size:11px;font-weight:500}

.halo{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 1.2s ease,box-shadow 1.2s ease;animation:breathe 3.6s ease-in-out infinite}
.halo.fast{animation-duration:1s}

.overlay{position:absolute;inset:0;z-index:20;background:rgba(6,7,9,0.5);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);display:flex;align-items:center;justify-content:center;animation:fadein .3s ease}
.overlay[hidden],[hidden]{display:none!important}
.dialog{position:relative;width:1024px;height:640px;border-radius:40px;padding:56px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);box-shadow:inset 0 1px 0 rgba(255,255,255,0.12);animation:rise .45s cubic-bezier(.2,.9,.25,1.05)}
.xbtn{position:absolute;top:24px;right:24px;width:48px;height:48px;border-radius:50%;border:1px solid rgba(255,255,255,0.12);background:rgba(255,255,255,0.04);display:flex;align-items:center;justify-content:center;padding:0;z-index:2}
.xbtn-lg{width:52px;height:52px}
.big{font-size:56px;font-weight:300;letter-spacing:-0.045em;line-height:1.02}
.pad{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:56px}
.pad-left{display:flex;flex-direction:column;justify-content:center;gap:14px}
.modes{display:flex;gap:10px;margin-top:8px}
.mode{padding:12px 20px;border-radius:999px;border:1px solid rgba(255,255,255,0.14);font-size:16px;font-weight:500;background:rgba(255,255,255,0.05)}
.mode.on{background:#F2F1EE;color:#0B0C0E}
.modes-big{flex-direction:column;gap:14px;margin-top:18px}.modes-big .mode{padding:22px 28px;font-size:22px;border-radius:24px;text-align:left;background:rgba(255,255,255,0.06);color:#F2F1EE}.modes-big .mode.on{background:rgba(255,255,255,0.06);color:#F2F1EE}
.pin{display:flex;gap:18px;margin-top:22px}
.pin.shake{animation:shake .4s ease}
.pin-dot{width:18px;height:18px;border-radius:50%;border:1.5px solid #F2F1EE;transition:background .15s ease,box-shadow .3s ease}
.pin-dot.on{background:#F2F1EE;box-shadow:0 0 14px rgba(255,255,255,0.6)}
.pin-err{min-height:22px;font-size:15px;color:#FF8A6E}
.pad-nocode{grid-template-columns:1fr;grid-template-rows:auto 1fr;gap:32px}.pad-nocode .pad-left{gap:10px}
.arm-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;align-self:stretch}
.arm-tile{border-radius:32px;padding:28px 20px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;border:1px solid;box-shadow:inset 0 1px 0 rgba(255,255,255,0.14),0 24px 40px -24px rgba(0,0,0,0.9)}
.arm-ico{width:112px;height:112px;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:10px}
.arm-name{font-size:30px;font-weight:400;letter-spacing:-0.02em;color:#F2F1EE}
.arm-sub{font-size:15px;color:#A3A6AD}
.arm-away{color:#FF8A6E;border-color:rgba(255,107,74,0.35);background:linear-gradient(180deg,rgba(255,107,74,0.16),rgba(255,107,74,0.04))}
.arm-away .arm-ico{background:radial-gradient(circle,rgba(255,107,74,0.28),rgba(255,107,74,0.06) 70%);box-shadow:0 0 50px -10px rgba(255,107,74,0.6)}
.arm-night{color:#A9B5FF;border-color:rgba(139,156,255,0.35);background:linear-gradient(180deg,rgba(139,156,255,0.16),rgba(139,156,255,0.04))}
.arm-night .arm-ico{background:radial-gradient(circle,rgba(139,156,255,0.28),rgba(139,156,255,0.06) 70%);box-shadow:0 0 50px -10px rgba(139,156,255,0.6)}
.keys{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;align-content:center}
.key{height:104px;border-radius:52px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.06);font-size:38px;font-weight:200;display:flex;align-items:center;justify-content:center;padding:0;box-shadow:inset 0 1px 0 rgba(255,255,255,0.06);font-variant-numeric:tabular-nums}
.key-ghost{background:transparent}.key-small{font-size:17px;font-weight:400}

.camfull{width:1232px;height:752px;padding:0;overflow:hidden;background:#07090C;border-radius:32px;animation:grow .55s cubic-bezier(.2,.9,.25,1.05)}
.camfull-media{position:absolute;inset:0;display:flex;align-items:center;justify-content:center}
.camfull-media .stream{position:relative;width:100%;height:100%;object-fit:contain;display:block;--video-max-height:100%}
.camfull-blur{position:absolute;inset:-40px;background-size:cover;background-position:center;filter:blur(40px) brightness(.45);transform:scale(1.1)}
.big-empty{font-size:15px}
.camfull-head{position:absolute;left:28px;top:24px;display:flex;flex-direction:column;gap:6px;text-shadow:0 1px 8px rgba(0,0,0,.8)}
.camfull-title{font-size:36px;font-weight:300;letter-spacing:-0.03em}
.ringing{align-self:flex-start;display:inline-flex;align-items:center;gap:8px;padding:6px 12px;border-radius:999px;background:rgba(242,181,68,0.16);color:#F2B544;font-size:14px;font-weight:500}
.ringing .dot{width:8px;height:8px;animation:blink 1s ease-in-out infinite}
.camfull-actions{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);display:flex;gap:12px}
.pill{height:56px;padding:0 26px;border-radius:999px;font-size:16px;font-weight:600;display:inline-flex;align-items:center;gap:10px}
.pill-ghost{border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.08);backdrop-filter:blur(12px)}
.pill-red{border:0;background:#D93A3F;color:#FFFFFF;box-shadow:0 0 40px -10px #D93A3F}

.callbox{display:flex;flex-direction:column;gap:20px}
.callbox > div{display:flex;flex-direction:column;gap:10px;height:100%}
.call-grid{flex:1;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-top:18px}
.call-target{border-radius:28px;padding:28px;border:1px solid rgba(255,255,255,0.10);background:rgba(255,255,255,0.05);text-align:left;display:flex;flex-direction:column;justify-content:space-between}
.call-target b{display:block;font-size:28px;font-weight:400;letter-spacing:-0.02em}.call-target span span{display:block;font-size:15px;color:#A3A6AD;margin-top:4px}
.avatars{display:flex}
.avatar{width:72px;height:72px;border-radius:50%;border:3px solid rgba(20,22,27,0.9);display:flex;align-items:center;justify-content:center;font-size:28px;font-weight:500;color:#0B0C0E}
.call-live{gap:14px}
.call-frame{flex:1;border-radius:24px;overflow:hidden;background:#000}
.call-ext{height:100%;display:flex;align-items:center;justify-content:center;text-align:center;font-size:20px;line-height:1.5;color:#A3A6AD}
.call-frame iframe{width:100%;height:100%;border:0}
.call-bar{display:flex;align-items:center;justify-content:space-between;gap:12px}

.idle{position:absolute;inset:0;z-index:30;border:0;padding:0;margin:0;width:1280px;height:800px;background:#020306;text-align:center;overflow:hidden;animation:fadein 1.2s ease;display:flex;align-items:center;justify-content:center}
.idle-glow{position:absolute;width:900px;height:900px;left:50%;top:50%;margin:-450px 0 0 -450px;border-radius:50%;animation:drift 30s ease-in-out infinite}
.idle-in{position:relative;display:flex;flex-direction:column;align-items:center;gap:10px}
.idle-time{font-size:220px;font-weight:100;letter-spacing:-0.07em;line-height:.9;font-variant-numeric:tabular-nums}
.idle-date{font-size:22px;font-weight:300;color:#A3A6AD}
.idle-alarm{margin-top:28px;display:inline-flex;align-items:center;gap:10px;padding:9px 16px;border-radius:999px;background:rgba(255,255,255,0.05);font-size:15px}
.idle-alarm .dot{width:8px;height:8px}

.toast{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);z-index:40;padding:12px 18px;border-radius:14px;background:rgba(20,22,27,0.92);border:1px solid rgba(255,255,255,0.12);font-size:14px;animation:rise .3s ease}

/* ---------- Téléphone : une colonne, défilement naturel ---------- */
.viewport.mobile{height:auto;min-height:100vh;overflow:visible}
.mobile .stage{position:relative;width:100%;height:auto;min-height:100vh;transform:none!important;overflow:hidden}
.mobile .bg{position:fixed}
.mobile .grid{display:flex;flex-direction:column;gap:12px;padding:12px 12px calc(24px + env(safe-area-inset-bottom));height:auto}
.mobile .col{display:contents}
.mobile .card{border-radius:22px;padding:16px}
.mobile .clock{order:0;padding:14px 16px}
.mobile .clock .time{font-size:56px;margin-top:6px}
.mobile .outdoor{margin-top:6px;padding-top:6px}
.mobile .alarm{order:1;height:auto;padding:16px;gap:16px}
.mobile .alarm-btn{width:104px;height:104px;margin-left:0}
.mobile .alarm-btn svg{width:34px;height:34px}
.mobile .alarm-action{font-size:16px}
.mobile .alarm-info h1{font-size:34px}
.mobile .chips{margin-top:6px}
.mobile .cams{order:2;grid-template-columns:1fr;gap:12px}
.mobile .cam{height:auto;aspect-ratio:16/10}
.mobile .scenes{order:3;gap:10px}
.mobile .scene{height:96px;padding:12px;border-radius:20px}
.mobile .scene b{font-size:14px}
.mobile .covers{order:4}
.mobile .cv-grid{gap:8px}
.mobile .cv-pill{min-height:124px;border-radius:18px}
.mobile .cv-label{font-size:12px}
.mobile .thermo{order:5}
.mobile .energy{order:6}
.mobile .weather{order:7}
.mobile .tempo{order:8}
.mobile .halo{position:fixed}
.mobile .overlay{position:fixed;padding:12px}
.mobile .dialog{width:100%;height:auto;max-height:calc(100vh - 24px);overflow:auto;padding:24px 20px;border-radius:28px}
.mobile .pad{grid-template-columns:1fr;gap:20px}
.mobile .big{font-size:34px}
.mobile .key{height:68px;font-size:30px}
.mobile .keys{gap:10px}
.mobile .arm-choices{gap:12px}
.mobile .arm-tile{padding:20px 12px;border-radius:24px}
.mobile .arm-ico{width:80px;height:80px}
.mobile .arm-name{font-size:22px}
.mobile .camfull{width:100%;height:calc(100vh - 24px);padding:0}
.mobile .camfull-title{font-size:24px}
.mobile .callbox{height:calc(100vh - 24px)}
.mobile .call-grid{grid-template-columns:1fr;gap:12px}
.mobile .call-target{padding:16px;flex-direction:row;align-items:center;gap:16px;justify-content:flex-start}
.mobile .avatar{width:52px;height:52px;font-size:20px}
.mobile .toast{position:fixed}

@keyframes ring{0%{transform:scale(1);opacity:.55}100%{transform:scale(1.32);opacity:0}}
@keyframes breathe{0%,100%{opacity:.65}50%{opacity:1}}
@keyframes blink{0%,100%{opacity:1}50%{opacity:.35}}
@keyframes rise{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}
@keyframes grow{from{opacity:0;transform:scale(.42)}to{opacity:1;transform:none}}
@keyframes drift{0%{transform:translate(0,0)}50%{transform:translate(60px,-40px)}100%{transform:translate(0,0)}}
@keyframes fadein{from{opacity:0}to{opacity:1}}
@keyframes shake{0%,100%{transform:none}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
@keyframes sweepUp{from{transform:translateY(110%)}to{transform:translateY(-110%)}}
@keyframes sweepDown{from{transform:translateY(-110%)}to{transform:translateY(110%)}}
@keyframes nudgeUp{0%,100%{transform:none}50%{transform:translateY(-5px)}}
@keyframes nudgeDown{0%,100%{transform:none}50%{transform:translateY(5px)}}
@media (prefers-reduced-motion: reduce){*{animation:none!important;transition:none!important}}
`;

if (!customElements.get('ecran-mural-card')) {
  customElements.define('ecran-mural-card', EcranMuralCard);
  window.customCards = window.customCards || [];
  window.customCards.push({ type: 'ecran-mural-card', name: 'Écran mural', description: 'Tableau de bord mural plein écran : alarme, caméras, scènes, volets, thermostat, météo, énergie.', preview: false });
  console.info(`%c ÉCRAN MURAL %c v${EM_VERSION} `, 'background:#F2B544;color:#1A1305;font-weight:700;border-radius:4px 0 0 4px;padding:2px 6px', 'background:#16181B;color:#F2F1EE;border-radius:0 4px 4px 0;padding:2px 6px');
}
