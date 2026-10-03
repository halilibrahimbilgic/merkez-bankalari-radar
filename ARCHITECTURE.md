# Mimari ve yol haritası

Bu belge projeyi devralan biri (insan ya da ajan) içindir. Kurulum ve veri
kaynaklarının ayrıntısı `README.md`'dedir; burada **neyin neden böyle
olduğu**, bozulmaması gereken kurallar ve sıradaki işler var.

---

## 1. Projenin özeti

Fed, ECB ve TCMB faiz kararlarını Türkçe ve Türkiye saatiyle takip eden bir
site. Üç modül:

| Modül | Ne yapar | Veri otomatik mi |
| --- | --- | --- |
| A — Takvim | Toplantı tarihleri, TRT geri sayımı, geçmiş kararlar, iCal | ✅ tam otomatik |
| B — Faiz olasılığı | Piyasanın fiyatladığı faiz dağılımı (Atlanta Fed MPT) | ✅ tam otomatik |
| C — Şahin/güvercin | Merkez bankacısı konuşmaları + Türkçe özet ve skor | ⚠️ metin otomatik, **skor elle** |

Site **yatırım tavsiyesi vermez** ve veri lisansı gereği kişisel/eğitim
amaçlıdır (bkz. §6).

---

## 2. Sistemin şekli

```
  resmî kaynaklar            scripts/              data/seed/*.json
  ─────────────────          ────────              ────────────────
  federalreserve.gov  ─┐
  ecb.europa.eu        ├──► fetch:meetings  ──────► meetings.json
  tcmb.gov.tr         ─┘                              ▲
                                                      │ (oranları doldurur,
  FRED + ECB SDMX + EVDS ─► fetch:rates ──────────────┘  üzerine YAZMAZ)
  FRED + ECB SDMX + EVDS ─► fetch:current-rates ───► current-rates.json
  atlantafed.org (.xlsx) ─► fetch:probabilities ──► probabilities.json
  bis.org (RSS + HTML) ───► fetch:speeches ───────► speeches.json
                                                      ▲
  Anthropic API ──────────► score:speeches ───────────┘ (elle; §5)

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
src/app/           Sayfalar. Hepsi sunucu bileşeni; istemci olanlar ayrı
                   dosyada ve "use client" ile işaretli.
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

**`fetch:current-rates` da birleştirir.** Bir bankanın kaynağı hata verirse
önceki kaydı korunur ve adım yine hata koduyla biter. İlk cron koşusunda ECB
SDW'nin geçici 504'ü ECB faizini siteden silmişti.

**Geçmiş toplantılar kaynaktan düşse de arşivde kalır.** Bankalar takvim
sayfalarını ileriye kaydırır; ECB'nin 10 Eylül 2026 toplantısı bu yüzden bir
kez silinmişti. Yalnızca *gelecek* toplantıların kaybolması anlamlıdır
(ertelenme/iptal).

**`db:import` mevcut skorları ezmez.** Skorlama elle yürütülüyor ve günlük iş
skorsuz kayıt üretiyor; naif bir upsert her gece skorları silerdi.

**Skor 0 ≠ nötr.** `hasPolicySignal: false` olan konuşmalar (düzenleme,
denetim, ödeme sistemleri) 0 alır ama banka ortalamasına **katılmaz**. Bu ayrım
eklenmeden önce Fed ortalaması 1,78 görünüyordu; doğrusu 4,0.

**Dış kaynaklar habersiz değişir; kırılma sessiz olmamalı.** 3 Ekim 2026'da
iki kaynak aynı anda kırıldı: Atlanta Fed xlsx'i taşıdı (eski adres 200 +
HTML 404 döndürdü) ve BIS Drupal'a geçti (HTML'de yalnızca özet kaldı, tam
metin PDF'e taşındı). Bu yüzden: MPT bağlantısı sayfadan keşfedilir ve zip
imzası kontrol edilir; konuşma metni önce PDF'ten okunur; cron adımları
`if: !cancelled()` ile birbirinden bağımsızdır ama iş yine kırmızı biter.

**`rawText` arayüze asla gitmez.** Üçüncü taraf telifli tam metin yalnızca
skorlamanın girdisidir; okuma katmanı onu ayıklar, Postgres sorgusu kolonu
seçmez bile.

**Sunucu bileşeni `"use client"` modülünden değer içe aktaramaz.** Gerçek
değeri değil istemci referansını alır. İki kez ısırdı: `computeCountdownParts`
(`src/lib/time.ts`'e taşındı) ve `THEME_KEY` (`src/lib/theme.ts`'e taşındı —
inline script'e `localStorage.getItem(undefined)` olarak gömülüyordu, sessizce).

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
elle üretilir.** `npm run score:speeches` bir Anthropic API anahtarı ve
bakiyesi ister; bakiye olmadığı için mevcut 15 kaydın skoru
`scripts/apply-session-scores.ts` ile elle yazıldı (`scoredVia: "session"`).

Cron'da bu adım `continue-on-error: true` — çalışmasa bile takvim, faiz,
olasılık ve konuşma metinleri commit'lenmeye devam eder; konuşmalar siteye
skorsuz düşer.

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

**FRED'de Fed Funds futures fiyatı yoktur** — MVP planındaki bu varsayım
hatalıydı, Atlanta Fed'e bu yüzden geçildi.

Hiçbir sayfa yatırım tavsiyesi vermez; altbilgideki uyarı kaldırılmamalı.

---

## 7. Mevcut durum (3 Ekim 2026)

```
Toplantı     87  (Fed 56, ECB 19, TCMB 12)  — 52'sinde karar oranı var (Fed 45, TCMB 6, ECB 1)
Konuşma      30  (Fed 13, ECB 9, RBA 3, BoE 3, BoJ 2) — 15'i skorlu, 9'u sinyalsiz
Olasılık     2026-10-01 anlığı, 13 pencere
Güncel faiz  Fed, ECB, TCMB
Sayfa        48 (build çıktısı), ISR 1 saat
```

---

## 8. Bilinen boşluklar

Öncelik sırasıyla:

1. **Anthropic anahtarı geçersiz.** Cron çalışıyor (3 Ekim'de elle tetiklenip
   doğrulandı, `FRED_API_KEY` ve `ANTHROPIC_API_KEY` secret olarak tanımlı),
   ancak `.env.local`'deki ve secret'taki Anthropic anahtarı 401
   "invalid" dönüyor; bakiye sorunu değil. console.anthropic.com'dan yeni
   anahtar alınıp hem `.env.local`'e hem
   `gh secret set ANTHROPIC_API_KEY --repo halilibrahimbilgic/merkez-bankalari-radar`
   ile yazılırsa (bakiye de varsa) skorlama ertesi sabah kendiliğinden başlar.
2. **15 konuşma skorsuz** — BIS kırılması giderilince Eylül konuşmaları
   eklendi; 1. madde çözülünce otomatik skorlanırlar. `/konusmalar` ve `/skor` bunu gösteriyor; ortalamalar hâlâ
   Ağustos örneklemine dayanıyor.
3. **TCMB ve ECB arşivi 2026'dan başlıyor.** Karar oranları artık üç banka
   için de dolduruluyor (TCMB: EVDS `TP.PY.P02.1H`; ECB'de 3 Ekim'e kadar
   "0 ECB" çıkmasının sebebi takvim değil, serinin toplantı gününden
   başlatılıp "önceki oran"ın bulunamamasıydı). Ancak iki bankanın takvim
   sayfası yalnızca içinde bulunulan/gelecek toplantıları veriyor; 2026
   öncesi toplantılar arşivde hiç yok. Faiz serisinden geçmiş toplantı
   *uydurulamaz* — seri yalnızca değişiklik günlerini gösterir, sabit tutma
   kararlarını değil. Arşiv §4'teki koruma sayesinde ileriye doğru birikir.
4. **Konuşma arşivi küçük.** BIS beslemesi yalnızca son 25 konuşmayı döndürür
   ve sayfalama kabul etmez; arşiv günlük işle birikir. Ağustos ortası–Eylül
   ortası arası (cron çalışmadığı için) kayıp. Ortalamalar tek haneli
   örneklemlerde yanıltıcı — `/skor` bunu yazıyor.
5. **`rawText` depoda** — artık ~28 konuşmanın tam metni (PDF'ten) commit'li.
   Site için gereksiz ve public depoda telif açısından hassas kısım bu.
   Gitignore'lu bir önbelleğe taşınabilir.
6. **MPT bantları %100'e tamamlanmıyor** — Atlanta Fed uçtaki küçük bantları
   ayrı yayımlamıyor (toplam ~%96–99). `/faiz-olasiligi` eksik payı açıkça
   yazıyor; yön olasılıkları (`Prob: cut/hike`) bu payı içeriyor.
7. **BoE, BoJ, RBA takvimi yok** — arayüzde "yakında" olarak pasif duruyor
   (`src/components/ComingSoon.tsx`). Ayrıştırıcı yazılmadı.

---

## 9. Yol haritası

**Yakın vade — güveni sağlamlaştır**
- `rawText`'i depodan çıkar

**Orta vade — kapsamı genişlet**
- BoE, BoJ, RBA takvim ayrıştırıcıları (`src/lib/sources/` deseni hazır)
- Skor zaman serisi: "bir ay önce +6 olan komite bugün +4" — yön seviyeden
  daha çok şey söyler. Veritabanı şeması geçmiş anlıkları zaten destekliyor.
- E-posta/RSS bildirimi: toplantı öncesi hatırlatma

**Uzun vade — ürünleşme**
- Skorlamayı otomatikleştir (Anthropic bakiyesi gerekir); `scoredVia: "api"`
  kayıtları çoğaldıkça elle süreç kendiliğinden sönümlenir
- Konuşmacı bazında eğilim sayfası (oy hakkı/kıdem ağırlıklandırması ile —
  şu an herkesin ağırlığı eşit, `/skor` bunu açıkça yazıyor)
- Ticarileşme düşünülürse **önce** §6'daki lisans sorunu çözülmeli

---

## 10. Çalışma alışkanlıkları

- Dış kaynak hakkında bir varsayımı koda gömmeden önce **doğrulayın**. Bu
  projede plandaki üç iddia (FRED futures, ECB host'u, Hawkometer) deneyle
  yanlış çıktı.
- Tasarım kararlarını ölçün: kontrast oranı, ton farkı, karakter sayısı.
- Değişiklikten sonra `npx tsc --noEmit`, `npm run lint`, `npx next build`.
  Veritabanı yolunu da değiştirdiyseniz `DATABASE_URL=... npx next build`
  ile iki modu da derleyin.
- Dev sunucusunu elle `npm run dev &` ile başlatmayın — port çakışması
  üretiyor. Araç varsa preview/launch mekanizmasını kullanın.
- Yorumlar Türkçe ve "neden"i anlatır, "ne"yi değil.
