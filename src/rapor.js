/**
 * Word (.docx) değerleme raporu iskeleti üretici.
 *
 * Örnek değerleme raporu formatını takip eder:
 *  - Başlık alanları (Rapor No, Uzman, İl, İlçe) otomatik dolar
 *  - TAPU KAYIT BİLGİSİ tablosu TAKBIS'ten dolar
 *  - TAPU TAKYİDAT BİLGİLERİ bölümüne hazır rapor metni yerleşir
 *  - Kalan bölümler (Bölge, Teknik, İskan, İmar, Faktörler, Fiyatlandırma)
 *    uzmanın dolduracağı boş başlıklar olarak eklenir
 */
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType,
} from 'docx';

const FONT = 'Calibri';
const GRI = 'D9D9D9';

function baslik(text) {
  return new Paragraph({
    spacing: { before: 320, after: 120 },
    shading: { type: ShadingType.CLEAR, fill: GRI },
    children: [new TextRun({ text, bold: true, font: FONT, size: 22 })],
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text, font: FONT, size: 21, bold: !!opts.bold, italics: !!opts.italic, color: opts.color })],
  });
}

function bosAlan() {
  return p('(Uzman tarafından doldurulacaktır.)', { italic: true, color: '808080' });
}

const KENAR = { style: BorderStyle.SINGLE, size: 4, color: 'A6A6A6' };
const KENARLAR = { top: KENAR, bottom: KENAR, left: KENAR, right: KENAR };

function kvTable(rows) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map(([k, v]) => new TableRow({
      children: [
        new TableCell({
          width: { size: 35, type: WidthType.PERCENTAGE },
          borders: KENARLAR,
          shading: { type: ShadingType.CLEAR, fill: 'F2F2F2' },
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: k, bold: true, font: FONT, size: 20 })] })],
        }),
        new TableCell({
          width: { size: 65, type: WidthType.PERCENTAGE },
          borders: KENARLAR,
          margins: { top: 60, bottom: 60, left: 100, right: 100 },
          children: [new Paragraph({ children: [new TextRun({ text: String(v ?? '') || '-', font: FONT, size: 20 })] })],
        }),
      ],
    })),
  });
}

// Takyidat metnini paragraflara çevir (bölüm başlıkları kalın)
function takyidatParagraflari(metin) {
  const out = [];
  for (const raw of String(metin || '').split('\n')) {
    const line = raw.trimEnd();
    if (!line.trim()) { out.push(new Paragraph({ spacing: { after: 60 } })); continue; }
    const isHeader =
      /Hanesinde:\s*$/.test(line) || /^Rehinlere Ait Şerhler:/.test(line) ||
      /^Takyidatlar\s*$/.test(line) || /^TAPU TAKYİDAT/.test(line) ||
      /^-Taşınmaz üzerinde \d+ adet/.test(line);
    out.push(new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({ text: line, font: FONT, size: 20, bold: isHeader })],
    }));
  }
  return out;
}

// Dosya adından rapor numarasını çek: "2026-GAR-1013 takbis.pdf" -> "2026-GAR-1013"
export function raporNo(dosyaAdi) {
  const m = String(dosyaAdi || '').match(/\d{4}-[A-Za-zÇĞİÖŞÜçğıöşü]+-\d+/u);
  return m ? m[0].toUpperCase() : '';
}

// Uzman bölümleri düzeni — arayüzdeki editör panelinde aynı sırayla görünür
export const BOLUMLER = [
  { heading: 'BÖLGE ÖZELLİKLERİ', subs: [
    { key: 'bolge', label: 'Gayrimenkulun Konumu, Çevresel Özellikleri ve Yakın Çevresinin Yapılaşma Bilgileri:' },
  ]},
  { heading: 'GAYRİMENKULÜN TEKNİK ÖZELLİKLERİ', subs: [
    { key: 'teknik', label: 'Gayrimenkulun Tanımı / Binadaki Konumu:' },
  ]},
  { heading: 'İSKAN BİLGİSİ', subs: [
    { key: 'iskan', label: 'Gayrimenkulde Kaçak Yapılaşma / Ruhsata Uygunluk Açıklaması:' },
  ]},
  { heading: 'İMAR DURUMU', subs: [
    { key: 'imar', label: 'İmar Durumu Açıklama/Plan Notu:' },
  ]},
  { heading: 'DEĞERLEMEYİ ETKİLEYEN FAKTÖRLER', subs: [
    { key: 'olumlu', label: 'Olumlu Faktörler:' },
    { key: 'olumsuz', label: 'Olumsuz Faktörler:' },
  ]},
  { heading: 'NOTLAR / DÜŞÜNCELER / FİYATLANDIRMA', subs: [
    { key: 'fiyatlandirma', label: '' },
    { key: 'emsaller', label: 'Emsaller:' },
    { key: 'emsalAciklama', label: 'Emsaller ile ilgili Diğer Açıklamalar:' },
  ]},
];

// Editörden gelen yapısal blokları (paragraf/madde + kalın/italik/altçizgi
// koşuları) docx paragraflarına çevir
function bolumParagraflari(blocks) {
  const out = [];
  let sira = 0; // numaralı liste sayacı
  for (const b of blocks || []) {
    const runs = (b.runs || [])
      .filter((r) => r && typeof r.text === 'string')
      .map((r) => new TextRun({
        text: r.text, font: FONT, size: 21,
        bold: !!r.bold, italics: !!r.italic,
        underline: r.underline ? {} : undefined,
      }));
    if (b.type === 'li') {
      if (b.ordered) {
        sira++;
        runs.unshift(new TextRun({ text: `${sira}. `, font: FONT, size: 21 }));
        out.push(new Paragraph({ spacing: { after: 60 }, indent: { left: 360 }, children: runs }));
      } else {
        out.push(new Paragraph({ spacing: { after: 60 }, bullet: { level: 0 }, children: runs }));
      }
    } else {
      sira = 0;
      out.push(new Paragraph({
        spacing: { after: 80 },
        children: runs.length ? runs : [new TextRun({ text: '', font: FONT, size: 21 })],
      }));
    }
  }
  return out;
}

export async function olusturRapor({ dosyaAdi, raporMetni, tapuKayit = {}, mulkiyet = [], bolumler = {} }) {
  const [il = '', ilce = ''] = String(tapuKayit.ilIlce || '').split('/');
  const malikler = mulkiyet.map((m) => `${m.adSoyad || m.malik}${m.hisse ? ` (${m.hisse})` : ''}`).join(', ');

  const children = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: 'KAT İRTİFAKLI/MÜLKİYETLİ TAŞINMAZ DEĞERLEME RAPORU', bold: true, font: FONT, size: 26 })],
    }),
    kvTable([
      ['Rapor No', raporNo(dosyaAdi)],
      ['Raporu Hazırlayan Uzman', ''],
      ['İl', il.trim()],
      ['İlçe', ilce.trim()],
    ]),

    baslik('TAPU KAYIT BİLGİSİ'),
    kvTable([
      ['Zemin Tipi', tapuKayit.zeminTipi],
      ['Taşınmaz Kimlik No', tapuKayit.tasinmazKimlikNo],
      ['İl/İlçe', tapuKayit.ilIlce],
      ['Mahalle/Köy', tapuKayit.mahalleKoy],
      ['Ada/Parsel', tapuKayit.adaParsel],
      ['AT Yüzölçüm (m²)', tapuKayit.atYuzolcum],
      ['Bağımsız Bölüm Nitelik', tapuKayit.bbNitelik],
      ['Blok/Kat/Giriş/BBNo', tapuKayit.blokKatGiris],
      ['Arsa Pay/Payda', tapuKayit.arsaPayPayda],
      ['Ana Taşınmaz Nitelik', tapuKayit.anaTasinmazNitelik],
      ['Cilt/Sayfa No', tapuKayit.ciltSayfaNo],
      ['Kayıt Durumu', tapuKayit.kayitDurum],
      ['Malik(ler)', malikler],
    ]),

    baslik('TAPU TAKYİDAT BİLGİLERİ'),
    ...takyidatParagraflari(raporMetni),
  ];

  // Uzman bölümleri: panel üzerinden doldurulan içerik varsa onu kullan,
  // yoksa "doldurulacaktır" yer tutucusunu koy
  for (const grup of BOLUMLER) {
    children.push(baslik(grup.heading));
    for (const sub of grup.subs) {
      if (sub.label) children.push(p(sub.label, { bold: true }));
      const blocks = bolumler[sub.key];
      const dolu = Array.isArray(blocks) && blocks.some((b) => (b.runs || []).some((r) => (r.text || '').trim()));
      if (dolu) children.push(...bolumParagraflari(blocks));
      else children.push(bosAlan());
    }
  }

  const doc = new Document({
    creator: 'TAKBIS Reader',
    title: `Değerleme Raporu ${raporNo(dosyaAdi)}`.trim(),
    sections: [{ properties: {}, children }],
  });

  return Packer.toBuffer(doc);
}
