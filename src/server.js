import express from 'express';
import multer from 'multer';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import crypto from 'crypto';
import { parseTakbis } from './parser.js';
import { recordVisit, recordParse, renderStatsPage } from './stats.js';
import { olusturRapor, raporNo } from './rapor.js';
import { parselSorgu, adresBul, cevreAnaliz, uavtSorgu } from './konum.js';

// pdf-parse CommonJS olduğu için require ile yüklüyoruz
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Gerçek ziyaretçi IP'si için (Dokploy/Traefik arkasında X-Forwarded-For).
// DİKKAT: 'true' = "her proxy'ye güven" demektir; o durumda istemci kendi
// X-Forwarded-For başlığını uydurup KVKK/5651 erişim kaydına sahte IP
// yazdırabilir. Uygulama tek bir ters vekilin (Traefik) arkasında olduğu için
// yalnızca EN YAKIN atlama güvenilir sayılır. Zincirde daha fazla vekil varsa
// (ör. Cloudflare + Traefik) TRUST_PROXY ile atlama sayısını artırın.
app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1));

// Güvenlik başlıkları. CSP bilerek EKLENMEDİ: arayüz satır içi <script>,
// satır içi onclick ve satır içi stil kullanıyor; CSP eklemek 'unsafe-inline'
// olmadan sayfayı bozardı (özellik kaybı).
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
  });
  next();
});

// ---------------------------------------------------------------------------
// Basit bellek içi hız sınırlayıcı (ek bağımlılık yok).
// Sınırlar normal kullanımın çok üzerindedir; gerçek kullanıcı görmez —
// yalnızca otomatik kötüye kullanımı keser.
// ---------------------------------------------------------------------------
const rlBuckets = new Map();
function rateLimit({ windowMs, max, key = 'g' }) {
  return (req, res, next) => {
    const now = Date.now();
    // Periyodik temizlik (Map sınırsız büyümesin)
    if (rlBuckets.size > 20000) {
      for (const [k, v] of rlBuckets) if (v.reset <= now) rlBuckets.delete(k);
      if (rlBuckets.size > 20000) rlBuckets.clear();
    }
    const id = key + '|' + (req.ip || 'bilinmiyor');
    let b = rlBuckets.get(id);
    if (!b || b.reset <= now) { b = { count: 0, reset: now + windowMs }; rlBuckets.set(id, b); }
    b.count++;
    const kalan = Math.max(0, max - b.count);
    res.set({ 'RateLimit-Limit': String(max), 'RateLimit-Remaining': String(kalan) });
    if (b.count > max) {
      const saniye = Math.ceil((b.reset - now) / 1000);
      res.set('Retry-After', String(saniye));
      return res.status(429).json({
        error: `Çok fazla istek gönderildi. Lütfen ${saniye} saniye sonra tekrar deneyin.`,
      });
    }
    next();
  };
}
const limitParse = rateLimit({ windowMs: 5 * 60e3, max: 60, key: 'parse' });
const limitRapor = rateLimit({ windowMs: 5 * 60e3, max: 120, key: 'rapor' });
const limitUavt = rateLimit({ windowMs: 5 * 60e3, max: 60, key: 'uavt' });
const limitKonum = rateLimit({ windowMs: 5 * 60e3, max: 300, key: 'konum' });

// İstatistik panosu kimlik bilgileri — yalnızca ortam değişkeninden okunur (Dokploy > Environment).
// Koda şifre gömülmez; tanımlı değilse /stats paneli devre dışı kalır.
const STATS_USER = process.env.STATS_USER || '';
const STATS_PASS = process.env.STATS_PASS || '';

// Bellekte tut (diske yazma yok), dosya başına 25MB sınır, sadece PDF
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 50, fields: 10, parts: 60 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece PDF dosyaları kabul edilir'));
    }
  },
});

// Multer dosyaları tamamen BELLEĞE alır; dosya başına sınır 25MB × 50 dosya =
// tek istekte 1,25 GB RAM demekti. Gövdenin tamamı için de bir tavan koyuyoruz.
// TAKBIS takyidat PDF'leri tipik olarak 50 KB - 3 MB arasıdır; 150 MB, 50
// dosyalık bir yığın için bile fazlasıyla yeterlidir. Gerekirse MAX_UPLOAD_MB
// ortam değişkeniyle büyütülebilir.
const MAX_UPLOAD_BYTES = (Number(process.env.MAX_UPLOAD_MB) || 150) * 1024 * 1024;
function govdeTavani(req, res, next) {
  const len = Number(req.headers['content-length'] || 0);
  if (len > MAX_UPLOAD_BYTES) {
    return res.status(413).json({
      error: `Yükleme çok büyük (toplam sınır ${Math.round(MAX_UPLOAD_BYTES / 1048576)} MB). Dosyaları birkaç partide yükleyin.`,
    });
  }
  next();
}

// Sağlık kontrolü — ziyaret SAYILMAZ (Docker healthcheck / izleme araçları için)
app.get('/healthz', (req, res) => res.type('text/plain').send('ok'));

// Ana sayfa ziyaretini say (statik servisten önce), sonra index.html'i sun
app.get('/', (req, res, next) => {
  try { recordVisit(req.ip, req.headers['user-agent']); } catch { /* yoksay */ }
  next();
});

// Uzunluk sızdırmayan, sabit zamanlı karşılaştırma (kaba kuvvet/zamanlama
// saldırılarına karşı). Karşılaştırmalar '&' ile birleştirilir ki kullanıcı adı
// yanlışsa bile şifre karşılaştırması atlanmasın (kısa devre olmasın).
function esitMi(a, b) {
  const ha = crypto.createHash('sha256').update(String(a), 'utf8').digest();
  const hb = crypto.createHash('sha256').update(String(b), 'utf8').digest();
  return crypto.timingSafeEqual(ha, hb) ? 1 : 0;
}

// Basic Auth ile korunan özel istatistik panosu
function statsAuth(req, res, next) {
  if (!STATS_USER || !STATS_PASS) {
    return res.status(503).type('text/plain')
      .send('İstatistik paneli yapılandırılmamış: STATS_USER ve STATS_PASS ortam değişkenlerini tanımlayın.');
  }
  const hdr = req.headers.authorization || '';
  const [type, b64] = hdr.split(' ');
  if (type === 'Basic' && b64) {
    const ham = Buffer.from(b64, 'base64').toString('utf8');
    // RFC 7617: yalnızca İLK iki nokta üst üste ayırıcıdır — şifrenin içinde
    // ':' bulunması geçerlidir (eski kod split(':') ile şifreyi kırpıyordu).
    const ay = ham.indexOf(':');
    const u = ay === -1 ? ham : ham.slice(0, ay);
    const p = ay === -1 ? '' : ham.slice(ay + 1);
    if (esitMi(u, STATS_USER) & esitMi(p, STATS_PASS)) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="TAKBIS Stats"');
  return res.status(401).send('Yetkilendirme gerekli');
}
app.get('/stats', statsAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.send(renderStatsPage(req.query));
});

// .html uzantılı adresler uzantısız kanonik adrese yönlendirilir (çift içerik olmasın)
app.get(/^\/(.+)\.html$/, (req, res, next) => {
  const ad = req.params[0];
  if (ad === 'index') return res.redirect(301, '/');
  return res.redirect(301, '/' + ad);
});

// Statik dosyalar.
// `extensions: ['html']` sayesinde /takyidat-nedir adresi takyidat-nedir.html'i
// sunar — SEO için temiz URL, ek yönlendirme koduna gerek yok.
// Değişmeyen varlıklar (yazı tipi, simge) uzun; HTML kısa önbelleklenir.
app.use(express.static(path.join(__dirname, '..', 'public'), {
  extensions: ['html'],
  setHeaders(res, dosya) {
    if (/\.(woff2|png|ico|svg)$/i.test(dosya)) {
      res.set('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (/\.html$/i.test(dosya)) {
      res.set('Cache-Control', 'public, max-age=0, must-revalidate');
    } else if (/\.(css|webmanifest)$/i.test(dosya)) {
      res.set('Cache-Control', 'public, max-age=3600');
    }
  },
}));


// Tek veya çoklu PDF yükleme -> ayrıştırılmış JSON döndür
app.post('/api/parse', limitParse, govdeTavani, upload.array('files', 50), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'PDF dosyası yüklenmedi' });
  }

  const results = [];
  for (const file of req.files) {
    try {
      // pdf-parse'a Buffer DEĞİL, sıfırdan hizalı bir Uint8Array veriyoruz.
      //
      // Neden: multer'ın memoryStorage'ı parçaları Buffer.concat ile birleştirir
      // ve küçük dosyalarda (~4 KB altı) sonuç Node'un paylaşımlı buffer
      // havuzundan gelir; yani byteOffset > 0 olur. pdf.js bu kaydırmayı doğru
      // ele almadığı için PDF'i yanlış konumdan okuyup "bad XRef entry" /
      // "Invalid number" gibi anlamsız hatalar veriyordu. Üstelik hata havuzun
      // o anki durumuna bağlı olduğundan AYNI dosya bazen okunup bazen
      // okunamıyordu. new Uint8Array(...) içeriği sıfır offset'li taze bir
      // ArrayBuffer'a kopyalar; büyük dosyalarda davranış zaten aynıydı.
      const data = await pdfParse(new Uint8Array(file.buffer));
      const parsed = parseTakbis(data.text);

      // Taranmış (metin katmanı olmayan) PDF tespiti.
      // pdf-parse böyle belgelerde boş metin döndürür; ayrıştırıcı da her bölümü
      // boş verir ve arayüz sebebini söylemeden "Kayıt yok" gösterirdi.
      // Sayfa başına anlamlı karakter sayısı eşiğin altındaysa uyarı ekliyoruz.
      const metin = (data.text || '').replace(/\s/g, '');
      const sayfa = Math.max(1, data.numpages || 1);
      let uyari = '';
      if (metin.length < 40 * sayfa) {
        uyari = `Belgeden yalnızca ${metin.length} karakter metin okunabildi (${sayfa} sayfa).`;
      }

      results.push({
        dosyaAdi: file.originalname,
        sayfaSayisi: data.numpages,
        basarili: true,
        ...(uyari ? { uyari } : {}),
        veri: parsed,
      });
    } catch (err) {
      results.push({
        dosyaAdi: file.originalname,
        basarili: false,
        hata: err.message,
      });
    }
  }

  try {
    recordParse(
      results.filter((r) => r.basarili).length,
      req.ip,
      req.headers['user-agent'],
      results.map((r) => r.dosyaAdi),
    );
  } catch { /* yoksay */ }
  res.json({ adet: results.length, sonuclar: results });
});

// TKGM parsel + Nominatim adres (önbellekli) — pafta, koordinat, geometri
app.get('/api/konum', limitKonum, async (req, res) => {
  try {
    const { il, ilce, mahalle, ada, parsel } = req.query;
    if (!il || !ilce || !ada || !parsel) {
      return res.status(400).json({ error: 'Eksik parametre (il, ilçe, ada, parsel gerekli)' });
    }
    const k = await parselSorgu({ il, ilce, mahalle, ada, parsel });
    let adres = null;
    if (k.merkez) {
      try { adres = await adresBul(k.merkez.lat, k.merkez.lon); } catch { /* adres opsiyonel */ }
    }
    res.json({ ...k, adres });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Overpass çevre analizi — yakın okul/hastane/market/durak vb.
app.get('/api/cevre', limitKonum, async (req, res) => {
  const lat = parseFloat(req.query.lat);
  const lon = parseFloat(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return res.status(400).json({ error: 'Geçersiz koordinat' });
  }
  const keys = String(req.query.kat || '').split(',').map((s) => s.trim()).filter(Boolean);
  try {
    const pois = await cevreAnaliz(lat, lon, keys, req.query.r);
    res.json({ pois });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// NVİ UAVT sorgusu — parselin birden çok noktasından bağımsız bölümler (captcha yok)
app.post('/api/uavt', limitUavt, express.json({ limit: '256kb' }), async (req, res) => {
  try {
    let points = req.body && Array.isArray(req.body.points) ? req.body.points : null;
    if (!points) {
      const lat = parseFloat(req.body?.lat);
      const lon = parseFloat(req.body?.lon);
      if (Number.isFinite(lat) && Number.isFinite(lon)) points = [[lat, lon]];
    }
    // Güvenlik: yalnızca [sayı, sayı] biçimindeki noktalar, en fazla 32 tanesi.
    // Array.isArray denetimi ŞART: `{"points":[null]}` gibi bir gövdede p[0]
    // TypeError fırlatır ve Express 4 async handler'daki senkron hatayı
    // yakalamadığı için süreç tamamen çökerdi.
    points = (points || [])
      .filter((p) => Array.isArray(p) && p.length >= 2)
      .map((p) => [parseFloat(p[0]), parseFloat(p[1])])
      .filter(([la, lo]) =>
        Number.isFinite(la) && Number.isFinite(lo) &&
        la >= -90 && la <= 90 && lo >= -180 && lo <= 180)
      .slice(0, 32);
    if (!points.length) return res.status(400).json({ error: 'Geçersiz koordinat' });
    const liste = await uavtSorgu(points, !!(req.body && req.body.nocache));
    res.json({ liste });
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// Word (.docx) değerleme raporu iskeleti üret (veri saklanmaz, anında üretilip döner)
app.post('/api/rapor', limitRapor, express.json({ limit: '5mb' }), async (req, res) => {
  try {
    const { dosyaAdi, raporMetni, tapuKayit, mulkiyet, bolumler, konum } = req.body || {};
    const buf = await olusturRapor({ dosyaAdi, raporMetni, tapuKayit, mulkiyet, bolumler, konum });
    const no = raporNo(dosyaAdi) || 'takbis';
    const ascii = `rapor-${no.replace(/[^\w-]/g, '_')}.docx`;
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(no + ' - Degerleme Raporu.docx')}`,
    });
    res.send(buf);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Merkezî hata yakalayıcı. Multer'ın teknik kodlarını anlaşılır Türkçeye
// çevirir; beklenmeyen hatalarda yığın izini istemciye sızdırmaz.
const MULTER_MESAJ = {
  LIMIT_FILE_SIZE: 'Dosya çok büyük (dosya başına en fazla 25 MB).',
  LIMIT_FILE_COUNT: 'Tek seferde en fazla 50 PDF yükleyebilirsiniz.',
  LIMIT_PART_COUNT: 'Tek seferde en fazla 50 PDF yükleyebilirsiniz.',
  LIMIT_UNEXPECTED_FILE: 'Beklenmeyen dosya alanı.',
};
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (err?.code && MULTER_MESAJ[err.code]) {
    return res.status(413).json({ error: MULTER_MESAJ[err.code] });
  }
  // Gövde ayrıştırma hataları (bozuk JSON, çok büyük gövde) kullanıcı kaynaklı
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Gönderilen veri çok büyük.' });
  }
  if (err?.status === 400 || err?.statusCode === 400 || err instanceof SyntaxError) {
    return res.status(400).json({ error: 'Geçersiz istek gövdesi.' });
  }
  if (err?.message === 'Sadece PDF dosyaları kabul edilir') {
    return res.status(400).json({ error: err.message });
  }
  console.error('Beklenmeyen hata:', err);
  return res.status(500).json({ error: 'Sunucu hatası' });
});

// Yakalanmamış hatalarda süreç sessizce ölmesin: logla, ayakta kal.
// (Express 4 async handler'lardaki reddedilmiş promise'leri yakalamaz.)
process.on('unhandledRejection', (sebep) => {
  console.error('Yakalanmamış promise reddi:', sebep);
});
process.on('uncaughtException', (err) => {
  console.error('Yakalanmamış istisna:', err);
});

app.listen(PORT, () => {
  console.log(`\n  TAKBIS Ayrıştırıcı çalışıyor:  http://localhost:${PORT}\n`);
});
