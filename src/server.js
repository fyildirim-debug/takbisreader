import express from 'express';
import multer from 'multer';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';
import { parseTakbis } from './parser.js';

// pdf-parse CommonJS olduğu için require ile yüklüyoruz
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

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

  res.json({ adet: results.length, sonuclar: results });
});

app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n  TAKBIS Ayrıştırıcı çalışıyor:  http://localhost:${PORT}\n`);
});
