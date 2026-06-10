import express from 'express';
import multer from 'multer';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import { parseTakbis } from './parser.js';
import { recordVisit, recordParse, renderStatsPage } from './stats.js';
import { olusturRapor, raporNo } from './rapor.js';

// pdf-parse CommonJS olduğu için require ile yüklüyoruz
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Gerçek ziyaretçi IP'si için (Dokploy/Traefik arkasında X-Forwarded-For)
app.set('trust proxy', true);

// İstatistik panosu kimlik bilgileri (Dokploy'da ortam değişkeniyle değiştirilebilir)
const STATS_USER = process.env.STATS_USER || 'procodertr';
const STATS_PASS = process.env.STATS_PASS || '25468546';

// Bellekte tut (diske yazma yok), 25MB sınır, sadece PDF
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Sadece PDF dosyaları kabul edilir'));
    }
  },
});

// Ana sayfa ziyaretini say (statik servisten önce), sonra index.html'i sun
app.get('/', (req, res, next) => {
  try { recordVisit(req.ip); } catch { /* yoksay */ }
  next();
});

// Basic Auth ile korunan özel istatistik panosu
function statsAuth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const [type, b64] = hdr.split(' ');
  if (type === 'Basic' && b64) {
    const [u, p] = Buffer.from(b64, 'base64').toString().split(':');
    if (u === STATS_USER && p === STATS_PASS) return next();
  }
  res.set('WWW-Authenticate', 'Basic realm="TAKBIS Stats"');
  return res.status(401).send('Yetkilendirme gerekli');
}
app.get('/stats', statsAuth, (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.send(renderStatsPage());
});

app.use(express.static(path.join(__dirname, '..', 'public')));

// Tek veya çoklu PDF yükleme -> ayrıştırılmış JSON döndür
app.post('/api/parse', upload.array('files', 50), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'PDF dosyası yüklenmedi' });
  }

  const results = [];
  for (const file of req.files) {
    try {
      const data = await pdfParse(file.buffer);
      const parsed = parseTakbis(data.text);
      results.push({
        dosyaAdi: file.originalname,
        sayfaSayisi: data.numpages,
        basarili: true,
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

  try { recordParse(results.filter((r) => r.basarili).length); } catch { /* yoksay */ }
  res.json({ adet: results.length, sonuclar: results });
});

// Word (.docx) değerleme raporu iskeleti üret (veri saklanmaz, anında üretilip döner)
app.post('/api/rapor', express.json({ limit: '5mb' }), async (req, res) => {
  try {
    const { dosyaAdi, raporMetni, tapuKayit, mulkiyet } = req.body || {};
    const buf = await olusturRapor({ dosyaAdi, raporMetni, tapuKayit, mulkiyet });
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

app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n  TAKBIS Ayrıştırıcı çalışıyor:  http://localhost:${PORT}\n`);
});
