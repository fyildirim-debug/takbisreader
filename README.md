# TAKBIS Reader

TAKBIS / Web Tapu PDF belgelerini yükleyip **takyidat bilgilerini** (tapu kayıt,
şerh-beyan-irtifak, mülkiyet, ipotek/rehin) otomatik çıkaran ve **rapora hazır
metin** üreten Node.js web uygulaması.

🌐 Demo / canlı: **https://takbis.arnexlab.com**

---

## ✨ Özellikler

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
- **Excel/CSV & JSON dışa aktarma.**

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

## ☁️ Dokploy ile dağıtım (takbis.arnexlab.com)

1. Dokploy'da **New Application** → kaynak olarak bu Git deposunu seçin.
2. **Build Type:** `Dockerfile` (veya `Docker Compose` → `docker-compose.yml`).
3. **Port:** `3000`.
4. **Domain:** `takbis.arnexlab.com` ekleyin, SSL'i (Let's Encrypt) etkinleştirin.
5. **Deploy**.

Uygulama `PORT` ortam değişkenini dinler (varsayılan `3000`).

### Ortam değişkenleri

| Değişken | Açıklama |
|----------|----------|
| `PORT` | Sunucu portu (varsayılan 3000) |
| `STATS_USER` / `STATS_PASS` | `/stats` paneli kimlik bilgileri |
| `DATA_DIR` | İstatistik/erişim kaydı dizini (volume için `/app/data`) |
| `NVI_PROXY` | **Opsiyonel.** NVİ (UAVT) sorgusu için çıkış proxy'si. NVİ devlet sistemi (F5 WAF) veri merkezi/yurt dışı sunucu IP'lerini engelleyebilir; UAVT sorgusu sunucuda çalışmıyorsa Türkiye IP'li bir HTTP(S) proxy URL'si verin (ör. `http://kullanici:sifre@host:port`). Yalnızca NVİ istekleri bu proxy'den geçer. |

## 🗂️ Proje yapısı

```
src/
  server.js      # Express sunucusu + /api/parse (PDF yükleme, çoklu dosya)
  parser.js      # TAKBIS metin ayrıştırıcı (tüm bölümler)
public/
  index.html     # Tek sayfa arayüz (sidebar geçmiş, rapor metni, kopyalama)
Dockerfile
docker-compose.yml
```

## 🛠️ Teknolojiler

Node.js · Express · Multer · pdf-parse · vanilla JS (bağımlılıksız arayüz)

## 👤 Yapımcı

**Furkan Yıldırım** — https://furkanyildirim.com/

Bu araç ücretsiz bir hizmet olarak sunulmaktadır.
