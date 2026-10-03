# Merkez Bankaları Radar

Fed, ECB, TCMB, BoE, BoJ ve RBA faiz toplantılarını Türkiye saatiyle tek yerde toplayan Türkçe
merkez bankası takip platformu. Yol haritası ve gerekçe için
`merkez_bankalari_radar_mvp_plani.docx` belgesine bakın.

Mimari, bozulmaması gereken kurallar ve sıradaki işler için
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## Durum

| Modül | Kapsam | Durum |
| --- | --- | --- |
| A — Toplantı takvimi | Fed, ECB, TCMB, BoE, BoJ, RBA; TRT dönüşümü, geri sayım, filtre, iCal aboneliği, RSS | **Yayında** |
| B — Faiz olasılığı | Atlanta Fed MPT dağılımları, Türkçe anlatım + grafik | **Yayında** |
| C — Konuşma arşivi ve şahin/güvercin skoru | BIS arşivi + Türkçe özet/skor | **Yayında** — metin toplama ve skorlama otomatik (Claude aboneliği) |

## Kurulum

```bash
npm install
cp .env.example .env.local   # şimdilik boş bırakılabilir
npm run fetch:meetings       # resmî takvimleri çeker → data/seed/meetings.json
npm run fetch:rates          # geçmiş karar oranları (FRED_API_KEY; TCMB için EVDS_API_KEY)
npm run fetch:current-rates  # güncel politika faizleri (Fed, ECB, TCMB)
npm run fetch:probabilities  # Atlanta Fed olasılık dağılımları
npm run fetch:speeches       # BIS konuşma arşivi (metinlerle birlikte)
npm run score:export         # skorsuz konuşmaları .scoring/ altına hazırlar
npm run score:import         # Claude Code çıktılarını doğrulayıp arşive yazar
npm run dev
```

`DATABASE_URL` tanımlı değilse uygulama `data/seed/meetings.json` dosyasından
okur. Bu sayede arayüz, Supabase/Neon kurulumunu beklemeden çalışır.

## Veritabanı (isteğe bağlı)

Site veritabanı olmadan da tam çalışır: `DATABASE_URL` tanımlı değilse okuma
katmanı `data/seed/*.json` dosyalarından okur. Postgres'e geçmek isterseniz:

```bash
export DATABASE_URL="postgres://localhost:5432/mbr"
npm run db:migrate   # db/migrations/*.sql dosyalarını sırayla uygular
npm run db:import    # data/seed/*.json içeriğini aktarır (idempotent)
```

`DATABASE_URL` tanımlandığı anda **tüm** okuma modülleri Postgres'e geçer —
toplantılar, konuşmalar, güncel faizler ve olasılıklar (`src/lib/db.ts`).
Karışık bir durum yoktur.

Birkaç tasarım notu:

- Birincil anahtarlar içerikten türeyen `text` değerlerdir (`fed-2026-09-16`),
  surrogate uuid değil. Aynı kimlik seed dosyasında, URL'de ve veritabanında
  geçerli olur; `db:import` doğal olarak idempotent kalır.
- `central_banks` yalnızca bir referans çapasıdır. Görünen ad, saat dilimi ve
  faiz adı `src/lib/banks.ts`'te kalır — iki yerde tutmak kayma üretirdi.
- `db:import` mevcut skorları **ezmez**: skorlama ayrı bir adımdır
  ve günlük veri çekme işi skorsuz kayıtlar üretir; naif bir upsert her gece
  skorları silerdi.
- Olasılıklar üç tabloya ayrıktır (`probability_snapshots` → `_windows` →
  `_buckets`), böylece geçmiş anlıklar birikip "beklenti zamanla nasıl
  değişti" sorusu sorgulanabilir. Seed dosyası yalnızca son anlığı tutar.

Uygulanmış bir göç dosyasını düzenlemeyin; yeni bir dosya ekleyin. Çalıştırıcı
dosyayı adına göre atlar, içeriği değişse bile yeniden uygulamaz.

## Veri kaynakları

Takvim verisi merkez bankalarının kendi sayfalarından çekilir; ara bir sağlayıcı
kullanılmaz.

| Banka | Kaynak | Karar saati |
| --- | --- | --- |
| Fed | `federalreserve.gov` FOMC takvimi | Toplantının 2. günü 14:00 New York |
| ECB | `ecb.europa.eu` Governing Council takvimi | Day 2, 14:15 Frankfurt |
| TCMB | `tcmb.gov.tr` duyuru takvimi | Toplantı günü 14:00 Türkiye |
| BoE | `bankofengland.co.uk` MPC takvimi | Duyuru günü 12:00 Londra |
| BoJ | `boj.or.jp` MPM takvimi | Son gün, toplantı bitince (saat duyurulmaz) |
| RBA | `rba.gov.au` kurul takvimi | 2. gün 14:30 Sidney |

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
takip edilen 6 bankaya ait olanlar alınır (ilk çekişte 11 konuşma). Eylül
2026'dan beri BIS sayfaları yalnızca giriş paragraflarını içerdiği için tam
metin konuşmanın PDF'inden okunur (`unpdf`). Yayımcısının şartları izin
veren konuşmaların (Fed Board, ECB, BoJ, RBA) tam metni `data/speech-text/`'te
tutulur ve konuşma sayfasında lisans notuyla okunabilir; izin vermeyenlerin
(BoE, bölgesel Fed bankaları, ulusal merkez bankaları) metni git'e girmeyen
`.cache/speech-text/` önbelleğinde kalır ve yalnızca skorlamada kullanılır.

Skor sıfırsa iki durum olabilir: dengeli bir duruş, ya da hiç para politikası
sinyali taşımayan bir konuşma (düzenleme, denetim, ödeme sistemleri).
`hasPolicySignal` alanı bunları ayırır; sinyalsiz konuşmalar banka
ortalamalarına katılmaz.

**Skorlama API anahtarı gerektirmez.** Günlük cron, Türkçe özeti ve
şahin/güvercin skorunu Claude aboneliğiyle üretir
(`anthropics/claude-code-action`, `CLAUDE_CODE_OAUTH_TOKEN` secret'ı —
`claude setup-token` ile alınır). Akış `score:export → Claude Code →
score:import`; ayrıntı ve güvenlik sınırları `ARCHITECTURE.md` §5'te. Kayıtlar
`scoredVia: "claude-code"` ile işaretlenir.

Skorsuz kayıt sayısı `/konusmalar` ve `/skor` sayfalarında açıkça gösterilir —
banka ortalamalarının hangi örnekleme dayandığı gizlenmez.

Takvim her gün 08:00 TRT'de GitHub Actions ile yenilenir
(`.github/workflows/fetch-meetings.yml`).

**Hatırlatma:** `/takvim` sayfasından takvime abone olunabilir (`webcal://`,
her karar için bir gün ve bir saat önce alarm) ya da `/rss.xml` akışı
izlenebilir (karardan bir hafta önce "yaklaşan" ve karar açıklanınca sonuç
öğesi). E-posta için RSS bir e-posta köprüsüne bağlanabilir; site e-posta
adresi toplamaz.

## Yayına alma (Vercel)

1. Depoyu Vercel'e bağlayın; Next.js otomatik algılanır, ek ayar gerekmez.
2. Site yalnızca seed dosyalarını okur; Vercel'de veri anahtarı gerekmez.
   Kendi alan adınızı bağladığınızda `NEXT_PUBLIC_SITE_URL` tanımlayın —
   sitemap ve kanonik adresler bunu kullanır; tanımsızsa Vercel'in verdiği
   üretim alan adına düşer.
3. GitHub deposunda **Secrets** olarak `FRED_API_KEY`, `EVDS_API_KEY` ve
   `CLAUDE_CODE_OAUTH_TOKEN` (skorlama; `claude setup-token`) ekleyin; günlük veri
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
src/components/ui.tsx  düzen ilkelleri (Card, SectionHeader, TableFrame, ...)
scripts/           veri çekme işleri ve veritabanı araçları
db/migrations/     sıralı şema göçleri
```

## Komutlar

```bash
npm run dev              # geliştirme sunucusu
npm run build            # üretim derlemesi
npm run fetch:meetings   # takvimleri yeniden çek
npm run fetch:rates      # geçmiş karar oranları (Fed, ECB, TCMB)
npm run fetch:current-rates  # güncel politika faizleri
npm run fetch:probabilities  # olasılık dağılımları
npm run fetch:speeches   # BIS konuşma arşivi
npm run score:export     # skorlanacakları .scoring/ altına hazırla (--limit N)
npm run score:import     # Claude Code çıktılarını doğrula ve arşive yaz
npm run score:speeches   # API yolu (ANTHROPIC_API_KEY gerekir; cron'da kullanılmaz)
npm run db:migrate       # şema göçlerini uygula (DATABASE_URL gerekir)
npm run db:import        # seed dosyalarını veritabanına aktar
npm run lint
```
