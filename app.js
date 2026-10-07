/* Cores da Fé: pintura por números com obras sacras */
(() => {
'use strict';

/* ---------------- armazenamento seguro ---------------- */
const store = {
  get(k, d = null) { try { const v = localStorage.getItem('cdf:' + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('cdf:' + k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem('cdf:' + k); } catch {} },
};

const $ = (s) => document.querySelector(s);
const ICONS = {
  music: '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/></svg>',
  musicOff: '<svg viewBox="0 0 24 24"><path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/><path d="M3 3l18 18"/></svg>',
  sun: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
  fit: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  more: '<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.3" fill="currentColor"/><circle cx="12" cy="12" r="1.3" fill="currentColor"/><circle cx="19" cy="12" r="1.3" fill="currentColor"/></svg>',
};

/* ---------------- configurações ---------------- */
const settings = Object.assign({ music: false, theme: null }, store.get('settings', {}));
function saveSettings() { store.set('settings', settings); }
function currentTheme() {
  if (settings.theme) return settings.theme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
function applyTheme() {
  const t = currentTheme();
  document.documentElement.dataset.theme = t;
  $('#g-theme').innerHTML = t === 'dark' ? ICONS.sun : ICONS.moon;
  $('#m-theme').textContent = t === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro';
  document.querySelector('meta[name=theme-color]').content = t === 'dark' ? '#141a26' : '#22324d';
  if (P.ready) { P.setThemeColors(); P.repaintAll(); }
}
function toggleTheme() { settings.theme = currentTheme() === 'dark' ? 'light' : 'dark'; saveSettings(); applyTheme(); }

/* ---------------- música suave (gerada no aparelho) ---------------- */
const Music = {
  ctx: null, master: null, timer: null, step: 0, next: 0,
  init() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.gain.value = 0;
    const rev = c.createConvolver();
    const len = c.sampleRate * 4.5, buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rev.buffer = buf;
    const wet = c.createGain(); wet.gain.value = 0.55;
    const dry = c.createGain(); dry.gain.value = 0.6;
    this.bus = c.createGain();
    this.bus.connect(dry).connect(this.master);
    this.bus.connect(rev).connect(wet).connect(this.master);
    this.master.connect(c.destination);
    return true;
  },
  // progressão em Ré maior: D, Bm, G, A / G, D, Em, A
  chords: [[50, 57, 62, 66], [47, 54, 62, 66], [43, 55, 59, 62], [45, 57, 61, 64], [43, 55, 59, 62], [50, 57, 62, 66], [40, 52, 59, 64], [45, 57, 61, 64]],
  hz(m) { return 440 * Math.pow(2, (m - 69) / 12); },
  pad(notes, t, dur) {
    const c = this.ctx;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 2.5); g.gain.setValueAtTime(0.09, t + dur - 1); g.gain.linearRampToValueAtTime(0, t + dur + 2.5);
    lp.connect(g).connect(this.bus);
    notes.forEach((m) => [-4, 4].forEach((det) => {
      const o = c.createOscillator(); o.type = 'triangle'; o.frequency.value = this.hz(m); o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + dur + 3);
    }));
  },
  bell(m, t) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.value = this.hz(m);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0005, t + 3.2);
    o.connect(g).connect(this.bus); o.start(t); o.stop(t + 3.3);
  },
  schedule() {
    const c = this.ctx, DUR = 7;
    while (this.next < c.currentTime + 2) {
      const ch = this.chords[this.step % this.chords.length];
      this.pad(ch, this.next, DUR);
      const tones = ch.slice(1).map((m) => m + 12);
      for (let b = 0; b < 4; b++) if (Math.random() < 0.65) this.bell(tones[Math.floor(Math.random() * tones.length)], this.next + b * 1.75 + Math.random() * 0.3);
      this.next += DUR; this.step++;
    }
  },
  play() {
    if (!this.ctx && !this.init()) return;
    this.ctx.resume();
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t); this.master.gain.setValueAtTime(this.master.gain.value, t); this.master.gain.linearRampToValueAtTime(0.8, t + 2);
    if (!this.timer) { this.next = t + 0.1; this.schedule(); this.timer = setInterval(() => this.schedule(), 500); }
  },
  stop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t); this.master.gain.setValueAtTime(this.master.gain.value, t); this.master.gain.linearRampToValueAtTime(0, t + 1);
    clearInterval(this.timer); this.timer = null;
    setTimeout(() => { if (!settings.music) this.ctx.suspend(); }, 1200);
  },
  pop() { // som discreto ao pintar
    if (!settings.music || !this.ctx) return;
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(880, t); o.frequency.exponentialRampToValueAtTime(1320, t + 0.08);
    g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.25);
    o.connect(g).connect(this.master); o.start(t); o.stop(t + 0.3);
  },
};
function refreshMusicButtons() {
  for (const id of ['#g-music', '#p-music']) { const b = $(id); b.innerHTML = settings.music ? ICONS.music : ICONS.musicOff; b.classList.toggle('on', settings.music); }
}
function toggleMusic() {
  settings.music = !settings.music; saveSettings(); refreshMusicButtons();
  settings.music ? Music.play() : Music.stop();
}
// navegadores só tocam som depois de um toque
document.addEventListener('pointerdown', () => { if (settings.music && (!Music.ctx || !Music.timer)) Music.play(); }, { once: false, passive: true });

/* ---------------- catálogo e progresso ---------------- */
let catalog = [];
let family = [];
const prog = {
  pct(slug) { return store.get('pct:' + slug, 0); },
  done(slug) { return store.get('done:' + slug, false); },
  thumb(slug) { return store.get('thumb:' + slug, null); },
};
function difficulty(n) { return n < 110 ? 'Fácil' : n < 200 ? 'Médio' : 'Mais detalhes'; }
function assetUrl(item, name) { return item.local ? item.urls[name] : `${item.slug}.${name}`; }
function dayIndex() { const d = new Date(); return Math.floor((d - d.getTimezoneOffset() * 60000) / 86400000); }

function thumbFor(item) {
  if (prog.done(item.slug)) return prog.thumb(item.slug) || assetUrl(item, 'color.webp');
  return prog.thumb(item.slug) || assetUrl(item, 'line.webp');
}
function statusChips(item) {
  const pct = prog.pct(item.slug);
  if (prog.done(item.slug)) return '<span class="chip done">Concluída ✓</span>';
  return `<span class="chip">${item.difficulty}</span>${pct > 0 ? `<span class="chip">${pct}%</span>` : ''}`;
}

function renderGallery() {
  const h = new Date().getHours();
  $('#greet').textContent = h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  const daily = catalog[dayIndex() % catalog.length];
  const dPct = prog.pct(daily.slug), dDone = prog.done(daily.slug);
  $('#daily').innerHTML = `
    <div class="d-img"><img src="${thumbFor(daily)}" alt=""></div>
    <div class="d-txt">
      <p class="kicker">Imagem do dia</p>
      <h2>${daily.title}</h2>
      <p class="artist">${daily.artist}</p>
      <div class="chips">${statusChips(daily)}</div>
      <button class="btn primary">${dDone ? 'Ver de novo' : dPct > 0 ? 'Continuar pintando' : 'Começar a pintar'}</button>
    </div>`;
  $('#daily').onclick = () => openPainter(daily);
  const fam = $('#family-grid'); fam.innerHTML = '';
  $('#family').hidden = family.length === 0;
  for (const item of family) fam.appendChild(makeCard(item));
  const grid = $('#grid'); grid.innerHTML = '';
  for (const item of catalog) grid.appendChild(makeCard(item));
}
function makeCard(item) {
  {
    const pct = prog.pct(item.slug);
    const b = document.createElement('button');
    b.className = 'card';
    b.innerHTML = `<div class="c-img"><img loading="lazy" src="${thumbFor(item)}" alt=""></div>
      <div class="c-txt"><h3>${item.title}</h3><div class="chips">${statusChips(item)}</div>
      ${pct > 0 && !prog.done(item.slug) ? `<div class="cbar"><i style="width:${pct}%"></i></div>` : ''}</div>`;
    b.onclick = () => openPainter(item);
    return b;
  }
}

function show(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
}

/* ---------------- motor de pintura ---------------- */
const P = {
  ready: false,
  item: null, W: 0, H: 0, R: 0,
  ids: null, colorOf: null, filled: null, start: null, pix: null, border: null, nbrs: null, bbox: null,
  lx: null, ly: null, rad: null, pal: [], pal32: null,
  selected: 0, remaining: null, remainingTotal: 0,
  art: document.createElement('canvas'), actx: null, img: null, buf: null,
  canvas: $('#screen'), ctx: null, dpr: 1, cw: 0, ch: 0,
  scale: 1, tx: 0, ty: 0, minScale: 0.1, maxScale: 8,
  flash: null, dirty: true,

  setThemeColors() {
    const dark = document.documentElement.dataset.theme === 'dark';
    const pack = (h) => { const n = parseInt(h.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; };
    this.PAPER = pack(dark ? '#2a2f3a' : '#fbf8f2');
    this.HI = pack(dark ? '#4a5266' : '#d6cdbd');
    this.LINE = pack(dark ? '#6b7385' : '#a39887');
    this.numColor = dark ? '#9aa1b2' : '#9a8f7f';
    this.numSel = dark ? '#ffffff' : '#2b2622';
    this.stageColor = getComputedStyle(document.documentElement).getPropertyValue('--stage').trim();
    if (this.pal.length) this.pal32 = Uint32Array.from(this.pal, pack);
  },

  async load(item) {
    this.ready = false;
    let data, blob;
    if (item.local) { data = item.data; blob = item.regionsBlob; }
    else {
      [data, blob] = await Promise.all([
        fetch(`${item.slug}.data.json`).then((r) => r.json()),
        fetch(`${item.slug}.regions.png`).then((r) => r.blob()),
      ]);
    }
    const W = this.W = data.w, H = this.H = data.h, N = W * H;
    // mapa de regiões: id = R + G*256 (lido sem conversão de cor)
    let bmp;
    try { bmp = await createImageBitmap(blob, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }); }
    catch { bmp = await createImageBitmap(blob); }
    const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
    const tctx = tmp.getContext('2d', { willReadFrequently: true });
    tctx.drawImage(bmp, 0, 0);
    const px = tctx.getImageData(0, 0, W, H).data;
    const ids = this.ids = new Uint16Array(N);
    for (let p = 0, i = 0; p < N; p++, i += 4) ids[p] = px[i] | (px[i + 1] << 8);
    tmp.width = tmp.height = 1;
    const R = this.R = data.color.length;
    for (let p = 0; p < N; p += 997) if (ids[p] >= R) throw new Error('mapa de regiões inválido');
    this.item = item;
    this.colorOf = Uint8Array.from(data.color);
    this.lx = data.lx; this.ly = data.ly; this.rad = data.r;
    this.pal = data.palette;
    this.setThemeColors();

    // listas de pixels por região, caixas e bordas
    const cnt = new Uint32Array(R + 1);
    for (let p = 0; p < N; p++) cnt[ids[p] + 1]++;
    for (let r = 0; r < R; r++) cnt[r + 1] += cnt[r];
    this.start = cnt.slice();
    const fillPos = cnt.slice(0, R);
    const pix = this.pix = new Uint32Array(N);
    const bbox = this.bbox = new Uint16Array(R * 4);
    for (let r = 0; r < R; r++) { bbox[r * 4] = 65535; bbox[r * 4 + 1] = 65535; }
    const border = this.border = new Uint8Array(N);
    const adj = Array.from({ length: R }, () => new Set());
    for (let y = 0, p = 0; y < H; y++) {
      for (let x = 0; x < W; x++, p++) {
        const r = ids[p];
        pix[fillPos[r]++] = p;
        const b = r * 4;
        if (x < bbox[b]) bbox[b] = x; if (y < bbox[b + 1]) bbox[b + 1] = y;
        if (x > bbox[b + 2]) bbox[b + 2] = x; if (y > bbox[b + 3]) bbox[b + 3] = y;
        if (x < W - 1) { const q = ids[p + 1]; if (q !== r) { border[p] |= 1; border[p + 1] |= 2; adj[r].add(q); adj[q].add(r); } }
        if (y < H - 1) { const q = ids[p + W]; if (q !== r) { border[p] |= 4; border[p + W] |= 8; adj[r].add(q); adj[q].add(r); } }
      }
    }
    this.nbrs = adj.map((s) => Array.from(s));

    // progresso salvo
    this.filled = new Uint8Array(R);
    const saved = store.get('prog:' + item.slug, null);
    if (saved) { try { const bin = atob(saved); for (let r = 0; r < R; r++) this.filled[r] = (bin.charCodeAt(r >> 3) >> (r & 7)) & 1; } catch {} }
    this.remaining = new Uint32Array(this.pal.length);
    this.remainingTotal = 0;
    for (let r = 0; r < R; r++) if (!this.filled[r]) { this.remaining[this.colorOf[r]]++; this.remainingTotal++; }
    this.selected = this.firstOpenColor(0);

    this.art.width = W; this.art.height = H;
    this.actx = this.art.getContext('2d');
    this.img = this.actx.createImageData(W, H);
    this.buf = new Uint32Array(this.img.data.buffer);
    this.repaintAll();
    this.ready = true;
  },

  firstOpenColor(from) {
    const K = this.pal.length;
    for (let i = 0; i < K; i++) { const c = (from + i) % K; if (this.remaining[c] > 0) return c; }
    return from;
  },

  paintRegion(r) {
    const { buf, ids, border, filled, W } = this;
    const f = filled[r], c = this.colorOf[r];
    const base = f ? this.pal32[c] : (c === this.selected ? this.HI : this.PAPER);
    const LINE = this.LINE;
    for (let i = this.start[r], e = this.start[r + 1]; i < e; i++) {
      const p = this.pix[i], b = border[p];
      if (b === 0) { buf[p] = base; continue; }
      let line = !f;
      if (!line) {
        if ((b & 1 && !filled[ids[p + 1]]) || (b & 2 && !filled[ids[p - 1]]) || (b & 4 && !filled[ids[p + W]]) || (b & 8 && !filled[ids[p - W]])) line = true;
      }
      buf[p] = line ? LINE : base;
    }
  },
  flushRegions(list) {
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (const r of list) {
      const b = r * 4;
      x0 = Math.min(x0, this.bbox[b]); y0 = Math.min(y0, this.bbox[b + 1]);
      x1 = Math.max(x1, this.bbox[b + 2]); y1 = Math.max(y1, this.bbox[b + 3]);
    }
    if (x1 >= 0) this.actx.putImageData(this.img, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
    this.dirty = true;
  },
  repaintAll() {
    for (let r = 0; r < this.R; r++) this.paintRegion(r);
    this.actx.putImageData(this.img, 0, 0);
    this.dirty = true;
  },
  repaintColor(c) {
    const list = [];
    for (let r = 0; r < this.R; r++) if (this.colorOf[r] === c && !this.filled[r]) { this.paintRegion(r); list.push(r); }
    if (list.length) this.flushRegions(list);
  },

  select(c) {
    if (c === this.selected) return;
    const old = this.selected; this.selected = c;
    this.repaintColor(old); this.repaintColor(c);
    renderPalette();
  },

  fill(r) {
    if (this.filled[r]) return;
    this.filled[r] = 1;
    const c = this.colorOf[r];
    this.remaining[c]--; this.remainingTotal--;
    const list = [r, ...this.nbrs[r]];
    for (const q of list) this.paintRegion(q);
    this.flushRegions(list);
    Music.pop();
    if (navigator.vibrate) try { navigator.vibrate(8); } catch {}
    scheduleSave();
    updateProgress();
    if (this.remaining[c] === 0) {
      const next = this.firstOpenColor(c + 1);
      if (this.remaining[next] > 0) { this.select(next); showToast(`Cor ${c + 1} completa!`); }
      else renderPalette();
    } else updatePaletteItem(c);
    if (this.remainingTotal === 0) setTimeout(finishPainting, 700);
  },

  /* ---- visualização ---- */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    this.cw = rect.width; this.ch = rect.height;
    this.canvas.width = Math.round(rect.width * this.dpr); this.canvas.height = Math.round(rect.height * this.dpr);
    this.ctx = this.canvas.getContext('2d');
    this.dirty = true;
  },
  fitScale() { return Math.min(this.cw / this.W, this.ch / this.H) * 0.94; },
  fit(animate) {
    const s = this.fitScale();
    this.minScale = s * 0.8; this.maxScale = Math.max(s * 12, 7);
    const target = { scale: s, tx: (this.cw - this.W * s) / 2, ty: (this.ch - this.H * s) / 2 };
    animate ? this.animateTo(target) : Object.assign(this, target);
    this.dirty = true;
  },
  clamp() {
    const m = 80;
    const w = this.W * this.scale, h = this.H * this.scale;
    this.tx = Math.min(Math.max(this.tx, m - w), this.cw - m);
    this.ty = Math.min(Math.max(this.ty, m - h), this.ch - m);
  },
  animateTo(t, ms = 450) {
    const from = { scale: this.scale, tx: this.tx, ty: this.ty }, t0 = performance.now();
    // interpola mantendo o ponto central coerente
    const step = (now) => {
      let k = Math.min(1, (now - t0) / ms); k = 1 - Math.pow(1 - k, 3);
      this.scale = from.scale + (t.scale - from.scale) * k;
      this.tx = from.tx + (t.tx - from.tx) * k;
      this.ty = from.ty + (t.ty - from.ty) * k;
      this.dirty = true;
      if (k < 1) this.anim = requestAnimationFrame(step); else this.anim = null;
    };
    cancelAnimationFrame(this.anim); this.anim = requestAnimationFrame(step);
  },
  draw() {
    if (!this.ready || !this.ctx) return;
    const { ctx, dpr } = this;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = this.stageColor; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(dpr * this.scale, 0, 0, dpr * this.scale, dpr * this.tx, dpr * this.ty);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.shadowColor = 'rgba(0,0,0,.18)'; ctx.shadowBlur = 12 / this.scale;
    ctx.drawImage(this.art, 0, 0);
    ctx.shadowBlur = 0;

    // números
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const s = this.scale, sel = this.selected;
    const vx0 = -this.tx / s, vy0 = -this.ty / s, vx1 = (this.cw - this.tx) / s, vy1 = (this.ch - this.ty) / s;
    let lastFont = '';
    for (let r = 0; r < this.R; r++) {
      if (this.filled[r]) continue;
      const x = this.lx[r], y = this.ly[r];
      if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
      const c = this.colorOf[r];
      const label = String(c + 1);
      const maxF = (this.rad[r] * s * 2) / (label.length > 1 ? 1.35 : 0.95);
      const fs = Math.min(maxF, 30);
      if (fs < (c === sel ? 8 : 10)) continue;
      const font = `${c === sel ? 800 : 700} ${fs.toFixed(0)}px Nunito, system-ui, sans-serif`;
      if (font !== lastFont) { ctx.font = font; lastFont = font; }
      ctx.fillStyle = c === sel ? this.numSel : this.numColor;
      ctx.fillText(label, x * s + this.tx, y * s + this.ty + fs * 0.04);
    }

    // destaque da dica
    if (this.flash) {
      const k = (performance.now() - this.flash.t0) / 1800;
      if (k >= 1) this.flash = null;
      else {
        const { x, y, rr } = this.flash;
        const rad = Math.max(rr * s, 18) + 10 + 8 * Math.sin(k * Math.PI * 6);
        ctx.lineWidth = 5; ctx.strokeStyle = `rgba(184,145,61,${1 - k})`;
        ctx.beginPath(); ctx.arc(x * s + this.tx, y * s + this.ty, rad, 0, Math.PI * 2); ctx.stroke();
        this.dirty = true;
      }
    }
  },

  regionAt(sx, sy) {
    const x = Math.floor((sx - this.tx) / this.scale), y = Math.floor((sy - this.ty) / this.scale);
    if (x < 0 || y < 0 || x >= this.W || y >= this.H) return -1;
    return this.ids[y * this.W + x];
  },
  // toque: área da cor do pincel pinta; área de outra cor troca o pincel para essa cor
  tapAt(sx, sy) {
    const r = this.regionAt(sx, sy);
    const want = this.selected;
    if (r >= 0 && !this.filled[r]) {
      if (this.colorOf[r] === want) return this.fill(r);
      const c = this.colorOf[r];
      this.select(c);
      showToast(`Cor ${c + 1} escolhida: toque de novo para pintar`);
      pulseSwatch(c);
      return;
    }
    // toque em área já pintada ou fora do desenho: procura perto uma área da cor do pincel
    const rad = Math.max(2, Math.round(14 / this.scale));
    const cx = Math.floor((sx - this.tx) / this.scale), cy = Math.floor((sy - this.ty) / this.scale);
    let best = -1, bd = 1e9;
    for (let dy = -rad; dy <= rad; dy++) {
      const y = cy + dy; if (y < 0 || y >= this.H) continue;
      for (let dx = -rad; dx <= rad; dx++) {
        const x = cx + dx; if (x < 0 || x >= this.W) continue;
        const q = this.ids[y * this.W + x];
        if (!this.filled[q] && this.colorOf[q] === want) { const d = dx * dx + dy * dy; if (d < bd && d <= rad * rad) { bd = d; best = q; } }
      }
    }
    if (best >= 0) this.fill(best);
  },

  hint() {
    const c = this.selected;
    if (this.remaining[c] === 0) return;
    const cx = (this.cw / 2 - this.tx) / this.scale, cy = (this.ch / 2 - this.ty) / this.scale;
    let best = -1, bd = 1e18;
    for (let r = 0; r < this.R; r++) {
      if (this.filled[r] || this.colorOf[r] !== c) continue;
      const d = (this.lx[r] - cx) ** 2 + (this.ly[r] - cy) ** 2;
      if (d < bd) { bd = d; best = r; }
    }
    if (best < 0) return;
    const x = this.lx[best], y = this.ly[best], rr = this.rad[best];
    const s = Math.min(this.maxScale, this.fitScale() * 5, Math.max(this.scale, 22 / Math.max(rr, 1)));
    this.animateTo({ scale: s, tx: this.cw / 2 - x * s, ty: this.ch / 2 - y * s });
    this.flash = { x, y, rr, t0: performance.now() + 300 };
  },

  bitsetString() {
    const n = Math.ceil(this.R / 8), a = new Uint8Array(n);
    for (let r = 0; r < this.R; r++) if (this.filled[r]) a[r >> 3] |= 1 << (r & 7);
    let s = ''; for (let i = 0; i < n; i++) s += String.fromCharCode(a[i]);
    return btoa(s);
  },
  thumbnail(maxW = 380) {
    const k = maxW / Math.max(this.W, this.H);
    const c = document.createElement('canvas'); c.width = Math.round(this.W * k); c.height = Math.round(this.H * k);
    const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(this.art, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.82);
  },
};
P.ctx = P.canvas.getContext('2d');
window.__cdf = P;

/* loop de desenho */
(function loop() { if (P.dirty && $('#painter').classList.contains('active')) { P.dirty = false; P.draw(); } requestAnimationFrame(loop); })();

/* ---------------- salvar ---------------- */
let saveTimer = null;
function saveNow() {
  clearTimeout(saveTimer); saveTimer = null;
  if (!P.ready || !P.item) return;
  const slug = P.item.slug;
  store.set('prog:' + slug, P.bitsetString());
  store.set('pct:' + slug, Math.floor(100 * (P.R - P.remainingTotal) / P.R));
  if (P.remainingTotal < P.R) store.set('thumb:' + slug, P.thumbnail());
}
function scheduleSave() { clearTimeout(saveTimer); saveTimer = setTimeout(saveNow, 800); }
document.addEventListener('visibilitychange', () => { if (document.hidden) saveNow(); });
window.addEventListener('pagehide', saveNow);

/* ---------------- paleta ---------------- */
function textOn(hex) { const n = parseInt(hex.slice(1), 16); const l = 0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255); return l > 150 ? '#2b2622' : '#ffffff'; }
let paletteTotals = [];
function renderPalette() {
  const nav = $('#palette'); nav.innerHTML = '';
  P.pal.forEach((hex, c) => {
    const b = document.createElement('button');
    b.className = 'sw'; b.dataset.c = c;
    b.setAttribute('aria-label', 'Cor ' + (c + 1));
    b.innerHTML = `<i class="ring"></i><i class="dot" style="background:${hex}"></i><span style="color:${textOn(hex)}"></span>`;
    b.onclick = () => { if (P.remaining[c] > 0) P.select(c); };
    nav.appendChild(b);
    updatePaletteItem(c);
  });
  const sel = nav.querySelector('.sel');
  if (sel) sel.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}
function updatePaletteItem(c) {
  const b = $('#palette').children[c]; if (!b) return;
  const total = paletteTotals[c] || 1, rem = P.remaining[c];
  b.style.setProperty('--p', Math.round(100 * (total - rem) / total));
  b.classList.toggle('sel', c === P.selected);
  b.classList.toggle('complete', rem === 0);
  b.querySelector('span').textContent = rem === 0 ? '✓' : c + 1;
}
function pulseSwatch(c) {
  const b = $('#palette').children[c]; if (!b) return;
  b.classList.remove('pulse'); void b.offsetWidth; b.classList.add('pulse');
  b.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
}
function updateProgress() { $('#p-bar').style.width = (100 * (P.R - P.remainingTotal) / P.R) + '%'; }

let toastTimer;
function showToast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 1800);
}

/* ---------------- abrir / fechar pintura ---------------- */
async function openPainter(item) {
  show('painter');
  $('#p-title').textContent = item.title;
  $('#loading').hidden = false;
  $('#palette').innerHTML = '';
  P.ready = false;
  P.resize();
  try {
    await P.load(item);
  } catch (e) {
    $('#loading').querySelector('p').textContent = 'Não foi possível abrir a imagem. Verifique a internet e tente de novo.';
    console.error(e); return;
  }
  paletteTotals = new Array(P.pal.length).fill(0);
  for (let r = 0; r < P.R; r++) paletteTotals[P.colorOf[r]]++;
  renderPalette(); updateProgress();
  P.resize(); P.fit(false);
  $('#loading').hidden = true;
  history.pushState({ painter: item.slug }, '');
  if (P.remainingTotal === 0) setTimeout(finishPainting, 300);
}
function closePainter(fromPop) {
  saveNow();
  P.ready = false;
  show('gallery'); renderGallery();
  if (!fromPop && history.state && history.state.painter) history.back();
}
window.addEventListener('popstate', () => {
  for (const m of document.querySelectorAll('.modal')) m.hidden = true;
  if ($('#painter').classList.contains('active')) closePainter(true);
});

function finishPainting() {
  const item = P.item;
  store.set('done:' + item.slug, true);
  store.set('pct:' + item.slug, 100);
  store.set('thumb:' + item.slug, P.thumbnail());
  const full = P.art.toDataURL('image/png');
  $('#done-painted').src = full;
  $('#done-original').src = assetUrl(item, 'original.jpg');
  $('#done-painted').classList.remove('hidden-img');
  $('#done-original').classList.add('hidden-img');
  $('#toggle-orig').textContent = item.local ? 'Ver a foto original' : 'Ver a pintura original';
  $('#toast').classList.remove('show');
  $('#done-title').textContent = item.title;
  $('#done-artist').textContent = item.artist;
  $('#done-ptitle').textContent = item.prayerTitle;
  $('#done-prayer').innerHTML = item.prayer.split('\n\n').map((p) => `<p>${p}</p>`).join('');
  $('#done-modal').hidden = false;
}
$('#toggle-orig').onclick = () => {
  const showingOrig = $('#done-painted').classList.toggle('hidden-img');
  $('#done-original').classList.toggle('hidden-img', !showingOrig);
  $('#toggle-orig').textContent = showingOrig ? 'Ver a minha pintura' : (P.item.local ? 'Ver a foto original' : 'Ver a pintura original');
};
$('#save-img').onclick = () => {
  P.art.toBlob((blob) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `cores-da-fe-${P.item.slug}.png`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    showToast('Imagem guardada');
  }, 'image/png');
};
$('#done-back').onclick = () => { $('#done-modal').hidden = true; closePainter(); };

/* ---------------- gestos ---------------- */
const pointers = new Map();
let gesture = null;
const cv = P.canvas;
function pos(e) { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; }
cv.addEventListener('pointerdown', (e) => {
  if (!P.ready) return;
  cv.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, pos(e));
  cancelAnimationFrame(P.anim);
  if (pointers.size === 1) {
    const p = pos(e);
    gesture = { type: 'tap', sx: p.x, sy: p.y, tx: P.tx, ty: P.ty, t0: performance.now() };
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    gesture = { type: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), s0: P.scale, wx: ((a.x + b.x) / 2 - P.tx) / P.scale, wy: ((a.y + b.y) / 2 - P.ty) / P.scale };
  }
});
cv.addEventListener('pointermove', (e) => {
  if (!pointers.has(e.pointerId) || !gesture) return;
  pointers.set(e.pointerId, pos(e));
  if (gesture.type === 'pinch' && pointers.size >= 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    const s = Math.min(P.maxScale, Math.max(P.minScale, gesture.s0 * d / gesture.d0));
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    P.scale = s; P.tx = mx - gesture.wx * s; P.ty = my - gesture.wy * s;
    P.clamp(); P.dirty = true;
  } else if (gesture.type === 'tap' || gesture.type === 'pan') {
    const p = pos(e);
    const dx = p.x - gesture.sx, dy = p.y - gesture.sy;
    if (gesture.type === 'tap' && Math.hypot(dx, dy) > 10) gesture.type = 'pan';
    if (gesture.type === 'pan') { P.tx = gesture.tx + dx; P.ty = gesture.ty + dy; P.clamp(); P.dirty = true; }
  }
});
function endPointer(e) {
  if (!pointers.has(e.pointerId)) return;
  pointers.delete(e.pointerId);
  if (gesture && gesture.type === 'tap' && pointers.size === 0 && e.type === 'pointerup') {
    if (performance.now() - gesture.t0 < 600) P.tapAt(gesture.sx, gesture.sy);
  }
  if (pointers.size === 1 && gesture && gesture.type === 'pinch') {
    const p = [...pointers.values()][0];
    gesture = { type: 'pan', sx: p.x, sy: p.y, tx: P.tx, ty: P.ty };
  } else if (pointers.size === 0) gesture = null;
}
cv.addEventListener('pointerup', endPointer);
cv.addEventListener('pointercancel', endPointer);
cv.addEventListener('wheel', (e) => {
  e.preventDefault(); if (!P.ready) return;
  const p = pos(e), k = Math.exp(-e.deltaY * 0.0015);
  const s = Math.min(P.maxScale, Math.max(P.minScale, P.scale * k));
  const wx = (p.x - P.tx) / P.scale, wy = (p.y - P.ty) / P.scale;
  P.scale = s; P.tx = p.x - wx * s; P.ty = p.y - wy * s; P.clamp(); P.dirty = true;
}, { passive: false });
window.addEventListener('resize', () => {
  if (!P.ready) return;
  const wasFit = Math.abs(P.scale - P.fitScale()) < 1e-3;
  P.resize();
  if (wasFit) P.fit(false); else { P.minScale = P.fitScale() * 0.8; P.clamp(); }
});

/* ---------------- botões ---------------- */
$('#hint').innerHTML = ICONS.search;
$('#fit').innerHTML = ICONS.fit;
$('#more').innerHTML = ICONS.more;
$('#hint').onclick = () => P.ready && P.hint();
$('#fit').onclick = () => P.ready && P.fit(true);
$('#back').onclick = () => closePainter();
$('#g-music').onclick = toggleMusic;
$('#p-music').onclick = toggleMusic;
$('#g-theme').onclick = toggleTheme;
$('#more').onclick = () => { $('#menu-modal').hidden = false; };
$('#m-close').onclick = () => { $('#menu-modal').hidden = true; };
$('#m-theme').onclick = () => { toggleTheme(); $('#menu-modal').hidden = true; };
$('#m-restart').onclick = () => { $('#menu-modal').hidden = true; $('#confirm-modal').hidden = false; };
$('#c-no').onclick = () => { $('#confirm-modal').hidden = true; };
$('#c-yes').onclick = () => {
  $('#confirm-modal').hidden = true;
  const slug = P.item.slug;
  ['prog:', 'pct:', 'thumb:', 'done:'].forEach((k) => store.del(k + slug));
  P.filled.fill(0);
  P.remaining.fill(0); P.remainingTotal = P.R;
  for (let r = 0; r < P.R; r++) P.remaining[P.colorOf[r]]++;
  P.selected = 0; P.repaintAll(); renderPalette(); updateProgress(); P.fit(true);
};
$('#about-btn').onclick = () => {
  $('#about-list').innerHTML = catalog.map((i) => `<li><strong>${i.title}</strong>, ${i.artist}</li>`).join('');
  $('#about-modal').hidden = false;
};
$('#about-close').onclick = () => { $('#about-modal').hidden = true; };
for (const m of document.querySelectorAll('.modal')) m.addEventListener('click', (e) => { if (e.target === m && m.id !== 'done-modal') m.hidden = true; });

/* ---------------- fotos da família (guardadas só no aparelho) ---------------- */
const DB = {
  open() {
    return new Promise((res, rej) => {
      const rq = indexedDB.open('coresdafe', 1);
      rq.onupgradeneeded = () => rq.result.createObjectStore('fotos', { keyPath: 'slug' });
      rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
    });
  },
  async all() {
    const db = await this.open();
    return new Promise((res, rej) => { const rq = db.transaction('fotos').objectStore('fotos').getAll(); rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error); });
  },
  async put(rec) {
    const db = await this.open();
    return new Promise((res, rej) => { const tx = db.transaction('fotos', 'readwrite'); tx.objectStore('fotos').put(rec); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  },
};
function b64ToBlob(b64, type) { const bin = atob(b64); const a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return new Blob([a], { type }); }
function b64urlToBytes(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const bin = atob(s); return Uint8Array.from(bin, (c) => c.charCodeAt(0)); }
function recordToItem(rec) {
  const regionsBlob = b64ToBlob(rec.regions, 'image/png');
  const urls = {
    'original.jpg': URL.createObjectURL(b64ToBlob(rec.original, 'image/jpeg')),
    'line.webp': URL.createObjectURL(b64ToBlob(rec.line, 'image/webp')),
    'color.webp': URL.createObjectURL(b64ToBlob(rec.color, 'image/webp')),
  };
  return { slug: rec.slug, title: rec.title, artist: rec.artist, prayerTitle: rec.prayerTitle, prayer: rec.prayer,
    local: true, data: rec.data, regionsBlob, urls, difficulty: difficulty(rec.data.color.length) };
}
// link no formato #foto=<id>.<chave>: baixa o arquivo cifrado e guarda no aparelho
async function importFromHash() {
  const m = location.hash.match(/^#foto=([a-z0-9]+)\.([A-Za-z0-9_-]+)$/);
  if (!m) return null;
  history.replaceState(null, '', location.pathname);
  const [, id, k] = m;
  const buf = new Uint8Array(await fetch(`f-${id}.dat`).then((r) => { if (!r.ok) throw new Error('arquivo'); return r.arrayBuffer(); }));
  const key = await crypto.subtle.importKey('raw', b64urlToBytes(k), 'AES-GCM', false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12));
  const rec = JSON.parse(new TextDecoder().decode(plain));
  await DB.put(rec);
  return rec.slug;
}

/* ---------------- início ---------------- */
async function boot() {
  applyTheme(); refreshMusicButtons();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (!settings.theme) applyTheme(); });
  catalog = await fetch('catalog.json').then((r) => r.json());
  for (const it of catalog) it.difficulty = difficulty(it.regions || 500);
  let newSlug = null;
  try { newSlug = await importFromHash(); } catch (e) { console.error(e); setTimeout(() => showToast('Não foi possível abrir a foto'), 300); }
  try { family = (await DB.all()).map(recordToItem); } catch (e) { family = []; }
  renderGallery();
  if (newSlug) { const it = family.find((f) => f.slug === newSlug); if (it) { showToast('Foto adicionada!'); document.querySelector('#family').scrollIntoView({ behavior: 'smooth' }); } }
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
})();
