# TAKBİS Okuyucu

Web Tapu'dan indirilen tapu kayıt örneği (takyidat) PDF'ini okuyup içindeki kayıtları tabloya döken küçük bir web uygulaması. Değerleme raporu yazarken takyidatı PDF'ten elle aktarmaktan sıkılınca yazdım.

Canlı: https://takbisci.com.tr

![Örnek bir takyidat belgesinin işlenmiş hali](docs/ekran-goruntusu.png)

*Görseldeki veriler uydurmadır.*

## Ne yapıyor

PDF'i yüklediğinizde şunları çıkarıyor:

- Tapu kayıt bilgisi: il/ilçe, ada/parsel, cilt/sayfa, yüzölçümü, bağımsız bölüm, arsa payı
- Taşınmaza ve mülkiyete ait şerh, beyan ve irtifaklar, tarih ve yevmiye numaralarıyla
- Malikler ve hisseleri
- İpotekler: alacaklı, tutar, derece/sıra, faiz

Bunların üstüne:

- Kütük özeti: kayıtları "devri engelleyen", "değeri etkileyen" ve "incelenmeli" diye ayırıyor, toplam ipotek yükünü hesaplıyor. Tanımadığı bir kaydı temiz saymıyor, incelenmeli'ye atıyor.
- Rapora yapıştırılacak "Tapu Takyidat Bilgileri" metni ve Word (.docx) rapor iskeleti
- Excel/CSV ve JSON dışa aktarma
- TKGM parsel sorgusundan pafta, koordinat ve parsel sınırı; yüzölçümünü TAKBİS'teki değerle karşılaştırıyor
- OpenStreetMap üzerinden adres ve yakın çevredeki okul, hastane, market, durak mesafeleri

Birden fazla PDF aynı anda yüklenebilir. Taranmış (metin katmanı olmayan) PDF'lerde neden okuyamadığını söylüyor.

Ayrıştırma pdf-parse'ın verdiği ham metin üzerinden çalışıyor. Sayfa arasında bölünen kayıtları, bitişik yazılmış alanları ve "BİLGİ AMAÇLIDIR" filigranından metne sızan parçaları topluyor ama PDF'in tablo yapısını birebir göremediği için her şeyi yakalayacağının garantisi yok. Çıktıyı belgeyle karşılaştırmadan rapora koymayın. Yakalayamadığı bir belge olursa issue açarsanız bakarım (kişisel bilgileri silerek).

## Gizlilik

Yüklenen PDF'ler bellekte işlenir, diske yazılmaz, sunucuda saklanmaz. İşlenen belgelerin listesi sadece sizin tarayıcınızda (localStorage) durur.

Sunucu, 5651 sayılı kanun gereği erişim kaydı tutar (IP, zaman, tarayıcı, yapılan işlem): `data/access.jsonl`.

## Çalıştırma

Node.js 18 veya üstü gerekiyor.

```bash
npm install
npm start
```

Uygulama http://localhost:3000 adresinde açılır.

Docker ile:

```bash
docker build -t takbis-reader .
docker run -p 3000:3000 -v takbis-data:/app/data takbis-reader
```

`/app/data` klasörüne volume bağlamazsanız her yeniden dağıtımda istatistikler ve erişim kayıtları silinir. `docker-compose.yml` bunu zaten yapıyor; Dokploy gibi bir panele de bu dosyayla ya da doğrudan Dockerfile ile kurulabilir.

### Ortam değişkenleri

| Değişken | Açıklama |
|---|---|
| `PORT` | Varsayılan 3000 |
| `DATA_DIR` | İstatistik ve erişim kaydı klasörü, Docker'da `/app/data` |
| `STATS_USER`, `STATS_PASS` | `/stats` panelinin kullanıcı adı ve şifresi. Verilmezse panel kapalı kalır. |
| `TRUST_PROXY` | Önündeki ters vekil sayısı, varsayılan 1. Traefik'in önünde Cloudflare da varsa 2. Gereğinden büyük verirseniz istemci `X-Forwarded-For` ile sahte IP yazdırabilir. |
| `MAX_UPLOAD_MB` | Bir istekteki toplam yükleme sınırı, varsayılan 150. Dosya başına sınır 25 MB. |
| `NVI_PROXY` | İsteğe bağlı. NVİ adres (UAVT) sorgusu için çıkış proxy'si, `http://kullanici:sifre@host:port`. NVİ sunucu IP'sini engellerse ve bu verilmemişse uygulama ücretsiz Türkiye proxy listelerini deniyor; o yol yavaş ve güvenilmez. |

## Dosyalar

```
src/
  server.js    Express sunucusu ve API uçları
  parser.js    TAKBİS metin ayrıştırıcı
  konum.js     TKGM parsel, Nominatim, Overpass, NVİ UAVT
  rapor.js     Word raporu
  stats.js     Ziyaret sayacı, erişim kayıtları, /stats paneli
public/
  index.html   Arayüzün tamamı (tek dosya, framework yok)
  *.html       Takyidat, şerh/beyan, haciz/ipotek, SSS ve gizlilik sayfaları
```

Arayüz tasarım kuralları `DESIGN.md`'de, ürünün neyi yapıp neyi yapmadığı `PRODUCT.md`'de.

## Yasal not

Bu uygulamanın Tapu ve Kadastro Genel Müdürlüğü ya da başka bir resmî kurumla ilgisi yok. Kimse adına e-Devlet'e veya Web Tapu'ya giriş yapmaz, tapu kaydı sorgulamaz. Sadece sizin kendi indirdiğiniz PDF'i okur. Çıktılar bilgi amaçlıdır, resmî belge yerine geçmez; güncel ve resmî kayıt için [Web Tapu](https://webtapu.tkgm.gov.tr/) esastır.

Parsel bilgisi TKGM'nin herkese açık [Parsel Sorgu](https://parselsorgu.tkgm.gov.tr/) servisinden, adres ve çevre bilgisi OpenStreetMap'ten geliyor.

## İletişim

Furkan Yıldırım · https://furkanyildirim.com
