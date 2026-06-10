/**
 * Ücretsiz konum servisleri entegrasyonu:
 *  - TKGM CBS Parsel API  → pafta, yüzölçüm, nitelik, parsel geometrisi, merkez koordinat
 *  - Nominatim (OSM)      → koordinattan açık adres (ters geokodlama)
 *  - Overpass (OSM)       → yakın çevre analizi (okul, hastane, market, durak ...)
 *
 * Tüm sonuçlar bellekte önbelleklenir (TKGM'de IP başına hız limiti var).
 * Hiçbir kişisel veri dış servise gönderilmez; yalnızca il/ilçe/mahalle/ada/parsel
 * ve koordinat sorgulanır.
 */

const TKGM = 'https://cbsapi.tkgm.gov.tr/megsiswebapi.v3/api';
const UA_TKGM = { 'User-Agent': 'Mozilla/5.0 (TAKBIS-Reader; +https://takbis.arnexlab.com)' };
const UA_OSM = { 'User-Agent': 'TAKBIS-Reader/1.0 (+https://takbis.arnexlab.com)' };
const UA_NVI = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36' };

// ---- basit TTL önbelleği ----
const cache = new Map();
function cGet(k) {
  const e = cache.get(k);
  if (e && e.exp > Date.now()) return e.val;
  cache.delete(k);
  return undefined;
}
function cSet(k, val, ttlMs) {
  if (cache.size > 1000) cache.clear();
  cache.set(k, { val, exp: Date.now() + ttlMs });
}

async function jfetch(url, timeoutMs = 12000, headers = UA_TKGM) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers, signal: ctrl.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// "KÜÇÜKKUMLA" ~ "Küçükkumla Köyü" ~ "Bağlarbaşı Mahallesi" eşleştirme
function norm(s) {
  return String(s || '')
    .toLocaleUpperCase('tr-TR')
    .replace(/\s+(MAHALLESİ|MAHALLESI|MAH\.?|KÖYÜ|KOYU|KÖY)$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function tkgmListe(path, cacheKey, ttlMs) {
  let v = cGet(cacheKey);
  if (v) return v;
  const j = await jfetch(`${TKGM}/${path}`);
  v = (j.features || []).map((f) => ({ id: f.properties.id, ad: f.properties.text }));
  cSet(cacheKey, v, ttlMs);
  return v;
}

export async function parselSorgu({ il, ilce, mahalle, ada, parsel }) {
  const key = `p|${norm(il)}|${norm(ilce)}|${norm(mahalle)}|${ada}|${parsel}`;
  const hit = cGet(key);
  if (hit) return hit;

  const iller = await tkgmListe('idariYapi/ilListe', 'iller', 24 * 3600e3);
  const ilRec = iller.find((x) => norm(x.ad) === norm(il));
  if (!ilRec) throw new Error('TKGM: il bulunamadı: ' + il);

  const ilceler = await tkgmListe(`idariYapi/ilceListe/${ilRec.id}`, 'ilce' + ilRec.id, 24 * 3600e3);
  const ilceRec = ilceler.find((x) => norm(x.ad) === norm(ilce));
  if (!ilceRec) throw new Error('TKGM: ilçe bulunamadı: ' + ilce);

  const mahalleler = await tkgmListe(`idariYapi/mahalleListe/${ilceRec.id}`, 'mah' + ilceRec.id, 24 * 3600e3);
  const nm = norm(mahalle);
  const mahRec =
    mahalleler.find((x) => norm(x.ad) === nm) ||
    mahalleler.find((x) => norm(x.ad).includes(nm) || nm.includes(norm(x.ad)));
  if (!mahRec) throw new Error('TKGM: mahalle bulunamadı: ' + mahalle);

  const pj = await jfetch(`${TKGM}/parsel/${mahRec.id}/${encodeURIComponent(ada)}/${encodeURIComponent(parsel)}`);
  if (!pj || !pj.properties) throw new Error('TKGM: parsel bulunamadı');
  const p = pj.properties;

  let merkez = null;
  let geometry = null;
  if (pj.geometry && Array.isArray(pj.geometry.coordinates)) {
    geometry = pj.geometry;
    const ring = pj.geometry.type === 'MultiPolygon'
      ? pj.geometry.coordinates[0]?.[0]
      : pj.geometry.coordinates[0];
    if (Array.isArray(ring) && ring.length) {
      const lat = ring.reduce((s, c) => s + c[1], 0) / ring.length;
      const lon = ring.reduce((s, c) => s + c[0], 0) / ring.length;
      merkez = { lat: +lat.toFixed(6), lon: +lon.toFixed(6) };
    }
  }

  const out = {
    pafta: p.pafta || '',
    alan: p.alan || '',
    nitelik: p.nitelik || '',
    zeminKmdurum: p.zeminKmdurum || '',
    mevkii: p.mevkii || '',
    ilAd: p.ilAd || '',
    ilceAd: p.ilceAd || '',
    mahalleAd: p.mahalleAd || '',
    adaNo: p.adaNo || '',
    parselNo: p.parselNo || '',
    merkez,
    geometry,
  };
  cSet(key, out, 12 * 3600e3);
  return out;
}

// Nominatim ters geokodlama — koordinattan açık adres
export async function adresBul(lat, lon) {
  const key = `a|${lat}|${lon}`;
  const hit = cGet(key);
  if (hit) return hit;
  const j = await jfetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&accept-language=tr&zoom=17`,
    10000, UA_OSM,
  );
  const a = j.address || {};
  const out = {
    adres: j.display_name || '',
    yol: a.road || '',
    semt: a.suburb || a.neighbourhood || a.village || '',
  };
  cSet(key, out, 7 * 24 * 3600e3);
  return out;
}

// Overpass — yakın çevredeki önemli noktalar (kategori başına en yakını)
// Katalog istemcidekiyle aynı anahtarları kullanır (bu uç yalnızca yedek;
// asıl sorgu kullanıcının tarayıcısından yapılır).
const KATALOG = [
  { k: 'okul', l: 'Okul', s: ['amenity=school'], t: (x) => x.amenity === 'school' },
  { k: 'universite', l: 'Üniversite', s: ['amenity=university'], t: (x) => x.amenity === 'university' },
  { k: 'hastane', l: 'Hastane', s: ['amenity=hospital'], t: (x) => x.amenity === 'hospital' },
  { k: 'saglik', l: 'Sağlık Kuruluşu', s: ['amenity=clinic', 'amenity=doctors'], t: (x) => ['clinic', 'doctors'].includes(x.amenity) },
  { k: 'eczane', l: 'Eczane', s: ['amenity=pharmacy'], t: (x) => x.amenity === 'pharmacy' },
  { k: 'cami', l: 'Cami', s: ['amenity=place_of_worship'], t: (x) => x.amenity === 'place_of_worship' && (!x.religion || x.religion === 'muslim') },
  { k: 'market', l: 'Market', s: ['shop=supermarket'], t: (x) => x.shop === 'supermarket' },
  { k: 'avm', l: 'AVM', s: ['shop=mall'], t: (x) => x.shop === 'mall' },
  { k: 'pazar', l: 'Pazar Yeri', s: ['amenity=marketplace'], t: (x) => x.amenity === 'marketplace' },
  { k: 'durak', l: 'Otobüs Durağı', s: ['highway=bus_stop'], t: (x) => x.highway === 'bus_stop' },
  { k: 'rayli', l: 'Metro/Tramvay', s: ['railway=station', 'railway=tram_stop'], t: (x) => ['station', 'tram_stop'].includes(x.railway) },
  { k: 'park', l: 'Park', s: ['leisure=park'], t: (x) => x.leisure === 'park' },
  { k: 'banka', l: 'Banka', s: ['amenity=bank'], t: (x) => x.amenity === 'bank' },
  { k: 'atm', l: 'ATM', s: ['amenity=atm'], t: (x) => x.amenity === 'atm' },
  { k: 'polis', l: 'Polis', s: ['amenity=police'], t: (x) => x.amenity === 'police' },
  { k: 'yakit', l: 'Benzin İstasyonu', s: ['amenity=fuel'], t: (x) => x.amenity === 'fuel' },
  { k: 'restoran', l: 'Restoran', s: ['amenity=restaurant'], t: (x) => x.amenity === 'restaurant' },
  { k: 'kafe', l: 'Kafe', s: ['amenity=cafe'], t: (x) => x.amenity === 'cafe' },
  { k: 'spor', l: 'Spor Tesisi', s: ['leisure=sports_centre', 'leisure=fitness_centre'], t: (x) => ['sports_centre', 'fitness_centre'].includes(x.leisure) },
  { k: 'postane', l: 'PTT/Postane', s: ['amenity=post_office'], t: (x) => x.amenity === 'post_office' },
];

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function cevreAnaliz(lat, lon, keys = [], radius = 1500) {
  radius = Math.min(Math.max(parseInt(radius, 10) || 1500, 200), 3000);
  const cats = KATALOG.filter((c) => !keys.length || keys.includes(c.k));
  if (!cats.length) return [];
  const key = `c|${(+lat).toFixed(4)}|${(+lon).toFixed(4)}|${radius}|${cats.map((c) => c.k).join(',')}`;
  const hit = cGet(key);
  if (hit) return hit;

  const sels = cats.flatMap((c) => c.s.map((s) => `nwr(around:${radius},${lat},${lon})[${s}];`)).join('\n');
  const q = `[out:json][timeout:25];(\n${sels}\n);out center 120;`;

  // POST + yedek aynalar (ana sunucu yoğun olduğunda 502 dönebiliyor)
  const MIRRORS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
  ];
  let j = null, sonHata = null;
  for (const host of MIRRORS) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 30000);
    try {
      const r = await fetch(host, {
        method: 'POST',
        headers: { ...UA_OSM, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(q),
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      j = await r.json();
      break;
    } catch (e) {
      sonHata = e;
    } finally {
      clearTimeout(t);
    }
  }
  if (!j) throw sonHata || new Error('Overpass erişilemedi');

  const best = {};
  for (const el of j.elements || []) {
    const elat = el.lat ?? el.center?.lat;
    const elon = el.lon ?? el.center?.lon;
    if (elat == null) continue;
    const tags = el.tags || {};
    const cat = cats.find((c) => c.t(tags));
    if (!cat) continue;
    const d = haversine(+lat, +lon, elat, elon);
    if (!best[cat.k] || d < best[cat.k].mesafe) {
      best[cat.k] = { tur: cat.l, ad: tags.name || '', mesafe: Math.round(d) };
    }
  }
  const list = Object.values(best).sort((a, b) => a.mesafe - b.mesafe);
  cSet(key, list, 7 * 24 * 3600e3);
  return list;
}

// ---------------------------------------------------------------------------
// NVİ Adres Veri Tabanı (UAVT) — koordinattan bağımsız bölümleri çek
// Captcha YOK (numarataj uçu). NVİ oturum cookie'si + anti-forgery token
// gerektirir; CORS kapalı olduğundan sunucu tarafından yapılır, önbelleklenir.
// ÖNEMLİ: NVİ parametreleri ters bekler -> latitude=BOYLAM, longitude=ENLEM.
// ---------------------------------------------------------------------------
import { ProxyAgent, fetch as ufetch } from 'undici';

const NVI_BASE = 'https://adres.nvi.gov.tr';

// F5 WAF bot tespitine karşı gerçek tarayıcı başlıkları
const NVI_BROWSER = {
  'User-Agent': UA_NVI['User-Agent'],
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
  'sec-ch-ua': '"Chromium";v="126", "Google Chrome";v="126", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
};

// ---- Ücretsiz Türkiye proxy listesi (NVİ devlet IP engelini aşmak için) ----
let workingProxy = null; // son çalışan proxy (öncelikli denenir)

async function trProxyListFresh() {
  const srcs = [
    'https://api.proxyscrape.com/v2/?request=getproxies&protocol=http&timeout=10000&country=tr',
    'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&country=tr&protocol=http&proxy_format=ipport&format=text',
    'https://proxylist.geonode.com/api/proxy-list?country=TR&protocols=http,https&limit=200&page=1&sort_by=lastChecked&sort_type=desc',
    'https://raw.githubusercontent.com/proxifly/free-proxy-list/main/proxies/countries/TR/data.txt',
    'https://raw.githubusercontent.com/TheSpeedX/PROXY-List/master/http.txt', // ülke filtresiz; doğrulama elerse kalanı TR
    'https://raw.githubusercontent.com/monosans/proxy-list/main/proxies/http.txt',
  ];
  const set = new Set();
  for (const s of srcs) {
    try {
      const r = await fetch(s, { headers: UA_OSM, signal: AbortSignal.timeout(10000) });
      const ct = r.headers.get('content-type') || '';
      if (ct.includes('json')) {
        const j = await r.json();
        for (const p of j.data || []) set.add(`${p.ip}:${p.port}`);
      } else {
        for (const line of (await r.text()).split(/\s+/)) {
          const m = line.replace(/^https?:\/\//, '').match(/^(\d+\.\d+\.\d+\.\d+:\d+)$/);
          if (m) set.add(m[1]);
        }
      }
    } catch { /* kaynak atlanır */ }
  }
  return [...set];
}

async function trProxyList() {
  const hit = cGet('trproxies');
  if (hit) return hit;
  const list = await trProxyListFresh();
  cSet('trproxies', list, 10 * 60e3);
  return list;
}

// ---- Arka plan proxy sağlık kontrolü: NVİ'ye erişebilen proxy havuzu ----
let goodProxies = [];       // NVİ auth'u geçen, doğrulanmış proxy'ler
let validating = false;

async function validateProxies() {
  if (validating) return;
  validating = true;
  try {
    const list = await trProxyListFresh();
    // önce mevcut iyi proxy'ler tekrar test edilsin, sonra yeniler
    const adaylar = [...new Set([...goodProxies, ...list])].slice(0, 40);
    const sonuc = await Promise.allSettled(
      adaylar.map(async (p) => {
        await nviAuthVia(agentFor(p)); // auth geçerse proxy NVİ'ye erişebiliyor
        return p;
      }),
    );
    const ok = sonuc.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    if (ok.length) goodProxies = ok.slice(0, 12);
  } catch { /* yoksay */ } finally {
    validating = false;
  }
}

// Açılışta + periyodik olarak (her 3 dk) proxy havuzunu tazele.
// Paralı proxy (NVI_PROXY) varsa serbest proxy doğrulamasına gerek yoktur.
if (!process.env.NVI_PROXY) {
  validateProxies();
  setInterval(validateProxies, 3 * 60e3).unref?.();
}

// NVİ oturumu (cookie + anti-forgery token) — verilen yol (proxy/doğrudan) üzerinden
async function nviAuthVia(dispatcher) {
  const base = dispatcher ? { dispatcher } : {};
  const pg = await ufetch(`${NVI_BASE}/VatandasIslemleri/AdresSorgu`, {
    ...base,
    headers: { ...NVI_BROWSER, 'Sec-Fetch-Dest': 'document', 'Sec-Fetch-Mode': 'navigate', 'Sec-Fetch-Site': 'none' },
    signal: AbortSignal.timeout(11000),
  });
  const cookie = (pg.headers.getSetCookie ? pg.headers.getSetCookie() : []).map((c) => c.split(';')[0]).join('; ');
  const token = ((await pg.text()).match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/) || [])[1] || '';
  if (!cookie || !token) throw new Error('oturum/token alınamadı');
  return { cookie, token };
}

// Tek koordinat için numarataj (bağımsız bölüm listesi) — NVİ parametreleri TERS
async function nviNumarataj(dispatcher, cookie, token, lat, lon) {
  const base = dispatcher ? { dispatcher } : {};
  const r = await ufetch(`${NVI_BASE}/Harita/NumaratajListesiByGeometry`, {
    ...base,
    method: 'POST',
    headers: {
      ...NVI_BROWSER,
      Accept: 'application/json, text/javascript, */*; q=0.01',
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      __RequestVerificationToken: token,
      Cookie: cookie,
      Origin: NVI_BASE,
      Referer: `${NVI_BASE}/VatandasIslemleri/AdresSorgu`,
    },
    body: `latitude=${lon}&longitude=${lat}`,
    signal: AbortSignal.timeout(11000),
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  if (!(r.headers.get('content-type') || '').includes('json')) throw new Error('engellendi');
  const j = await r.json();
  if (j && j.success === false) throw new Error(j.message || 'NVİ hata');
  return j;
}

// Bir yolu (proxy/doğrudan) tek noktayla dene: çalışırsa oturumu+sonucu döndür
async function routeTry(proxy, lat, lon) {
  const dispatcher = agentFor(proxy);
  const { cookie, token } = await nviAuthVia(dispatcher);
  const j = await nviNumarataj(dispatcher, cookie, token, lat, lon);
  return { proxy, dispatcher, cookie, token, j };
}

function parseBB(j) {
  const liste = [];
  for (const b of Array.isArray(j) ? j : []) {
    for (const x of b.bagimsizBolumler || []) {
      const a = x.acikAdresModel || {};
      liste.push({
        uavt: String(x.adresNo || a.adresNo || ''),
        kat: x.katNo || '',
        icKapi: x.icKapiNo || '',
        disKapi: String(x.disKapiNo || a.disKapiNo1 || ''),
        kullanim: x.yapiKullanimAmacFormatted || '',
        site: x.siteAdi || '',
        blok: x.blokAdi || '',
        adres: (a.acikAdresAciklama || '').replace(/\s+/g, ' ').trim(),
      });
    }
  }
  return liste;
}

const agentCache = new Map();
function agentFor(proxy) {
  if (!proxy) return null;
  if (!agentCache.has(proxy)) agentCache.set(proxy, new ProxyAgent('http://' + proxy));
  return agentCache.get(proxy);
}

// points: [[lat,lon], ...] — ilk nokta parsel merkezi; çok bloklu parsellerde
// farklı noktalar farklı blokları (A/B/C/D) yakalar.
export async function uavtSorgu(points, force = false) {
  if (!Array.isArray(points) || !points.length) throw new Error('Koordinat yok');
  const [lat0, lon0] = points[0];
  const key = `u|${(+lat0).toFixed(6)}|${(+lon0).toFixed(6)}|${points.length}`;
  if (force) {
    // "Tekrar sorgula": önbelleği, proxy listesini ve çalışan proxy'yi sıfırla → sıfırdan dene
    cache.delete(key);
    cache.delete('trproxies');
    workingProxy = null;
  } else {
    const hit = cGet(key);
    if (hit) return hit;
  }

  // Paralı proxy (NVI_PROXY): auth+userinfo dahil "user:pass@host:port" biçimi
  const PAID = process.env.NVI_PROXY ? process.env.NVI_PROXY.replace(/^https?:\/\//, '') : null;

  // 1) Çalışan yolu bul.
  let candidates = [];
  if (PAID) {
    // Paralı proxy önce (oynaklığa karşı 3 şans), sonra doğrudan yedek
    candidates = [PAID, PAID, PAID, null];
  } else {
    const ekle = (p) => { if (!candidates.includes(p)) candidates.push(p); };
    for (const p of goodProxies) ekle(p);   // doğrulanmış havuz
    if (workingProxy) ekle(workingProxy);
    ekle(null);                              // doğrudan
    for (const p of await trProxyList()) ekle(p);
    candidates = candidates.slice(0, 20);
  }

  let route;
  try {
    route = await Promise.any(candidates.map((p) => routeTry(p, lat0, lon0)));
  } catch {
    if (!PAID) validateProxies(); // serbest havuzu arka planda tazele
    throw new Error('NVİ tüm yollardan engellendi/erişilemedi — birkaç saniye sonra "Tekrar sorgula" deyin');
  }
  workingProxy = route.proxy; // çalışan yolu hatırla

  // 2) Diğer noktaları birden çok yola (proxy) DAĞITARAK sorgula. Tek flaky
  //    proxy'ye 28 paralel istek atmak çoğunu düşürüyordu; bu yüzden ek
  //    doğrulanmış proxy'lerden de oturum açıp yükü bölüyoruz ve eşzamanlılığı
  //    sınırlıyoruz. Başarısız noktalar tekrar denenir.
  const workers = [route];
  const withT = (pr, ms) => Promise.race([pr, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);
  // Doğrudan erişim çalışıyorsa (route.proxy === null) ek yola GEREK YOK.
  // Proxy üzerinden gidiyorsak yükü bölmek için ek oturumlar/işçiler aç:
  //  - Paralı proxy: aynı proxy üzerinden 3 ek bağımsız oturum (rotating exit)
  //  - Serbest proxy: doğrulanmış havuzdan farklı proxy'ler
  if (route.proxy) {
    const ekUcler = PAID
      ? [PAID, PAID, PAID]
      : goodProxies.filter((p) => p && p !== route.proxy).slice(0, 4);
    const ekRoutes = await Promise.allSettled(
      ekUcler.map(async (p) => {
        const { cookie, token } = await withT(nviAuthVia(agentFor(p)), 8000);
        return { proxy: p, dispatcher: agentFor(p), cookie, token };
      }),
    );
    for (const r of ekRoutes) if (r.status === 'fulfilled') workers.push(r.value);
  }

  const tumJson = [route.j];
  const kalan = points.slice(1);
  if (kalan.length) {
    let idx = 0;
    // Doğrudan erişimde yüksek paralellik; proxy üzerinden sınırlı (proxy'yi boğma)
    const C = route.proxy ? Math.min(8, Math.max(4, workers.length * 2)) : 12;
    async function slot() {
      while (idx < kalan.length) {
        const i = idx++;
        const [la, lo] = kalan[i];
        let ok = false;
        for (let deneme = 0; deneme < 2 && !ok; deneme++) {
          const w = workers[(i + deneme) % workers.length];
          try {
            tumJson.push(await nviNumarataj(w.dispatcher, w.cookie, w.token, la, lo));
            ok = true;
          } catch { /* sonraki worker ile tekrar */ }
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(C, kalan.length) }, slot));
  }

  // 3) Birleştir + UAVT'ye göre tekilleştir
  const seen = new Set();
  const liste = [];
  for (const j of tumJson) {
    for (const bb of parseBB(j)) {
      if (!bb.uavt || seen.has(bb.uavt)) continue;
      seen.add(bb.uavt);
      liste.push(bb);
    }
  }
  // Blok, sonra kat, sonra iç kapıya göre sırala
  liste.sort((a, b) =>
    String(a.blok).localeCompare(String(b.blok), 'tr') ||
    (parseInt(a.kat) || 0) - (parseInt(b.kat) || 0) ||
    String(a.icKapi).localeCompare(String(b.icKapi), 'tr', { numeric: true }));
  cSet(key, liste, 6 * 3600e3);
  return liste;
}
