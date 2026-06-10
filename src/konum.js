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
const NVI_BASE = 'https://adres.nvi.gov.tr';
let nviSession = { cookie: '', token: '', exp: 0 };

async function nviAuth() {
  if (nviSession.exp > Date.now() && nviSession.cookie && nviSession.token) return nviSession;
  const r = await fetch(`${NVI_BASE}/VatandasIslemleri/AdresSorgu`, { headers: UA_NVI });
  const cookies = (r.headers.getSetCookie ? r.headers.getSetCookie() : []).map((c) => c.split(';')[0]);
  const html = await r.text();
  const token = (html.match(/name="__RequestVerificationToken"[^>]*value="([^"]+)"/) || [])[1] || '';
  const cookie = cookies.join('; ');
  if (!cookie || !token) throw new Error('NVİ oturumu alınamadı');
  nviSession = { cookie, token, exp: Date.now() + 10 * 60e3 };
  return nviSession;
}

export async function uavtSorgu(lat, lon) {
  const key = `u|${(+lat).toFixed(6)}|${(+lon).toFixed(6)}`;
  const hit = cGet(key);
  if (hit) return hit;

  async function call() {
    const { cookie, token } = await nviAuth();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await fetch(`${NVI_BASE}/Harita/NumaratajListesiByGeometry`, {
        method: 'POST',
        headers: {
          ...UA_NVI,
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          __RequestVerificationToken: token,
          Cookie: cookie,
          Referer: `${NVI_BASE}/VatandasIslemleri/AdresSorgu`,
        },
        body: `latitude=${lon}&longitude=${lat}`, // NVİ: parametreler ters
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error('NVİ HTTP ' + r.status);
      return await r.json();
    } finally {
      clearTimeout(t);
    }
  }

  let j;
  try {
    j = await call();
  } catch (e) {
    nviSession.exp = 0; // oturum bayatlamış olabilir → bir kez yenile
    j = await call();
  }
  if (j && j.success === false) throw new Error(j.message || 'NVİ sorgu hatası');

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
  cSet(key, liste, 6 * 3600e3);
  return liste;
}
