---
name: TAKBIS Okuyucu
description: Tapu takyidat PDF'ini sicil sayfasına çeviren tek dosyalık çalışma yüzeyi.
colors:
  cilt: "#1B2740"
  cilt-2: "#243352"
  cilt-3: "#35496F"
  cilt-ink: "#E4E9DC"
  cilt-ink-2: "#9DACC4"
  cilt-rule: "#33425F"
  kagit: "#E9ECE1"
  kagit-2: "#E2E6D8"
  kagit-3: "#D7DCC9"
  murekkep: "#15190F"
  murekkep-2: "#4A5241"
  murekkep-3: "#565D4D"
  cetvel: "#C4CCB5"
  cetvel-2: "#A9B398"
  numarator: "#5B3D96"
  numarator-2: "#7B5FB8"
  engel: "#A81E15"
  engel-zemin: "#F4DFDD"
  engel-cetvel: "#DDB4B0"
  dikkat: "#8A5A00"
  dikkat-zemin: "#F4E8D2"
  dikkat-cetvel: "#DCC69A"
  temiz: "#1E6B4A"
  temiz-zemin: "#DAE8DF"
  temiz-cetvel: "#A9C6B5"
  yikici: "#8E2A20"
  # --- gece değerleri: aynı adların prefers-color-scheme: dark karşılığı ---
  cilt-gece: "#0E1626"
  cilt-2-gece: "#172234"
  cilt-3-gece: "#2A3B58"
  cilt-ink-gece: "#DDE3D4"
  cilt-ink-2-gece: "#8494AC"
  cilt-rule-gece: "#23314A"
  kagit-gece: "#171E2B"
  kagit-2-gece: "#1D2534"
  kagit-3-gece: "#252E40"
  murekkep-gece: "#E6EBDA"
  murekkep-2-gece: "#A9B49C"
  murekkep-3-gece: "#8F9A83"
  cetvel-gece: "#303B4E"
  cetvel-2-gece: "#435066"
  numarator-gece: "#B39CE8"
  numarator-2-gece: "#C9B8F0"
  engel-gece: "#F1938A"
  engel-zemin-gece: "#3A1B18"
  engel-cetvel-gece: "#6B2F29"
  dikkat-gece: "#DFB569"
  dikkat-zemin-gece: "#35280D"
  dikkat-cetvel-gece: "#63501F"
  temiz-gece: "#7FC9A3"
  temiz-zemin-gece: "#12301F"
  temiz-cetvel-gece: "#2E5A41"
  yikici-gece: "#E0918A"
  # --- belge adası (.word-ed / .wtb / .ed): kapalı alt palet, ada dışına çıkmaz ---
  ada-sayfa: "#ffffff"
  ada-serit: "#F1F1EC"
  ada-serit-cetvel: "#DCDCD2"
  ada-denetim-kenar: "#CFCFC3"
  ada-denetim-hover: "#E2E2D8"
  ada-serit-murekkep: "#2C3026"
  ada-govde-murekkep: "#16180F"
  ada-etkin-zemin: "#DED3F2"
  ada-yertutucu: "#6E7266"
  ada-etkin-kenar: "#8E77C9"
  ada-etkin-murekkep: "#4A2F80"
  # --- perde: adlandırılmamış; DESIGN.md etiketi ---
  perde: "rgba(10,15,25,.5)"
  perde-kip: "rgba(10,15,25,.55)"
  # --- kullanıcı girdisinin başlangıç değeri, palet değil ---
  ed-yazi-varsayilan: "#C00000"
  ed-vurgu-varsayilan: "#FFFF00"
typography:
  display:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Segoe UI', sans-serif"
    fontSize: "19px"
    fontWeight: 700
    lineHeight: 1.55
    letterSpacing: "-.005em"
    fontVariation: "font-stretch: 90%"
  headline:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Segoe UI', sans-serif"
    fontSize: "17px"
    fontWeight: 700
    letterSpacing: ".01em"
    fontVariation: "font-stretch: 88%"
  title:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Segoe UI', sans-serif"
    fontSize: "15px"
    fontWeight: 700
    letterSpacing: ".015em"
    fontVariation: "font-stretch: 88%"
  subtitle:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 600
    letterSpacing: ".005em"
  belge-govde:
    fontFamily: "Archivo, 'Segoe UI', sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.6
  body:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Segoe UI', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Archivo, ui-sans-serif, system-ui, 'Segoe UI', sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: ".1em"
    fontVariation: "font-stretch: 92%"
  data:
    fontFamily: "ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', Consolas, 'SF Mono', 'Liberation Mono', monospace"
    fontSize: "12.5px"
    fontWeight: 400
    fontFeature: "font-variant-numeric: tabular-nums"
  kimlik:
    fontFamily: "ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', Consolas, 'SF Mono', 'Liberation Mono', monospace"
    fontSize: "21px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "-.01em"
    fontFeature: "font-variant-numeric: tabular-nums"
  sayim:
    fontFamily: "ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', Consolas, 'SF Mono', 'Liberation Mono', monospace"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "font-variant-numeric: tabular-nums"
rounded:
  blok: "0"
  dugme: "2px"
  odak: "1px"
  hap: "99px"
  daire: "50%"
spacing:
  kenar: "74px"
  olcu: "68ch"
components:
  copybtn:
    backgroundColor: "transparent"
    textColor: "{colors.murekkep-3}"
    rounded: "{rounded.dugme}"
    size: "27px"
  copybtn-hover:
    backgroundColor: "{colors.kagit-3}"
    textColor: "{colors.numarator}"
  copybtn-ok:
    backgroundColor: "{colors.temiz-zemin}"
    textColor: "{colors.temiz}"
  copybtn-birincil:
    backgroundColor: "{colors.cilt}"
    textColor: "{colors.cilt-ink}"
    rounded: "{rounded.dugme}"
    padding: "0 12px"
    height: "29px"
  karne-hukum-engel:
    backgroundColor: "{colors.engel-zemin}"
    textColor: "{colors.engel}"
    typography: "{typography.headline}"
    padding: "16px 18px"
  karne-hukum-dikkat:
    backgroundColor: "{colors.dikkat-zemin}"
    textColor: "{colors.dikkat}"
    typography: "{typography.headline}"
    padding: "16px 18px"
  karne-hukum-temiz:
    backgroundColor: "{colors.temiz-zemin}"
    textColor: "{colors.temiz}"
    typography: "{typography.headline}"
    padding: "16px 18px"
  plaka:
    backgroundColor: "{colors.dikkat-zemin}"
    textColor: "{colors.dikkat}"
    rounded: "{rounded.blok}"
    padding: "11px 14px"
  plaka-engel:
    backgroundColor: "{colors.engel-zemin}"
    textColor: "{colors.engel}"
  tag:
    backgroundColor: "{colors.kagit-2}"
    textColor: "{colors.murekkep-2}"
    rounded: "{rounded.blok}"
    padding: "2px 7px"
    typography: "{typography.label}"
  hist-item:
    backgroundColor: "{colors.cilt}"
    textColor: "{colors.cilt-ink}"
    padding: "11px 14px"
  hist-item-active:
    backgroundColor: "{colors.cilt-2}"
    textColor: "{colors.cilt-ink}"
---

# Design System: TAKBIS Okuyucu

Bu dosya **sevk edilmiş** `public/index.html` içinden çıkarılmıştır: değerler `<style>`
bloğundaki gerçek bildirimlerdir, niyetten değil koddan alınmıştır. Frontmatter normatiftir;
düzyazı yalnızca nerede ve neden kullanıldığını anlatır. Kod tek dosyadır, derleme adımı yoktur;
bu yüzden her düzenleme doğrudan bu sistemin içine yazılır.

Bölüm başlıkları (`## Colors` vb.) araçlar tarafından ayrıştırıldığı için İngilizce ve tam
yazımıyla korunmuştur; metin Türkçedir.

## Overview

**Creative North Star: "Yevmiye Defteri"**

Ekran, tapu sicilinin sayfasıdır. Solda lacivert bez cilt (cilt rafı ve başlık bandı) kromayı
taşır; sağda defter yeşiline çalan çalışma kâğıdı kayıtları tutar. Ayrım kartla veya gölgeyle
değil, **cetvel çizgisiyle** yapılır: her blok 1px'lik bir hairline ile ayrılır, bölüm başlıkları
2px'lik daha ağır bir cetvelle biter. Numaratör moru sicil numaralarının mürekkebidir ve aynı
zamanda arayüzün tek etkileşim vurgusudur. Karar renkleri (kırmızı/amber/yeşil) hüküm anlamını
Kütük Özeti ile tehlike plakasında taşır.

Yoğunluk bilinçlidir: kullanıcı günde onlarca belge işleyen bir değerleme uzmanıdır; taban gövde
ölçüsü 13px, etiketler 11px, satır aralığı 1.55'tir. Yüzeyde boş nefes alanı değil, okunur satır
ritmi vardır. Koyu SaaS pano dili, yuvarlatılmış kartlar, renkli dolgu düğmeleri ve dekoratif
gradyanlar reddedilmiştir.

Karanlık varyant ayrı bir tema değil, **aynı dünyanın gecesidir**: `prefers-color-scheme: dark`
altında aynı token adları yeniden değerlenir, hiçbir kural veya bileşen değişmez. Kontrast
ölçümü bu belgenin bulgusu değildir; bitiş incelemesinde raporlanmıştır.

**Key Characteristics:**
- Kart ve gölge yok; ayrım yalnızca cetvel çizgisi (1px `--cetvel`, 2px `--cetvel-2`).
- Ters tipografi rampası: en büyük tip bir sayıdır (21px mono), başlıklar 11px versal etikettir.
- İki yüz: Archivo (etiket/başlık/düzyazı) + sistem mono (tüm veri değerleri).
- Köşe yarıçapı fiilen sıfır; 2px yalnızca düğme ve alanlarda.
- İkonlar yazılmış SVG `<symbol>`; emoji ve ikon fontu yok.
- Tek ifade edici hareket: hükmün kâğıda basılması (`@keyframes damga`).

## Colors

Palet üç maddeden gelir: bez cilt (lacivert), defter kâğıdı (yeşile çalan kırık beyaz) ve
mürekkepler (siyah-zeytin metin, mor numaratör, üç renkli karar mürekkebi).

### Primary
- **Cilt Laciverti** (`--cilt`): Kroma yüzeyi. Başlık bandı, kenar çubuğu ve tek dolgulu düğme
  (`.copybtn.birincil`, `.wn-foot button`) bu renktedir. Ekranın yaklaşık %30'u.
  `--cilt-2` hover/etkin zemin, `--cilt-3` hover kenarı, `--cilt-rule` cilt içi hairline,
  `--cilt-ink` / `--cilt-ink-2` cilt üzerindeki birincil/ikincil metin.
- **Numaratör Moru** (`--numarator`, açık ton `--numarator-2`): iki işi vardır ve ikisi de
  sistemdir. (a) Yevmiye/sicil numarası mürekkebi (`.yev`, `.mono-uavt`, `.wn-ver`).
  (b) Arayüzün **tek etkileşim vurgusu**: `::selection`, `:focus-visible`, tüm hover kenarları
  (`#drop`, `.copybtn`, `.konum-links a`, `.raw summary`, `.uavt-sec`, `.cv-mini`), açık anahtar
  (`.switch input:checked`), seçili kategori (`.cv-cat:has(input:checked)`, `accent-color`),
  yükleme halkası (`.spin`), eşleşen UAVT satırının çubuğu ve `.wtb button.active`.

### Secondary
- **Yıkıcı Eylem Mürekkebi** (`--yikici`): geri alınamaz eylemin ve hatanın rengi.
  Yalnızca dört yerde: geçmişi temizle (`.side-head button:hover`), fiş sil
  (`.hist-item .hx:hover`), kip kapat (`.wn-head .wn-x:hover`) ve hata metni (`.err`).
  `--engel`den bir tık koyu ve ayrı bir tokendır; ikisi bilerek karıştırılmaz.

### Neutral
- **Defter Kâğıdı** (`--kagit`): gövde zemini. `--kagit-2` bir kademe içeri çekilmiş blok zemini
  (tablo başlığı, karne, rapor kutusu, plakasız bloklar), `--kagit-3` en içteki kademe
  (rapor başlık şeridi, ipotek başlığı, hover dolgusu).
- **Mürekkep** (`--murekkep`): ana metin. `--murekkep-2` ikincil metin ve grup başlıkları,
  `--murekkep-3` etiket/yardımcı metin ve pasif ikon.
- **Beyaz** (`#fff`): token değildir, üç yerde görünür — `::selection` metni,
  `.copybtn.birincil:hover` metni ve `@media print` gövde zemini. Ayrıca belge adasının
  sayfa zemini (aşağıya bakın).
- **Cetvel** (`--cetvel`): satır ayıran hairline. `--cetvel-2` blok kenarı ve ağır (2px) bölüm
  cetveli; aynı zamanda kaydırma çubuğu başparmağı.

### Tertiary — karar mürekkepleri
Her biri üçlü gelir: metin rengi, zemin, kenar.
- **Engel Kırmızısı** (`--engel` / `--engel-zemin` / `--engel-cetvel`): devri engelleyen hüküm.
- **Dikkat Amberi** (`--dikkat` / `--dikkat-zemin` / `--dikkat-cetvel`): devri engellemeyen
  ama değeri/kullanımı etkileyen hüküm.
- **Temiz Yeşili** (`--temiz` / `--temiz-zemin` / `--temiz-cetvel`): engelleyici kayda
  rastlanmadı hükmü; ayrıca kopyalama başarısı ve TKGM çapraz doğrulama onayı.

### Karanlık tema değerleri
`prefers-color-scheme: dark` altında aynı adlar yeniden değerlenir. Frontmatter bir medya
sorgusu tutamadığı için gece değerleri orada `<ad>-gece` anahtarlarıyla taşınır; bu **yeni bir
token seti değildir**, aynı 25 tokenın ikinci değeridir. Bir bileşen asla `-gece` anahtarını
doğrudan kullanmaz — her zaman `var(--ad)` yazılır, değeri medya sorgusu seçer.

| Token | Açık | Koyu | | Token | Açık | Koyu |
|---|---|---|---|---|---|---|
| `--cilt` | #1B2740 | #0E1626 | | `--cetvel` | #C4CCB5 | #303B4E |
| `--cilt-2` | #243352 | #172234 | | `--cetvel-2` | #A9B398 | #435066 |
| `--cilt-3` | #35496F | #2A3B58 | | `--numarator` | #5B3D96 | #B39CE8 |
| `--cilt-ink` | #E4E9DC | #DDE3D4 | | `--numarator-2` | #7B5FB8 | #C9B8F0 |
| `--cilt-ink-2` | #9DACC4 | #8494AC | | `--engel` | #A81E15 | #F1938A |
| `--cilt-rule` | #33425F | #23314A | | `--engel-zemin` | #F4DFDD | #3A1B18 |
| `--kagit` | #E9ECE1 | #171E2B | | `--engel-cetvel` | #DDB4B0 | #6B2F29 |
| `--kagit-2` | #E2E6D8 | #1D2534 | | `--dikkat` | #8A5A00 | #DFB569 |
| `--kagit-3` | #D7DCC9 | #252E40 | | `--dikkat-zemin` | #F4E8D2 | #35280D |
| `--murekkep` | #15190F | #E6EBDA | | `--dikkat-cetvel` | #DCC69A | #63501F |
| `--murekkep-2` | #4A5241 | #A9B49C | | `--temiz` | #1E6B4A | #7FC9A3 |
| `--murekkep-3` | #565D4D | #8F9A83 | | `--temiz-zemin` | #DAE8DF | #12301F |
| | | | | `--temiz-cetvel` | #A9C6B5 | #2E5A41 |

`color-scheme` her iki blokta da bildirilir (`light` / `dark`), böylece tarayıcının kendi
alanları (form denetimleri, kaydırma çubukları) tema ile birlikte döner.

### Named Rules

**Hüküm Rengi Kuralı.** Kırmızı/amber/yeşilin **yargı** anlamı yalnızca iki yerde yaşar: Kütük
Özeti bloğu (`.karne`) ve tehlike plakası (`.plaka`). Aynı üçlü, arayüzün geri kalanında yalnızca
**durum** rengi olarak görünür ve orası da kapalıdır: kopyalama başarısı (`.copybtn.ok`) ve
çapraz doğrulama (`.ok-badge` / `.warn-badge`, `.uavt-sel`). Yıkıcı eylem bu üçlünün dışındadır. Yeni bir yüzeyde bu renkleri
üçüncü bir anlamla — marka, kategori veya süs — kullanmak yasaktır.

**Yıkıcı Eylem Kuralı.** Yıkıcı eylem ve hata `--yikici` kullanır, `--engel` **kullanamaz**.
Bir düğmenin kırmızısı taşınmaz hakkında bir yargı gibi okunmamalıdır; silme kırmızısı evrensel
bir affordance'tır, hüküm değildir. Aynı biçimde `--engel` bir düğmenin hover rengi olamaz.

**Renksiz Okunma Kuralı.** Hüküm asla yalnızca renkle anlatılmaz. `.karne-hukum` her zaman
bir ikon + büyük harf söz taşır: engel → `i-block` + "DEVRE ENGEL VAR"; dikkat → `i-warn` +
"DİKKAT GEREKİYOR"; temiz → `i-check` + "ENGEL GÖRÜNMÜYOR". Madde satırları aynı şekilde
"Engel" / "Dikkat" / "İncele" metin jetonunu ikonla birlikte taşır (`.karne-madde .isaret`).
Renk kaldırıldığında karar hâlâ okunmalıdır.

**Tek Vurgu Kuralı.** Etkileşimin (odak, hover, seçim, açık anahtar) tek rengi `--numarator`'dur.
Yeni bir hover veya odak rengi tanımlanmaz. *Sapma notu:* yön sözleşmesi moru "yalnız yevmiye/
sicil numaralarında" öngörüyordu; sevk edilen yapıda mor aynı zamanda tek etkileşim vurgusudur.
Yapı kazanır; kayda geçen kural budur.

## Typography

**Display / Body / Label Font:** Archivo (değişken; ağırlık ekseni 400–700, genişlik ekseni
62%–125%), kendi barındırdığımız iki woff2 alt kümesiyle (`/fonts/archivo-latin.woff2`,
`/fonts/archivo-latin-ext.woff2`), `font-display: swap`, `<head>` içinde `preload`.
**Data Font:** sistem mono yığını (`--yuz-veri`).

**Karakter:** Archivo dar-versal etiketlerde bir sicil formunun basılı başlıkları gibi durur;
mono ise ölçülen her şeyin — numara, tarih, tutar, koordinat — yazıldığı kalemdir.

*Sapma notu:* yön sözleşmesi "sistem grotesk" diyordu. Yapı Archivo değişken fontu kendi
barındırır; bir platform sans'ı kendi dünyasına sahip bir sayfanın gösterim sesi olarak
kullanılamaz. Yapı kazanır.

### Hierarchy
Rampa **terstir**: sayfanın en büyük tipi bir başlık değil, bir sayıdır.
- **Kimlik** (mono, 600, 21px/1.1, `-0.01em`, `tabular-nums`): `.doc-kimlik .kimlik b` —
  ada/parsel ve cilt/sayfa. Sayfadaki en büyük tip bir başlık değil, taşınmazın numarasıdır.
- **Display** (Archivo, 700, 19px, `font-stretch: 90%`, `-0.005em`): `.doc-title` — belge adı.
- **Headline** (Archivo, 700, 17px versal, `font-stretch: 88%`): `.karne-hukum .soz` — hüküm sözü.
- **Title** (Archivo, 700, 15px, `font-stretch: 88%`): `header h1`. Gövde tabanı da 15px'tir
  (`body`), ama içerik metni bloklarda 13px'e iner.
- **Sayım** (mono, 600, 17px/1, `tabular-nums`): `.sayim-satir .adet` — kütük özetindeki
  kayıt sayıları; tutar gösterirken 14px'e iner (`.adet.tutar`).
- **Alan Başlığı** (Archivo, 600, 14px, `.005em`): `#drop h2` — kayıt bırakma alanının
  çağrısı.
- **Body** (Archivo, 400, 13px/1.55–1.65): karne maddesi, kanaat paragrafı, `.kv .row`,
  `.wn-body li`, `.seo-box p`. Düzyazı ölçüsü `--olcu: 68ch` ile sınırlanır.
- **Label** (Archivo, 600–700, 11px, `letter-spacing` .04em–.12em, VERSAL,
  `font-stretch: 92%`): `.etiket`, `.section h3`, `.kv .k`, `th`, `.tag`, `.ed-group .gh`,
  `.side-head`. Sistemin en çok tekrarlanan tipografik birimi.
- **Data** (mono, 12–12.5px, `tabular-nums`): `.veri`, tablo hücreleri, `.doc-sub`,
  `.rapor textarea`, `.raw pre` (11px), `.hist-item .hm` (11px).

### Named Rules

**11px Tabanı Kuralı.** İşlevsel hiçbir metin 11px'in altına inmez. Yasal bilgilendirme dahil
en küçük metin 11px'tir (`.site-foot`, `.raw pre`, `.karne-not`). Yeni bir yüzey 10px veya daha
küçük bir işlevsel metin getiremez.

**İki Yüz Kuralı.** Yalnızca iki yüz vardır. Archivo etiket, başlık ve düzyazıyı taşır; mono
**yalnızca ölçülen veriyi** taşır — numara, tarih, tutar, koordinat, ham metin. Mono "teknik
görünsün" diye kostüm olarak kullanılmaz; üçüncü bir aile eklenmez.

**Genişlik Ekseni Kuralı.** Archivo'nun genişlik ekseninin üç durağı vardır ve yenisi
açılmaz: 88% (`header h1`, `.karne-hukum .soz`), 90% (`.doc-title`), 92% (`.etiket`, `.kv .k`).
Gövde metni doğal genişlikte kalır.

**Tabular Kuralı.** `tabular-nums` gövdede açılır ve `.veri`, `.yev`, `.adet`, `.mono-uavt`
üzerinde yeniden bildirilir. Sütun halinde okunan hiçbir sayı orantılı rakamla dizilmez.

## Layout

**Ana iskelet.** `header` (min 60px, cilt zemini, altında 1px `--cilt-rule`) + `.layout`
(flex, `min-height: calc(100vh - 61px)`). Solda `.sidebar` 274px sabit (cilt zemini, sağında
1px cetvel); sağda `.main` esner: `padding: 22px 26px 64px`, içerik `max-width: 1020px` ile
ortalanır (`.main > *`).

**Ritim.** Sistemde adlandırılmış bir boşluk skalası **yoktur**; blok dolguları içerik
yoğunluğuna göre 7–26px arasında elle verilmiştir (tipik: satır 7–9px dikey, blok başlığı
10–15px, blok gövdesi 13–16px, bölümler arası `.section { margin-top: 26px }`). Bir skala icat
etmeyin; komşu bloğun dolgusunu eşleyin.

İki adlandırılmış ölçü vardır ve ikisi de sistemdir:
- `--kenar: 74px` — şerh kenarı; `.karne-madde` ızgarasının ilk sütunu (işaret/jeton şeridi).
- `--olcu: 68ch` — düzyazı ölçüsü; kanaat paragrafı, `.seo-box`, `.site-foot`.

**Izgaralar.** `.kv` etiket–değer ızgarası `repeat(auto-fill, minmax(310px, 1fr))`, sütunlar
arası 26px, satırlar arası 0 (ayrım cetvelle). `.karne-madde` `var(--kenar) 1fr`.
`.sayim-satir` `minmax(140px, auto) 1fr auto` (ad · açıklayıcı · sağa dayalı rakam),
satırlar arasında 1px cetvel.

**Kırılma noktaları.**
- **≤860px** — hamburger görünür (`.menu-toggle`), başlık 54px'e iner ve alt başlık gizlenir;
  `.layout` bloklaşır, `.sidebar` üstten tam boy sabit çekmeceye dönüşür (%85 genişlik,
  max 320px, `translateX(-100%)`, `.open` ile girer, kenarı 2px'e kalınlaşır) ve `.overlay`
  arkasına düşer; `.main` dolgusu 14px'e iner, genişlik sınırı kalkar; `.kv` tek sütuna iner;
  `.karne-ust` dikeye döner (hüküm bloğunun sağ kenarı alt kenara taşınır, karar rengini
  korur), `.sayim-satir` iki sütuna iner ve açıklayıcı alt satıra geçer, `.karne-madde` tek sütuna iner ve işaret
  şeridi altına noktalı çizgiyle ayrılır; tablolar `min-width: 540px` ile yatay kaydırılır
  (`.section`, `.ipotek-card` `overflow-x: auto`); geniş kopyalama düğmeleri tam genişliğe geçer.
- **≤560px** — yalnızca rapor başlığındaki geniş düğmeler tam genişliğe geçer ve
  `margin-left: auto` düşer. Sayım satırları 860px'teki biçimini korur.

**Baskı.** `@media print` kroma ve eylemleri kaldırır (sidebar, header, `#drop`, `.fill-row`,
`.copybtn`, örtüler, yükleyici), zemini beyaza alır, `.main` dolgusunu sıfırlar. Sayfa çıktıda
düz bir belgedir.

**Tarayıcı yüzeyleri.** `::selection` mor zemin/beyaz metin; `:focus-visible` 2px mor dış çizgi,
2px offset, 1px yarıçap; kaydırma çubukları `scrollbar-width: thin` + `scrollbar-color`, WebKit
tarafında 11px genişlik, saydam yol, `--cetvel-2` başparmak (`--kagit` zeminle 3px kenarlık
sayesinde inceltilmiş), cilt içinde `--cilt-3`. Bunlar sistemin parçasıdır, varsayılana
bırakılmaz.

## Elevation & Depth

**Gölge yoktur.** Hiçbir yüzey yükseltilmez; derinlik yalnızca üç araçla anlatılır: (1) kâğıt
kademesi — `--kagit` → `--kagit-2` → `--kagit-3`; (2) cetvel çizgisi — 1px `--cetvel` satır
ayrımı, 2px `--cetvel-2` bölüm/blok sınırı; (3) kroma karşıtlığı — cilt laciverti ile kâğıt
arasındaki kesin sınır.

Modal (`.wn-modal`) bile yükselmez: yükseltme yerine `border-width: 2px` kullanır. Örtüler
gölge değil **perde**dir: `.overlay` `rgba(10,15,25,.5)`, `.wn-overlay` `rgba(10,15,25,.55)`.
Bu iki değerin CSS'te bir adı **yoktur** — frontmatter'daki `perde` / `perde-kip` anahtarları bu
belgenin etiketleridir, kodda değişken olarak bulunmazlar.
`.ipotek-card` adına rağmen kart değildir — 1px kenarlı cetvelli bir bloktur.

Dosyadaki iki `box-shadow` da yükseltme değildir: `.hist-item.active:before { box-shadow:
1px 0 0 }` 1px'lik sekmeyi 2px'lik düz bir işarete uzatır; karanlık temada
`.word-ed { box-shadow: 0 0 0 4px var(--kagit-3) }` bulanıksız, ofsetsiz bir **paspartu**dur —
beyaz belge adasının gece parlamasını kesen düz bir çerçeve halkası. Bulanıklığı veya ofseti
olan hiçbir gölge yoktur.

### Named Rules
**Cetvel Kuralı.** Ayrım çizgiyle yapılır, gölgeyle değil. Yeni bir blok gölge, `filter:
drop-shadow` veya yükseltme katmanı getiremez; ihtiyaç duyduğu ayrımı 1px `--cetvel` /
2px `--cetvel-2` ile alır.

## Shapes

Form dili dikdörtgendir. Bloklar (`.karne`, `.rapor`, `.plaka`, `.tag`, `.editor-panel`,
`.ipotek-card`, `#drop`, `.word-ed`, `.wn-modal`, tablolar) **köşesizdir** — yarıçap 0.

Yarıçap yalnızca dokunulan küçük denetimlerde belirir ve dört değeri vardır (bunlar CSS
değişkeni değildir; aşağıdaki adlar bu belgenin etiketleridir):
- **2px** — düğmeler, seçiciler, girdiler (`.copybtn`, `.menu-toggle`, `.wn-open`,
  `.side-foot button`, `.wtb button`, `.wsize`, `.uavt-sec`, `.cv-actions select`, `.wn-x`).
- **1px** — odak halkasının kendisi (`:focus-visible { border-radius: 1px }`).
- **99px** — anahtar rayı ve kaydırma başparmağı.
- **50%** — anahtar topuzu ve yükleme halkası (tam daire).

Kenarlıklar her zaman 1px'tir; 2px kenarlık üç yerde anlamlıdır: bölüm/blok kapanışı
(`.doc-sub`, `.section h3`, `.ed-group .gh`, `.seo-box`, `.karne-kanaat` üst kenarı), modal
gövdesi ve dar ekranda açılan çekmecenin sağ kenarı.

`.tag:before` 6×6px'lik bir tür işareti basar ve dördü de köşelidir: boş kare (Beyan,
`box-shadow: inset`), dolu kare (Şerh), üçgen ve baklava (`clip-path`). Sistemde yuvarlak nokta
yoktur.

## Components

Aşağıdaki sınıf adları sistemdir; yeni bir yüzey bunları **yeniden kullanır**, benzerini
yazmaz.

### İkonlar (`.ico`, `ic(ad, ek)`)
Tüm ikonlar sayfanın başındaki gizli `<svg>` içinde `<symbol id="i-*">` olarak yazılmıştır
(29 sembol: `i-arma`, `i-menu`, `i-bell`, `i-close`, `i-shelf`, `i-trash`, `i-download`,
`i-file`, `i-copy`, `i-check`, `i-refresh`, `i-map`, `i-bank`, `i-pin`, `i-tag`, `i-around`,
`i-word`, `i-clipboard`, `i-pencil`, `i-lock`, `i-scale`, `i-search`, `i-plus`, `i-warn`,
`i-block`, `i-eye`, `i-undo`, `i-redo`, `i-eraser`). Tek ızgara (24×24), tek çizgi kalınlığı
(`stroke-width: 1.6`; küçük boyda 2–2.4'e çıkar), `fill: none`, `currentColor`, yuvarlak uç.
Boyut `1em`, hizalama `vertical-align: -.14em`. Dolgulu varyant `.ico.dolgu`.
`ic(ad, ek)` yardımcısı `<use href="#i-*">` üretir ve `aria-hidden` ekler.

**Sonuç davranışı:** ikon içeren düğmelerde `flash()` `textContent` değil `innerHTML` değiştirir;
aksi hâlde SVG silinir. Yeni bir düğme geri bildirimi de aynı yolu izlemelidir.

### Kopyalama düğmeleri (`.copybtn`)
Karakteri: sessiz, kenar çizgili, dolgusuz.
- **Şekil:** 27×27px kare, 2px yarıçap, 1px `--cetvel-2` kenar, saydam zemin.
- **Hover:** kenar ve metin mora döner, zemin `--kagit-3` olur (120ms).
- **Başarı (`.ok`):** kenar/metin `--temiz`, zemin `--temiz-zemin`; `flash()` ikonu `i-check`
  ile değiştirip 1300ms sonra geri alır.
- **Geniş (`.wide`):** yükseklik 29px, yatay dolgu 12px, `.05em` aralık; dar ekranda tam genişlik.
- **Birincil (`.birincil`):** tek dolgulu düğme *stili* — cilt laciverti zemin, cilt mürekkebi
  metin. Yalnızca iki yerde: Word raporu indirme ve güncelleme notlarının kapatma düğmesi
  (`.wn-foot button`). Bir görünümde birden fazla birincil düğme bulunmaz.
- **Devre dışı:** `opacity: .55`.

### Kayıt türü damgası (`.tag`)
Kenar notu damgası: 11px versal, `.07em` aralık, 1px kenar, 2×7px dolgu, köşesiz, nötr
mürekkep (`--murekkep-2`), zemin `--kagit-2`. `.tag` sınıfına tür adı Türkçe yazımıyla eklenir
(`class="tag Şerh"`), çünkü sınıf doğrudan ayrıştırılan `e.tur` değerinden gelir.

**Dört tür renkle değil, işaret biçimiyle ayrılır** (`.tag:before`, 6×6px, `currentColor`):
boş kare = Beyan (`box-shadow: inset 0 0 0 1.5px`), dolu kare = Şerh, üçgen = İrtifak
(`clip-path`), baklava = İpotek. Damgaya karar rengi veya numaratör moru girmez: bir şerhin
varlığı kendiliğinden engel demek değildir, tür bir hüküm değildir.

### Etiket–değer ızgarası (`.kv`)
Form alanı çiftleri. `.kv .row` altında 1px cetvel, `.kv .k` 11px versal etiket
(min-width 152px, dar ekranda 124px), `.kv .v` 500 ağırlıklı değer; değer ölçülen bir veriyse
`.veri` ile monoya geçer. Kutu yok, zemin yok, yalnızca satır.

### Bölüm (`.section`)
Sicilin bir hanesi. `h3` 11px versal, `.12em` aralık, altında 2px `--cetvel-2`; solunda 13px
ikon, sağında `margin-left: auto` ile `.sayi` (mono kayıt sayacı). Bölüm gövdesi ya `.kv`,
ya tablo, ya `.empty` ("Kayıt yok") olur. Dar ekranda bölüm yatay kaydırılabilir.

### Tablolar
`border-collapse: collapse`, 12.5px. `th` 11px versal, `--kagit-2` zemin, altında
`--cetvel-2`; `td` 8×10px dolgu, üstten hizalı, altında `--cetvel`. Son satırın alt cetveli
kaldırılır; satır hover'ı `--kagit-2`. `td.tur` daralır (`width: 1%`), `td.veri` monoya geçer.
Yevmiye sütunu `.yev` ile mor mürekkeple dizilir.

### Kütük Özeti (`.karne`) — imza bileşen
Sistemin tek karar yüzeyi. Kök `.karne` hükümle sınıflanır: `.k-engel` / `.k-dikkat` /
`.k-temiz`.
- `.karne-baslik` — üst cetvel: panel adı (11px versal) ve sağda `margin-left: auto` ile
  `.kaynak` ("ön değerlendirme"). Panelin adı buraya aittir; hüküm bloğunun içine kicker
  konmaz.
- `.karne-ust` — solda `.karne-hukum` (min 246px; ikonlu 17px versal `.soz` + `.not` gerekçe
  satırı; zemin/metin/sağ kenar hüküm rengini alır), sağda `.karne-sayim`.
- `.karne-sayim` — dört **cetvelli satır** (`.sayim-satir`), metrik kutusu değil. Izgara:
  `minmax(140px, auto) 1fr auto` — solda glifli ad, ortada açıklayıcı, sağda sağa dayalı mono
  rakam; satırlar `--cetvel` ile ayrılır, sonuncusunda cetvel kalkar. Her satır bir glif taşır
  (`block` / `warn` / `eye` / `tag`), böylece renk tek taşıyıcı olmaz.
  `.var` iken `.s-engel` ve `.s-dikkat` ad ve rakamı hüküm rengine boyar; `.yok` nötre iner.
"İncelenmeli" satırı `.s-notr` sınıfını taşır — bu sınıfın **hiç bildirimi yoktur**, nötrlük
rengin yokluğudur; sınıf yalnızca satırın niyetini işaretler.
  Dördüncü satır `.s-yuk` ipotek yüküdür: bir sayım değil bir yük gösterdiği için her zaman
  nötr mürekkeple durur ve rakamı `.adet.tutar` ile 14px'e iner. Yeşil bir sayım satırı yoktur —
  yeşil yalnızca "temiz" hükmüne aittir.
- `.karne-madde` — `--kenar` genişliğinde işaret şeridi (ikon + "Engel"/"Dikkat"/"İncele")
  ve 13px metin; metin sonunda `.kaynak` içinde `.yev` yevmiye numarası. "İncelenmeli" nötr
  mürekkeple durur: aynı kavram üstte uyarı, altta not olamaz.
- `.karne-kanaat` — rapora yapıştırılabilir paragraf (`--olcu` ile sınırlı) + `.copybtn`,
  üstünde 2px cetvel, zemini `--kagit` (bir kademe geri).
- `.karne-not` — 11px sorumluluk notu, `i-scale` ikonuyla; kaldırılamaz.
- **≤860px:** `.karne-ust` dikeye döner (hüküm bloğunun sağ kenarı alt kenara taşınır ve karar
  rengini korur), `.sayim-satir` iki sütuna iner ve açıklayıcı alt satıra geçer.

### Belge kimliği (`.doc-kimlik`)
Belge adının (`.doc-title`) altında, meta akışından **ayrı** duran kimlik satırı: her biri
11px versal etiket + 21px mono değer olan Ada/Parsel ve Cilt/Sayfa alanları. Taşınmazın
numarası meta metnine gömülmez. Altında `.doc-sub` mono künye satırı (sayfa sayısı, il/ilçe,
mahalle, işlenme zamanı) ve 2px kapanış cetveli.

### Tehlike plakası (`.plaka`)
Aynı uyarı sayfanın her yerinde aynı görünür. 1px kenar + zemin + metin, varsayılan amber;
`.p-engel` kırmızıya çevirir. İçinde `i-warn` ikonu, `<b>` ile tek cümlelik hüküm ve `.alt`
ile nötr mürekkepli açıklama. Üçüncü bir varyantı yoktur (yeşil plaka yoktur).

### Cilt rafı fişi (`.hist-item`)
Kenar çubuğundaki her belge bir sayfa fişidir. İki sütunlu ızgara: `.hn` dosya adı (12.5px,
600, taşarsa üç nokta), `.hm` mono künye satırı (11px, il/ilçe · ada/parsel · tarih),
`.hx` silme işareti (yalnızca hover'da `opacity .65`, kendi hover'ında `--yikici`). Etkin fiş
`--cilt-2` zemin alır ve solunda `:before` ile 2px'lik mor sekme taşır. Boş durumda
`.side-empty` metni açıklar.

### Rapor kutusu (`.rapor`)
`.rapor-head` şerit (`--kagit-3` zemin, 11.5px versal başlık, sağda düğmeler) + kenarsız,
zeminsiz, mono `textarea` (12.5px/1.62, min 290px, dikey yeniden boyutlanabilir). Odakta
içeriye 2px mor çizgi.

### Uzman editörü (`.fill-row`, `.editor-panel`, `.word-ed`)
`.fill-row` bir anahtar satırıdır (`.switch` 40×22px, açıkken mor; ray 99px, topuz %50).
Açıldığında `.editor-panel` üstündeki satıra kenarsız yapışır (`border-top: 0`).
`.ed-group > .gh` grup başlığı (11px versal, altında 2px cetvel), `.ed-label` alan başlığı.

`.word-ed` bilinçli bir **belge adası**dır ve tasarım sisteminin dışında durur. İçindeki metin
beyaz bir `.docx` sayfasına gider ve kullanıcı kendi yazı/vurgu renklerini seçer; zemini
karartmak çıktıyı yanlış gösterirdi (WYSIWYG). Bu yüzden ada her iki temada da beyaz kalır.
Karanlık temada tek fark bir paspartudur: `box-shadow: 0 0 0 4px var(--kagit-3)` — ada gece
sayfada parlamasın diye.

Adanın kapalı bir alt paleti vardır (frontmatter'da `ada-*` anahtarları): sayfa (`#ffffff`),
şerit zemini (`#F1F1EC`), şerit alt cetveli (`#DCDCD2`), denetim kenarı ve ayraç (`#CFCFC3`),
denetim hover'ı (`#E2E2D8`), şerit mürekkebi (`#2C3026`), gövde mürekkebi (`#16180F`), etkin
düğme zemini (`#DED3F2`), etkin düğme kenarı (`#8E77C9`), etkin düğme mürekkebi (`#4A2F80`),
yer tutucu (`#6E7266`). Bu değerler **yalnızca ada içinde**
kullanılabilir; sayfanın hiçbir yerine taşamaz ve palet tokenı yerine geçmez. Aynı gerekçeyle
adanın gövde ölçüsü 14px/1.6'dır (`.ed`) — arayüz rampasının değil, belgenin ölçüsüdür; yazı
tipi ailesi de doğrudan `'Archivo','Segoe UI'` yazılır, `--yuz-baslik` üzerinden gelmez.

Araç çubuğundaki renk seçicilerinin varsayılanları `#C00000` (Word kırmızısı) ve `#FFFF00`
(vurgu sarısı) palet değildir; kullanıcı girdisinin başlangıç değeridir ve Word'ün kendi
varsayılanlarını taklit eder. Arayüzde bu iki renk başka hiçbir yerde görünmez.

Kalın/italik/altı çizili/üstü çizili düğmeleri `<b>K</b>`, `<i>T</i>`, `<u>A</u>`, `<s>ab</s>`
harfleriyle etiketlenir. Bunlar ikon yerine geçen sembol glifi değil, **yerelleştirilmiş
tipografik denetimlerdir**: Word'ün Türkçe arayüzü de aynı harfleri kullanır ve harf, uygulayacağı
biçimin kendisini gösterir. Kural: ada içinde biçim düğmeleri harfle etiketlenir; adanın dışında
her ikon `<symbol id="i-*">` olarak yazılır. Etkin araç düğmesinin (`.wtb button.active`) metni ve kenarı da
adaya aittir (`#4A2F80` / `#8E77C9`), `var(--numarator)` değil: ada gece de açık kaldığı için
mor token'ın gece değeri `#DED3F2` zemin üzerinde 1.66:1'e düşüyor ve kalın/italik basılı mı
değil mi anlaşılmıyordu. **Kural:** ada içindeki hiçbir renk temaya bağlı bir token'dan
gelemez; ada sabit açık olduğu için karşıtlık sabit değerlerle güvence altına alınır.

`.ed:empty:before` yer tutucu metni basar (`#6E7266`, beyaz üzerinde 4.6:1).

**Ölçüm notu.** Otomatik kontrast denetimi DOM metin düğümlerini dolaşır ve **pseudo-element
içeriğini göremez**. `.ed:empty:before` bu kör noktada bir kez düşük kontrastla (3.31:1)
kaldı. `content` ile metin basan her kural (`.ed:empty:before`; ayrıca saf biçim oldukları için
sorun olmayan `.raw summary:before` ve `.seo-box li:before`) elle kontrol edilmelidir.

### Konum / UAVT / çevre (`.konum-links`, `.uavt-*`, `.cv-*`, `.poi-chip`)
- `#parselMap` 330px yüksekliğinde, 1px `--cetvel-2` kenarlı harita penceresi (`z-index: 1`).
- `.konum-links a` kenar çizgili bağlantı düğmeleri; hover'da mora döner.
- `.ok-badge` / `.warn-badge` çapraz doğrulama rozetleri: 11px, ikon + metin, yeşil/amber.
- `.uavt-sel` seçili bağımsız bölümün onay bloğu (`--temiz-zemin`, `.ico.onay`); seçilen kod
  `.mono-uavt` ile mor mono dizilir.
- `.uavt-scroll` 300px yüksekliğinde kaydırma penceresi, yapışkan `thead`; `tr.uavt-match`
  `--kagit-3` zemin alır ve ilk hücresine 3×11px mor çubuk basar. `.uavt-sec` seçim düğmesi.
- `.cv-opts` / `.cv-cat` kategori seçimleri: kenar çizgili, köşesiz, seçildiğinde mor kenar +
  mor metin + `--kagit-3` zemin; `accent-color` mor. `.cv-actions` alt eylem satırı,
  `.cv-mini` altı çizili metin düğmesi. `.poi-chip` sonuç sayacı; sayı `.m` ile mor mono.

### Ham metin (`.raw`)
Doğrulama yüzeyi; kaldırılamaz. `<details>` yapısı, kendi üçgen işaretini `:before` ile çizer
(WebKit işareti gizlenir), açıkken 90° döner. `pre` 11px mono, max 260px, `--kagit-2` zemin.

### Güncelleme notları kipi (`.wn-overlay` / `.wn-modal`)
Perde + 2px kenarlı, köşesiz, `--kagit` zeminli pencere (max 520px / 82vh). Yapışkan başlık,
`.wn-ver` sürüm satırı (mor mono, altında cetvel), `.wn-body li` çizgi işaretli maddeler,
tam genişlikte cilt lacivertli kapatma düğmesi.

### Hareket
Tek **ifade edici** hareket vardır: `@keyframes damga` — hüküm sözü kâğıda basılır gibi
`scale(1.06)`'dan 340ms'de yerine oturur (`cubic-bezier(.16,.84,.28,1)`).
Bunun dışındaki hareket işlevseldir: 120–140ms renk/kenar geçişleri, `.switch` 180ms
(`cubic-bezier(.2,.8,.3,1)`), `.spin` 700ms dönüş, `.raw` işareti 150ms, çekmece 220ms kayma.
`prefers-reduced-motion: reduce` altında damga animasyonu, anahtar geçişi, çekmece kayması
(`.sidebar`) ve hover geçişleri (`#drop`, `.copybtn`, `.konum-links a`, `.cv-cat`,
`.menu-toggle`, `.wn-open`) kapanır; `.spin` durdurulmaz, 2s'ye yavaşlatılır (yükleme hâlâ
sürdüğünü göstermelidir); `scroll-behavior` zorla `auto` olur. Yeni bir hareket eklenirse bu
bloğa da yazılır.

## Do's and Don'ts

### Do:
- **Do** yeni bloğu cetvelle ayır: gövde içi 1px `var(--cetvel)`, blok/bölüm kapanışı 2px
  `var(--cetvel-2)`.
- **Do** ölçülen her değeri (`numara, tarih, tutar, koordinat`) `.veri` ile monoya al ve
  `tabular-nums` koru.
- **Do** yevmiye/sicil numaralarını `.yev` ile diz; numaratör mürekkebi oraya aittir.
- **Do** her karar göstergesine ikon **ve** metin jetonu ekle; renk tek başına anlam taşımaz.
- **Do** yeni ikonu `<symbol id="i-*">` olarak 24×24 ızgarada, `stroke-width: 1.6` ile yaz ve
  `ic('ad')` ile bas.
- **Do** düğme geri bildirimini `innerHTML` üzerinden ver (`flash()`); SVG'yi `textContent` ile
  silme.
- **Do** yeni bir yüzeyi 860px ve 560px'te sına: tablolar yatay kaydırılır, karne dikeye
  döner, kenar çubuğu çekmeceye dönüşür.
- **Do** `content` ile metin basan pseudo-element'lerin kontrastını elle ölç; otomatik denetim
  onları göremez.
- **Do** yeni token gerektiğinde `:root` **ve** koyu medya sorgusuna aynı adla ekle; tema
  ayrımı ada değil değere yazılır.

### Don't:
- **Don't** gölge, `filter: drop-shadow`, yükseltme katmanı veya "kart" getirme. Modal bile
  2px kenarla durur.
- **Don't** kırmızı/amber/yeşili yargı ve durum dışında üçüncü bir anlamla (marka, kategori,
  süs) kullanma.
- **Don't** mor dışında bir hover/odak/seçim vurgusu tanımlama.
- **Don't** işlevsel metni 11px'in altına indirme; sistemde 10px yoktur.
- **Don't** üçüncü bir yazı ailesi ekleme; monoyu "teknik görünsün" diye dekoratif olarak
  kullanma.
- **Don't** emoji veya ikon fontu kullanma; `<img>` ile ikon çekme.
- **Don't** blok köşelerini yuvarlatma; 2px yarıçap yalnızca dokunulan küçük denetimlere aittir.
- **Don't** belge adasının (`ada-*`) renklerini veya 14px gövde ölçüsünü ada dışında kullanma;
  onlar kapalı bir alt palettir, arayüz tokenı değildir.
- **Don't** kayıt türü damgasını renkle ayırma; tür işareti biçimle (kare/üçgen/baklava)
  ayrılır.
- **Don't** yıkıcı eylem veya hata için `--engel` kullanma; onun rengi `--yikici`dir.
- **Don't** sayımları metrik kutusuna çevirme; kütük özetinin sayımları cetvelli satırdır
  (`.sayim-satir`) ve her biri glif taşır.
- **Don't** panel adını veya bağlam etiketini bir bloğun içine kicker olarak koyma; `.karne`
  gibi paneller adını üst cetvelde taşır (`.karne-baslik`).
- **Don't** ham metin (`.raw`), sorumluluk notu (`.karne-not`) ve altbilgideki yasal
  bilgilendirmeyi kaldırma; doğrulama yüzeyi sistemin parçasıdır.
