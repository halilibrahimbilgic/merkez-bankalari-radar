# Merkez Bankaları Radar

Fed, ECB ve TCMB faiz toplantılarını Türkiye saatiyle tek yerde toplayan Türkçe
merkez bankası takip platformu. Yol haritası ve gerekçe için
`merkez_bankalari_radar_mvp_plani.docx` belgesine bakın.

## Durum

| Modül | Kapsam | Durum |
| --- | --- | --- |
| A — Toplantı takvimi | Fed, ECB, TCMB; TRT dönüşümü, geri sayım, filtre, iCal | **Yayında** |
| B — Faiz olasılığı | Atlanta Fed MPT dağılımları, Türkçe anlatım + grafik | **Yayında** |
| C — Konuşma arşivi ve şahin/güvercin skoru | BIS arşivi + Türkçe özet/skor | **Yayında** — metin toplama otomatik, **skorlama elle** |

## Kurulum

```bash
npm install
cp .env.example .env.local   # şimdilik boş bırakılabilir
npm run fetch:meetings       # resmî takvimleri çeker → data/seed/meetings.json
npm run fetch:rates          # geçmiş Fed karar oranları (FRED_API_KEY gerekir)
npm run fetch:current-rates  # güncel politika faizleri (Fed, ECB)
npm run fetch:probabilities  # Atlanta Fed olasılık dağılımları
npm run fetch:speeches       # BIS konuşma arşivi (metinlerle birlikte)
npm run score:speeches       # Türkçe özet + skor (ANTHROPIC_API_KEY gerekir)
npm run dev
```

`DATABASE_URL` tanımlı değilse uygulama `data/seed/meetings.json` dosyasından
okur. Bu sayede arayüz, Supabase/Neon kurulumunu beklemeden çalışır.

## Veritabanı (isteğe bağlı)

```bash
psql "$DATABASE_URL" -f db/schema.sql
psql "$DATABASE_URL" -f db/seed.sql
```

`DATABASE_URL` tanımlandığı anda okuma katmanı otomatik olarak Postgres'e geçer
(`src/lib/db.ts`).

## Veri kaynakları

Takvim verisi merkez bankalarının kendi sayfalarından çekilir; ara bir sağlayıcı
kullanılmaz.

| Banka | Kaynak | Karar saati |
| --- | --- | --- |
| Fed | `federalreserve.gov` FOMC takvimi | Toplantının 2. günü 14:00 New York |
| ECB | `ecb.europa.eu` Governing Council takvimi | Day 2, 14:15 Frankfurt |
| TCMB | `tcmb.gov.tr` duyuru takvimi | Toplantı günü 14:00 Türkiye |

Faiz olasılıkları [Atlanta Fed Market Probability
Tracker](https://www.atlantafed.org/research-and-data/data/market-probability-tracker)
verisinden gelir (CME 3 aylık SOFR opsiyonlarından türetilir).

**Lisans uyarısı:** bu veri yalnızca kişisel ve eğitim amaçlı kullanıma
izinlidir. Site buna göre konumlandırılmıştır; ticarileştirme (reklam,
abonelik) düşünülüyorsa önce CME lisansı alınmalı ve bu kaynak
değiştirilmelidir. Kaynak ve lisans metinleri `/faiz-olasiligi` ile
`/hakkinda` sayfalarında görünür durumdadır.

Olasılıkları kendimiz hesaplamıyoruz: girdi olan vadeli işlem/opsiyon
fiyatları CME'nin lisanslı verisidir ve CME otomatik veri çekmeyi kullanım
şartlarıyla yasaklamıştır. FRED'de Fed Funds futures fiyatı **yoktur** —
plandaki bu varsayım hatalıdır.

Saatler kaynağın yerel saatinden okunup UTC olarak saklanır, sunumda TRT'ye
çevrilir. Yaz saati farkları `src/lib/tz.ts` içinde `Intl` üzerinden çözülür —
sabit ofset varsayımı yoktur.

Konuşmalar [BIS Central Bankers'
Speeches](https://www.bis.org/cbspeeches/index.htm) beslemesinden gelir. Besleme
yalnızca **son 25 konuşmayı** döndürür ve sayfalama parametresi kabul etmez —
arşiv, günlük çalışan işle zaman içinde birikir. Tek bir çekişte yalnızca
takip edilen 6 bankaya ait olanlar alınır (ilk çekişte 11 konuşma).

Skor sıfırsa iki durum olabilir: dengeli bir duruş, ya da hiç para politikası
sinyali taşımayan bir konuşma (düzenleme, denetim, ödeme sistemleri).
`hasPolicySignal` alanı bunları ayırır; sinyalsiz konuşmalar banka
ortalamalarına katılmaz.

**Skorlama otomatik değildir.** Konuşma metinleri günlük cron ile toplanır,
ancak Türkçe özet ve şahin/güvercin skoru elle üretilir
(`scripts/apply-session-scores.ts`, kayıtlar `scoredVia: "session"` ile
işaretli). `npm run score:speeches` toplu işi bir Anthropic API anahtarı ve
bakiyesi gerektirir; cron'da `continue-on-error` ile işaretlidir, yani
çalışmasa bile diğer veriler güncellenmeye devam eder.

Skorsuz kayıt sayısı `/konusmalar` ve `/skor` sayfalarında açıkça gösterilir —
banka ortalamalarının hangi örnekleme dayandığı gizlenmez.

Takvim her gün 08:00 TRT'de GitHub Actions ile yenilenir
(`.github/workflows/fetch-meetings.yml`).

## Yayına alma (Vercel)

1. Depoyu Vercel'e bağlayın; Next.js otomatik algılanır, ek ayar gerekmez.
2. Ortam değişkeni olarak `FRED_API_KEY` ve (skorlama için) `ANTHROPIC_API_KEY`
   ekleyin. Kendi alan adınızı bağladığınızda `NEXT_PUBLIC_SITE_URL` tanımlayın —
   sitemap ve kanonik adresler bunu kullanır; tanımsızsa Vercel'in verdiği
   üretim alan adına düşer.
3. Aynı anahtarları GitHub deposunda **Secrets** olarak da ekleyin; günlük veri
   yenileme işi (`.github/workflows/fetch-meetings.yml`) bunları kullanır ve
   güncellenen `data/seed/*.json` dosyalarını commit'ler. Bu commit Vercel'de
   yeni bir dağıtım tetikler.

`sitemap.xml` ve `robots.txt` otomatik üretilir (`src/app/sitemap.ts`,
`src/app/robots.ts`).

## Dizin yapısı

```
src/app/           sayfalar (/, /takvim, /banka/[code], /hakkinda, ...)
src/components/    paylaşılan arayüz parçaları
src/lib/sources/   resmî takvim ayrıştırıcıları (fomc, ecb, tcmb)
src/lib/data/      okuma katmanı — Postgres ya da seed dosyası
src/lib/tz.ts      zaman dilimi / DST dönüşümü
scripts/           veri çekme işleri
db/                şema ve seed SQL
```

## Komutlar

```bash
npm run dev              # geliştirme sunucusu
npm run build            # üretim derlemesi
npm run fetch:meetings   # takvimleri yeniden çek
npm run fetch:rates      # geçmiş Fed karar oranları
npm run fetch:current-rates  # güncel politika faizleri
npm run fetch:probabilities  # olasılık dağılımları
npm run fetch:speeches   # BIS konuşma arşivi
npm run score:speeches   # özet + skor üret (--limit N ile sınırlanabilir)
npm run lint
```
