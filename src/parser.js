/**
 * TAKBIS / Web Tapu PDF metin ayrıştırıcısı.
 *
 * pdf-parse ile çıkarılan ham metni alır ve belgedeki bölümleri
 * yapısal verilere dönüştürür:
 *   - Tapu kayıt bilgisi (zemin tipi, ada/parsel, malik niteliği ...)
 *   - Taşınmaza ait şerh / beyan / irtifak bilgileri
 *   - Mülkiyet (malik) bilgileri
 *   - Mülkiyete ait şerh / beyan / irtifak (haciz, kısıtlama ...)
 *   - İpotek / rehin bilgileri
 *
 * Not: PDF metin katmanı sütun sınırlarını net vermediği için tablo
 * ayrıştırma "en iyi çaba" mantığındadır. Her bölümün ham metni de
 * sonuca eklenir, böylece kullanıcı doğrulayabilir.
 */

// Belgeyi bölümlere ayıran başlıklar (büyük harf, sabit metinler)
const SECTION_HEADERS = [
  'TAPU KAYIT BİLGİSİ',
  'TAŞINMAZA AİT ŞERH BEYAN İRTİFAK BİLGİLERİ',
  'MÜLKİYET BİLGİLERİ',
  'MÜLKİYETE AİT ŞERH BEYAN İRTİFAK BİLGİLERİ',
  'MÜLKİYETE AİT REHİN BİLGİLERİ',
];

// Sayfa altbilgisi / üstbilgisi gibi gürültü satırları
const NOISE_PATTERNS = [
  /BU BELGE TOPLAM \d+ SAYFADAN OLUŞMAKTADIR/i,
  /BİLGİ AMAÇLIDIR/i,
  /^BİL$/i,
  /^Gİ AMAÇLIDIR/i,
  /^\d+\s*\/\s*\d+$/, // sayfa numarası "1 / 3"
  /Bu belgeyi akıllı telefonunuzdan/i,
  /Web Tapu anasayfasından/i,
  /Online İşlemler/i,
  /webtapu\.tkgm\.gov\.tr/i,
  /^tapunun kısayolu$/i,
  /alanına yazarak doğrulayabilirsiniz/i,
  /kodunu Online İşlemler/i,
];

// "BİLGİ AMAÇLIDIR" filigranı diagonal olduğu için metne "BİL", "Gİ AM", "A",
// "ÇLIDIR" gibi düzensiz parçalar halinde sızar. Tümü büyük harf olan ve bu
// metnin bir parçası olan satırları filigran kabul edip eliyoruz.
const WATERMARK = 'BİLGİ AMAÇLIDIR'.replace(/\s/g, '');

function isNoise(line) {
  const t = line.trim();
  if (!t) return true;
  if (NOISE_PATTERNS.some((re) => re.test(t))) return true;
  // Filigran kırıntısı: küçük harf içermeyen ve filigran metninin parçası olan satır
  const s = t.replace(/[\s.]/g, '');
  if (s && !/[a-zçğıöşü]/.test(s) && WATERMARK.includes(s)) return true;
  return false;
}

// Ham metni temizle: gürültü satırlarını at, fazla boşlukları sadeleştir
function cleanLines(rawText) {
  return rawText
    .split(/\r?\n/)
    .map((l) => l.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').trimEnd())
    .filter((l) => !isNoise(l));
}

// ---------------------------------------------------------------------------
// 1) Üst bilgi: Tarih, Makbuz No, Dekont No, Başvuru No, Kaydı Oluşturan
// ---------------------------------------------------------------------------
function parseHeader(text) {
  const header = {};

  const tarih = text.match(/Tarih:\s*([\d.\-: ]+)/);
  if (tarih) header.belgeTarihi = tarih[1].trim();

  const kaydi = text.match(/Kaydı Oluşturan:\s*(.+)/);
  if (kaydi) header.kaydiOlusturan = kaydi[1].trim();

  // "Makbuz NoDekont NoBaşvuru No" başlığını takip eden değer satırı; PDF'te
  // değerler bitişik gelir: 1827264564232026-05-05-17.13.29.17048445642
  // Dekont No'nun ayırt edici kalıbı üzerinden makbuz ve başvuruyu ayıklıyoruz.
  const m = text.match(/Makbuz No\s*Dekont No\s*Başvuru No\s*\n\s*(.+)/);
  if (m) {
    const dek = m[1].match(
      /(\d+?)(\d{4}-\d{2}-\d{2}-\d{2}\.\d{2}\.\d{2}\.\d{6})(\d+)/
    );
    if (dek) {
      header.makbuzNo = dek[1];
      header.dekontNo = dek[2];
      header.basvuruNo = dek[3];
    }
  }
  return header;
}

// ---------------------------------------------------------------------------
// 2) Tapu kayıt bilgisi (etiket: değer çiftleri)
// ---------------------------------------------------------------------------
const KAYIT_FIELDS = [
  { key: 'zeminTipi', label: 'Zemin Tipi' },
  { key: 'tasinmazKimlikNo', label: 'Taşınmaz Kimlik No' },
  { key: 'ilIlce', label: 'İl/İlçe' },
  { key: 'kurumAdi', label: 'Kurum Adı' },
  { key: 'mahalleKoy', label: 'Mahalle/Köy Adı' },
  { key: 'mevkii', label: 'Mevkii' },
  { key: 'ciltSayfaNo', label: 'Cilt/Sayfa No' },
  { key: 'kayitDurum', label: 'Kayıt Durum' },
  { key: 'adaParsel', label: 'Ada/Parsel' },
  { key: 'atYuzolcum', label: 'AT Yüzölçüm\\(m2\\)' },
  { key: 'bbNitelik', label: 'Bağımsız Bölüm Nitelik' },
  { key: 'bbBrut', label: 'Bağımsız Bölüm Brüt\\s+YüzÖlçümü' },
  { key: 'bbNet', label: 'Bağımsız Bölüm Net\\s+YüzÖlçümü' },
  { key: 'blokKatGiris', label: 'Blok/Kat/Giriş/BBNo' },
  { key: 'arsaPayPayda', label: 'Arsa Pay/Payda' },
  { key: 'anaTasinmazNitelik', label: 'Ana Taşınmaz Nitelik' },
];

const KAYIT_LABELS_TR = {
  zeminTipi: 'Zemin Tipi',
  tasinmazKimlikNo: 'Taşınmaz Kimlik No',
  ilIlce: 'İl/İlçe',
  kurumAdi: 'Kurum Adı',
  mahalleKoy: 'Mahalle/Köy Adı',
  mevkii: 'Mevkii',
  ciltSayfaNo: 'Cilt/Sayfa No',
  kayitDurum: 'Kayıt Durum',
  adaParsel: 'Ada/Parsel',
  atYuzolcum: 'AT Yüzölçüm (m²)',
  bbNitelik: 'Bağımsız Bölüm Nitelik',
  bbBrut: 'Bağımsız Bölüm Brüt Yüzölçümü',
  bbNet: 'Bağımsız Bölüm Net Yüzölçümü',
  blokKatGiris: 'Blok/Kat/Giriş/BBNo',
  arsaPayPayda: 'Arsa Pay/Payda',
  anaTasinmazNitelik: 'Ana Taşınmaz Nitelik',
};

function parseKayitBilgisi(flatText) {
  // Her etiketin metindeki ilk konumunu bul
  const positions = [];
  for (const f of KAYIT_FIELDS) {
    const re = new RegExp(f.label + '\\s*:', 'i');
    const match = flatText.match(re);
    if (match) {
      positions.push({
        key: f.key,
        start: match.index,
        valueStart: match.index + match[0].length,
      });
    }
  }
  // Bölüm sınırı: "TAŞINMAZA AİT ŞERH..." başlığı
  const sectionEnd = flatText.search(/TAŞINMAZA AİT ŞERH/i);
  const end = sectionEnd > -1 ? sectionEnd : flatText.length;

  positions.sort((a, b) => a.start - b.start);

  const result = {};
  for (let i = 0; i < positions.length; i++) {
    const cur = positions[i];
    const next = positions[i + 1];
    const valueEnd = next ? Math.min(next.start, end) : end;
    let value = flatText.slice(cur.valueStart, valueEnd).trim();
    // Sondaki "Ana Taşınmaz Nitelik" gibi alanlarda kalan etiket kırıntılarını temizle
    value = value.replace(/\s+/g, ' ').trim();
    result[cur.key] = value;
  }
  return result;
}

// ---------------------------------------------------------------------------
// Bölüm metinlerini ayır
// ---------------------------------------------------------------------------
function splitSections(lines) {
  const text = lines.join('\n');
  const sections = {};
  const found = [];
  for (const h of SECTION_HEADERS) {
    const idx = text.indexOf(h);
    if (idx > -1) found.push({ header: h, idx });
  }
  found.sort((a, b) => a.idx - b.idx);
  for (let i = 0; i < found.length; i++) {
    const start = found[i].idx + found[i].header.length;
    const end = i + 1 < found.length ? found[i + 1].idx : text.length;
    sections[found[i].header] = text.slice(start, end).trim();
  }
  return sections;
}

// ---------------------------------------------------------------------------
// 3) Şerh / Beyan / İrtifak bilgileri (taşınmaza ve mülkiyete ait ortak mantık)
// ---------------------------------------------------------------------------
function parseSerhBeyan(sectionText) {
  if (!sectionText) return [];

  // Kayıtlar satır başında "Beyan", "Serh", "Şerh" veya "İrtifak" ile başlar.
  // PDF metninde kelime değere bitişik olabildiği için \b kullanmıyoruz; satır
  // başını (\n) baz alıyoruz. İlk kayıttan önceki tablo başlığı atılır.
  const norm = '\n' + sectionText;
  const tokens = norm.split(/(?=\n(?:Beyan|Serh|Şerh|İrtifak))/);
  const entries = [];

  for (const tok of tokens) {
    const t = tok.trim();
    const head = t.match(/^(Beyan|Serh|Şerh|İrtifak)/);
    if (!head) continue;

    const tur = head[1] === 'Serh' ? 'Şerh' : head[1];
    let body = t.slice(head[0].length).trim();

    // Kurum-tarih-yevmiye ve (varsa) kısıtlı malik, açıklamanın ORTASINDA da
    // olabilir: dar sütunlu tablolarda satır sayfa kırılmasıyla bölündüğünde
    // açıklamanın devamı tarih-yevmiyeden SONRA gelir. Bu yüzden bu bloğu
    // açıklamadan kesip atmak yerine "içinden çıkarıp" öncesi+sonrasını
    // birleştiriyoruz. Kısıtlı malik TÜMÜ BÜYÜK harf (VEYSEL DEMİR), kurum ise
    // Baş harfi büyük (Nilüfer) olduğundan ayırt edilebilir.
    let kurum = '', tarih = '', saat = '', yevmiye = '', kisitliMalik = '';
    // kurum+tire kısmı opsiyonel (sayfa kırılmasında kurum açıklamadan ayrı
    // düşebilir). yevmiye, dosya no ("2026/27161") ile karışmaması için sayı
    // veya "/" ile devam ETMEYEN bir tam sayıdır.
    // NOT: malik kalıbı iç içe niceleyici İÇERMEMELİDİR; aksi halde uzun
    // ALL-CAPS açıklamalarda katastrofik backtracking (sonsuz takılma) olur.
    // Kelimeler zorunlu boşlukla ayrıldığı için bölünme tek-yorumludur.
    const tailRe =
      /\s*([A-ZÇĞİÖŞÜ]{2,}(?:\s+[A-ZÇĞİÖŞÜ.]{2,})*\s*)?([A-Za-zÇĞİÖŞÜçğıöşü]+\s*-\s*)?(\d{2}-\d{2}-\d{4})\s+(\d{2}:\d{2})\s*-\s*(\d+(?![\d/]))?/;
    const mt = body.match(tailRe);
    if (mt) {
      kisitliMalik = (mt[1] || '').replace(/\s+/g, ' ').trim();
      kurum = (mt[2] || '').replace(/\s*-\s*$/, '').trim();
      tarih = mt[3];
      saat = mt[4];
      yevmiye = mt[5] || '';
      // Bloğu çıkar, kalan baş ve son parçaları birleştir
      body = (body.slice(0, mt.index) + ' ' + body.slice(mt.index + mt[0].length)).trim();
    }

    // Şablon bilgisini ayıkla ve açıklamadan çıkar
    let sablon = '';
    const sab = body.match(/\(\s*Şablon:\s*([^)]+)\)/);
    if (sab) {
      sablon = sab[1].trim();
      body = body.replace(sab[0], ' ');
    }

    // Açıklamayı sadeleştir
    let aciklama = body.replace(/\s+/g, ' ').trim();

    // Yevmiye bloktan alınamadıysa (sayfa kırılması) açıklamanın sonundaki
    // tek başına duran sayıyı yevmiye olarak kurtar
    if (tarih && !yevmiye) {
      const ty = aciklama.match(/\s(\d{3,7})\s*$/);
      if (ty) { yevmiye = ty[1]; aciklama = aciklama.slice(0, ty.index).trim(); }
    }

    if (!aciklama && !sablon) continue;

    // Açıklamanın sonuna tarih ve yevmiyeyi parantez içinde ekle
    // Örn: "... (17.04.2023 tarih, 23407 yevmiye)"
    if (tarih || yevmiye) {
      const noktaliTarih = tarih.replace(/-/g, '.');
      const par = [];
      if (noktaliTarih) par.push(`${noktaliTarih} tarih`);
      if (yevmiye) par.push(`${yevmiye} yevmiye`);
      if (par.length) {
        aciklama = (aciklama ? aciklama + ' ' : '') + `(${par.join(', ')})`;
      }
    }

    entries.push({ tur, aciklama, sablon, kisitliMalik, kurum, tarih, saat, yevmiye });
  }

  // Aynı kayıt birden çok sayfada tekrar edebilir -> tekilleştir
  return dedupe(entries, (e) => `${e.tur}|${e.aciklama}|${e.yevmiye}`);
}

// ---------------------------------------------------------------------------
// 4) Mülkiyet (malik) bilgileri
// ---------------------------------------------------------------------------
function parseMulkiyet(sectionText) {
  if (!sectionText) return [];
  // Satır içi \n'ler edinme sebebini böldüğü için bölümü düzleştiriyoruz
  const flat = sectionText.replace(/\s+/g, ' ');
  const entries = [];

  // Malik kalıbı: "(SN:42239258) SEFA KARAKUM : KEMAL Oğlu" veya şirket adı
  // Sistem No genelde SN bloğundan hemen önce gelir.
  // Hisse metrekare değerleriyle bitişik gelebilir: "-1/19424.009424.00Satış"
  // -> hisse "1/1", metrekare "9424.00", toplam metrekare "9424.00".
  // Pay/payda tembel (lazy) yazılır ki metrekare grupları hakkını yesin.
  const re =
    /(\d{6,})?\s*\(SN:(\d+)\)\s*(.+?)\s*-?(\d+?\/\d+?)(\d+\.\d{2})?(\d+\.\d{2})?(?=[-\sA-Za-zÇĞİÖŞÜçğıöşü])/g;
  let m;
  while ((m = re.exec(flat)) !== null) {
    const sistemNo = (m[1] || '').trim();
    const sn = m[2];
    let malik = m[3].replace(/\s+/g, ' ').trim();
    const hisse = m[4];
    const metrekare = m[5] || '';
    const toplamMetrekare = m[6] || '';

    // Maliği ad ve baba adına böl (varsa): "SEFA KARAKUM : KEMAL Oğlu"
    let adSoyad = malik;
    let babaAdi = '';
    const parts = malik.split(/\s*:\s*/);
    if (parts.length === 2) {
      adSoyad = parts[0].trim();
      babaAdi = parts[1].trim();
    }

    entries.push({ sistemNo, sn, malik, adSoyad, babaAdi, hisse, metrekare, toplamMetrekare });
  }

  // Edinme sebeplerini kabaca eşle (sıra ile)
  const edinmeMatches = [...flat.matchAll(
    /(Satış|Miras|Bağış|Trampa|İntikal|[\wÇĞİÖŞÜçğıöşü .]+?Temlik İşlemi|[\wÇĞİÖŞÜçğıöşü .]+?Cins Değişikliği)\s+(\d{2}-\d{2}-\d{4})\s+(\d+)/g,
  )];
  edinmeMatches.forEach((em, i) => {
    if (entries[i]) {
      entries[i].edinmeSebebi = em[1].replace(/\s+/g, ' ').trim();
      entries[i].edinmeTarihi = em[2];
      entries[i].edinmeYevmiye = em[3];
    }
  });

  return dedupe(entries, (e) => `${e.sn}|${e.hisse}`);
}

// ---------------------------------------------------------------------------
// 5) İpotek / rehin bilgileri
// ---------------------------------------------------------------------------
// Faiz metnini sadeleştir: "yıllık  %70" -> "yıllık %70", satır kırılmasıyla
// bölünen kelimeleri birleştir ("%19,75akd i" -> "%19,75 akdi")
function temizFaiz(s) {
  return String(s || '')
    .replace(/\s+/g, ' ')
    .replace(/%\s+(?=\d)/g, '%')
    .replace(/(\d)(?=[A-Za-zÇĞİÖŞÜçğıöşü])/g, '$1 ')
    .replace(/\b([A-Za-zÇĞİÖŞÜçğıöşü]{2,}) ([a-zçğıöşü])\b/g, '$1$2')
    .trim();
}

function parseIpotek(sectionText) {
  if (!sectionText) return [];
  const entries = [];

  // Her ipotek bloğu ascii "Ipotek" başlığı ile başlar. Blok içindeki ilk
  // satır ipotek özetidir; altındaki "İpoteğin Konulduğu Hisse Bilgisi"
  // borçlu malik tablosudur (onu özetin dışında tutuyoruz).
  // Değerler bitişik gelir:
  //   "(SN:2281342) BANKA A.Ş. ... Evet1500000.00 TLFaizsiz1/1F.B.KNilüfer - 26-08-2021 14:14 - 47623"
  // Faiz tek regex'e sığmadığı için (örn. "Yıllık43,07 (Sabit faiz)",
  // "%7,68 SABİT", "%19,75akd i") satırı SONDAN çözüyoruz:
  //   ... <faiz><derece/sıra><süre><kurum> - <tarih> <saat> - <yevmiye>
  const blocks = sectionText.split(/\bIpotek\b/);
  for (const block of blocks) {
    // Özet kısmı: borçlu malik tablosundan önceki bölüm
    const ozet = block.split('İpoteğin Konulduğu')[0];
    const flat = ozet.replace(/\s+/g, ' ').trim();

    // 1) Kuyruk: "- tarih saat - yevmiye" her zaman sondadır
    const tm = flat.match(/-\s*(\d{2}-\d{2}-\d{4})\s+(\d{1,2}:\d{2})\s*-\s*(\d+)\s*$/);
    if (!tm) continue;
    const tarih = tm[1], saat = tm[2], yevmiye = tm[3];
    let rest = flat.slice(0, tm.index).trim();

    // 2) Kurum: süre işaretinin (F.B.K. / F.B.K / FBK) sonrası. Kurum adı
    //    parantez/rakam/boşluk içerebilir: "Yenişehir(BURSA)",
    //    "Osmangazi 1.Bölge(Kapatildi)".
    let sure = '', kurum = '';
    const sm = rest.match(/F\.?\s?B\.?\s?K\.?/i);
    if (sm) {
      sure = 'F.B.K.';
      kurum = rest.slice(sm.index + sm[0].length).replace(/^[\s.]+/, '').trim();
      rest = rest.slice(0, sm.index).trim();
    } else {
      // Süre yoksa son kelime(ler) kurum kabul edilir
      const km = rest.match(/([A-Za-zÇĞİÖŞÜçğıöşü0-9.()]+(?:\s+[A-Za-zÇĞİÖŞÜçğıöşü0-9.()]+)*)$/);
      if (km) { kurum = km[1].trim(); rest = rest.slice(0, km.index).trim(); }
    }

    // 3) Derece/sıra: sondaki "n/m". Faiz yüzdesiyle bitişik gelebilir
    //    ("%701/0" = faiz %70, derece 1/0; "% 11,761/0" = faiz %11,76, derece
    //    1/0): faiz tarafı rakam/virgül/% ile bitiyorsa derece çok haneli
    //    çıkmış demektir — son hane derece, kalan haneler faize iade edilir.
    const dm = rest.match(/(\d+)\/(\d+)\s*$/);
    if (!dm) continue;
    let derece = dm[1], sira = dm[2];
    rest = rest.slice(0, dm.index).trim();
    if (derece.length >= 2 && /[\d%,]$/.test(rest)) {
      rest += derece.slice(0, -1);
      derece = derece.slice(-1);
    }

    // 4) Kalan baş: "(SN:..) alacaklı Evet/Hayır <borç> TL <faiz>"
    const hm = rest.match(/\(SN:(\d+)\)\s*([\s\S]+?)\s*(Evet|Hayır)\s*([\d.,]+)\s*TL\s*([\s\S]*)$/);
    if (!hm) continue;

    entries.push({
      alacakli: hm[2].replace(/\s+/g, ' ').trim(),
      musterek: hm[3],
      borc: hm[4] + ' TL',
      faiz: temizFaiz(hm[5]),
      dereceSira: `${derece}/${sira}`,
      sure,
      kurum,
      tarih,
      saat,
      yevmiye,
      hisse: parseIpotekHisse(block),
      rehinSerh: parseRehinSerh(block),
    });
  }
  return dedupe(entries, (e) => `${e.alacakli}|${e.borc}|${e.yevmiye}`);
}

// İpoteğin konulduğu hisse bilgisi (taşınmaz, borçlu malik, malik borç, tescil)
function parseIpotekHisse(block) {
  const raw = block.split('İpoteğin Konulduğu')[1];
  if (!raw) return null;
  const hisseOnly = raw.split('Rehine Ait Şerh')[0] || '';
  // Sütun başlığını (".. Hisse Bilgisi Taşınmaz ... Tarih Yev") at
  const flat = hisseOnly.replace(/\s+/g, ' ').replace(/Hisse Bilgisi[\s\S]*?Tarih Yev/, '');

  const hisseRe =
    /(\d+\/\d+)\s*\(SN:(\d+)\)\s*(.+?)\s*([\d.,]+)\s*TL\s*([A-Za-zÇĞİÖŞÜçğıöşü0-9.()]+(?:\s+[A-Za-zÇĞİÖŞÜçğıöşü0-9.()]+)*)\s*-\s*(\d{2}-\d{2}-\d{4})\s+(\d{1,2}:\d{2})\s*-\s*(\d+)/;
  const h = flat.match(hisseRe);
  if (!h) return null;

  const tasinmaz = flat.slice(0, h.index).trim().replace(/\s+/g, ' ');
  return {
    tasinmaz,
    hissePayPayda: h[1],
    borcluMalik: h[3].replace(/\s+/g, ' ').trim(),
    malikBorc: h[4] + ' TL',
    kurum: h[5],
    tarih: h[6],
    saat: h[7],
    yevmiye: h[8],
  };
}

// Rehine ait şerh/beyan bilgisi (İİK 150/c vb.)
function parseRehinSerh(block) {
  const parts = block.split('Rehine Ait Şerh Beyan Bilgisi').slice(1);
  const out = [];
  for (const part of parts) {
    // Başlık satırı ("Ş/B/İ Açıklama Malik ...") kayıt anahtar kelimesinden
    // önce gelir; doğrudan "Serh/Beyan" kelimesinden itibaren yakalıyoruz.
    // Tarih dar sütunda bölünebilir: "19-01-20 26 10:36 - 3535" -> 19-01-2026
    const flat = part.replace(/\s+/g, ' ');
    const m = flat.match(
      /(Serh|Şerh|Beyan|İrtifak)\s*([\s\S]*?)\s+(\d{2}-\d{2}-\d{2})\s*(\d{2})\s+(\d{1,2}:\d{2})\s*-\s*(\d+)/
    );
    if (!m) continue;
    const tur = m[1] === 'Serh' ? 'Şerh' : m[1];
    const tarih = m[3] + m[4];
    const yevmiye = m[6];
    let aciklama = m[2].replace(/\s+/g, ' ').trim();
    aciklama += ` (${tarih.replace(/-/g, '.')} tarih, ${yevmiye} yevmiye)`;
    out.push({ tur, aciklama, tarih, saat: m[5], yevmiye });
  }
  return dedupe(out, (e) => `${e.aciklama}|${e.yevmiye}`);
}

// ---------------------------------------------------------------------------
// Yardımcılar
// ---------------------------------------------------------------------------
function dedupe(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Ana giriş noktası
// ---------------------------------------------------------------------------
export function parseTakbis(rawText) {
  const lines = cleanLines(rawText);
  const cleanText = lines.join('\n');
  const flatText = lines.join(' ').replace(/\s+/g, ' ');

  const sections = splitSections(lines);

  const tasinmazSerhText = sections['TAŞINMAZA AİT ŞERH BEYAN İRTİFAK BİLGİLERİ'] || '';
  const mulkiyetText = sections['MÜLKİYET BİLGİLERİ'] || '';
  const mulkiyetSerhText = sections['MÜLKİYETE AİT ŞERH BEYAN İRTİFAK BİLGİLERİ'] || '';
  const rehinText = sections['MÜLKİYETE AİT REHİN BİLGİLERİ'] || '';

  return {
    ustBilgi: parseHeader(cleanText),
    tapuKayit: parseKayitBilgisi(flatText),
    tasinmazSerhBeyan: parseSerhBeyan(tasinmazSerhText),
    mulkiyet: parseMulkiyet(mulkiyetText),
    mulkiyetSerhBeyan: parseSerhBeyan(mulkiyetSerhText),
    ipotekler: parseIpotek(rehinText),
    hamMetin: {
      tasinmazSerh: tasinmazSerhText,
      mulkiyet: mulkiyetText,
      mulkiyetSerh: mulkiyetSerhText,
      rehin: rehinText,
    },
  };
}

export { KAYIT_LABELS_TR };
