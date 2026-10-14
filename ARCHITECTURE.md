# Mimari ve yol haritası

Bu belge projeyi devralan biri (insan ya da ajan) içindir. Kurulum ve veri
kaynaklarının ayrıntısı `README.md`'dedir; burada **neyin neden böyle
olduğu**, bozulmaması gereken kurallar ve sıradaki işler var.

---

## 1. Projenin özeti

Fed, ECB, TCMB, BoE, BoJ ve RBA faiz kararlarını Türkçe ve Türkiye saatiyle
takip eden bir site. Üç modül:

| Modül | Ne yapar | Veri otomatik mi |
| --- | --- | --- |
| A — Takvim | Toplantı tarihleri, TRT geri sayımı, geçmiş kararlar, iCal + RSS + Telegram hatırlatma | ✅ tam otomatik |
| B — Faiz olasılığı | Fed: piyasa dağılımı (Atlanta Fed MPT); BoE: OIS eğrisinden toplantı bazında beklenti; ECB: analist anketi (SMA); TCMB: Piyasa Katılımcıları Anketi | ✅ tam otomatik |
| D — Haberler | Resmî açıklamalar + önemli kişilerin sözlerini aktaran haberler, Türkçe/İngilizce özet, önemliler Telegram'a | ✅ 30 dk'da bir (news.yml) |
| C — Şahin/güvercin | Merkez bankacısı konuşmaları + Türkçe özet ve skor; konuşmacı sayfaları, aylık seyir | ✅ metin ve skor otomatik (Claude aboneliği; §5) |
| E — Kararlar | Her karar, karardan önceki beklentiyle (sürpriz) ve bir önceki karar metniyle (fark + model özeti) karşılaştırılır; beklentinin seyri; sayfa başında son 12 ayın faiz döngüsü | ✅ karar metni 30 dk'da bir (news.yml), özet Claude; beklenti geçmişi günlük |
| F — Reel faiz | Politika faizi − son yıllık TÜFE, altı ekonomi; TCMB için 12 ay sonrası enflasyon beklentisiyle ileriye dönük | ✅ günlük |
| G — Rehber | Faiz kararlarını sade dille anlatan beş yazı | elle (içerik kodda, `src/lib/guides/`) |
| H — Bu hafta | Ana sayfada önümüzdeki 7 günün kararları (beklentisiyle), Fed ve ECB yönetim kurullarının konuşma ve yayınları, TCMB'nin PPK özeti ve raporları, beş ekonominin enflasyon (TÜFE) açıklamaları | ✅ günlük (`fetch:events`) |

Site **yatırım tavsiyesi vermez** ve veri lisansı gereği kişisel/eğitim
amaçlıdır (bkz. §6).

---

## 2. Sistemin şekli

```
  resmî kaynaklar            scripts/              data/seed/*.json
  ─────────────────          ────────              ────────────────
  federalreserve.gov  ─┐
  ecb.europa.eu        │
  tcmb.gov.tr          ├──► fetch:meetings  ──────► meetings.json
  bankofengland.co.uk  │                              ▲
  boj.or.jp            │                              │ (oranları doldurur,
  rba.gov.au          ─┘                              │  üzerine YAZMAZ)
  FRED · ECB SDMX · EVDS · BoE xlsx · RBA F1 · BoJ karar PDF'leri ─► fetch:rates
  aynıları ────────────────► fetch:current-rates ───► current-rates.json
                                                     └► tcmb-funding.json (AOFM, koridor)
  atlantafed.org (.xlsx) ─► fetch:probabilities ──► probabilities.json
  BoE OIS+SONIA · ECB SMA · EVDS anket · NY Fed SME ─► fetch:expectations ─► expectations.json
                                                     └► data/history/expectations.json (seyir)
  FRED · ECB HICP · EVDS · ONS · e-Stat · RBA G4 ─► fetch:inflation ─► inflation.json
  Fed takvim JSON · ECB haftalık program ─► fetch:events ─► events.json
  TÜFE takvimleri: FRED · TÜİK · ONS · stat.go.jp · ABS ──┘
  resmî karar metinleri ──► statements:fetch (news.yml) ─► statements.json + data/statements/
                            └► meetings.json (karar günü, seri gelmeden)
  bis.org (RSS + HTML) ───► fetch:speeches ───────► speeches.json
                                                      ▲
  Claude Code (abonelik) ─► score:export/import ──────┘ (§5)

                         data/seed/*.json
                                │
                    ┌───────────┴───────────┐
                    │  DATABASE_URL var mı? │
                    └───────────┬───────────┘
                     hayır │          │ evet
                           ▼          ▼
                      JSON oku   Postgres oku
                           └────┬─────┘
                                ▼
                        src/lib/data/*  (okuma katmanı)
                                ▼
                        src/app/*  (sunucu bileşenleri, ISR 1 saat)
```

Günlük iş `.github/workflows/fetch-meetings.yml` (05:00 UTC) script'leri
çalıştırır ve değişen `data/seed/*.json` dosyalarını commit'ler (yalnızca
`fetchedAt` değiştiyse commit atılmaz; cron'un sağlığı Actions geçmişinden
izlenir). Bu commit
Vercel'de yeni dağıtım tetikler. Yani **seed dosyaları üretimin asıl veri
kaynağıdır**; Postgres isteğe bağlı bir alternatiftir.

---

## 3. Katmanlar

```
src/lib/sources/   Dış kaynak ayrıştırıcıları. Tek sorumluluğu HTML/XML/xlsx'i
                   tipli nesneye çevirmek. Dosya yazmaz, veritabanı bilmez.
src/lib/data/      Okuma katmanı. Postgres ya da JSON'dan okur, türetilmiş
                   hesapları (ortalama skor, kapsam, tazelik) yapar.
                   "server-only" ile işaretli — istemciye sızamaz.
src/lib/           Saf yardımcılar: tz, time, banks, score, theme, types.
src/components/    Arayüz. ui.tsx düzen ilkellerini barındırır.
src/views/         Sayfaların gövdesi, dil parametresiyle (lang). Her sayfa
                   bir kez yazılır, iki dilin rotası onu çağırır.
src/app/           Rotalar: (tr)/ kökte Türkçe, en/ altında İngilizce — ince
                   sarmalayıcılar. Hepsi sunucu bileşeni; istemci olanlar
                   ayrı dosyada ve "use client" ile işaretli.
scripts/           Veri çekme işleri ve veritabanı araçları. Yalnızca
                   buradan yazılır; sayfalar asla dış kaynağa gitmez.
db/migrations/     Sıralı SQL göçleri.
```

### Banka meta verisi kodda, veritabanında değil

`src/lib/banks.ts` adı, saat dilimini, faiz adını tutar. Veritabanındaki
`central_banks` tablosu yalnızca referans çapasıdır (tek kolon: `code`).
Gerekçe: bu veri nadiren değişir, her sayfada lazım, ve veritabanı olmadan da
arayüzün çalışması gerekiyor. İki yerde tutmak kaçınılmaz kayma üretirdi.

### Kimlikler içerikten türer

`fed-2026-09-16` — surrogate uuid yok (`src/lib/data/ids.ts`). Aynı kimlik
seed dosyasında, URL'de ve veritabanında geçerli. Sonucu: `db:import`
doğal olarak idempotent, ve veritabanı açılıp kapandığında `/konusma/<id>`
bağlantıları kırılmıyor.

---

## 4. Bozulmaması gereken kurallar

Bunların her biri gerçek bir hatadan öğrenildi. Değiştirmeden önce neden
böyle olduğunu okuyun.

**Zamanlar UTC saklanır, sunumda TRT'ye çevrilir.** Sabit ofset varsayımı
yasak. `src/lib/tz.ts` `Intl` üzerinden ofsetı iki kez uygulayarak yaz saati
sınırlarını çözer. Doğrulama: Fed Aralık → 22:00 TRT (EST), Eylül → 21:00
TRT (EDT); ECB Eylül → 15:15, Ekim → 16:15.

**`fetch:meetings` dosyayı birleştirir, üzerine yazmaz.** Takvim kaynakları
yalnızca tarih verir; karar oranlarını `fetch:rates` ayrı adımda doldurur.
Sıfırdan yazmak 45 toplantının karar oranını siliyordu.

**Karar oranı, seri yürürlük gününe ulaşmadan seriden yazılmaz.** Resmî
seriler yeni oranı karar günü değil yürürlük günü gösterir (ECB'de 6 gün
sonra, Fed ve RBA'da ertesi gün). `rateAsOf` en yakın önceki gözleme
düştüğü için seri yetişmeden okunan "yeni oran" eski orandı ve karar
"değişiklik yok" diye yazılıyordu — sitede, RSS'te ve Telegram'da (13 Ekim
2026'da fark edildi, yanlış mesaj gitmeden). `fetch:rates`'teki `covers()`
bunu engeller. Arada karar, karar metninden gelir: `statements:fetch` 30
dakikada bir resmî duyuruyu okur ve oranı `meetings.json`'a yazar (saati son
10 dakikada geçmiş karar için aynı koşuda dakikada bir, 15 dakikaya kadar
yeniden bakar: kararların çoğu tam saatte, haber işi de :00/:30'da
tetikleniyor — dış zamanlayıcıya karar günü alarmı gerekmez); seri
gelince esas alınır, çelişki uyarı verir (`setDecision`). İki yazar aynı
dosyaya yazar ama iki iş aynı `concurrency` grubunda sırayla çalışır.

**BoE beklentisinin tabanı SONIA'dır.** Eğri 1 aylık vadeden başlar;
"bugünden ilk toplantıya" ortalaması eğimle dışarı uzatılan kısa uca
dayanıyordu ve toplantı yaklaştıkça 10–15 bp kayıyordu. 2025–2026'nın 14
kararında sınandı: tamamen fiyatlanmış indirimler eski yöntemle −3/−7 bp,
SONIA tabanıyla −23/−25 bp; sabit tutmalar eskiyle +12 bp'ye kadar, yenisiyle
±2 bp. Sitede Kasım 2026 MPC'si için "%52 artırım" görünüyordu; doğrusu
~%88'di (`implied-path.ts`).

**Sürpriz yalnızca önceki karardan sonra ve bu karardan önce oluşmuş
beklentiyle hesaplanır** (`preDecisionPoint`). Beklenti geçmişi, beklentinin
oluştuğu güne göre tutulur (eğri günü, anketin yanıt son günü ya da yayım
günü) — çekildiği güne göre değil. Önceki karardan önce toplanmış bir anket
eskimiştir: Fed'in Eylül 2026 artırımından önce toplanan SME turu Ekim
kararıyla kıyaslansaydı Eylül'ün sürprizi Ekim'e yazılırdı. Bu yüzden
sonuçları kararın ardından yayımlanan anketlerde (ECB SMA: ertesi gün, NY
Fed SME: 2–3 hafta sonra) kart, anket yayımlanınca tamamlanır. Eşikler:
<10 bp uyumlu, ≥25 bp sürpriz, arası "biraz" — anket ortalamasıyla
kıyasta çoğunluğun beklediği karar "sürpriz" diye sunulmasın.

**Karar metni yalnızca yayımcı izin veriyorsa gösterilir** (Fed, ECB, RBA:
§4'teki konuşma lisansları; TCMB: "kaynak gösterilmek suretiyle
yayımlanabilir; ticari kullanım yazılı izne tabidir"). BoE metni kişisel
kullanıma açık, BoJ metni yalnızca PDF (satırları kırık, fark okunmaz):
ikisinde yalnızca model özeti ve bağlantı var; metin `.cache/statements`'ta
kalır. Fark önce cümleleri hizalar, sonra yalnızca değişen cümlelerde kelime
farkına iner (`text-diff.ts`) — doğrudan kelime farkı ilgisiz cümleleri
"the"/"ve" üzerinden eşleştirip okunmaz yapıyordu. Özet: `statements:fetch`
→ claude-code-action (Opus; yazma yalnızca `.statements/out`) → koruma →
`statements:import`; koşu başına 4, en yeni karar önce.

**`fetch:current-rates` da birleştirir.** Bir bankanın kaynağı hata verirse
önceki kaydı korunur ve adım yine hata koduyla biter. İlk cron koşusunda ECB
SDW'nin geçici 504'ü ECB faizini siteden silmişti.

**TCMB'nin fiilî faizi politika faizinden ayrışabilir** (`src/lib/tcmb-funding.ts`).
Bankaların fiilen ödediği ortalama faiz AOFM'dir (EVDS `TP.APIFON4`); TCMB
bir hafta vadeli repo ihalesine ara verip koridorun üst bandından
fonladığında politika faizinin üstüne çıkar. 3 Mart–24 Ağustos 2026'da
politika faizi %37 iken AOFM %40'tı ve site altı ay boyunca yalnızca %37
gösterdi (24 Mart–12 Haziran 2025'te de fark 2–3 puandı). AOFM ve koridor
`tcmb-funding.json`'da değişim noktası olarak durur (dosya yalnızca oran
değişince değişir). Ayrışma sayılması için iki kural var, ikisi de gerçek
veriden: AOFM bir önceki iş gününün politika faiziyle kıyaslanır (seri yeni
oranı karar günü, AOFM ertesi iş günü gösterir — dokuz kararın hepsinde) ve
fark ≥0,25 puan en az beş iş günü sürmelidir (karar sonrası %37,30 → %37,01
oturması ve Ocak 2025'in üç günlük yarım puanı ayrışma değil). Ayrışma
sürerken ana sayfa kartı, telefon listesi, reel faiz tablosu ve TCMB
sayfasının başı fiilî oranı da gösterir; TCMB sayfasında oranlar ve
koridor her zaman, karar sayfasında ve `/kararlar`'daki faiz döngüsünün
altında dönem cümlesi durur. Sınır: kararın hemen ardından haftalık bir
bayram tatili gelirse gözlem olmadığı için AOFM eski değerinde "durur".

**Güncel faizin `asOf`'u "şu tarihten beri"dir, son gözlem günü değil**
(`effectiveSince`). Son gözlem günü her gün değişip `current-rates.json`'u
her gün farklılaştırıyor, cron'un boş-commit korumasını delip her gün dağıtım
tetikliyordu.

**Kaynaklara dürüst user-agent ile gidilir, tarayıcı taklit edilmez.**
rba.gov.au'nun Akamai'si curl'ün Chrome taklidine 403 veriyor ama projenin
kendi UA'sını (`shared.ts`) geçiriyor. Taklit hem kırılgan hem yanlış.
(Atlanta Fed MPT okuyucusunda bir Chrome taklidi kalmıştı; 13 Ekim 2026'da
kaldırıldı — dürüst UA ile sayfa 7–50 sn'de, dosya sorunsuz geliyor.)

**Saati geçmiş, sonucu gelmemiş karar "bekleyen" karardır**
(`isPendingDecision`). Sonuç resmî metinden birkaç dakika (tam saatte
açıklananlar) ile yarım saat (ECB :15, BoJ) arasında gecikmeyle gelir; o arada sayfalar bugünkü kararı atlayıp bir sonraki toplantıyı
gösteriyordu — kullanıcının en çok baktığı anda. Ana sayfa kartı, telefon
listesi, banka sayfası, "Bu hafta" ve takvim satırı onu "Karar açıklandı:
sonuç kısa süre içinde burada" diye tutar; canlı sayaç önbellekteki sayfada
da aynısını yazar. 12 saatten eskisi sayılmaz (metin okunamazsa sonuç seriden
günler sonra gelir). BoJ'de yer tutucu saat geçti diye kararın açıklandığı
bilinmez: "sonuç bekleniyor" der.

**Saati duyurulmayan karar (BoJ) `timeTbd`'dir ve hiçbir yerde saat gibi
sunulmaz.** `meetingAt`'teki saat yalnızca sıralama için yer tutucudur:
kartta ve listede gün düzeyinde etiket, iCal'de tüm gün etkinliği.

**BoJ hedef faizi metinden okunur ve kalıp bulunamazsa hata verir.** BoJ'nin
istatistik API'sinde hedef serisi yok; çağrı faizi (gerçekleşen) ve temel
iskonto oranı (türetilmiş) hedef değildir, "politika faizi" diye
gösterilmemeli. Karar metinleri PDF olduğu için `fillBoj` yalnızca
doldurulmamış toplantıları indirir; BoJ güncel faizi `fetch:current-rates`'te
yeniden indirilmeden meetings.json'dan türetilir (sıra: rates → current-rates).

**iCal UID'leri değişmez.** `UID:<id>@merkezbankalariradar` eski marka adını
taşır ama abone takvimler etkinlikleri UID ile eşler; değişirse her
toplantı abonelerin takviminde iki kez görünür. Marka "Faiz Radar" olsa da
ek kalır. Sayfalardaki "Takvime ekle" (`?toplanti=<id>`, Google Takvim
bağlantısı ayrıca) aynı UID'yi kullanır: hem abone olan hem tek toplantıyı
ekleyen okurun takviminde etkinlik bir kez görünür.

**Telegram aynı mesajı iki kez göndermez.** `scripts/post-telegram.ts`
gönderdiği her mesajın anahtarını `data/telegram/posted.json`'a yazar ve cron
bu dosyayı commit'ler; dosyayı silmek kanala son 4 günün kararlarını yeniden
yollar. Hatırlatma *bir gün önce* atılır: cron 08:00 TRT'de çalışır, RBA ve
BoJ kararları o saatten önce açıklanır. Metin RSS ile ortaktır
(`src/lib/announce.ts`). Token secret'ta (`TELEGRAM_BOT_TOKEN`), kanal
repo değişkeninde (`TELEGRAM_CHAT_ID`); biri yoksa adım atlanır.

**Site iki dillidir; Türkçe adresler değişmez.** Türkçe kökte (`app/(tr)/`),
İngilizce `/en` altında (`app/en/`); yol adları iki dilde aynı (`/en/takvim`),
dil değiştirici yalnızca öneki ekler/kaldırır. İki ayrı kök düzen var çünkü
`<html lang>` başka türlü doğru verilemiyor. Arayüz metni kullanıldığı yerde
çift olarak yazılır (`const t = L(lang); t("Takvim", "Calendar")`) — ayrı
sözlükte anahtar unutulup bir dil sessizce boş kalamaz. Yeni sayfa: gövde
`src/views/`'a, iki ince rota `(tr)/` ve `en/` altına; ikisinde de
`languageAlternates` ile hreflang. Kontrol: iki dildeki bütün sayfaların
metni yanlış dil için taranır (Türkçe sayfada `lang="en"` dışında İngilizce,
İngilizce sayfada Türkçe kalmamalı). Konuşmaların karşılıkları
(`titleTr`, `contextTr`, `summaryEn`, `scoreRationaleEn`) skorlamada üretilir
(PROMPT_VERSION 3); yoksa arayüz diğer dile düşer ve bunu "(İngilizce)" /
"(in Turkish)" notu ve doğru `lang` özniteliğiyle belli eder. RSS, iCal ve
Telegram yalnızca Türkçedir.

**Haber akışı telife ve kullanım şartlarına saygılıdır.** Yalnızca
yayıncıların kendi RSS/Atom akışları okunur (`src/lib/news.ts`,
NEWS_SOURCES); haber metni kopyalanmaz — başlık, akış açıklamasından
modelin yazdığı 1–2 cümlelik özet ve kaynak bağlantısı. X/Twitter yok
(şartlar otomatik çekmeyi yasaklıyor, API ücretli). Basın akışları önce
anahtar kelimeyle süzülür, sonra model `relevant`/`important` der; yalnızca
`important` ve 12 saatten taze olanlar Telegram'a gider, koşu başına en
fazla 4. `.github/workflows/news.yml` günlük işle aynı `concurrency`
grubundadır: ikisi aynı dala yazar. Model: Sonnet (özet işi; skorlamadaki
Opus kotasını korur).

**Haber işini dışarıdan bir zamanlayıcı tetikler; GitHub cron'u yedektir.**
GitHub zamanlanmış işleri "en iyi çaba" ile çalıştırır: 13 Ekim 2026'da
30 dakikalık iş 21 saatte yalnızca 3 kez çalıştı, kanal sessiz kaldı.
Çözüm: cron-job.org her 30 dakikada
`POST https://api.github.com/repos/halilibrahimbilgic/merkez-bankalari-radar/actions/workflows/news.yml/dispatches`
(gövde `{"ref":"main"}`) çağırır. Günlük iş de aynı yolla her gün 08:00
TRT'de tetiklenir (`fetch-meetings.yml/dispatches`, 14 Ekim 2026'dan beri):
GitHub onu son altı günde 05:00 UTC yerine 09:52–12:40 UTC arasında
başlatmıştı. İki işin GitHub zamanlaması yedek olarak duruyor; çift koşu
zararsız (veri değişmediyse commit yok, Telegram aynı mesajı iki kez
göndermez). Yetki, yalnızca bu repoda *Actions: Read and write* izni olan
fine-grained token (`faizradar-cron`) ile verilir; token cron-job.org'da
durur, repoda değil.

> ⚠️ **Token Ekim 2027'de (oluşturulduktan 1 yıl sonra) sona erer.** Süresi
> dolunca cron-job.org 401 alır; haberler ve günlük veri yine yalnızca
> düzensiz GitHub cron'uyla gelir — kimse fark etmeyebilir. Bitmeden: GitHub → Settings →
> Developer settings → Fine-grained tokens → `faizradar-cron` →
> *Regenerate token*, yeni değeri cron-job.org'daki `Authorization: Bearer …`
> başlığına yapıştırın (iki işte de); *Test run* 204 dönmeli. Haber işlerinin `event`'i
> Actions geçmişinde `workflow_dispatch` olarak görünüyorsa dış tetikleme
> çalışıyordur, yalnızca `schedule` görünüyorsa durmuştur.

**Fed olasılıkları yarım saatte bir, yalnızca dosya değiştiyse tazelenir.**
Atlanta Fed MPT'yi bir iş günü gecikmeyle ABD gündüzü yayımlıyor (9 Ekim 2026
verisi 13 Ekim 13:55, 13 Ekim verisi 14 Ekim 17:54 UTC'de); günlük iş bizim sabahımızda koştuğu için site
bir tur geriden geliyordu (14 Ekim'de 5 gün). Haber işi her koşuda dosyanın
`Last-Modified`'ına HEAD ile bakar (`fetch:probabilities -- --if-changed`)
ve değiştiyse indirir; tarih `probabilities.json`'da `sourceModified` olarak
durur. Tarihe yalnızca içerik türü xlsx ise güvenilir — taşınan dosyanın eski
adresi 200 + HTML döndürmüştü. Günlük iş aynı adımı koşulsuz çalıştırır.

**Paylaşım görselleri koddan üretilir** (`opengraph-image.tsx`: kök, banka,
konuşma; ortak kart `src/lib/og.tsx`). Derlemede statik üretilip saatlik
yenilenir, böylece faiz ve tarih güncel kalır. Yazı tipi next/og'un gömülü
Geist-Regular'ı; Türkçe karakterleri kapsadığı render edilerek doğrulandı.

**Geçmiş toplantılar kaynaktan düşse de arşivde kalır.** Bankalar takvim
sayfalarını ileriye kaydırır; ECB'nin 10 Eylül 2026 toplantısı bu yüzden bir
kez silinmişti. Yalnızca *gelecek* toplantıların kaybolması anlamlıdır
(ertelenme/iptal).

**`db:import` mevcut skorları ezmez.** Skorlama ayrı bir adım ve günlük iş
skorsuz kayıt üretiyor; naif bir upsert her gece skorları silerdi.

**Skor 0 ≠ nötr.** `hasPolicySignal: false` olan konuşmalar (düzenleme,
denetim, ödeme sistemleri) 0 alır ama banka ortalamasına **katılmaz** ve
listede "0,0 (nötr)" değil "politika sinyali yok" diye görünür (öyle
göründüğünde skorlanmamış sanılıyordu). Bu ayrım
eklenmeden önce Fed ortalaması 1,78 görünüyordu; doğrusu 4,0.

**Dış kaynaklar habersiz değişir; kırılma sessiz olmamalı.** 3 Ekim 2026'da
iki kaynak aynı anda kırıldı: Atlanta Fed xlsx'i taşıdı (eski adres 200 +
HTML 404 döndürdü) ve BIS Drupal'a geçti (HTML'de yalnızca özet kaldı, tam
metin PDF'e taşındı). Bu yüzden: MPT bağlantısı sayfadan keşfedilir ve zip
imzası kontrol edilir; konuşma metni önce PDF'ten okunur; cron adımları
`if: !cancelled()` ile birbirinden bağımsızdır ama iş yine kırmızı biter.

**Tam metin yalnızca yayımcı izin veriyorsa yayımlanır.** Konuşma metni
üçüncü taraf içeriktir. `src/lib/text-license.ts` her bankanın kendi
şartlarını kaynaklarından alıntılar: Fed Board kamu malı, ECB serbest
kullanım (doğru aktarım + kaynak), BoJ kaynak göstererek, RBA CC BY 4.0;
**BoE yalnızca kişisel kullanım** — yayımlanmaz. Kurum, konuşmacının
*unvanından* (BIS tanıtım cümlesi, `contextEn`) okunur, kayıt bankasından
değil: New York Fed başkanı "fed", ulusal banka başkanları "ecb" olarak
etiketlenir ama metinleri Board'un/ECB'nin değildir. Etkinlik kısmı
kuruma karışmaz (Jefferson'ın bölgesel Fed'deki konuşması bu yüzden
yanlışlıkla dışlanmıştı). Cümle yoksa yayımlanmaz.

İzinli metin `data/speech-text/<id>.txt`'de commit'lenir ve `/konusma/<id>`
sayfasında lisans notuyla okunur; izinsiz olan git'e girmeyen
`.cache/speech-text/`'te kalır, yalnızca skorlama girdisidir
(`scripts/speech-text.ts`). Gösterimde yalnızca boşluk düzenlenir
(`speech-format.ts`; sadakat testi: boşluk dışı karakterler birebir aynı).

**Sunucu bileşeni `"use client"` modülünden değer içe aktaramaz.** Gerçek
değeri değil istemci referansını alır. İki kez ısırdı: `computeCountdownParts`
(`src/lib/time.ts`'e taşındı) ve `THEME_KEY` (`src/lib/theme.ts`'e taşındı —
inline script'e `localStorage.getItem(undefined)` olarak gömülüyordu, sessizce).

**Arayüz 390 px'te gerçekten bakılarak denetlenir.** Başsız Chrome'un
pencere genişliği ~500 px'in altına inmiyor; düz ekran görüntüsü dar ekranı
taklit etmez. Geliştirici protokolüyle (Emulation.setDeviceMetricsOverride)
bakıldı (14 Ekim 2026): tablolar telefonda sabit genişlikle kaydığı için
reel faiz tablosunun asıl sütunu görünmüyordu — `TableFrame` artık asgari
genişliği yalnızca sm ve üstünde uygular. Tek başına duran bağlantılar en az
24 px yüksekliğinde (WCAG 2.5.8; metin içi bağlantılar muaf). Telefonda üst
menü "Menü" düğmesinin arkasındadır (`MobileMenu`): yatay kayan menüde sekiz
bağlantının dördü ilk ekranda görünmüyordu, sarmalı menü başlığı üç satıra
çıkarıyordu.

**"Bu hafta" takvimi kaynak başına korunur.** Sekiz kaynak (Fed takvimi,
ECB programı, TCMB'nin PPK özeti ve rapor takvimi, beş TÜFE takvimi) ayrı
ayrı çekilir; biri hata verirse
yalnızca *o kaynağın* önceki kayıtları korunur. TÜFE kayıtları banka
koduyla tutulur (ABD → `fed`), banka başına koruma Fed takvimi kırıldığında
eski TÜFE kaydını yenisinin yanına ikinci kez eklerdi. Euro bölgesi TÜFE
takvimi yok: Eurostat'ın takvimi tarayıcıda JavaScript'le yükleniyor,
makinece okunur ucu bulunamadı (14 Ekim 2026). TÜFE satırı açıklanmadan önce
bir önceki ayın rakamını, açıklanıp veri gelince yenisini gösterir; haber işi
açıklamadan sonraki 12 saat yalnızca o ekonominin kaynağına bakar
(`fetch:inflation -- --if-due`, `src/lib/cpi-release.ts`). Verinin ait
olduğu ay, açıklandığı ayın bir öncesidir — beş ekonominin hepsinde.
Konsensüs beklentisi lisanslı veri; gösterilmez. TCMB'nin PPK toplantı
özeti, Enflasyon Raporu ve Finansal İstikrar Raporu karar takviminin diğer
sütunlarından okunur; takvim saat vermediği için gün düzeyindedir
(`timeTbd`, saat yerine "—").

**Faiz döngüsü seviye değil değişim gösterir** (`src/lib/rate-cycle.ts`,
`/kararlar` başı). TCMB'nin %37'si seviye grafiğinde diğer beş bankayı düz
çizgiye çevirirdi. Pencere son 12 ay (ay başından) ama arşivin başından
(`DECISIONS_FROM`) geriye gitmez: Fed dışındaki bankaların 2026 öncesi
toplantısı yok, daha geriden başlayan pencere değişiklik kaçırırken
kaçırmıyormuş gibi görünürdü. "Yıl başından" seçilmedi; Ocak'ta boş kalırdı.

**Konuşmacı adresi addan türer** (`src/lib/speakers.ts`):
`/konusmaci/christopher-j-waller`. Aksan ve noktalama atılır, BIS'in
"J." / "J" farkı aynı adrese düşer; ad gerçekten değişirse eski adres 404
verir. Konuşmacının bankası en yeni konuşmasındaki bankadır; ortalama,
banka ortalamasıyla aynı kuralla (yalnızca sinyal taşıyan skorlu konuşmalar).
Unvan BIS tanıtım cümlesinden okunur ("…, <unvan>, at …"); Türkçesi modelin
çevirdiği cümlede addan önceki kısımdır, yoksa İngilizcesi `lang="en"` ile.

**Jargon sözlüğe bağlanır, kırık çapa derlemeyi kırar** (`Term`). Sözlük
terimlerinin çapası Türkçe terimden türer (`termId`: "Sürpriz" → `surpriz`),
iki dilde aynıdır. Bağlantı düz `<a>`: istemci tarafı gezinme `pushState`
kullanır ve `:target` vurgusu tetiklenmez.

**Renk tek başına anlam taşımaz** (WCAG 1.4.1). Banka renkleri ikincil
ipucudur, yanında her zaman banka adı metni durur. Tonlar ölçülerek seçildi:
hepsi yüzeye karşı ≥5:1, en sık görünen üçlü birbirinden ≥68° ayrık.

**Tema üç durumludur** ve hiçbir rengin tek tanımı media sorgusu içinde
olamaz — sistem ayarı "açık" olan tarayıcıda o renk tanımsız kalırdı.

**Next.js sürümü eğitim verinizden farklı olabilir.** `AGENTS.md`'nin uyarısı
ciddi: kod yazmadan önce `node_modules/next/dist/docs/` içindeki ilgili
rehbere bakın.

---

## 5. Skorlamanın gerçeği

Konuşma metinleri otomatik toplanır; **Türkçe özet ve şahin/güvercin skoru
API anahtarı olmadan, Claude aboneliğiyle üretilir.** Cron'daki akış:

```
score:export  → .scoring/TASK.md (score.ts'teki prompt) + .scoring/in/<id>.md
claude-code-action (CLAUDE_CODE_OAUTH_TOKEN, --model opus)
              → .scoring/out/<id>.json
koruma        → .scoring dışında değişiklik varsa çalışma alanı sıfırlanır
score:import  → şema denetimi, aralık sınırı, mevcut skoru ezmeden yazar
```

- Prompt tek kaynaktadır (`SYSTEM_PROMPT`, `buildUserMessage`); `api`,
  `session` ve `claude-code` kayıtları aynı prompt sürümüyle karşılaştırılabilir.
- Konuşma metni üçüncü taraf içeriktir (prompt injection yüzeyi). Claude'un
  araçları `Read(./.scoring/**)`, `Edit(./.scoring/out/**)`, `Glob` ile
  sınırlı; Bash/ağ yok. **Dosya izni `Write(...)` ile verilemez**, CLI bunu
  yok sayıyor; `Edit(...)` tüm yazma araçlarını kapsar (2.1.288'de denendi).
- Koşu başına en fazla 6 konuşma (`score:export`'taki `DEFAULT_LIMIT`):
  bağlamı ve abonelik kullanımını sınırlar; birikim ertesi gün erir.
- Yerelde aynı akış: `npm run score:export`, ardından aynı argümanlarla
  `claude -p`, ardından `npm run score:import`.
- Skorlama metni `loadSpeechText` ile okur: önce `data/speech-text`, sonra
  önbellek, ikisinde de yoksa kaynaktan indirir.
- `npm run score:speeches` (API yolu) yerel kullanım için duruyor ama cron'da
  çalışmaz. `apply-session-scores.ts` tarihsel dolgudur.

Cron'da doğrulandı (3 Ekim 2026: CLAUDE_CODE_OAUTH_TOKEN ile 7 turda 2
konuşma, koruma adımı temiz). Token yoksa skorlama adımları atlanır; varsa ama başarısızsa
`continue-on-error` — takvim, faiz, olasılık ve konuşma metinleri yine
commit'lenir, konuşmalar siteye skorsuz düşer.

Skorsuz kayıt sayısı `/konusmalar` ve `/skor` sayfalarında **açıkça
gösterilir** (`src/components/ScoringGap.tsx`). Bu bilinçli: gizlenirse banka
ortalamaları eskimiş bir örneklemi temsil ederken güncel görünür.

Skorlama modeli ve prompt sürümü `src/lib/score.ts` içinde sabitlenmiştir
(`SCORING_MODEL`, `PROMPT_VERSION`). Prompt değişirse sürümü artırın —
eski skorlarla yenileri karşılaştırılabilir olmayabilir.

---

## 6. Lisans ve hukuki sınırlar

**Atlanta Fed MPT verisi yalnızca kişisel ve eğitim amaçlı kullanıma
izinlidir.** Site buna göre konumlandırıldı. Ticarileştirme (reklam, abonelik)
düşünülürse önce CME lisansı alınmalı ve bu kaynak değiştirilmelidir. Lisans
metinleri `/faiz-olasiligi` ve `/hakkinda` sayfalarında aynen görünür.

**CME otomatik veri çekmeyi kullanım şartlarıyla yasaklar.** Denemeyin.

**NY Fed SME**: içerik kişisel ya da ticari amaçla kullanılabilir,
kopyalanabilir, dağıtılabilir; New York Fed'in onayı ima edilemez
(newyorkfed.org/privacy/termsofuse). Fed için toplantı bazlı beklentinin
yeniden yayımlanabilir tek kaynağı; yalnızca karar kartında kullanılır.
**Enflasyon**: BLS kamu malı (FRED üzerinden), Eurostat/ECB kaynak
göstererek, ONS Open Government Licence, ABS CC BY 4.0 (RBA G4), TÜİK verisi
EVDS'den TCMB şartlarıyla, Japonya İstatistik Bürosu hükümet standart
kullanım şartları (CC BY uyumlu). OECD ve FRED'deki Japonya TÜFE serileri
2021–2022'de kesildi; e-Stat Excel'i okunur.

**Fed dışı beklentiler iki ayrı türdür ve arayüzde karıştırılmaz.** BoE:
BoE'nin günlük OIS eğrisinden türetilen *piyasa fiyatlaması*
(`src/lib/implied-path.ts`; BoE web kaynakları ticari olmayan kullanıma
izinli). TCMB: Piyasa Katılımcıları Anketi — *ekonomist beklentisi*, aylık.
ECB: Survey of Monetary Analysts — *analist anketi*, yılda 8 tur; yalnızca
PDF yayımlanıyor (PDF'teki seri anahtarları Data Portal API'sinde yok),
`src/lib/sources/ecb-sma.ts` PDF metnini okur. BoJ ve RBA için
ücretsiz ve yayımlanabilir kaynak yok (piyasa verisi borsaların lisanslı
ürünü — ASX, JSCC, Eurex/ICE). Her bölüm türünü rozetle söyler.

**FRED'de Fed Funds futures fiyatı yoktur** — MVP planındaki bu varsayım
hatalıydı, Atlanta Fed'e bu yüzden geçildi.

Hiçbir sayfa yatırım tavsiyesi vermez; altbilgideki uyarı kaldırılmamalı.

---

## 7. Mevcut durum (3 Ekim 2026; 13 ve 14 Ekim ekleri aşağıda)

```
Toplantı     135 (Fed 56, ECB 19, TCMB 12, BoE 16, BoJ 16, RBA 16)
             — 70'inde karar oranı var (Fed 45, TCMB 6, BoE 6, RBA 6, BoJ 6, ECB 1)
Konuşma      30  (Fed 13, ECB 9, RBA 3, BoE 3, BoJ 2) — 30'u skorlu, 17'si sinyalsiz,
             26'sının metni sitede okunabilir (5'i yalnızca giriş bölümü)
Olasılık     2026-10-01 anlığı, 13 pencere
Güncel faiz  Fed, ECB, TCMB, BoE, BoJ, RBA
Hatırlatma   /rss.xml (1 hafta önce + karar), iCal aboneliği (1 gün + 1 saat önce),
             Telegram kanalı (1 gün önce + karar; scripts/post-telegram.ts)
Sayfa        49 (build çıktısı), ISR 1 saat
```

13 Ekim 2026: takvim arşivine ECB'nin 2026 ilk yarısı ve altı bankanın
Aralık 2025 kararları (fark tabanı) eklendi — 145 toplantı. 36 karar
sayfası (2026), 42 karar metni (28'i yayımlanabilir), beklenti geçmişi 2026
başından (BoE günlük, ECB 7 SMA turu, Fed 7 SME turu, TCMB aylık), altı
ekonominin enflasyonu, beş rehber yazısı. Özetler ilk günlerde 30 dakikalık
işle birikimi eritir.

14 Ekim 2026: "Bu hafta"ya beş ekonominin TÜFE açıklama tarihleri;
`/kararlar` başında faiz döngüsü; 19 konuşmacı sayfası; `/skor`'da aylık
seyir tablosu; TCMB için ileriye dönük reel faiz; site haritasında gerçek
`lastModified` (karar: özet tarihi, konuşma: skor tarihi, rehber:
`updatedOn`; yasal sayfalarda alan yok). 47 konuşma, hepsi skorlu. Banka
sayfaları sıradaki toplantının beklentisini gösterir (ana sayfa kartıyla
aynı hesap: `src/views/bank-expectations.ts`).

15 Ekim 2026: TCMB'nin fiilî fonlama maliyeti (AOFM) ve faiz koridoru
(§4); TCMB sayfasında son 12 ayın grafiği, sözlükte iki yeni terim.

---

## 8. Bilinen boşluklar

Öncelik sırasıyla:

1. **Skorlar deterministik değil.** Aynı konuşma iki koşuda ±1 farklı puan
   alabiliyor (Waller 16.09: yerelde +4, CI'da +5). Banka ortalamalarında
   bu gürültü küçük örneklemde hissedilir; bir kayıt bir kez skorlandıktan
   sonra yeniden skorlanmaz, bu yüzden puanlar zamanla kaymaz.
2. **Fed dışındaki bankaların arşivi 2026'dan başlıyor.** (BoE oylama
   geçmişi ve RBA F1 tablosu 1997/2011'e uzanıyor ama takvim sayfaları
   yalnızca bu yılı ve geleceği verdiği için eşlenecek toplantı yok.) Karar oranları artık üç banka
   için de dolduruluyor (TCMB: EVDS `TP.PY.P02.1H`; ECB'de 3 Ekim'e kadar
   "0 ECB" çıkmasının sebebi takvim değil, serinin toplantı gününden
   başlatılıp "önceki oran"ın bulunamamasıydı). Ancak iki bankanın takvim
   sayfası yalnızca içinde bulunulan/gelecek toplantıları veriyor; 2026
   öncesi toplantılar arşivde hiç yok. Faiz serisinden geçmiş toplantı
   *uydurulamaz* — seri yalnızca değişiklik günlerini gösterir, sabit tutma
   kararlarını değil. Arşiv §4'teki koruma sayesinde ileriye doğru birikir.
3. **Konuşma arşivi küçük.** BIS beslemesi yalnızca son 25 konuşmayı döndürür
   ve sayfalama kabul etmez; arşiv günlük işle birikir. Ağustos ortası–Eylül
   ortası arası (cron çalışmadığı için) kayıp. Ortalamalar tek haneli
   örneklemlerde yanıltıcı — `/skor` bunu yazıyor.
4. **MPT bantları %100'e tamamlanmıyor** — Atlanta Fed uçtaki küçük bantları
   ayrı yayımlamıyor (toplam ~%96–99). `/faiz-olasiligi` eksik payı açıkça
   yazıyor; yön olasılıkları (`Prob: cut/hike`) bu payı içeriyor.
5. **E-posta bildirimi yok — bilinçli.** Gönderim servisi ve abone e-posta
   adresi saklamak (KVKK, açık rıza, abonelikten çıkma) ürün kararı
   gerektiriyor. Şimdilik RSS (e-posta köprülerine bağlanabilir) ve iCal
   aboneliği var; site kişisel veri toplamıyor.
6. **"Bu hafta" eksik.** Euro bölgesi TÜFE takvimi yok (§4) ve bölgesel
   Fed başkanları Board takviminde yer almıyor; BoE, BoJ, RBA ve TCMB
   ileriye dönük konuşma programını makinece okunur yayımlamıyor.

---

## 9. Yol haritası

**Orta vade — kapsamı genişlet**
- Skor zaman serisi: "bir ay önce +6 olan komite bugün +4" — yön seviyeden
  daha çok şey söyler. İlk adım `/skor`'daki aylık seyir tablosu (14 Ekim
  2026); örneklem büyüdükçe grafiğe çevrilebilir.
- E-posta bildirimi (§8.5'teki kararlardan sonra)

**Uzun vade — ürünleşme**
- Konuşmacı ağırlıklandırması (oy hakkı/kıdem): konuşmacı sayfaları var
  (`/konusmaci/<ad>`), ama banka ortalamasında herkesin ağırlığı hâlâ eşit
  — `/skor` bunu açıkça yazıyor
- Ticarileşme düşünülürse **önce** §6'daki lisans sorunu çözülmeli

---

## 10. Çalışma alışkanlıkları

- Dış kaynak hakkında bir varsayımı koda gömmeden önce **doğrulayın**. Bu
  projede plandaki üç iddia (FRED futures, ECB host'u, Hawkometer) deneyle
  yanlış çıktı.
- Tasarım kararlarını ölçün: kontrast oranı, ton farkı, karakter sayısı.
- Değişiklikten sonra `npx tsc --noEmit`, `npm run lint`, `npm test`,
  `npx next build`. İlk üçü her push'ta CI'da da koşar (`ci.yml`).
- Testler `tests/` altında, Node'un yerleşik çalıştırıcısıyla (`tsx --test`);
  bağımlılık yok. Bir kaynak ayrıştırıcısını ya da saf hesabı değiştirirken
  önce o kaynağın gerçek bir örneğini teste ekleyin — bu projedeki
  kırılmaların çoğu sessiz biçim değişikliğiydi.
  Veritabanı yolunu da değiştirdiyseniz `DATABASE_URL=... npx next build`
  ile iki modu da derleyin.
- Dev sunucusunu elle `npm run dev &` ile başlatmayın — port çakışması
  üretiyor. Araç varsa preview/launch mekanizmasını kullanın.
- Yorumlar Türkçe ve "neden"i anlatır, "ne"yi değil.
