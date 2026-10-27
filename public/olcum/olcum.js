'use strict';
/* TAKBIS Okuyucu - plandan alan olcumu (/alan-olcumu).
   Her sey tarayicida calisir; plan dosyasi sunucuya gonderilmez.
   Koordinatlar "belge birimi" cinsinden saklanir: PDF'te 1x olcekli sayfa noktasi,
   gorselde piksel. Ekran = belge * zoom + pan. Olcek her sayfa icin ayridir. */
(() => {
  const $ = (id) => document.getElementById(id);
  const stage = $('stage'), view = $('view'), vctx = view.getContext('2d');
  const loupe = $('loupe'), lctx = loupe.getContext('2d');

  const CATS = ['Net', 'Brüt', 'Balkon', 'Teras', 'Ortak alan', 'Diğer'];
  // Hukum renkleri (kirmizi/amber/yesil) kategori/sus olarak kullanilmaz (DESIGN.md); alan renkleri bu yuzden mavi-mor-kahve ailesinden.
  const COLORS = ['#2459c4', '#0a7f8f', '#b0367a', '#7a4f24', '#3d4fd6', '#00718a', '#8f3fa8', '#55657f', '#a24c1e', '#1f6f9e'];
  const SIGNAL = '#5B3D96'; // --numarator: tek etkilesim vurgusu
  const ROOMS = ['Salon', 'Oturma odası', 'Yatak odası', 'Ebeveyn yatak odası', 'Oda', 'Çocuk odası', 'Mutfak', 'Banyo', 'Ebeveyn banyosu', 'WC', 'Antre', 'Hol', 'Koridor', 'Balkon', 'Teras', 'Kiler', 'Depo', 'Giyinme odası', 'Çamaşır odası', 'Çatı arası', 'Bodrum', 'Brüt alan', 'Net alan'];
  const DRAW_TOOLS = ['calibrate', 'area', 'rect', 'line'];
  const MAX_BASE = 5000;

  const S = {
    file: null, pdf: null, page: null, img: null,
    pageCount: 1, pageIndex: 0, pages: {},
    base: null, baseScale: 1, docW: 0, docH: 0,
    hi: null, hiTask: null, hiTimer: 0, loadingPage: false,
    zoom: 1, fitZoom: 1, panX: 0, panY: 0,
    tool: 'select', draft: null, mouse: null, hover: null, snap: null,
    selected: null, hoverShape: null, hoverEdge: null, drag: null,
    space: false, opts: { edges: true, loupe: true },
    undo: [], redo: [], pendingCal: null,
  };

  /* ---------------- yardimcilar ---------------- */
  const nf2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const nfX = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
  const f2 = (n) => nf2.format(n);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function parseNum(str) {
    let s = String(str).trim().replace(/\s/g, '');
    if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }
  function signedArea(pts) {
    let a = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) a += (pts[j].x * pts[i].y) - (pts[i].x * pts[j].y);
    return a / 2;
  }
  const polyArea = (pts) => Math.abs(signedArea(pts));
  function pathLen(pts, closed) {
    let l = 0;
    for (let i = 1; i < pts.length; i++) l += dist(pts[i - 1], pts[i]);
    if (closed && pts.length > 2) l += dist(pts[pts.length - 1], pts[0]);
    return l;
  }
  function pointInPoly(p, pts) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i], b = pts[j];
      if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
    }
    return inside;
  }
  function segDist(p, a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy;
    let t = l2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2 : 0;
    t = clamp(t, 0, 1);
    const q = { x: a.x + t * dx, y: a.y + t * dy };
    return { d: dist(p, q), q };
  }
  function centroid(pts) {
    const A = signedArea(pts);
    if (Math.abs(A) < 1e-9) {
      const s = pts.reduce((o, p) => ({ x: o.x + p.x, y: o.y + p.y }), { x: 0, y: 0 });
      return { x: s.x / pts.length, y: s.y / pts.length };
    }
    let cx = 0, cy = 0;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const f = pts[j].x * pts[i].y - pts[i].x * pts[j].y;
      cx += (pts[j].x + pts[i].x) * f;
      cy += (pts[j].y + pts[i].y) * f;
    }
    return { x: cx / (6 * A), y: cy / (6 * A) };
  }
  // Ic bukey olmayan alanlarda etiket icin poligonun icinde kalan nokta
  function labelPoint(pts) {
    const c = centroid(pts);
    if (pointInPoly(c, pts)) return c;
    let minY = Infinity, maxY = -Infinity;
    pts.forEach((p) => { minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
    let best = c, bw = -1;
    for (let k = 1; k < 12; k++) {
      const y = minY + ((maxY - minY) * k) / 12;
      const xs = [];
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const a = pts[i], b = pts[j];
        if ((a.y > y) !== (b.y > y)) xs.push(a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y));
      }
      xs.sort((a, b) => a - b);
      for (let i = 0; i + 1 < xs.length; i += 2) {
        if (xs[i + 1] - xs[i] > bw) { bw = xs[i + 1] - xs[i]; best = { x: (xs[i] + xs[i + 1]) / 2, y }; }
      }
    }
    return best;
  }

  /* ---------------- sayfa durumu ve birimler ---------------- */
  function ps(i = S.pageIndex) {
    if (!S.pages[i]) S.pages[i] = { scale: null, shapes: [], seq: 0, lseq: 0 };
    return S.pages[i];
  }
  function mpuOf(p) {
    const sc = p && p.scale;
    if (!sc) return null;
    const d = dist(sc.a, sc.b);
    return d > 0 ? sc.meters / d : null;
  }
  const mpu = () => mpuOf(ps());
  function shapeArea(sh, m = mpu()) { return m ? polyArea(sh.pts) * m * m : null; }
  function shapeLen(sh, m = mpu()) { return m ? pathLen(sh.pts, sh.kind === 'area') * m : null; }
  const findShape = (id) => ps().shapes.find((s) => s.id === id);

  /* ---------------- gecmis + otomatik kayit ---------------- */
  function snapshot() {
    S.undo.push(JSON.stringify({ i: S.pageIndex, pages: S.pages }));
    if (S.undo.length > 300) S.undo.shift();
    S.redo = [];
    syncUndoButtons();
  }
  function restore(from, to) {
    if (!from.length) return;
    to.push(JSON.stringify({ i: S.pageIndex, pages: S.pages }));
    const st = JSON.parse(from.pop());
    S.pages = st.pages;
    S.draft = null;
    if (S.selected && !findShape(S.selected)) S.selected = null;
    if (st.i !== S.pageIndex && S.file) showPage(st.i);
    changed(false);
  }
  const undo = () => restore(S.undo, S.redo);
  const redo = () => restore(S.redo, S.undo);
  function syncUndoButtons() {
    $('btnUndo').disabled = !S.undo.length;
    $('btnRedo').disabled = !S.redo.length;
  }
  const storeKey = () => S.file && `takbis_olcum:${S.file.name}:${S.file.size}`;
  let saveTimer = 0;
  function autosave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { if (storeKey()) localStorage.setItem(storeKey(), JSON.stringify(S.pages)); } catch (e) { /* depolama yoksa sessiz gec */ }
    }, 300);
  }
  function changed(save = true) {
    if (save) autosave();
    renderPanel();
    syncUndoButtons();
    invalidate();
  }

  /* ---------------- dosya acma ---------------- */
  let workerReady = null;
  function ensurePdfjs() {
    if (workerReady) return workerReady;
    if (location.protocol === 'file:') {
      // file:// altinda Worker acilamiyor; pdf.js ana is parcaciginda calisir
      workerReady = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = '/olcum/pdf.worker.min.js';
        s.onload = res; s.onerror = () => rej(new Error('pdf.worker yüklenemedi'));
        document.head.appendChild(s);
      });
    } else {
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/olcum/pdf.worker.min.js';
      workerReady = Promise.resolve();
    }
    return workerReady;
  }

  function isPdf(file, bytes) {
    return file.type === 'application/pdf' || /\.pdf$/i.test(file.name) ||
      (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46);
  }

  async function openFile(file, pages) {
    if (/\.(olcum|elifcad|json)$/i.test(file.name)) return openProject(file);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdf = isPdf(file, bytes);
    if (!pdf && !/^image\//.test(file.type) && !/\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)) {
      toast('Bu dosya açılamıyor. PDF ya da görsel (PNG, JPG, WEBP) seçin.', true);
      return;
    }
    setHint('Plan yükleniyor…');
    try {
      if (S.hiTask) { try { S.hiTask.cancel(); } catch (e) { /* */ } }
      S.pdf = null; S.img = null; S.page = null; S.hi = null;
      const type = pdf ? 'application/pdf' : (file.type || 'image/png');
      S.file = { name: file.name, size: file.size, type, bytes };
      if (pdf) {
        await ensurePdfjs();
        S.pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
        S.pageCount = S.pdf.numPages;
      } else {
        S.img = await loadImage(new Blob([bytes], { type }));
        S.pageCount = 1;
      }
    } catch (err) {
      console.error(err);
      S.file = null;
      toast('Dosya okunamadı: ' + (err.message || err), true);
      setHint('Bir plan açın.');
      return;
    }
    let restored = false;
    if (pages) S.pages = pages;
    else {
      S.pages = {};
      try {
        const saved = localStorage.getItem(storeKey());
        if (saved) { S.pages = JSON.parse(saved) || {}; restored = true; }
      } catch (e) { /* */ }
    }
    S.undo = []; S.redo = [];
    $('fileName').textContent = file.name;
    $('fileName').title = file.name;
    $('empty').hidden = true;
    await showPage(firstPageWithData());
    if (restored && totalShapes()) toast('Bu dosyadaki önceki ölçümler geri yüklendi.');
  }
  const totalShapes = () => Object.values(S.pages).reduce((n, p) => n + p.shapes.length, 0);
  function firstPageWithData() {
    const ks = Object.keys(S.pages).map(Number).filter((k) => k < S.pageCount && (S.pages[k].shapes.length || S.pages[k].scale));
    return ks.length ? Math.min(...ks) : 0;
  }
  function loadImage(blob) {
    return new Promise((res, rej) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => rej(new Error('Görsel çözülemedi'));
      img.src = URL.createObjectURL(blob);
    });
  }

  async function showPage(i) {
    i = clamp(i, 0, S.pageCount - 1);
    S.pageIndex = i; S.draft = null; S.selected = null; S.hi = null; S.snap = null;
    if (S.hiTask) { try { S.hiTask.cancel(); } catch (e) { /* */ } S.hiTask = null; }
    if (S.pdf) {
      S.loadingPage = true;
      setHint('Sayfa çiziliyor…');
      const page = await S.pdf.getPage(i + 1);
      S.page = page;
      const vp1 = page.getViewport({ scale: 1 });
      S.docW = vp1.width; S.docH = vp1.height;
      const r = clamp(MAX_BASE / Math.max(S.docW, S.docH), 1, 8);
      const c = document.createElement('canvas');
      c.width = Math.round(S.docW * r); c.height = Math.round(S.docH * r);
      await page.render({ canvasContext: c.getContext('2d'), viewport: page.getViewport({ scale: c.width / S.docW }) }).promise;
      if (S.pageIndex !== i) return;
      S.base = c; S.baseScale = c.width / S.docW;
      S.loadingPage = false;
    } else if (S.img) {
      S.base = S.img; S.docW = S.img.naturalWidth; S.docH = S.img.naturalHeight; S.baseScale = 1;
    }
    $('pager').hidden = S.pageCount < 2;
    $('pageInfo').textContent = `${i + 1} / ${S.pageCount}`;
    fit();
    if (!mpu() && S.tool !== 'calibrate') setTool('calibrate');
    else setTool(S.tool);
    changed(false);
  }

  /* ---------------- gorunum ---------------- */
  let dpr = window.devicePixelRatio || 1;
  let stageBg = getComputedStyle(stage).backgroundColor;
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { stageBg = getComputedStyle(stage).backgroundColor; invalidate(); });
  function resize() {
    dpr = window.devicePixelRatio || 1;
    const w = stage.clientWidth, h = stage.clientHeight;
    view.width = Math.max(1, Math.round(w * dpr));
    view.height = Math.max(1, Math.round(h * dpr));
    loupe.width = Math.round(168 * dpr); loupe.height = Math.round(168 * dpr);
    invalidate(); scheduleHi();
  }
  new ResizeObserver(resize).observe(stage);

  function fit() {
    if (!S.docW) return;
    const w = stage.clientWidth, h = stage.clientHeight, m = 28;
    S.fitZoom = Math.min((w - m * 2) / S.docW, (h - m * 2) / S.docH);
    S.zoom = S.fitZoom;
    S.panX = (w - S.docW * S.zoom) / 2;
    S.panY = (h - S.docH * S.zoom) / 2;
    viewChanged();
  }
  function zoomAt(sx, sy, factor) {
    if (!S.docW) return;
    const z = clamp(S.zoom * factor, S.fitZoom * 0.2, S.fitZoom * 120);
    const k = z / S.zoom;
    S.panX = sx - (sx - S.panX) * k;
    S.panY = sy - (sy - S.panY) * k;
    S.zoom = z;
    viewChanged();
  }
  function viewChanged() {
    $('zoomFit').textContent = '%' + Math.round((S.zoom / S.fitZoom) * 100);
    invalidate(); scheduleHi();
  }
  const toScreen = (p) => ({ x: p.x * S.zoom + S.panX, y: p.y * S.zoom + S.panY });
  const toDoc = (sx, sy) => ({ x: (sx - S.panX) / S.zoom, y: (sy - S.panY) / S.zoom });

  // Yakinlasinca gorunen bolgeyi PDF'ten yeniden, keskin cizer
  function scheduleHi() {
    clearTimeout(S.hiTimer);
    if (!S.page) return;
    if (S.zoom * dpr <= S.baseScale * 1.05) { S.hi = null; return; }
    S.hiTimer = setTimeout(renderHi, 140);
  }
  async function renderHi() {
    const page = S.page, idx = S.pageIndex;
    if (!page) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    const x0 = Math.max(0, -S.panX / S.zoom), y0 = Math.max(0, -S.panY / S.zoom);
    const x1 = Math.min(S.docW, (w - S.panX) / S.zoom), y1 = Math.min(S.docH, (h - S.panY) / S.zoom);
    if (x1 <= x0 || y1 <= y0) return;
    const s = S.zoom * dpr;
    const cw = Math.ceil((x1 - x0) * s), ch = Math.ceil((y1 - y0) * s);
    if (cw * ch > 30e6) return;
    if (S.hiTask) { try { S.hiTask.cancel(); } catch (e) { /* */ } }
    const c = document.createElement('canvas');
    c.width = cw; c.height = ch;
    const task = page.render({
      canvasContext: c.getContext('2d'),
      viewport: page.getViewport({ scale: s }),
      transform: [1, 0, 0, 1, -x0 * s, -y0 * s],
    });
    S.hiTask = task;
    try { await task.promise; } catch (e) { return; }
    if (S.hiTask !== task || S.pageIndex !== idx) return;
    S.hiTask = null;
    S.hi = { c, x: x0, y: y0, w: cw / s, h: ch / s, page: idx };
    invalidate();
  }

  /* ---------------- cizim ---------------- */
  let raf = 0;
  function invalidate() { if (!raf) raf = requestAnimationFrame(draw); }

  function draw() {
    raf = 0;
    const w = view.width / dpr, h = view.height / dpr;
    vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vctx.fillStyle = stageBg;
    vctx.fillRect(0, 0, w, h);
    if (!S.base) { drawLoupe(); return; }
    const pw = S.docW * S.zoom, ph = S.docH * S.zoom;
    vctx.fillStyle = '#fff';
    vctx.fillRect(S.panX, S.panY, pw, ph);
    vctx.strokeStyle = 'rgba(21,25,15,.28)'; vctx.lineWidth = 1;
    vctx.strokeRect(S.panX - 0.5, S.panY - 0.5, pw + 1, ph + 1);
    vctx.imageSmoothingEnabled = true;
    vctx.imageSmoothingQuality = 'high';
    vctx.drawImage(S.base, S.panX, S.panY, pw, ph);
    if (S.hi && S.hi.page === S.pageIndex) {
      vctx.drawImage(S.hi.c, S.hi.x * S.zoom + S.panX, S.hi.y * S.zoom + S.panY, S.hi.w * S.zoom, S.hi.h * S.zoom);
    }
    drawOverlays(vctx, toScreen, 1, true);
    drawLoupe();
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function pill(ctx, text, x, y, o) {
    const u = o.u || 1;
    ctx.save();
    ctx.translate(x, y);
    if (o.angle) ctx.rotate(o.angle);
    ctx.font = o.font || `600 ${11 * u}px ui-monospace, "Cascadia Mono", Consolas, monospace`;
    const tw = ctx.measureText(text).width, pad = 4 * u, hh = (o.h || 17) * u;
    rrect(ctx, -tw / 2 - pad, -hh / 2, tw + pad * 2, hh, 3 * u);
    ctx.fillStyle = o.bg; ctx.fill();
    ctx.fillStyle = o.fg; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, 0, 0.5 * u);
    ctx.restore();
    return tw + pad * 2;
  }
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }
  const lenText = (units, m) => (m ? f2(units * m) + ' m' : '');

  // Kenar uzunluk etiketi: kenar boyunca, poligonun disina dogru
  function edgeLabel(ctx, a, b, text, color, u, inside) {
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy);
    if (!text || L < 34 * u) return;
    ctx.font = `600 ${11 * u}px ui-monospace, "Cascadia Mono", Consolas, monospace`;
    if (ctx.measureText(text).width + 10 * u > L) return;
    let nx = -dy / L, ny = dx / L;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    if (inside && inside({ x: mx + nx * 3 * u, y: my + ny * 3 * u })) { nx = -nx; ny = -ny; }
    let ang = Math.atan2(dy, dx);
    if (ang > Math.PI / 2) ang -= Math.PI;
    if (ang < -Math.PI / 2) ang += Math.PI;
    pill(ctx, text, mx + nx * 11 * u, my + ny * 11 * u, { u, angle: ang, bg: color, fg: '#fff' });
  }

  function drawOverlays(ctx, T, u, live) {
    const p = ps(), m = mpuOf(p);
    const order = p.shapes.filter((s) => s.visible !== false);
    for (const sh of order) drawShape(ctx, sh, T, u, m, live);
    if (p.scale) drawScale(ctx, p.scale, T, u);
    if (!live) return;
    if (S.hoverEdge) {
      const sh = findShape(S.hoverEdge.id);
      if (sh) {
        const a = T(sh.pts[S.hoverEdge.i]), b = T(sh.pts[(S.hoverEdge.i + 1) % sh.pts.length]);
        ctx.save(); ctx.strokeStyle = SIGNAL; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.restore();
      }
    }
    drawSelection(ctx, T);
    drawDraft(ctx, T, m);
    drawSnap(ctx, T);
  }

  function drawShape(ctx, sh, T, u, m, live) {
    const pts = sh.pts.map(T);
    const sel = live && sh.id === S.selected;
    const hov = live && sh.id === S.hoverShape && !sel;
    const color = sh.color;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (sh.kind === 'area') {
      ctx.beginPath();
      pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.closePath();
      ctx.fillStyle = hexA(color, sh.sign < 0 ? 0.1 : sel ? 0.26 : hov ? 0.22 : 0.16);
      ctx.fill();
      if (sh.sign < 0) ctx.setLineDash([7 * u, 5 * u]);
      ctx.strokeStyle = color; ctx.lineWidth = (sel ? 3 : 2) * u;
      ctx.stroke();
      ctx.setLineDash([]);
      // kose noktalari
      ctx.lineWidth = 1.5 * u;
      for (const q of pts) { ctx.beginPath(); ctx.arc(q.x, q.y, 3.5 * u, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke(); }
      if (S.opts.edges && m) {
        const inside = (q) => pointInPoly(q, pts);
        for (let i = 0; i < pts.length; i++) {
          const j = (i + 1) % pts.length;
          edgeLabel(ctx, pts[i], pts[j], lenText(dist(sh.pts[i], sh.pts[j]), m), color, u, inside);
        }
      }
      // merkez etiketi
      const c = T(labelPoint(sh.pts));
      const area = m ? polyArea(sh.pts) * m * m : null;
      const big = area == null ? 'ölçek yok' : (sh.sign < 0 ? '−' : '') + f2(area) + ' m²';
      ctx.font = `600 ${12 * u}px Archivo, "Segoe UI", sans-serif`;
      const w1 = ctx.measureText(sh.name).width;
      ctx.font = `600 ${15 * u}px ui-monospace, "Cascadia Mono", Consolas, monospace`;
      const w2 = ctx.measureText(big).width;
      const bw = Math.max(w1, w2) + 14 * u, bh = 40 * u;
      rrect(ctx, c.x - bw / 2, c.y - bh / 2, bw, bh, 4 * u);
      ctx.fillStyle = sh.sign < 0 ? '#fff' : color; ctx.fill();
      if (sh.sign < 0) { ctx.strokeStyle = color; ctx.lineWidth = 1.5 * u; ctx.stroke(); }
      ctx.fillStyle = sh.sign < 0 ? color : '#fff';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `600 ${12 * u}px Archivo, "Segoe UI", sans-serif`;
      ctx.fillText(sh.name, c.x, c.y - 8 * u);
      ctx.font = `600 ${15 * u}px ui-monospace, "Cascadia Mono", Consolas, monospace`;
      ctx.fillText(big, c.x, c.y + 9 * u);
    } else {
      ctx.strokeStyle = color; ctx.lineWidth = (sel ? 3 : 2) * u;
      ctx.beginPath();
      pts.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)));
      ctx.stroke();
      for (const q of pts) { ctx.beginPath(); ctx.arc(q.x, q.y, 3.5 * u, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.5 * u; ctx.stroke(); }
      if (m) {
        if (S.opts.edges && pts.length > 2) {
          for (let i = 1; i < pts.length; i++) edgeLabel(ctx, pts[i - 1], pts[i], lenText(dist(sh.pts[i - 1], sh.pts[i]), m), color, u);
        }
        const last = pts[pts.length - 1];
        const total = (pts.length > 2 ? 'Σ ' : '') + f2(pathLen(sh.pts) * m) + ' m';
        pill(ctx, `${sh.name}  ${total}`, last.x, last.y - 18 * u, { u, bg: color, fg: '#fff', h: 20 });
      }
    }
    ctx.restore();
  }

  function drawScale(ctx, sc, T, u) {
    const a = T(sc.a), b = T(sc.b);
    const dx = b.x - a.x, dy = b.y - a.y, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L * 7 * u, ny = dx / L * 7 * u;
    ctx.save();
    ctx.strokeStyle = SIGNAL; ctx.lineWidth = 2 * u; ctx.lineCap = 'round';
    ctx.setLineDash([8 * u, 4 * u]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(a.x - nx, a.y - ny); ctx.lineTo(a.x + nx, a.y + ny);
    ctx.moveTo(b.x - nx, b.y - ny); ctx.lineTo(b.x + nx, b.y + ny);
    ctx.stroke();
    let ang = Math.atan2(dy, dx);
    if (ang > Math.PI / 2) ang -= Math.PI;
    if (ang < -Math.PI / 2) ang += Math.PI;
    pill(ctx, `ÖLÇEK ${f2(sc.meters)} m`, (a.x + b.x) / 2 - nx * 2.2, (a.y + b.y) / 2 - ny * 2.2, { u, angle: ang, bg: SIGNAL, fg: '#fff' });
    ctx.restore();
  }

  function drawSelection(ctx, T) {
    const sh = S.selected && findShape(S.selected);
    if (!sh || sh.visible === false) return;
    const pts = sh.pts.map(T);
    ctx.save();
    const n = sh.kind === 'area' ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if (dist(a, b) < 26) continue;
      ctx.beginPath(); ctx.arc((a.x + b.x) / 2, (a.y + b.y) / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = sh.color; ctx.lineWidth = 1.5; ctx.stroke();
    }
    for (const q of pts) {
      ctx.fillStyle = '#fff'; ctx.fillRect(q.x - 5, q.y - 5, 10, 10);
      ctx.strokeStyle = sh.color; ctx.lineWidth = 2; ctx.strokeRect(q.x - 5, q.y - 5, 10, 10);
    }
    ctx.restore();
  }

  function draftColor() {
    if (!S.draft) return SIGNAL;
    return S.draft.kind === 'calibrate' ? SIGNAL : nextColor();
  }

  function drawDraft(ctx, T, m) {
    const d = S.draft;
    if (!d) return;
    const color = draftColor();
    const pts = d.pts.slice();
    const hov = S.hover;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (d.kind === 'rect') {
      if (hov) {
        const r = rectPts(pts[0], hov).map(T);
        ctx.beginPath(); r.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath();
        ctx.fillStyle = hexA(color, 0.16); ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
        if (m) {
          const rp = rectPts(pts[0], hov);
          edgeLabel(ctx, r[0], r[1], lenText(dist(rp[0], rp[1]), m), color, 1, (q) => pointInPoly(q, r));
          edgeLabel(ctx, r[1], r[2], lenText(dist(rp[1], rp[2]), m), color, 1, (q) => pointInPoly(q, r));
          const c = T(centroid(rp));
          pill(ctx, f2(polyArea(rp) * m * m) + ' m²', c.x, c.y, { u: 1, bg: color, fg: '#fff', h: 22, font: '600 14px ui-monospace, "Cascadia Mono", Consolas, monospace' });
        }
      }
      ctx.restore();
      return;
    }
    const all = hov ? pts.concat([hov]) : pts;
    const sp = all.map(T);
    if (d.kind === 'area' && sp.length >= 3) {
      ctx.beginPath(); sp.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.closePath();
      ctx.fillStyle = hexA(color, 0.14); ctx.fill();
      ctx.setLineDash([5, 5]); ctx.strokeStyle = hexA(color, 0.7); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(sp[sp.length - 1].x, sp[sp.length - 1].y); ctx.lineTo(sp[0].x, sp[0].y); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    if (d.kind === 'calibrate') ctx.setLineDash([8, 4]);
    ctx.beginPath(); sp.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y))); ctx.stroke();
    ctx.setLineDash([]);
    sp.forEach((q, i) => {
      if (hov && i === sp.length - 1) return;
      ctx.beginPath(); ctx.arc(q.x, q.y, i === 0 && d.kind === 'area' ? 5 : 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = color; ctx.stroke();
    });
    if (d.kind === 'area' && hov && pts.length >= 3 && dist(T(pts[0]), T(hov)) < 1) {
      ctx.beginPath(); ctx.arc(sp[0].x, sp[0].y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    }
    // parca uzunluklari
    if (m) {
      for (let i = 1; i < all.length; i++) edgeLabel(ctx, sp[i - 1], sp[i], lenText(dist(all[i - 1], all[i]), m), color, 1);
    }
    if (hov && pts.length) {
      const last = pts[pts.length - 1];
      const L = dist(last, hov);
      let txt;
      if (d.kind === 'calibrate') txt = m ? f2(L * m) + ' m (eski ölçek)' : 'Bitiş noktasına tıklayın';
      else if (m) {
        txt = f2(L * m) + ' m';
        if (d.kind === 'area' && all.length >= 3) txt += '   ·   ' + f2(polyArea(all) * m * m) + ' m²';
        if (d.kind === 'line' && all.length > 2) txt += '   ·   Σ ' + f2(pathLen(all) * m) + ' m';
      }
      if (txt) {
        const h = T(hov);
        ctx.font = '600 12px ui-monospace, "Cascadia Mono", Consolas, monospace';
        const tw = ctx.measureText(txt).width;
        pill(ctx, txt, h.x + 18 + tw / 2, h.y + 26, { u: 1, bg: '#1B2740', fg: '#E4E9DC', h: 22, font: '600 12px ui-monospace, "Cascadia Mono", Consolas, monospace' });
      }
    }
    ctx.restore();
  }

  function drawSnap(ctx, T) {
    const s = S.snap;
    if (!s) return;
    const q = T(s.pt);
    ctx.save();
    if (s.ref) {
      const r = T(s.ref);
      ctx.setLineDash([3, 4]); ctx.strokeStyle = SIGNAL; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(q.x, q.y); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.strokeStyle = SIGNAL; ctx.lineWidth = 2;
    if (s.type === 'edge') {
      ctx.beginPath(); ctx.moveTo(q.x - 6, q.y - 6); ctx.lineTo(q.x + 6, q.y + 6); ctx.moveTo(q.x + 6, q.y - 6); ctx.lineTo(q.x - 6, q.y + 6); ctx.stroke();
    } else {
      ctx.strokeRect(q.x - 7, q.y - 7, 14, 14);
    }
    ctx.restore();
  }

  function drawLoupe() {
    const show = S.opts.loupe && S.base && S.mouse && !S.space &&
      ((DRAW_TOOLS.includes(S.tool) && !(S.drag && S.drag.type === 'pan')) || (S.drag && S.drag.type === 'vertex'));
    if (!show) { loupe.hidden = true; return; }
    const W = stage.clientWidth, H = stage.clientHeight, size = 168, off = 26;
    let lx = S.mouse.x + off, ly = S.mouse.y + off;
    if (lx + size > W) lx = S.mouse.x - off - size;
    if (ly + size > H) ly = S.mouse.y - off - size;
    loupe.style.left = lx + 'px'; loupe.style.top = ly + 'px';
    loupe.hidden = false;
    const Z = 3, src = (size / Z) * dpr;
    const cx = (S.hover ? toScreen(S.hover).x : S.mouse.x) * dpr, cy = (S.hover ? toScreen(S.hover).y : S.mouse.y) * dpr;
    lctx.setTransform(1, 0, 0, 1, 0, 0);
    lctx.fillStyle = stageBg; lctx.fillRect(0, 0, loupe.width, loupe.height);
    lctx.imageSmoothingEnabled = false;
    lctx.drawImage(view, cx - src / 2, cy - src / 2, src, src, 0, 0, loupe.width, loupe.height);
    const c = loupe.width / 2;
    lctx.strokeStyle = SIGNAL; lctx.lineWidth = 1.5 * dpr;
    lctx.beginPath();
    lctx.moveTo(c, c - 26 * dpr); lctx.lineTo(c, c - 6 * dpr);
    lctx.moveTo(c, c + 6 * dpr); lctx.lineTo(c, c + 26 * dpr);
    lctx.moveTo(c - 26 * dpr, c); lctx.lineTo(c - 6 * dpr, c);
    lctx.moveTo(c + 6 * dpr, c); lctx.lineTo(c + 26 * dpr, c);
    lctx.stroke();
    lctx.beginPath(); lctx.arc(c, c, 1.6 * dpr, 0, Math.PI * 2); lctx.fillStyle = SIGNAL; lctx.fill();
  }

  /* ---------------- yakalama (snap) ---------------- */
  function snapVertices(ex) {
    const out = [];
    const p = ps();
    for (const sh of p.shapes) {
      if (sh.visible === false) continue;
      sh.pts.forEach((q, i) => { if (!(ex && ex.id === sh.id && ex.i === i)) out.push(q); });
    }
    if (p.scale) out.push(p.scale.a, p.scale.b);
    if (S.draft) out.push(...S.draft.pts);
    return out;
  }
  function ortho(from, p) {
    const dx = p.x - from.x, dy = p.y - from.y;
    const step = Math.PI / 4;
    const ang = Math.round(Math.atan2(dy, dx) / step) * step;
    const c = Math.cos(ang), s = Math.sin(ang);
    const len = dx * c + dy * s;
    return { x: from.x + c * len, y: from.y + s * len, axis: Math.abs(s) < 1e-6 ? 'h' : Math.abs(c) < 1e-6 ? 'v' : 'd' };
  }
  function pick(sx, sy, ev, from, ex) {
    let p = toDoc(sx, sy);
    S.snap = null;
    const tol = 10 / S.zoom;
    if (ev.shiftKey && from) {
      const o = ortho(from, p);
      p = { x: o.x, y: o.y };
      if (!ev.altKey && o.axis !== 'd') {
        let best = null, bd = tol;
        for (const q of snapVertices(ex)) {
          const d = o.axis === 'h' ? Math.abs(q.x - p.x) : Math.abs(q.y - p.y);
          if (d < bd) { bd = d; best = q; }
        }
        if (best) {
          p = o.axis === 'h' ? { x: best.x, y: from.y } : { x: from.x, y: best.y };
          S.snap = { pt: p, type: 'align', ref: best };
        }
      }
      return p;
    }
    if (ev.altKey) return p;
    let best = null, bd = tol;
    for (const q of snapVertices(ex)) { const d = dist(p, q); if (d < bd) { bd = d; best = q; } }
    if (best) { p = { x: best.x, y: best.y }; S.snap = { pt: p, type: 'vertex' }; return p; }
    // kenar uzerine yakala
    let eb = null, ed = 6 / S.zoom;
    for (const sh of ps().shapes) {
      if (sh.visible === false || (ex && ex.id === sh.id)) continue;
      const n = sh.kind === 'area' ? sh.pts.length : sh.pts.length - 1;
      for (let i = 0; i < n; i++) {
        const r = segDist(p, sh.pts[i], sh.pts[(i + 1) % sh.pts.length]);
        if (r.d < ed) { ed = r.d; eb = r.q; }
      }
    }
    if (eb) { p = eb; S.snap = { pt: p, type: 'edge' }; }
    return p;
  }

  /* ---------------- araclar ---------------- */
  function setTool(t) {
    if (S.tool !== t) S.draft = null;
    S.tool = t;
    document.querySelectorAll('.tool[data-tool]').forEach((b) => b.classList.toggle('active', b.dataset.tool === t));
    updateCursor(); updateHint(); invalidate();
  }
  function updateCursor(kind) {
    let c = 'default';
    if (S.drag && S.drag.type === 'pan') c = 'grabbing';
    else if (S.space || S.tool === 'pan') c = 'grab';
    else if (DRAW_TOOLS.includes(S.tool)) c = 'cross';
    else if (kind) c = kind;
    stage.dataset.cursor = c;
  }
  function setHint(html) { $('hint').innerHTML = html; }
  function updateHint() {
    if (!S.file) return setHint('Bir plan açın.');
    const k = (s) => `<kbd>${s}</kbd>`;
    const noScale = !mpu();
    const d = S.draft;
    let h = '';
    switch (S.tool) {
      case 'calibrate':
        h = d ? `Çizginin <b>bitişine</b> tıklayın · ${k('Shift')} yatay/dikey · ${k('Esc')} iptal`
          : `<b>Ölçek:</b> planda ölçüsü yazılı bir çizginin <b>başına</b> tıklayın (ör. 260 cm duvar)`;
        break;
      case 'area':
        h = d ? `Tıkla: köşe · İlk noktaya tıkla, ${k('Enter')} ya da çift tık: kapat · ${k('⌫')} son köşeyi sil · ${k('Shift')} dik açı · ${k('Alt')} yakalama kapalı`
          : (noScale ? '<b>Önce ölçek koyun</b> ' + k('K') + ' — alanlar ölçek gelince hesaplanır. ' : '') + '<b>Alan:</b> ilk köşeye tıklayın';
        break;
      case 'rect':
        h = d ? 'Karşı köşeye tıklayın' : '<b>Dikdörtgen:</b> bir köşeye, sonra karşı köşeye tıklayın';
        break;
      case 'line':
        h = d ? `Tıkla: nokta ekle · ${k('Enter')} ya da çift tık: bitir · ${k('Shift')} dik açı` : '<b>Mesafe:</b> başlangıç noktasına tıklayın';
        break;
      case 'pan':
        h = 'Sürükle: kaydır · Tekerlek: yakınlaş';
        break;
      default:
        h = `Tıkla: seç · Köşeyi sürükle: düzelt · Kenar ortasındaki noktayı sürükle: köşe ekle · Seçili alanı sürükle: taşı · Köşeye sağ tık: sil · ${k('Del')} alanı sil`;
    }
    setHint(h);
  }
  function nextColor() {
    const used = ps().shapes.length;
    return COLORS[used % COLORS.length];
  }
  function rectPts(a, b) {
    return [{ x: a.x, y: a.y }, { x: b.x, y: a.y }, { x: b.x, y: b.y }, { x: a.x, y: b.y }];
  }
  function guessCat(name) {
    const n = name.toLocaleLowerCase('tr');
    if (n.includes('balkon')) return 'Balkon';
    if (n.includes('teras')) return 'Teras';
    if (n.includes('brüt')) return 'Brüt';
    return null;
  }

  function addShape(kind, pts) {
    const p = ps();
    snapshot();
    const name = kind === 'area' ? `Alan ${++p.seq}` : `Mesafe ${++p.lseq}`;
    const sh = { id: uid(), kind, name, cat: 'Net', sign: 1, color: nextColor(), pts: pts.map((q) => ({ x: q.x, y: q.y })), visible: true };
    p.shapes.push(sh);
    S.selected = sh.id;
    S.draft = null;
    changed();
    updateHint();
    if (kind === 'area') {
      const inp = document.querySelector(`.item[data-id="${sh.id}"] .item-name`);
      if (inp) { inp.focus(); inp.select(); }
    }
  }

  function finishDraft() {
    const d = S.draft;
    if (!d) return;
    if (d.kind === 'area') {
      if (d.pts.length < 3) return toast('Alan için en az 3 köşe gerekir.', true);
      if (polyArea(d.pts) < 1e-6) return toast('Köşeler aynı çizgide; alan oluşmadı.', true);
      addShape('area', d.pts);
    } else if (d.kind === 'line') {
      if (d.pts.length < 2) return;
      addShape('line', d.pts);
    }
  }

  /* ---------------- olcek penceresi ---------------- */
  function openCal(a, b, current) {
    S.pendingCal = { a, b };
    const m = mpu();
    $('calPx').textContent = m
      ? `Mevcut ölçeğe göre bu çizgi ${f2(dist(a, b) * m)} m.`
      : `Çizgi uzunluğu ekranda ${Math.round(dist(a, b) * S.zoom)} piksel.`;
    $('calVal').value = current != null ? nfX.format(current) : '';
    $('calErr').hidden = true;
    document.querySelector('input[name="calUnit"][value="m"]').checked = true;
    $('calDlg').showModal();
    $('calVal').focus(); $('calVal').select();
  }
  $('calForm').addEventListener('submit', (e) => {
    e.preventDefault();
    let v = parseNum($('calVal').value);
    const unit = document.querySelector('input[name="calUnit"]:checked').value;
    if (!(v > 0)) {
      $('calErr').textContent = 'Sıfırdan büyük bir sayı yazın. Ondalık için virgül kullanabilirsiniz: 2,60';
      $('calErr').hidden = false;
      return;
    }
    if (unit === 'cm') v /= 100;
    const { a, b } = S.pendingCal;
    snapshot();
    const first = !mpu();
    ps().scale = { a, b, meters: v };
    S.pendingCal = null; S.draft = null;
    $('calDlg').close();
    toast(`Ölçek kaydedildi: ${f2(v)} m`);
    changed();
    if (first || S.tool === 'calibrate') setTool('area');
  });
  $('calCancel').addEventListener('click', () => $('calDlg').close());
  $('calDlg').addEventListener('close', () => { S.pendingCal = null; S.draft = null; updateHint(); invalidate(); });

  /* ---------------- isaretci olaylari ---------------- */
  function local(ev) {
    const r = view.getBoundingClientRect();
    return { x: ev.clientX - r.left, y: ev.clientY - r.top };
  }
  function hitHandle(m) {
    const sh = S.selected && findShape(S.selected);
    if (!sh || sh.visible === false) return null;
    const pts = sh.pts.map(toScreen);
    for (let i = 0; i < pts.length; i++) if (dist(pts[i], m) < 9) return { sh, type: 'vertex', i };
    const n = sh.kind === 'area' ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if (dist(a, b) < 26) continue;
      if (dist({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, m) < 8) return { sh, type: 'mid', i };
    }
    return null;
  }
  function hitShape(m) {
    const p = toDoc(m.x, m.y), tol = 6 / S.zoom;
    let best = null, ba = Infinity;
    for (const sh of ps().shapes) {
      if (sh.visible === false) continue;
      const n = sh.kind === 'area' ? sh.pts.length : sh.pts.length - 1;
      let near = false;
      for (let i = 0; i < n; i++) if (segDist(p, sh.pts[i], sh.pts[(i + 1) % sh.pts.length]).d < tol) { near = true; break; }
      const inside = sh.kind === 'area' && pointInPoly(p, sh.pts);
      if (near || inside) {
        const a = sh.kind === 'area' ? polyArea(sh.pts) : 0; // en kucuk (ic) alan once
        if (a < ba) { ba = a; best = sh; }
      }
    }
    return best;
  }

  view.addEventListener('contextmenu', (e) => e.preventDefault());

  view.addEventListener('pointerdown', (ev) => {
    if (!S.base) return;
    const m = local(ev);
    S.mouse = m;
    try { view.setPointerCapture(ev.pointerId); } catch (e) { /* sentetik olay */ }
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();

    if (ev.button === 1 || (ev.button === 0 && (S.space || S.tool === 'pan'))) {
      S.drag = { type: 'pan', sx: m.x, sy: m.y, px: S.panX, py: S.panY };
      updateCursor(); return;
    }
    if (ev.button === 2) {
      if (S.draft && (S.draft.kind === 'area' || S.draft.kind === 'line')) { finishDraft(); return; }
      if (S.tool === 'select') {
        const h = hitHandle(m);
        if (h && h.type === 'vertex') {
          const min = h.sh.kind === 'area' ? 3 : 2;
          if (h.sh.pts.length <= min) { toast(`En az ${min} köşe kalmalı.`, true); return; }
          snapshot(); h.sh.pts.splice(h.i, 1); changed();
        }
      }
      return;
    }
    if (ev.button !== 0) return;

    if (DRAW_TOOLS.includes(S.tool)) {
      const d = S.draft;
      const from = d && d.pts[d.pts.length - 1];
      const p = pick(m.x, m.y, ev, from);
      if (S.tool === 'calibrate') {
        if (!d) S.draft = { kind: 'calibrate', pts: [p] };
        else if (dist(toScreen(p), toScreen(d.pts[0])) > 4) { d.pts.push(p); openCal(d.pts[0], p); }
      } else if (S.tool === 'rect') {
        if (!d) { S.draft = { kind: 'rect', pts: [p], down: m }; }
        else finishRect(p);
      } else {
        if (!d) S.draft = { kind: S.tool, pts: [p] };
        else {
          if (d.kind === 'area' && d.pts.length >= 3 && dist(toScreen(p), toScreen(d.pts[0])) < 10) { finishDraft(); return; }
          if (dist(toScreen(p), toScreen(from)) < 3) return; // cift tik ayni noktayi iki kez eklemesin
          d.pts.push(p);
        }
      }
      S.hover = p;
      updateHint(); invalidate();
      return;
    }

    if (S.tool === 'select') {
      const h = hitHandle(m);
      if (h) {
        const before = JSON.stringify({ i: S.pageIndex, pages: S.pages });
        if (h.type === 'mid') {
          const a = h.sh.pts[h.i], b = h.sh.pts[(h.i + 1) % h.sh.pts.length];
          h.sh.pts.splice(h.i + 1, 0, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          S.drag = { type: 'vertex', id: h.sh.id, i: h.i + 1, before, moved: true };
        } else {
          S.drag = { type: 'vertex', id: h.sh.id, i: h.i, before, moved: false };
        }
        updateCursor('move'); invalidate(); return;
      }
      const sh = hitShape(m);
      if (sh && sh.id === S.selected) {
        S.drag = { type: 'move', id: sh.id, start: toDoc(m.x, m.y), orig: sh.pts.map((q) => ({ ...q })), before: JSON.stringify({ i: S.pageIndex, pages: S.pages }), moved: false };
        return;
      }
      if (sh) { S.selected = sh.id; renderPanel(); scrollToItem(sh.id); invalidate(); return; }
      if (S.selected) { S.selected = null; renderPanel(); }
      S.drag = { type: 'pan', sx: m.x, sy: m.y, px: S.panX, py: S.panY };
      updateCursor(); invalidate();
    }
  });

  function finishRect(p) {
    const a = S.draft.pts[0];
    if (Math.abs(p.x - a.x) * S.zoom < 4 || Math.abs(p.y - a.y) * S.zoom < 4) return;
    addShape('area', rectPts(a, p));
  }

  view.addEventListener('pointermove', (ev) => {
    if (!S.base) return;
    const m = local(ev);
    S.mouse = m;
    const dr = S.drag;
    if (dr && dr.type === 'pan') {
      S.panX = dr.px + (m.x - dr.sx); S.panY = dr.py + (m.y - dr.sy);
      viewChanged(); return;
    }
    if (dr && dr.type === 'vertex') {
      const sh = findShape(dr.id);
      const p = pick(m.x, m.y, ev, null, { id: sh.id, i: dr.i });
      sh.pts[dr.i] = p; dr.moved = true; S.hover = p;
      invalidate(); return;
    }
    if (dr && dr.type === 'move') {
      const sh = findShape(dr.id), c = toDoc(m.x, m.y);
      const dx = c.x - dr.start.x, dy = c.y - dr.start.y;
      sh.pts = dr.orig.map((q) => ({ x: q.x + dx, y: q.y + dy }));
      dr.moved = true; updateCursor('move'); invalidate(); return;
    }
    if (DRAW_TOOLS.includes(S.tool)) {
      const d = S.draft;
      S.hover = pick(m.x, m.y, ev, d && d.pts[d.pts.length - 1]);
    } else {
      S.hover = toDoc(m.x, m.y); S.snap = null;
      if (S.tool === 'select') {
        const h = hitHandle(m);
        const sh = h ? null : hitShape(m);
        const hid = sh ? sh.id : null;
        if (hid !== S.hoverShape) S.hoverShape = hid;
        updateCursor(h ? 'move' : sh ? (sh.id === S.selected ? 'move' : 'pointer') : null);
      }
    }
    updateCursorInfo();
    invalidate();
  });

  view.addEventListener('pointerup', (ev) => {
    const dr = S.drag;
    S.drag = null;
    if (dr && (dr.type === 'vertex' || dr.type === 'move')) {
      if (dr.moved) { S.undo.push(dr.before); S.redo = []; changed(); }
      S.snap = null;
    }
    if (S.tool === 'rect' && S.draft && S.draft.down) {
      const m = local(ev);
      if (dist(m, S.draft.down) > 8) finishRect(pick(m.x, m.y, ev, S.draft.pts[0]));
      else if (S.draft) S.draft.down = null;
    }
    updateCursor();
    invalidate();
  });
  view.addEventListener('pointerleave', () => { if (!S.drag) { S.mouse = null; S.hoverShape = null; $('cursorInfo').textContent = ''; invalidate(); } });
  view.addEventListener('dblclick', () => {
    if (S.draft && (S.draft.kind === 'area' || S.draft.kind === 'line')) finishDraft();
  });
  view.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    if (!S.base) return;
    const m = local(ev);
    const k = ev.deltaMode === 1 ? 0.05 : 0.0016;
    zoomAt(m.x, m.y, Math.exp(-ev.deltaY * k));
    S.mouse = m;
    if (DRAW_TOOLS.includes(S.tool)) {
      const d = S.draft;
      S.hover = pick(m.x, m.y, ev, d && d.pts[d.pts.length - 1]);
    } else S.hover = toDoc(m.x, m.y);
    updateCursorInfo();
  }, { passive: false });

  function updateCursorInfo() {
    const m = mpu(), h = S.hover, d = S.draft;
    if (!h) { $('cursorInfo').textContent = ''; return; }
    if (d && d.pts.length && m) {
      const last = d.pts[d.pts.length - 1];
      const ang = (Math.atan2(-(h.y - last.y), h.x - last.x) * 180) / Math.PI;
      $('cursorInfo').textContent = `Δ ${f2(dist(last, h) * m)} m   ${nf2.format((ang + 360) % 360)}°`;
    } else if (m) {
      $('cursorInfo').textContent = `x ${f2(h.x * m)} m   y ${f2(h.y * m)} m`;
    } else $('cursorInfo').textContent = '';
  }

  /* ---------------- klavye ---------------- */
  const isField = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA');
  document.addEventListener('keydown', (ev) => {
    if ($('calDlg').open) return;
    const t = ev.target;
    if (isField(t)) {
      if (ev.key === 'Enter' || ev.key === 'Escape') { t.blur(); ev.preventDefault(); }
      return;
    }
    const ctrl = ev.ctrlKey || ev.metaKey;
    const key = ev.key.toLowerCase();
    if (ctrl && key === 'z' && !ev.shiftKey) { ev.preventDefault(); undo(); return; }
    if (ctrl && (key === 'y' || (key === 'z' && ev.shiftKey))) { ev.preventDefault(); redo(); return; }
    if (ctrl && key === 'o') { ev.preventDefault(); $('fileInput').click(); return; }
    if (ctrl && key === 's') { ev.preventDefault(); saveProject(); return; }
    if (ctrl) return;
    if (ev.key === ' ' && !S.space) { S.space = true; updateCursor(); invalidate(); ev.preventDefault(); return; }
    if (!S.base) return;
    switch (ev.key) {
      case 'Escape':
        if (S.draft) S.draft = null;
        else if (S.selected) { S.selected = null; renderPanel(); }
        else setTool('select');
        S.snap = null; updateHint(); invalidate(); return;
      case 'Enter': finishDraft(); return;
      case 'Backspace':
        ev.preventDefault();
        if (S.draft) { S.draft.pts.pop(); if (!S.draft.pts.length) S.draft = null; updateHint(); invalidate(); }
        else if (S.selected) deleteShape(S.selected);
        return;
      case 'Delete': if (S.selected) deleteShape(S.selected); return;
      case 'PageUp': if (S.pageIndex > 0) showPage(S.pageIndex - 1); return;
      case 'PageDown': if (S.pageIndex < S.pageCount - 1) showPage(S.pageIndex + 1); return;
      case '+': case '=': zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1.25); return;
      case '-': zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 0.8); return;
      default: break;
    }
    const map = { v: 'select', h: 'pan', k: 'calibrate', a: 'area', r: 'rect', l: 'line' };
    if (map[key]) { setTool(map[key]); return; }
    if (key === 'f' || key === '0') { fit(); return; }
    if (key === 'b') { $('optLoupe').checked = !$('optLoupe').checked; $('optLoupe').dispatchEvent(new Event('change')); }
  });
  document.addEventListener('keyup', (ev) => {
    if (ev.key === ' ') { S.space = false; updateCursor(); invalidate(); }
    if (ev.key === 'Shift' || ev.key === 'Alt') {
      if (S.mouse && DRAW_TOOLS.includes(S.tool)) {
        const d = S.draft;
        S.hover = pick(S.mouse.x, S.mouse.y, ev, d && d.pts[d.pts.length - 1]); invalidate();
      }
    }
  });

  function deleteShape(id) {
    const p = ps(), i = p.shapes.findIndex((s) => s.id === id);
    if (i < 0) return;
    snapshot();
    const [sh] = p.shapes.splice(i, 1);
    if (S.selected === id) S.selected = null;
    if (S.hoverEdge && S.hoverEdge.id === id) S.hoverEdge = null;
    changed();
    toast(`"${sh.name}" silindi. Geri almak için Ctrl+Z.`);
  }

  /* ---------------- panel ---------------- */
  function renderPanel() {
    renderScale();
    renderList();
    renderTotals();
    document.querySelector('.tool-scale').classList.toggle('needs', !!S.file && !mpu());
  }

  function renderScale() {
    const p = ps(), sc = p.scale, box = $('scaleBox');
    $('btnRecal').hidden = !sc;
    if (!S.file) { box.innerHTML = '<p class="muted">Önce bir plan açın.</p>'; return; }
    if (!sc) {
      const other = Object.keys(S.pages).map(Number).find((k) => k !== S.pageIndex && S.pages[k].scale);
      box.innerHTML = '<p class="muted">Ölçek yok. <b>Ölçek</b> aracıyla planda uzunluğu bilinen bir çizgiyi uçtan uca çizin.</p>' +
        (other != null && S.pageCount > 1 ? `<button class="btn btn-sm" id="copyScale" style="margin-top:10px">Sayfa ${other + 1} ölçeğini kullan</button>` : '');
      const cb = $('copyScale');
      if (cb) cb.onclick = () => { snapshot(); p.scale = JSON.parse(JSON.stringify(S.pages[other].scale)); changed(); setTool('area'); };
      return;
    }
    const m = mpuOf(p);
    const unitLabel = S.pdf ? 'pt' : 'px';
    box.innerHTML = `
      <div class="scale-main"><span class="num">${f2(sc.meters)} m</span><span class="muted small">referans çizgi</span></div>
      <div class="scale-sub">1 m = ${nf2.format(1 / m)} ${unitLabel}${S.pdf ? ' · ' + scaleRatio(m) : ''}</div>
      <div style="display:flex;gap:6px;margin-top:10px">
        <button class="btn btn-sm" id="calEdit">Değeri düzelt</button>
        <button class="btn btn-sm" id="calRedraw">Yeniden çiz</button>
      </div>`;
    $('calEdit').onclick = () => openCal(sc.a, sc.b, sc.meters);
    $('calRedraw').onclick = () => setTool('calibrate');
  }
  // PDF noktasi 1/72 inc: kagit uzerindeki olcek orani (1/50, 1/100 ...)
  function scaleRatio(m) {
    const paperM = 0.0254 / 72;
    const r = m / paperM;
    return '≈ 1/' + Math.round(r);
  }

  function renderList() {
    const list = $('list');
    if (list.contains(document.activeElement) && document.activeElement.classList.contains('item-name') && !list.dataset.force) return renderTotals();
    const p = ps(), m = mpuOf(p);
    const areas = p.shapes;
    $('areaCount').textContent = areas.length ? areas.length + ' kayıt' : '';
    if (!areas.length) {
      list.innerHTML = `<p class="list-empty">${S.file ? (m ? '<b>Alan</b> ya da <b>Dikdörtgen</b> aracıyla bir oda çizin.' : 'Ölçek konunca alanları çizmeye başlayabilirsiniz.') : 'Plan açınca ölçülen alanlar burada listelenir.'}</p>`;
      return;
    }
    list.innerHTML = areas.map((sh, idx) => itemHtml(sh, idx, m)).join('') +
      `<datalist id="roomNames">${ROOMS.map((r) => `<option value="${esc(r)}">`).join('')}</datalist>`;
  }

  function itemHtml(sh, idx, m) {
    const sel = sh.id === S.selected;
    const isArea = sh.kind === 'area';
    const val = isArea ? shapeArea(sh, m) : shapeLen(sh, m);
    const valTxt = val == null ? '—' : (isArea && sh.sign < 0 ? '−' : '') + f2(val) + `<small>${isArea ? 'm²' : 'm'}</small>`;
    const per = isArea ? shapeLen(sh, m) : null;
    const eye = sh.visible === false
      ? '<svg viewBox="0 0 24 24"><path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0112 6c5 0 9 6 9 6a15 15 0 01-3 3.4M6.4 7.6A15 15 0 003 12s4 6 9 6a9 9 0 004.2-1"/></svg>'
      : '<svg viewBox="0 0 24 24"><path d="M3 12s4-6 9-6 9 6 9 6-4 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/></svg>';
    let html = `<div class="item${sel ? ' selected' : ''}${isArea && sh.sign < 0 ? ' minus' : ''}${sh.visible === false ? ' hidden-shape' : ''}" data-id="${sh.id}">
      <div class="item-row">
        <label class="swatch" style="background:${sh.color}" title="Renk"><input type="color" value="${sh.color}" data-act="color"></label>
        <input class="item-name" value="${esc(sh.name)}" data-act="name" list="roomNames" spellcheck="false" aria-label="Ad">
        <span class="item-area">${valTxt}</span>
      </div>
      <div class="item-meta">`;
    if (isArea) {
      html += `<select data-act="cat" aria-label="Kategori">${CATS.map((c) => `<option${c === sh.cat ? ' selected' : ''}>${c}</option>`).join('')}</select>
        <span class="num">${per == null ? '' : 'Ç ' + f2(per) + ' m'}</span>`;
    } else {
      html += `<span>Mesafe · ${sh.pts.length - 1} parça</span>`;
    }
    html += `<span class="sp"></span>`;
    if (isArea) html += `<button class="mini${sh.sign < 0 ? ' on-minus' : ''}" data-act="sign" title="${sh.sign < 0 ? 'Bu alan toplamdan düşülüyor. Eklemek için tıklayın.' : 'Toplamdan düş (ör. şaft, boşluk)'}">${sh.sign < 0 ? '−' : '+'}</button>`;
    html += `<button class="mini" data-act="zoom" title="Plana yakınlaş"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/></svg></button>
        <button class="mini" data-act="vis" title="${sh.visible === false ? 'Göster' : 'Gizle'}">${eye}</button>
        <button class="mini del" data-act="del" title="Sil"><svg viewBox="0 0 24 24"><path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13"/></svg></button>
      </div>`;
    if (sel) {
      const n = isArea ? sh.pts.length : sh.pts.length - 1;
      html += '<div class="edges">';
      for (let i = 0; i < n; i++) {
        const a = sh.pts[i], b = sh.pts[(i + 1) % sh.pts.length];
        const L = dist(a, b);
        let ang = (Math.atan2(-(b.y - a.y), b.x - a.x) * 180) / Math.PI;
        ang = ((ang % 180) + 180) % 180;
        const dir = Math.abs(ang) < 0.5 || Math.abs(ang - 180) < 0.5 ? 'yatay' : Math.abs(ang - 90) < 0.5 ? 'dikey' : Math.round(ang) + '°';
        html += `<div class="e" data-edge="${i}"><span class="e-no">${i + 1}</span><span class="e-dir">${dir}</span><span class="e-len">${m ? f2(L * m) + ' m' : '—'}</span></div>`;
      }
      if (m) html += `<div class="e e-sum"><span></span><span>${isArea ? 'Çevre' : 'Toplam'}</span><span class="e-len">${f2(pathLen(sh.pts, isArea) * m)} m</span></div>`;
      if (m && isArea) html += `<div class="e e-sum"><span></span><span>Alan</span><span class="e-len">${f2(polyArea(sh.pts) * m * m)} m²</span></div>`;
      html += '</div>';
    }
    return html + '</div>';
  }

  function scrollToItem(id) {
    const el = document.querySelector(`.item[data-id="${id}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  const list = $('list');
  list.addEventListener('input', (e) => {
    const it = e.target.closest('.item'); if (!it) return;
    const sh = findShape(it.dataset.id); if (!sh) return;
    const act = e.target.dataset.act;
    if (act === 'name') { sh.name = e.target.value; invalidate(); autosave(); }
    if (act === 'color') { sh.color = e.target.value; it.querySelector('.swatch').style.background = sh.color; invalidate(); autosave(); }
  });
  list.addEventListener('focusin', (e) => {
    const it = e.target.closest('.item'); if (!it) return;
    if (e.target.dataset.act === 'name') {
      e.target.dataset.before = JSON.stringify({ i: S.pageIndex, pages: S.pages });
      e.target.dataset.orig = e.target.value;
    }
  });
  list.addEventListener('change', (e) => {
    const it = e.target.closest('.item'); if (!it) return;
    const sh = findShape(it.dataset.id); if (!sh) return;
    const act = e.target.dataset.act;
    if (act === 'name') {
      const t = e.target;
      if (t.dataset.before && t.dataset.orig !== t.value) { S.undo.push(t.dataset.before); S.redo = []; }
      const c = guessCat(sh.name);
      if (c && sh.cat === 'Net') sh.cat = c;
      list.dataset.force = '1'; changed(); delete list.dataset.force;
    } else if (act === 'cat') { snapshot(); sh.cat = e.target.value; changed(); }
    else if (act === 'color') { autosave(); }
  });
  list.addEventListener('click', (e) => {
    const it = e.target.closest('.item'); if (!it) return;
    const sh = findShape(it.dataset.id); if (!sh) return;
    const btn = e.target.closest('[data-act]');
    const act = btn && btn.dataset.act;
    if (act === 'del') return deleteShape(sh.id);
    if (act === 'vis') { snapshot(); sh.visible = sh.visible === false; if (!sh.visible && S.selected === sh.id) S.selected = null; changed(); return; }
    if (act === 'sign') { snapshot(); sh.sign = sh.sign < 0 ? 1 : -1; changed(); return; }
    if (act === 'zoom') { zoomToShape(sh); }
    if (S.selected !== sh.id) {
      S.selected = sh.id;
      if (act !== 'name' && act !== 'cat' && act !== 'color') { list.dataset.force = '1'; renderPanel(); delete list.dataset.force; }
      invalidate();
    }
  });
  list.addEventListener('mouseover', (e) => {
    const row = e.target.closest('.e[data-edge]');
    const it = e.target.closest('.item');
    const he = row && it ? { id: it.dataset.id, i: Number(row.dataset.edge) } : null;
    const hs = it ? it.dataset.id : null;
    if (JSON.stringify(he) !== JSON.stringify(S.hoverEdge) || hs !== S.hoverShape) { S.hoverEdge = he; S.hoverShape = hs; invalidate(); }
  });
  list.addEventListener('mouseleave', () => { S.hoverEdge = null; S.hoverShape = null; invalidate(); });

  function zoomToShape(sh) {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    sh.pts.forEach((p) => { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); });
    const w = stage.clientWidth, h = stage.clientHeight;
    const z = clamp(Math.min((w * 0.6) / Math.max(x1 - x0, 1), (h * 0.6) / Math.max(y1 - y0, 1)), S.fitZoom, S.fitZoom * 40);
    S.zoom = z;
    S.panX = w / 2 - ((x0 + x1) / 2) * z;
    S.panY = h / 2 - ((y0 + y1) / 2) * z;
    viewChanged();
  }

  function catTotals(p) {
    const m = mpuOf(p);
    if (!m) return null;
    const by = new Map();
    let total = 0, n = 0;
    for (const sh of p.shapes) {
      if (sh.kind !== 'area') continue;
      const a = polyArea(sh.pts) * m * m * (sh.sign < 0 ? -1 : 1);
      by.set(sh.cat, (by.get(sh.cat) || 0) + a);
      total += a; n++;
    }
    return { by, total, n };
  }

  function renderTotals() {
    const el = $('totals');
    const t = catTotals(ps());
    if (!t || !t.n) { el.innerHTML = ''; return; }
    let h = '';
    if (t.by.size > 1) for (const [c, v] of t.by) h += `<div class="t-row"><span>${esc(c)}</span><span class="num">${f2(v)} m²</span></div>`;
    h += `<div class="t-row t-grand"><span>${t.by.size === 1 ? 'Toplam · ' + esc([...t.by.keys()][0]) : 'Genel toplam'}</span><span class="num">${f2(t.total)} m²</span></div>`;
    el.innerHTML = h;
  }

  /* ---------------- disa aktarim ---------------- */
  function baseName() { return (S.file ? S.file.name.replace(/\.[^.]+$/, '') : 'plan'); }
  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }
  function tableRows() {
    const rows = [];
    const keys = Object.keys(S.pages).map(Number).sort((a, b) => a - b);
    for (const k of keys) {
      const p = S.pages[k], m = mpuOf(p);
      p.shapes.forEach((sh) => {
        if (sh.kind !== 'area') return;
        rows.push({
          page: k + 1, name: sh.name, cat: sh.cat, sign: sh.sign < 0 ? '−' : '+',
          area: m ? polyArea(sh.pts) * m * m * (sh.sign < 0 ? -1 : 1) : null,
          per: m ? pathLen(sh.pts, true) * m : null,
        });
      });
    }
    return rows;
  }
  function tableText(sep) {
    const rows = tableRows();
    const multi = S.pageCount > 1;
    const n = (v) => (v == null ? '' : nfX.format(v));
    const head = ['No', 'Ad', 'Kategori', 'İşlem', 'Alan (m²)', 'Çevre (m)'].concat(multi ? ['Sayfa'] : []);
    const q = (s) => (sep === ';' && /[;"\n]/.test(s) ? `"${String(s).replace(/"/g, '""')}"` : s);
    const lines = [head.join(sep)];
    rows.forEach((r, i) => lines.push([i + 1, q(r.name), r.cat, r.sign, n(r.area), n(r.per)].concat(multi ? [r.page] : []).join(sep)));
    const by = new Map(); let total = 0;
    rows.forEach((r) => { if (r.area != null) { by.set(r.cat, (by.get(r.cat) || 0) + r.area); total += r.area; } });
    lines.push('');
    for (const [c, v] of by) lines.push(['', `${c} toplam`, '', '', n(v), ''].join(sep));
    lines.push(['', 'Genel toplam', '', '', n(total), ''].join(sep));
    return { text: lines.join('\r\n'), count: rows.length };
  }
  async function copyTable() {
    const { text, count } = tableText('\t');
    if (!count) return toast('Kopyalanacak alan yok.', true);
    try { await navigator.clipboard.writeText(text); }
    catch (e) {
      const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    toast(`${count} alan kopyalandı. Excel'de bir hücreye yapıştırın.`);
  }
  function exportCsv() {
    const { text, count } = tableText(';');
    if (!count) return toast('Dışa aktarılacak alan yok.', true);
    download(new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' }), baseName() + '-alanlar.csv');
  }

  function exportPng() {
    if (!S.base) return toast('Önce bir plan açın.', true);
    const p = ps(), m = mpuOf(p);
    const bs = S.baseScale;
    const W = S.pdf ? S.base.width : S.docW, H = S.pdf ? S.base.height : S.docH;
    const u = Math.max(1, Math.max(W, H) / 1100);
    const shapes = p.shapes.filter((s) => s.visible !== false);
    const rowH = 24 * u, pad = 28 * u;
    const t = catTotals(p);
    const legendRows = shapes.length + (t && t.n ? t.by.size + 1 : 0);
    const legendH = shapes.length ? pad * 2 + 30 * u + legendRows * rowH : 0;
    const c = document.createElement('canvas');
    c.width = W; c.height = Math.round(H + legendH);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(S.base, 0, 0, W, H);
    const k = S.pdf ? bs : 1;
    drawOverlays(ctx, (q) => ({ x: q.x * k, y: q.y * k }), u, false);
    if (legendH) {
      let y = H + pad;
      ctx.fillStyle = '#15190F'; ctx.fillRect(0, H, W, 2 * u);
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${15 * u}px Archivo, "Segoe UI", sans-serif`;
      ctx.fillText(`${baseName()}${S.pageCount > 1 ? ' · sayfa ' + (S.pageIndex + 1) : ''}${p.scale ? ' · ölçek ' + f2(p.scale.meters) + ' m referans' : ''}`, pad, y + 10 * u);
      y += 30 * u;
      const colR = Math.min(W - pad, pad + 640 * u);
      for (const sh of shapes) {
        const isA = sh.kind === 'area';
        const v = isA ? shapeArea(sh, m) : shapeLen(sh, m);
        ctx.fillStyle = sh.color; ctx.fillRect(pad, y + rowH / 2 - 6 * u, 12 * u, 12 * u);
        ctx.fillStyle = '#15190F'; ctx.textAlign = 'left';
        ctx.font = `500 ${13 * u}px Archivo, "Segoe UI", sans-serif`;
        ctx.fillText(sh.name, pad + 22 * u, y + rowH / 2);
        ctx.fillStyle = '#4A5241';
        ctx.fillText(isA ? sh.cat + (sh.sign < 0 ? ' (düşülür)' : '') : 'mesafe', pad + 260 * u, y + rowH / 2);
        ctx.fillStyle = '#15190F'; ctx.textAlign = 'right';
        ctx.font = `600 ${13 * u}px ui-monospace, "Cascadia Mono", Consolas, monospace`;
        ctx.fillText(v == null ? '—' : (isA && sh.sign < 0 ? '−' : '') + f2(v) + (isA ? ' m²' : ' m'), colR, y + rowH / 2);
        y += rowH;
      }
      if (t && t.n) {
        ctx.fillStyle = '#C4CCB5'; ctx.fillRect(pad, y + 2 * u, colR - pad, 1 * u);
        for (const [cat, v] of t.by) {
          ctx.textAlign = 'left'; ctx.fillStyle = '#4A5241'; ctx.font = `500 ${13 * u}px Archivo, "Segoe UI", sans-serif`;
          ctx.fillText(cat + ' toplam', pad + 22 * u, y + rowH / 2 + 4 * u);
          ctx.textAlign = 'right'; ctx.fillStyle = '#15190F'; ctx.font = `600 ${13 * u}px ui-monospace, "Cascadia Mono", Consolas, monospace`;
          ctx.fillText(f2(v) + ' m²', colR, y + rowH / 2 + 4 * u);
          y += rowH;
        }
        ctx.textAlign = 'left'; ctx.fillStyle = '#15190F'; ctx.font = `700 ${14 * u}px Archivo, "Segoe UI", sans-serif`;
        ctx.fillText('Genel toplam', pad + 22 * u, y + rowH / 2 + 4 * u);
        ctx.textAlign = 'right'; ctx.fillStyle = '#5B3D96'; ctx.font = `700 ${15 * u}px ui-monospace, "Cascadia Mono", Consolas, monospace`;
        ctx.fillText(f2(t.total) + ' m²', colR, y + rowH / 2 + 4 * u);
      }
    }
    c.toBlob((b) => { download(b, `${baseName()}${S.pageCount > 1 ? '-s' + (S.pageIndex + 1) : ''}-olcum.png`); toast('Görsel indirildi.'); }, 'image/png');
  }

  function b64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function saveProject() {
    if (!S.file) return toast('Kaydedilecek plan yok.', true);
    const data = { app: 'takbis-olcum', v: 1, file: { name: S.file.name, type: S.file.type, data: b64(S.file.bytes) }, pages: S.pages };
    download(new Blob([JSON.stringify(data)], { type: 'application/json' }), baseName() + '.olcum');
    toast('Proje kaydedildi: plan ve tüm ölçümler tek dosyada.');
  }
  async function openProject(file) {
    try {
      const data = JSON.parse(await file.text());
      if (!['takbis-olcum', 'elifcad'].includes(data.app) || !data.file) throw new Error('Ölçüm proje dosyası değil');
      const bin = atob(data.file.data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const f = new File([bytes], data.file.name, { type: data.file.type });
      await openFile(f, data.pages || {});
      autosave();
      toast('Proje açıldı.');
    } catch (e) {
      toast('Proje açılamadı: ' + e.message, true);
    }
  }

  /* ---------------- bildirim ---------------- */
  let toastTimer = 0;
  function toast(msg, bad) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.toggle('bad', !!bad);
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), bad ? 4200 : 2600);
  }

  /* ---------------- baglantilar ---------------- */
  document.querySelectorAll('.tool[data-tool]').forEach((b) => b.addEventListener('click', () => { if (S.base) setTool(b.dataset.tool); }));
  $('btnUndo').onclick = undo;
  $('btnRedo').onclick = redo;
  $('btnOpen').onclick = $('btnOpen2').onclick = () => $('fileInput').click();
  $('fileInput').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) openFile(f); };
  $('btnLoad').onclick = () => $('projInput').click();
  $('projInput').onchange = (e) => { const f = e.target.files[0]; e.target.value = ''; if (f) openProject(f); };
  $('btnSave').onclick = saveProject;
  $('btnCopy').onclick = copyTable;
  $('btnCsv').onclick = exportCsv;
  $('btnPng').onclick = exportPng;
  $('btnRecal').onclick = () => setTool('calibrate');
  $('pagePrev').onclick = () => S.pageIndex > 0 && showPage(S.pageIndex - 1);
  $('pageNext').onclick = () => S.pageIndex < S.pageCount - 1 && showPage(S.pageIndex + 1);
  $('zoomFit').onclick = fit;
  $('zoomIn').onclick = () => zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 1.25);
  $('zoomOut').onclick = () => zoomAt(stage.clientWidth / 2, stage.clientHeight / 2, 0.8);
  $('optEdges').onchange = (e) => { S.opts.edges = e.target.checked; savePrefs(); invalidate(); };
  $('optLoupe').onchange = (e) => { S.opts.loupe = e.target.checked; savePrefs(); invalidate(); };
  function savePrefs() { try { localStorage.setItem('takbis_olcum_prefs', JSON.stringify(S.opts)); } catch (e) { /* */ } }
  try {
    const pr = JSON.parse(localStorage.getItem('takbis_olcum_prefs') || 'null');
    if (pr) { Object.assign(S.opts, pr); $('optEdges').checked = S.opts.edges; $('optLoupe').checked = S.opts.loupe; }
  } catch (e) { /* */ }

  // surukle birak
  let dragDepth = 0;
  stage.addEventListener('dragenter', (e) => { e.preventDefault(); dragDepth++; $('dropHint').hidden = false; stage.classList.add('dragging'); });
  stage.addEventListener('dragover', (e) => e.preventDefault());
  stage.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; $('dropHint').hidden = true; stage.classList.remove('dragging'); } });
  stage.addEventListener('drop', (e) => {
    e.preventDefault(); dragDepth = 0; $('dropHint').hidden = true; stage.classList.remove('dragging');
    const f = e.dataTransfer.files[0];
    if (f) openFile(f);
  });
  // panodan gorsel
  document.addEventListener('paste', (e) => {
    if (isField(e.target)) return;
    const item = [...(e.clipboardData || {}).items || []].find((i) => i.type.startsWith('image/'));
    if (!item) return;
    const blob = item.getAsFile();
    const d = new Date();
    const name = `Pano ${d.toLocaleDateString('tr-TR')} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}.png`;
    openFile(new File([blob], name, { type: blob.type || 'image/png' }));
  });
  window.addEventListener('blur', () => { S.space = false; updateCursor(); });

  // fontlar gelince tuval etiketlerini yeniden olc
  if (document.fonts) document.fonts.ready.then(invalidate);

  renderPanel();
  syncUndoButtons();
  setTool('select');
  window.__olcum = S; // hata ayiklama icin
})();
