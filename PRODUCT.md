# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Birincil: **gayrimenkul değerleme uzmanı (eksper)** — bir taşınmaz için ekspertiz/değerleme
raporu hazırlarken, elindeki Web Tapu/TAKBIS takyidat PDF'ini rapora dönüştürüyor. Terminolojiye
(şerh, beyan, irtifak, takyidat, yevmiye, F.B.K., derece/sıra) hakim, aynı işi günde defalarca
tekrarlıyor.

İkincil, teyit edilmiş: **emlakçı, banka kredi/teminat birimi, avukat** gibi yarı-uzman
kullanıcılar. Tapu terimlerini tam bilmiyorlar; terimlerin yanında kısa açıklama gerekiyor,
ama arayüz onlara göre sadeleştirilip uzmanın hızını düşürmemeli.

Kullanım yeri: **masaüstü / ofis**. Geniş ekranda, çoğunlukla Word açıkken yan yana çalışılıyor.
Mobil çalışmalı ama düzen kararlarında masaüstü önceliklidir.

## Product Purpose

Web Tapu / TAKBIS'ten alınan tapu kayıt örneği (takyidat belgesi) PDF'ini saniyeler içinde
yapısal veriye çevirir ve değerleme raporuna hazır hale getirir. Elle okuyup daktilo etmek
gereken bir belgeyi, kopyalanabilir metne ve Word rapor iskeletine dönüştürür.

Başarı: uzman belgeyi yükledikten sonra (a) taşınmazın takyidat durumunu güvenle okuyabiliyor
ve (b) raporuna geçireceği metni/dosyayı elle düzeltmeye gerek kalmadan alabiliyor. Bu iki iş
**eşit ağırlıkta**: önce inceleyip doğruluyor, sonra çıktıyı alıyor. Düzen bu iki aşamayı net
ayırmalı.

## Positioning

Belgeyi yalnızca metne çevirmiyor; TAKBIS'in dar sütunlu, sayfa kırılmalı, filigran kirli PDF
metnini **alan alan doğru ayrıştırıyor** ve doğrudan sektörün beklediği "TAPU TAKYİDAT
BİLGİLERİ" biçiminde çıktı veriyor. Üstüne ücretsiz kamu servisleriyle (TKGM parsel, OSM adres
ve çevre, NVİ UAVT) belgeyi **çapraz doğruluyor** — yüzölçümü TAKBIS ile TKGM arasında
karşılaştırılıyor, parsel haritada gösteriliyor, bağımsız bölüm UAVT koduyla eşleştiriliyor.
Genel bir PDF okuyucunun veya bir yapay zekâ özetleyicinin doğrulukla yapamayacağı iş budur.

## Operating Context

- Kullanıcı belgeyi kendisi Web Tapu'dan indirip yüklüyor; uygulama hiçbir devlet sistemine
  kullanıcı adına giriş yapmıyor.
- Çalışma masaüstünde, çoğunlukla Word açıkken sürüyor: kopyala-yapıştır ve .docx indirme
  akışın merkezinde.
- Aynı oturumda birden çok belge işlenebiliyor (tek istekte 50 PDF'e kadar); işlenenler soldaki
  geçmişte kalıyor ve PDF olmadan yeniden açılabiliyor.
- Ekspertiz raporunun takyidat dışındaki bölümlerini (bölge, teknik, iskan, imar, faktörler,
  fiyatlandırma) uzman uygulama içindeki editörde dolduruyor; bunlar Word çıktısına giriyor.

## Capabilities and Constraints

Yetenekler (hepsi çalışır durumda, korunacak):
- PDF → yapısal veri: üst bilgi, tapu kayıt bilgisi, taşınmaza/mülkiyete ait şerh-beyan-irtifak,
  mülkiyet (malik), ipotek/rehin (+ konulduğu hisse, + rehine ait şerh).
- Rapora hazır "TAPU TAKYİDAT BİLGİLERİ" metni; hane hane (Beyanlar/Şerhler/Rehinler/Rehinlere
  Ait Şerhler) + icrai/ihtiyati haciz sayısı. Düzenlenebilir.
- Standart ipotek cümlesi üretimi ve tek tıkla kopyalama.
- Word (.docx) değerleme raporu iskeleti; uzman bölümleri zengin metin editöründen dolar.
- TKGM parsel: pafta, yüzölçüm (TAKBIS ile çapraz doğrulama), nitelik, koordinat, geometri;
  Leaflet + OpenStreetMap haritası.
- Nominatim ters geokodlama ile açık adres; Overpass ile 20 kategoride yakın çevre analizi ve
  bunu "Bölge Özellikleri"ne metin olarak ekleme.
- NVİ UAVT: koordinattan bağımsız bölüm listesi, TAKBIS blok/kat bilgisiyle eşleştirme ve seçim.
- Geçmiş (localStorage), Excel/CSV ve JSON dışa aktarma.
- Yönetici istatistik panosu (`/stats`, Basic Auth).

Kısıtlar:
- **Sunucuda hiçbir belge veya takyidat verisi saklanmaz.** PDF bellekte işlenir. Geçmiş yalnızca
  kullanıcının tarayıcısında. Bu bir pazarlama sözü değil, mimarinin kendisi.
- Arayüz **tek dosya**: `public/index.html` (HTML+CSS+JS). Derleme adımı, paket yöneticisi veya
  framework yok; bu bilinçli.
- Satır içi `<script>`, satır içi `onclick` ve satır içi stil kullanıldığı için CSP
  `unsafe-inline` olmadan uygulanamıyor.
- Dış servisler (TKGM, Nominatim, Overpass) önce **tarayıcıdan** çağrılır; sunucu uçları yalnızca
  yedektir. NVİ yalnızca sunucudan çağrılabilir (CORS kapalı).
- Ayrıştırma "en iyi çaba"dır: her bölümün ham metni de sonuca eklenir ki kullanıcı
  doğrulayabilsin. Bu doğrulama yüzeyi kaldırılamaz.

Açık/kararlaştırılmamış: erişilebilirlik için hedeflenen resmî bir standart (ör. WCAG seviyesi)
belirlenmedi.

## Brand Commitments

- Ad: **TAKBIS Okuyucu** / TAKBIS Reader. Alan adı `takbisci.com.tr`.
- Yapımcı: Furkan Yıldırım (https://furkanyildirim.com/). Ücretsiz bir hizmet olarak sunuluyor.
- Zorunlu yasal bilgilendirme, sayfadan kaldırılamaz: uygulamanın TKGM veya herhangi bir resmî
  kurumla **bağlantılı olmadığı**, devlet sistemlerine kullanıcı adına giriş yapmadığı, çıktıların
  bilgi amaçlı olduğu ve resmî belge niteliği taşımadığı.
- Gizlilik beyanı (PDF'lerin sunucuda saklanmadığı, geçmişin yalnızca tarayıcıda tutulduğu) ve
  KVKK/5651 erişim kaydı bildirimi korunmalı.
- Dil Türkçe; tapu terminolojisi sektörde kullanıldığı biçimde korunur ("takyidat", "şerh",
  "yevmiye" gibi terimler sadeleştirilmez).

## Evidence on Hand

- Çalışan gerçek ürün: `public/index.html`, `src/` altındaki ayrıştırıcı ve servis modülleri.
- Gerçek ayrıştırma çıktısı örneği ve regresyon girdileri oturum scratchpad'inde mevcut.
- Örnek TAKBIS PDF'leri **kişisel veri içerdiği için depoda yok** (`.gitignore`). Ekran
  görüntüsü veya örnek belge uydurulmamalı.
- Müşteri referansı, kullanım istatistiği, ödül, fiyatlandırma veya kurumsal iş birliği iddiası
  **yoktur** — bunlar uydurulamaz.

## Product Principles

1. **Doğruluk gösterilir, iddia edilmez.** Ayrıştırılan her bölümün ham metni ve dış servislerle
   çapraz doğrulaması erişilebilir kalır; kullanıcı isterse her değeri kaynağına kadar takip
   edebilmelidir.
2. **Çıktı ürünün kendisidir.** Kopyalanabilir metin ve .docx, arayüzün süsü değil amacıdır;
   her tasarım kararı bu iki çıktıya giden yolu kısaltmalıdır.
3. **Uzmanın hızı, yarı-uzmanın anlayışına feda edilmez.** Açıklamalar isteğe bağlı katmanda
   durur; varsayılan görünüm yoğun ve hızlıdır.
4. **Veri kullanıcınındır.** Sunucuda saklama yok, kilitlenme yok; geçmiş, JSON ve CSV olarak her
   an dışa aktarılabilir.
5. **Sınırlar dürüstçe söylenir.** Resmî olmadığı, bilgi amaçlı olduğu ve neyin doğrulanamadığı
   gizlenmez.

## Accessibility & Inclusion

Ürüne özgü zorunlu bir standart belirlenmedi. Bilinen bağlam: uzun süreli ekran başı kullanım,
masaüstü ağırlıklı, yoğun tablo okuma. Klavye ile gezinme ve okunabilir kontrast pratik
gerekliliktir; hedef seviye kullanıcı tarafından teyit edilmemiştir.
