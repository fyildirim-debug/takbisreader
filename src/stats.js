/**
 * Ziyaret istatistikleri + KVKK/5651 amaçlı erişim kayıtları.
 *
 * - PDF içerikleri / takyidat verileri SAKLANMAZ.
 * - Yasal saklama yükümlülüğü (KVKK / 5651) kapsamında erişim kayıtları
 *   tutulur: IP adresi, tarih-saat, tarayıcı (User-Agent), yapılan işlem.
 *   Kayıtlar DATA_DIR/access.jsonl dosyasına eklenir; sayaçlar
 *   DATA_DIR/stats.json'da tutulur. Kalıcılık için Dokploy'da /app/data
 *   dizinine volume bağlayın.
 * - Sağlık kontrolü (/healthz) ve bot/monitör istekleri ziyaret SAYILMAZ
 *   (kendi kendine artan sayaç sorununu önler); bunlar yalnızca erişim
 *   kaydına "bot" olarak düşülür.
 */
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
const STATS_FILE = path.join(DATA_DIR, 'stats.json');
const ACCESS_FILE = path.join(DATA_DIR, 'access.jsonl');

function emptyStats() {
  return {
    totalVisits: 0,
    parseRequests: 0,
    totalParsed: 0,
    botHits: 0,
    firstSeen: new Date().toISOString(),
    lastVisit: null,
    daily: {}, // 'YYYY-MM-DD' -> { visits, parsed, uniq }
    visitors: {}, // ip -> { count, first, last, lastDay, ua }
  };
}

let stats = load();
let saveTimer = null;

function load() {
  try {
    return Object.assign(emptyStats(), JSON.parse(fs.readFileSync(STATS_FILE, 'utf8')));
  } catch {
    return emptyStats();
  }
}
function save() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats));
  } catch { /* yoksay */ }
}
function scheduleSave() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => { saveTimer = null; save(); }, 2000);
}
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

// Bot / izleme araçları: ziyaret sayılmaz, erişim kaydına "bot" düşülür
const BOT_RE = /bot|crawler|spider|curl|wget|python-requests|go-http|headless|uptime|monitor|pingdom|statuscake|healthcheck/i;
export function isBot(ua) { return BOT_RE.test(String(ua || '')); }

// Erişim kaydı (append-only JSONL): KVKK/5651 amaçlı
function appendAccess(entry) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.appendFileSync(ACCESS_FILE, JSON.stringify(entry) + '\n');
  } catch { /* yoksay */ }
}

export function recordVisit(ip, ua) {
  const now = new Date();
  const iso = now.toISOString();
  ip = String(ip || '').replace(/^::ffff:/, '');
  ua = String(ua || '');

  if (isBot(ua)) {
    stats.botHits++;
    appendAccess({ ts: iso, tip: 'bot', ip, ua });
    scheduleSave();
    return;
  }

  appendAccess({ ts: iso, tip: 'ziyaret', ip, ua });

  const dk = dayKey(now);
  stats.totalVisits++;
  stats.lastVisit = iso;
  const d = (stats.daily[dk] = stats.daily[dk] || { visits: 0, parsed: 0, uniq: 0 });
  d.visits++;
  const v = stats.visitors[ip] || { count: 0, first: iso, last: iso, lastDay: '' };
  v.count++; v.last = iso; v.ua = ua;
  if (v.lastDay !== dk) { d.uniq++; v.lastDay = dk; }
  stats.visitors[ip] = v;
  scheduleSave();
}

export function recordParse(count, ip, ua, dosyalar = []) {
  const iso = new Date().toISOString();
  ip = String(ip || '').replace(/^::ffff:/, '');
  appendAccess({ ts: iso, tip: 'pdf', ip, ua: String(ua || ''), adet: count || 1, dosyalar: dosyalar.slice(0, 20) });

  const dk = dayKey();
  stats.parseRequests++;
  stats.totalParsed += count || 1;
  const d = (stats.daily[dk] = stats.daily[dk] || { visits: 0, parsed: 0, uniq: 0 });
  d.parsed += count || 1;
  scheduleSave();
}

// User-Agent'ı kısa, okunur metne çevir: "Chrome · Windows · Mobil"
export function uaToText(ua = '') {
  ua = String(ua);
  if (!ua) return '—';
  let b = 'Diğer';
  if (/edg(a|ios)?\//i.test(ua)) b = 'Edge';
  else if (/opr\/|opera/i.test(ua)) b = 'Opera';
  else if (/samsungbrowser/i.test(ua)) b = 'Samsung Internet';
  else if (/firefox\//i.test(ua)) b = 'Firefox';
  else if (/chrome\//i.test(ua)) b = 'Chrome';
  else if (/safari\//i.test(ua)) b = 'Safari';
  else if (/wget|curl|python|bot|spider|crawler/i.test(ua)) b = 'Bot/Araç';
  let os = '';
  if (/windows nt/i.test(ua)) os = 'Windows';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
  else if (/mac os x/i.test(ua)) os = 'macOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  const mob = /mobile/i.test(ua) && !/ipad/i.test(ua) ? ' · Mobil' : '';
  return b + (os ? ' · ' + os : '') + mob;
}

// Erişim kaydının son N satırını oku (en yeni başta)
function accessTail(n = 100) {
  try {
    const st = fs.statSync(ACCESS_FILE);
    const size = Math.min(st.size, 512 * 1024); // en fazla son 512KB
    const fd = fs.openSync(ACCESS_FILE, 'r');
    const buf = Buffer.alloc(size);
    fs.readSync(fd, buf, 0, size, st.size - size);
    fs.closeSync(fd);
    const lines = buf.toString('utf8').split('\n').filter(Boolean);
    return lines.slice(-n).reverse().map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  } catch {
    return [];
  }
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
  const visitors = Object.entries(stats.visitors).map(([ip, v]) => ({ ip, ...v }));
  const days14 = lastNDays(14);
  const last7 = lastNDays(7).reduce((s, d) => s + d.visits, 0);
  const today = stats.daily[dayKey()] || { visits: 0, parsed: 0, uniq: 0 };
  return {
    totalVisits: stats.totalVisits,
    uniqueVisitors: visitors.length,
    returningVisitors: visitors.filter((v) => v.count > 1).length,
    totalParsed: stats.totalParsed,
    parseRequests: stats.parseRequests,
    botHits: stats.botHits || 0,
    lastVisit: stats.lastVisit,
    firstSeen: stats.firstSeen,
    todayVisits: today.visits,
    todayUniq: today.uniq,
    todayParsed: today.parsed,
    last7Visits: last7,
    daily: days14,
    visitorList: visitors.sort((a, b) => String(b.last).localeCompare(String(a.last))).slice(0, 100),
    sonKayitlar: accessTail(100),
  };
}

// ---------------------------------------------------------------------------
// İstatistik sayfası (HTML)
// ---------------------------------------------------------------------------
function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' }); } catch { return iso; }
}
function escH(s) { return String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

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

  const visitorRows = s.visitorList.map((v) => `<tr>
    <td class="mono">${escH(v.ip)}</td><td>${v.count}</td>
    <td>${fmtDate(v.first)}</td><td>${fmtDate(v.last)}</td>
    <td>${escH(uaToText(v.ua))}</td></tr>`).join('') ||
    '<tr><td colspan="5" class="dim">Kayıt yok</td></tr>';

  const logRows = s.sonKayitlar.map((k) => {
    const tip = k.tip === 'pdf'
      ? `PDF İşleme (${k.adet || 1})${k.dosyalar?.length ? ': ' + escH(k.dosyalar.join(', ')) : ''}`
      : k.tip === 'bot' ? 'Bot/İzleme' : 'Ziyaret';
    const cls = k.tip === 'pdf' ? 'tp' : k.tip === 'bot' ? 'tb' : 'tz';
    return `<tr><td>${fmtDate(k.ts)}</td><td class="mono">${escH(k.ip)}</td>
      <td><span class="chip ${cls}">${tip}</span></td><td>${escH(uaToText(k.ua))}</td></tr>`;
  }).join('') || '<tr><td colspan="4" class="dim">Kayıt yok</td></tr>';

  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>TAKBIS — İstatistikler</title>
<style>
  :root{--bg:#0f172a;--card:#1e293b;--card2:#273449;--line:#334155;--txt:#e2e8f0;--muted:#94a3b8;--accent:#38bdf8;--green:#22c55e;--amber:#f59e0b;--pink:#f0abfc;}
  *{box-sizing:border-box;} body{margin:0;background:var(--bg);color:var(--txt);font-family:"Segoe UI",system-ui,sans-serif;}
  header{padding:18px 28px;border-bottom:1px solid var(--line);display:flex;align-items:center;gap:12px;background:linear-gradient(90deg,#0c1a33,#0f172a);}
  header h1{font-size:18px;margin:0;} header .sub{color:var(--muted);font-size:12px;}
  .wrap{max-width:1100px;margin:0 auto;padding:24px 20px 60px;}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:14px;margin-bottom:26px;}
  .card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px;}
  .card .cv{font-size:28px;font-weight:800;color:var(--accent);line-height:1.1;}
  .card .cl{color:var(--muted);font-size:13px;margin-top:6px;}
  .card .cs{color:#64748b;font-size:11px;margin-top:3px;}
  .panel{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:18px 20px;margin-bottom:22px;}
  .panel h2{font-size:14px;margin:0 0 14px;color:var(--accent);text-transform:uppercase;letter-spacing:.5px;}
  .chart{display:flex;align-items:flex-end;gap:8px;height:170px;padding-top:18px;}
  .bar{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;}
  .bfill{width:70%;max-width:34px;background:linear-gradient(180deg,var(--accent),#0ea5e9);border-radius:5px 5px 0 0;min-height:2px;}
  .bcount{font-size:11px;color:var(--muted);margin-bottom:4px;}
  .blabel{font-size:10px;color:#64748b;margin-top:6px;white-space:nowrap;}
  table{width:100%;border-collapse:collapse;font-size:12.5px;}
  th,td{text-align:left;padding:7px 9px;border:1px solid var(--line);vertical-align:top;}
  th{background:var(--card2);color:var(--muted);font-weight:600;white-space:nowrap;}
  .mono{font-family:Consolas,monospace;font-size:12px;color:#7dd3fc;white-space:nowrap;}
  .dim{color:var(--muted);font-style:italic;}
  .chip{display:inline-block;padding:1px 8px;border-radius:99px;font-size:11px;font-weight:700;}
  .chip.tz{background:#1e3a5f;color:#7dd3fc;} .chip.tp{background:#143824;color:#86efac;} .chip.tb{background:#3a2e10;color:#fcd34d;}
  .note{color:#64748b;font-size:11.5px;text-align:center;margin-top:20px;line-height:1.7;}
  .top{display:flex;gap:10px;align-items:center;margin-bottom:18px;}
  .top a{margin-left:auto;color:var(--accent);text-decoration:none;font-size:13px;border:1px solid var(--line);padding:6px 12px;border-radius:7px;}
  .top a:hover{border-color:var(--accent);}
  .scroll{max-height:420px;overflow:auto;border-radius:8px;}
</style></head><body>
<header><div style="font-size:24px">📊</div><div><h1>TAKBIS İstatistikleri</h1><div class="sub">Yönetici paneli · ${fmtDate(new Date().toISOString())}</div></div></header>
<div class="wrap">
  <div class="top"><a href="/stats">↻ Yenile</a></div>
  <div class="grid">
    ${card('Toplam Ziyaret', s.totalVisits)}
    ${card('Tekil Ziyaretçi', s.uniqueVisitors, 'farklı IP')}
    ${card('Tekrar Eden', s.returningVisitors)}
    ${card('Bugün', s.todayVisits, s.todayUniq + ' tekil')}
    ${card('Son 7 Gün', s.last7Visits, 'ziyaret')}
    ${card('İşlenen PDF', s.totalParsed, s.parseRequests + ' işlem')}
    ${card('Bot/İzleme', s.botHits, 'sayılmayan istek')}
  </div>
  <div class="panel"><h2>Son 14 Gün — Günlük Ziyaret</h2><div class="chart">${bars}</div></div>
  <div class="panel"><h2>👥 Ziyaretçiler (IP Bazında)</h2><div class="scroll">
    <table><thead><tr><th>IP Adresi</th><th>Ziyaret</th><th>İlk Giriş</th><th>Son Giriş</th><th>Tarayıcı / Cihaz</th></tr></thead>
    <tbody>${visitorRows}</tbody></table></div></div>
  <div class="panel"><h2>🗂️ Erişim Kayıtları — KVKK/5651 (son 100)</h2><div class="scroll">
    <table><thead><tr><th>Tarih · Saat</th><th>IP Adresi</th><th>İşlem</th><th>Tarayıcı / Cihaz</th></tr></thead>
    <tbody>${logRows}</tbody></table></div></div>
  <div class="note">🔒 Yüklenen PDF içerikleri ve takyidat verileri sunucuda saklanmaz.<br>
  Erişim kayıtları (IP, tarih-saat, tarayıcı, işlem) yasal saklama yükümlülüğü (KVKK / 5651 sayılı Kanun) kapsamında tutulur.<br>
  Sağlık kontrolü ve bot/izleme istekleri ziyaret sayılarına dahil edilmez.</div>
</div></body></html>`;
}
