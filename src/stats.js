/**
 * Basit, gizliliğe saygılı ziyaret istatistikleri.
 *
 * - Sadece anonim sayaçlar tutulur: toplam ziyaret, tekil ziyaretçi (IP'nin
 *   SHA-256 hash'i — ham IP ASLA saklanmaz), günlük dökümler, işlenen PDF sayısı.
 * - Yüklenen PDF içerikleri / takyidat verileri burada da saklanmaz.
 * - Veriler DATA_DIR/stats.json dosyasında tutulur (kalıcılık için Dokploy'da
 *   /app/data dizinine bir volume bağlayın).
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'stats.json');

function emptyStats() {
  return {
    totalVisits: 0,
    parseRequests: 0,
    totalParsed: 0,
    firstSeen: new Date().toISOString(),
    lastVisit: null,
    daily: {}, // 'YYYY-MM-DD' -> { visits, parsed, uniq }
    visitors: {}, // iphash -> { count, first, last, lastDay }
  };
}

let stats = load();
let saveTimer = null;

function load() {
  try {
    return Object.assign(emptyStats(), JSON.parse(fs.readFileSync(FILE, 'utf8')));
  } catch {
    return emptyStats();
  }
}
function save() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(stats));
  } catch (e) {
    /* yoksay */
  }
}
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; save(); }, 2000);
}

// Süreç kapanırken (Docker stop / SIGTERM) bekleyen veriyi diske yaz
function flushNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  save();
}
let exiting = false;
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { if (exiting) return; exiting = true; flushNow(); process.exit(0); });
}
process.on('beforeExit', flushNow);

function dayKey(d = new Date()) { return d.toISOString().slice(0, 10); }
function ipHash(ip) {
  return crypto.createHash('sha256').update(String(ip) + '|takbis-salt').digest('hex').slice(0, 16);
}

export function recordVisit(ip) {
  const now = new Date();
  const iso = now.toISOString();
  const dk = dayKey(now);
  stats.totalVisits++;
  stats.lastVisit = iso;
  if (!stats.firstSeen) stats.firstSeen = iso;
  const d = (stats.daily[dk] = stats.daily[dk] || { visits: 0, parsed: 0, uniq: 0 });
  d.visits++;
  const h = ipHash(ip);
  const v = stats.visitors[h] || { count: 0, first: iso, last: iso, lastDay: '' };
  v.count++; v.last = iso;
  if (v.lastDay !== dk) { d.uniq++; v.lastDay = dk; }
  stats.visitors[h] = v;
  scheduleSave();
}

export function recordParse(count) {
  const dk = dayKey();
  stats.parseRequests++;
  stats.totalParsed += count || 1;
  const d = (stats.daily[dk] = stats.daily[dk] || { visits: 0, parsed: 0, uniq: 0 });
  d.parsed += count || 1;
  scheduleSave();
}

function lastNDays(n) {
  const out = [];
  const today = new Date(dayKey() + 'T00:00:00Z');
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const k = d.toISOString().slice(0, 10);
    const e = stats.daily[k] || { visits: 0, parsed: 0, uniq: 0 };
    out.push({ date: k, visits: e.visits, parsed: e.parsed, uniq: e.uniq });
  }
  return out;
}

export function snapshot() {
  const visitors = Object.values(stats.visitors);
  const days14 = lastNDays(14);
  const last7 = lastNDays(7).reduce((s, d) => s + d.visits, 0);
  const todayKey = dayKey();
  const today = stats.daily[todayKey] || { visits: 0, parsed: 0, uniq: 0 };
  return {
    totalVisits: stats.totalVisits,
    uniqueVisitors: visitors.length,
    returningVisitors: visitors.filter((v) => v.count > 1).length,
    totalParsed: stats.totalParsed,
    parseRequests: stats.parseRequests,
    lastVisit: stats.lastVisit,
    firstSeen: stats.firstSeen,
    todayVisits: today.visits,
    todayUniq: today.uniq,
    todayParsed: today.parsed,
    last7Visits: last7,
    daily: days14,
  };
}

// ---------------------------------------------------------------------------
// İstatistik sayfası (HTML)
// ---------------------------------------------------------------------------
function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('tr-TR'); } catch { return iso; }
}

export function renderStatsPage() {
  const s = snapshot();
  const maxV = Math.max(1, ...s.daily.map((d) => d.visits));
  const bars = s.daily.map((d) => {
    const h = Math.round((d.visits / maxV) * 100);
    const label = d.date.slice(5).replace('-', '/');
    return `<div class="bar"><div class="bcount">${d.visits}</div><div class="bfill" style="height:${h}%"></div><div class="blabel">${label}</div></div>`;
  }).join('');

  const card = (label, value, sub) =>
    `<div class="card"><div class="cv">${value}</div><div class="cl">${label}</div>${sub ? `<div class="cs">${sub}</div>` : ''}</div>`;

  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>TAKBIS — İstatistikler</title>
<style>
  :root{--bg:#0f172a;--card:#1e293b;--card2:#273449;--line:#334155;--txt:#e2e8f0;--muted:#94a3b8;--accent:#38bdf8;--green:#22c55e;--amber:#f59e0b;--pink:#f0abfc;}
  *{box-sizing:border-box;} body{margin:0;background:var(--bg);color:var(--txt);font-family:"Segoe UI",system-ui,sans-serif;}
  header{padding:18px 28px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px;background:linear-gradient(90deg,#0c1a33,#0f172a);}
  header h1{font-size:18px;margin:0;} header .sub{color:var(--muted);font-size:12px;}
  .wrap{max-width:980px;margin:0 auto;padding:24px 20px 60px;}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px;margin-bottom:26px;}
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px;}
  .card .cv{font-size:30px;font-weight:800;color:var(--accent);line-height:1.1;}
  .card .cl{color:var(--muted);font-size:13px;margin-top:6px;}
  .card .cs{color:#64748b;font-size:11px;margin-top:3px;}
  .panel{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin-bottom:22px;}
  .panel h2{font-size:14px;margin:0 0 16px;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;}
  .chart{display:flex;align-items:flex-end;gap:8px;height:180px;padding-top:18px;}
  .bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;position:relative;}
  .bfill{width:70%;max-width:34px;background:linear-gradient(180deg,var(--accent),#0ea5e9);border-radius:5px 5px 0 0;min-height:2px;transition:.2s;}
  .bcount{font-size:11px;color:var(--muted);margin-bottom:4px;}
  .blabel{font-size:10px;color:#64748b;margin-top:6px;white-space:nowrap;}
  .kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:6px 24px;}
  .kv .row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px dotted #2b3a52;font-size:13.5px;}
  .kv .k{color:var(--muted);} .note{color:#64748b;font-size:11.5px;text-align:center;margin-top:20px;line-height:1.7;}
  .top{display:flex;gap:10px;align-items:center;margin-bottom:18px;}
  .top a{margin-left:auto;color:var(--accent);text-decoration:none;font-size:13px;border:1px solid var(--line);padding:6px 12px;border-radius:7px;}
  .top a:hover{border-color:var(--accent);}
</style></head><body>
<header><div style="font-size:24px">📊</div><div><h1>TAKBIS İstatistikleri</h1><div class="sub">Özel panel · ${fmtDate(new Date().toISOString())}</div></div></header>
<div class="wrap">
  <div class="top"><a href="/stats">↻ Yenile</a></div>
  <div class="grid">
    ${card('Toplam Ziyaret', s.totalVisits)}
    ${card('Tekil Ziyaretçi', s.uniqueVisitors, 'farklı kişi (IP)')}
    ${card('Tekrar Eden', s.returningVisitors, 'birden çok kez girenler')}
    ${card('Bugün Ziyaret', s.todayVisits, s.todayUniq + ' tekil')}
    ${card('Son 7 Gün', s.last7Visits, 'ziyaret')}
    ${card('İşlenen PDF', s.totalParsed, s.parseRequests + ' işlem')}
  </div>
  <div class="panel">
    <h2>Son 14 Gün — Günlük Ziyaret</h2>
    <div class="chart">${bars}</div>
  </div>
  <div class="panel">
    <h2>Detaylar</h2>
    <div class="kv">
      <div class="row"><span class="k">Son ziyaret</span><span>${fmtDate(s.lastVisit)}</span></div>
      <div class="row"><span class="k">İlk kayıt</span><span>${fmtDate(s.firstSeen)}</span></div>
      <div class="row"><span class="k">Bugün işlenen PDF</span><span>${s.todayParsed}</span></div>
      <div class="row"><span class="k">Toplam işlem (parse)</span><span>${s.parseRequests}</span></div>
    </div>
  </div>
  <div class="note">🔒 Gizlilik: Yüklenen PDF'ler / takyidat verileri sunucuda saklanmaz.<br>
  Burada yalnızca anonim ziyaret sayaçları tutulur; IP adresleri geri döndürülemez şekilde (SHA-256) hash'lenir.</div>
</div></body></html>`;
}
