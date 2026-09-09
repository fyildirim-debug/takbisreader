# TAKBIS Reader

TAKBIS / Web Tapu PDF belgelerini yükleyip **takyidat bilgilerini** (tapu kayıt,
şerh-beyan-irtifak, mülkiyet, ipotek/rehin) otomatik çıkaran ve **rapora hazır
metin** üreten Node.js web uygulaması.

🌐 Demo / canlı: **https://takbisci.com.tr**

---

## ✨ Özellikler

- **Kütük Özeti (ön değerlendirme):** Çıkarılan kayıtlar otomatik olarak *devri engelleyen*
  (haciz, tedbir, aile konutu, satış vaadi, İİK 150/c …), *değeri etkileyen* (ipotek, intifa,
  irtifak, kira şerhi …) ve *incelenmeli* diye ayrılır; toplam ipotek yükü hesaplanır ve
  **rapora yapıştırılabilir kanaat paragrafı** üretilir. Sınıflandırma ihtiyatlıdır:
  tanınmayan hiçbir kayıt sessizce "temiz" sayılmaz. Sayımlar rapor metniyle aynı
  tekilleştirilmiş listeden gelir, bu yüzden ikisi asla ayrışmaz.
- **PDF → yapısal veri:** Tapu Kayıt Bilgisi, Taşınmaza/Mülkiyete Ait Şerh-Beyan-İrtifak,
  Mülkiyet (malik) ve İpotek/Rehin bilgileri otomatik ayrıştırılır.
- **Rapora hazır metin:** "TAPU TAKYİDAT BİLGİLERİ" formatında, tek tıkla kopyalanabilir
  hazır rapor metni (Beyanlar / Şerhler / Rehinler / Rehinlere Ait Şerhler + icrai haciz sayısı).
- **Standart ipotek cümlesi:** "… lehine 1. dereceden 1.500.000 TL bedelle ipotek mevcuttur.
  (tarih, yevmiye)" biçiminde kopyalanabilir metin.
- **Geçmiş (sidebar):** İşlenen belgeler soldaki listede kalıcı tutulur; PDF dosyası
  olmadan tek tıkla yeniden açılır.
- **Sağlam ayrıştırma:** Sayfa kırılmasıyla bölünen kayıtlar, bitişik yazılan alanlar,
  "BİLGİ AMAÇLIDIR" filigran kırıntıları ve mükerrer haciz kayıtları doğru biçimde işlenir.
- **TKGM parsel entegrasyonu:** Belgeden çıkan il/ilçe/mahalle/ada/parsel ile TKGM
  CBS API'sinden pafta no, koordinat ve parsel geometrisi otomatik alınır; yüzölçüm
  TAKBIS ile çapraz doğrulanır, parsel haritada (OpenStreetMap/Leaflet) gösterilir.
- **Adres & çevre analizi (OSM):** Koordinattan açık adres (Nominatim) ve yakın
  çevredeki okul/hastane/market/durak mesafeleri (Overpass) — "Bölge Özellikleri"
  bölümüne tek tıkla metin olarak eklenir.
- **Taranmış belge uyarısı:** Metin katmanı olmayan (görüntü olarak taranmış) PDF'lerde
  artık sessizce boş sonuç dönmez; sebebi açıkça yazılır.
- **Excel/CSV & JSON dışa aktarma.**
- **Bilgi sayfaları:** takyidat, şerh-beyan-irtifak, haciz-ipotek, belge alma, SSS ve
  gizlilik konularında Türkçe rehber sayfaları (arama motoru görünürlüğü ve kullanıcı için).

## ⚖️ Yasal Bilgilendirme

- Bu uygulama, **Tapu ve Kadastro Genel Müdürlüğü (TKGM) veya herhangi bir resmî kurumla bağlantılı değildir**
  ve resmî bir tapu sorgulama hizmeti sunmaz.
- Uygulama **devlet sistemlerine kullanıcı adına giriş yapmaz**, e-Devlet/Web Tapu kimlik bilgisi istemez ve
  tapu kaydı sorgulamaz. Yalnızca kullanıcının **yasal yollarla edindiği** (ör. Web Tapu üzerinden kendisinin
  indirdiği) PDF belgelerini, kullanıcının talebiyle ayrıştırır. Belge sahibinin kendi belgesini işlemesi
  meşru bir kullanımdır; **yasa dışı hiçbir veri erişimi veya sorgulama söz konusu değildir**.
- Parsel konum bilgisi, TKGM'nin **herkese açık** Parsel Sorgu (CBS) servisinden; adres ve çevre bilgisi
  OpenStreetMap'in açık servislerinden (Nominatim/Overpass) alınır.
- Çıkarılan bilgiler **bilgi amaçlıdır**, resmî belge niteliği taşımaz. Resmî ve güncel tapu kayıtları için
  yetkili merciler esastır.

**Resmî adresler:**

| Kurum / Hizmet | Adres |
|----------------|-------|
| Tapu ve Kadastro Genel Müdürlüğü (TKGM) | https://www.tkgm.gov.tr/ |
| Web Tapu | https://webtapu.tkgm.gov.tr/ |
| TKGM Parsel Sorgu | https://parselsorgu.tkgm.gov.tr/ |
| KVKK (Kişisel Verileri Koruma Kurumu) | https://www.kvkk.gov.tr/ |

## 🔒 Gizlilik

Yüklediğiniz PDF'ler ve çıkarılan bilgiler **sunucuda saklanmaz**. PDF'ler bellekte
işlenir, diske yazılmaz. Geçmiş yalnızca **kullandığınız cihazın tarayıcı önbelleğinde**
(`localStorage`) tutulur; tarayıcıdan silindiğinde kaybolur.

Yasal saklama yükümlülüğü (KVKK / 5651 sayılı Kanun) kapsamında **erişim kayıtları**
(IP adresi, tarih-saat, tarayıcı bilgisi, yapılan işlem) `data/access.jsonl` dosyasında
tutulur. Sağlık kontrolü (`/healthz`) ve bot/izleme istekleri ziyaret sayılmaz.

## 🚀 Yerel çalıştırma

```bash
npm install
npm start
# http://localhost:3000
```

Node.js 18+ gereklidir.

## 🐳 Docker

```bash
docker build -t takbis-reader .
docker run -p 3000:3000 takbis-reader
# http://localhost:3000
```

## ☁️ Dokploy ile dağıtım (takbisci.com.tr)

1. Dokploy'da **New Application** → kaynak olarak bu Git deposunu seçin.
2. **Build Type:** `Dockerfile` (veya `Docker Compose` → `docker-compose.yml`).
3. **Port:** `3000`.
4. **Domain:** `takbisci.com.tr` ekleyin, SSL'i (Let's Encrypt) etkinleştirin.
5. **Environment** sekmesinde `STATS_USER` ve `STATS_PASS` değişkenlerini tanımlayın
   (güçlü, tahmin edilemez değerler kullanın — bu bilgiler depoda **yer almaz**).
6. **Volume:** `/app/data` dizinine kalıcı bir volume bağlayın. `docker-compose.yml`
   kullanıyorsanız `takbis-data` volume'ü zaten tanımlıdır. **Bu olmadan her
   dağıtımda ziyaret istatistikleri ve KVKK/5651 erişim kayıtları silinir.**
7. **Deploy**.

Uygulama `PORT` ortam değişkenini dinler (varsayılan `3000`).

### Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `PORT` | Sunucu portu (varsayılan 3000) |
| `STATS_USER` / `STATS_PASS` | `/stats` paneli kimlik bilgileri. **Yalnızca ortam değişkeniyle verilir** (Dokploy → Environment); koda/depoya yazılmaz. Tanımlanmazsa `/stats` paneli devre dışı kalır. |
| `DATA_DIR` | İstatistik/erişim kaydı dizini (volume için `/app/data`) |
| `TRUST_PROXY` | Güvenilen ters vekil (proxy) sayısı, varsayılan `1`. Uygulama yalnızca Traefik'in arkasındaysa `1` doğrudur. Cloudflare gibi ikinci bir katman varsa `2` yapın. **Gereğinden büyük vermeyin:** istemci kendi `X-Forwarded-For` başlığını uydurup erişim kaydına sahte IP yazdırabilir. |
| `MAX_UPLOAD_MB` | Tek istekte kabul edilen toplam yükleme boyutu, varsayılan `150`. Dosya başına sınır ayrıca 25 MB'dır. |
| `NVI_PROXY` | **Opsiyonel.** NVİ (UAVT) sorgusu için sabit çıkış proxy'si (`http://kullanici:sifre@host:port`). Verilirse önce bu denenir. Verilmezse uygulama, NVİ devlet sistemi (F5 WAF) sunucu IP'sini engellediğinde **otomatik olarak ücretsiz Türkiye proxy listelerini** (proxyscrape, geonode, proxifly) çekip paralel dener; çalışanı bulup önbelleğe alır. Sabit/kaliteli bir TR proxy varsa `NVI_PROXY` ile vermek daha hızlı ve güvenilirdir. |

## 🔎 SEO ve simgeler

- **Simge seti kendi üretimimizdir** (`public/favicon.svg`, `favicon.ico` 16/32/48,
  `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`): cilt lacivertliği zemin,
  sicil kırmızısı kenar çizgisi, kâğıt kremi kayıt satırları — ürünün "kenara düşülmüş
  şerh" fikrinin 16px'te bile okunan hâli. Üreteç: oturum betiği; PNG (zlib) ve
  ICO (BMP/DIB) kodlayıcıları elle yazıldı, dış araç gerekmez.
- **Temiz URL'ler:** `/takyidat-nedir` gibi adresler uzantısız çalışır
  (`express.static` + `extensions: ['html']`); `.html` uzantılı istekler **301** ile
  kanonik adrese yönlendirilir, çift içerik oluşmaz.
- **Yapısal veri:** ana sayfada `WebSite` + `Person` + `WebApplication` (`@graph`),
  içerik sayfalarında `BreadcrumbList` + `Article`, SSS sayfasında ayrıca `FAQPage`.
- Her sayfada tek `h1`, `canonical`, Open Graph ve Twitter kartı; başlıklar ≤ 60,
  meta açıklamalar ≤ 158 karakter (Google kırpma sınırı).
- `sitemap.xml` tüm sayfaları listeler; `robots.txt` `/stats` ve `/api/` dizinlerini
  kapatır ve site haritasını bildirir.
- **Önbellek:** yazı tipi ve simgeler `immutable` (1 yıl), HTML `must-revalidate`.
- Üçüncü taraf yazı tipi, analitik veya reklam betiği **yoktur**; çerez kullanılmaz.

## 🗂️ Proje yapısı

```
src/
  server.js      # Express sunucusu + tüm API uçları, hız sınırı, güvenlik başlıkları
  parser.js      # TAKBIS metin ayrıştırıcı (tüm bölümler)
  konum.js       # TKGM parsel, Nominatim adres, Overpass çevre, NVİ UAVT
  rapor.js       # Word (.docx) değerleme raporu üretimi
  stats.js       # Ziyaret sayaçları + KVKK/5651 erişim kayıtları + /stats panosu
public/
  index.html     # Tek sayfa arayüz (cilt rafı, kütük özeti, rapor metni, editör, harita)
  icerik.css     # Bilgi sayfalarının stili (jetonlar index.html ile aynı, senkron tutulmalı)
  takyidat-nedir.html · serh-beyan-irtifak.html · haciz-ve-ipotek.html
  tapu-kayit-ornegi-nasil-alinir.html · sikca-sorulan-sorular.html · gizlilik.html
  fonts/         # Kendi barındırılan Archivo değişken yazı tipi (latin + latin-ext)
  favicon.svg · favicon.ico · apple-touch-icon.png · icon-192.png · icon-512.png
  site.webmanifest · robots.txt · sitemap.xml
Dockerfile
docker-entrypoint.sh   # Veri dizinini hazırlar, root olmayan 'node' kullanıcısına düşer
docker-compose.yml
```

## 🔐 Güvenlik notları

- Uygulama konteynerde **root olmayan** `node` kullanıcısıyla çalışır.
- API uçlarında IP başına hız sınırı vardır (normal kullanımın çok üzerinde;
  aşıldığında `429` + `Retry-After` döner).
- `/stats` kimlik doğrulaması sabit zamanlı karşılaştırma kullanır.
- Yanıtlarda `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`,
  `Permissions-Policy` başlıkları gönderilir. **CSP bilinçli olarak eklenmemiştir:**
  arayüz satır içi script/stil kullandığı için `unsafe-inline` olmadan çalışmaz.
- Leaflet, CDN'den **SRI (alt kaynak bütünlüğü) hash'i** ile yüklenir.

## 🎨 Arayüz

Arayüz, tapu sicilinin kendi düzenini izler: solda **cilt rafı** (işlenen belgeler), sağda
başlık bloğu ve cetvelli **haneler**. Cilt lacivertliği kromayı taşır, defter yeşili çalışma
alanını; **yevmiye ve sicil numaraları numaratör moruyla** ayrı mürekkepte yazılır. Kırmızı /
amber / yeşil **kapalı bir karar yasasıdır** — yalnızca Kütük Özeti'nde bulunur ve her biri
renge ek olarak bir glif ve metin jetonu taşır, böylece renk görmeden de okunur.

- Kart ve gölge yok; ayrım cetvel çizgisiyle yapılır.
- İkonlar çizilmiş SVG'dir (emoji değil), tek çizgi kalınlığı ve tek ızgarada.
- Başlık yüzü **Archivo** kendi sunucumuzda barındırılır (`public/fonts/`); dış yazı tipi
  servisi çağrılmaz, ziyaretçi IP'si üçüncü tarafa sızmaz.
- Koyu varyant işletim sistemi tercihini izler (`prefers-color-scheme`); aynı dünyanın gece
  hâlidir, ayrı bir tema değildir.
- Her iki temada da tüm metin WCAG AA kontrast eşiğini (4.5:1 / 3:1) geçer.
- `prefers-reduced-motion` altında tek hareketli an (karar plakasının yerleşmesi) kapanır.

## 🛠️ Teknolojiler

Node.js · Express · Multer · pdf-parse · vanilla JS (bağımlılıksız arayüz) ·
kendi barındırılan Archivo değişken yazı tipi

## 🔎 Anahtar Kelimeler

takbis okuma · takbis pdf · tapu takyidat · takyidat belgesi · şerh beyan irtifak ·
ipotek sorgulama · haciz listesi · web tapu pdf · tapu kayıt örneği ·
gayrimenkul değerleme · ekspertiz raporu · taşınmaz değerleme · TKGM parsel sorgu ·
değerleme raporu hazırlama

## 👤 Yapımcı

**Furkan Yıldırım** — https://furkanyildirim.com/

Bu araç ücretsiz bir hizmet olarak sunulmaktadır.
