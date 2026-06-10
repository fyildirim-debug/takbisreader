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
const POI_TR = {
  school: 'Okul', university: 'Üniversite', hospital: 'Hastane',
  clinic: 'Sağlık Kuruluşu', pharmacy: 'Eczane', place_of_worship: 'Cami',
  marketplace: 'Pazar Yeri', supermarket: 'Market', bus_stop: 'Otobüs Durağı',
  park: 'Park', bank: 'Banka', police: 'Polis Karakolu',
};

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function cevreAnaliz(lat, lon) {
  const key = `c|${(+lat).toFixed(4)}|${(+lon).toFixed(4)}`;
  const hit = cGet(key);
  if (hit) return hit;

  const q = `[out:json][timeout:25];(
node(around:1500,${lat},${lon})[amenity~"school|university|hospital|clinic|pharmacy|place_of_worship|marketplace|bank|police"];
node(around:1500,${lat},${lon})[shop=supermarket];
node(around:1500,${lat},${lon})[highway=bus_stop];
way(around:1500,${lat},${lon})[leisure=park];
);out center 80;`;

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
    const cat = tags.amenity || tags.shop || tags.highway || tags.leisure;
    if (!POI_TR[cat]) continue;
    if (cat === 'place_of_worship' && tags.religion && tags.religion !== 'muslim') continue;
    const d = haversine(+lat, +lon, elat, elon);
    if (!best[cat] || d < best[cat].mesafe) {
      best[cat] = { tur: POI_TR[cat], ad: tags.name || '', mesafe: Math.round(d) };
    }
  }
  const list = Object.values(best).sort((a, b) => a.mesafe - b.mesafe);
  cSet(key, list, 7 * 24 * 3600e3);
  return list;
}
