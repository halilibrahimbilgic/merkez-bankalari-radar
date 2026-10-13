import type { Guide } from "../guides";

/** Faizi enflasyonla birlikte okumayı anlatır: nominal ile reel faiz farkı, iki hesaplama yolu ve /reel-faiz tablosunun neyi ölçüp neyi ölçmediği. */
export const guide: Guide = {
  slug: "reel-faiz-nedir",
  title: { tr: "Reel faiz nedir?", en: "What is the real interest rate?" },
  description: {
    tr: "Nominal ve reel faiz farkı, basit fark ile Fisher denklemi, geçmiş ve beklenen enflasyonun rolü ve sitedeki reel faiz tablosunun nasıl hesaplandığı.",
    en: "Nominal versus real rates, the simple difference and the Fisher equation, past versus expected inflation, and how the site's real rate table is calculated.",
  },
  updatedOn: "2026-10-13",
  blocks: [
    {
      p: {
        tr: "Bir faiz oranı, paranın ne kadar artacağını söyler; o parayla ne alınabileceğini söylemez. **Reel faiz**, faizin enflasyondan arta kalan kısmıdır: satın alma gücünün artıp artmadığını ve ne kadar değiştiğini gösterir.",
        en: "An interest rate says how much money will grow, not what that money will buy. The **real interest rate** is what remains of the rate after inflation: it shows whether, and by how much, purchasing power grows or shrinks.",
      },
    },
    { h: { tr: "Nominal faiz ve reel faiz", en: "Nominal and real rates" } },
    {
      p: {
        tr: "Sözleşmede yazan ya da merkez bankasının açıkladığı faize **nominal faiz** denir; para miktarındaki artışı ölçer. **Reel faiz** ise bu artışı fiyatlardaki artışla karşılaştırır, yani satın alma gücündeki değişimi ölçer.",
        en: "The rate in a contract or announced by a central bank is the **nominal rate**: it measures the growth in the amount of money. The **real rate** sets that growth against the rise in prices, so it measures the change in purchasing power.",
      },
    },
    {
      p: {
        tr: "Varsayımsal bir örnek: yıllık %40 faizle 100 lira, yıl sonunda 140 lira olur. Aynı yıl fiyatlar %30 arttıysa, başta 100 lira olan bir sepet yıl sonunda 130 liraya çıkar. Para %40 çoğalmıştır, ama satın alma gücü çok daha az artmıştır.",
        en: "A hypothetical example: at 40% a year, 100 becomes 140. If prices rise by 30% over the same year, a basket that cost 100 at the start costs 130 at the end. The money has grown by 40%, its purchasing power by much less.",
      },
    },
    { h: { tr: "Nasıl hesaplanır?", en: "How is it calculated?" } },
    {
      p: {
        tr: "Yaygın kestirme yol **basit fark** yöntemidir: nominal faizden enflasyon çıkarılır. Örnekte bu, 40 − 30 = 10 yüzde puan eder. Hızlı ve sezgiseldir, ama yaklaşık bir sonuçtur.",
        en: "The usual shortcut is the **simple difference**: nominal rate minus inflation, here 40 − 30 = 10 percentage points. It is quick and intuitive, but only an approximation.",
      },
    },
    {
      p: {
        tr: "Kesin hesap **Fisher denklemi** ile yapılır: reel faiz = (1 + nominal faiz) ÷ (1 + enflasyon) − 1. Oranlar ondalık olarak yazılır (%40 için 0,40). Örnekte 1,40 ÷ 1,30 − 1 ≈ 0,077, yani reel faiz yaklaşık %7,7'dir: yıl sonundaki 140 lira, artık 130 lira olan sepetten yaklaşık 1,077 tane alır.",
        en: "The exact calculation is the **Fisher equation**: real rate = (1 + nominal rate) ÷ (1 + inflation) − 1, with rates as decimals (0.40 for 40%). Here 1.40 ÷ 1.30 − 1 ≈ 0.077, a real rate of about 7.7%: the 140 buys about 1.077 baskets at the new price of 130.",
      },
    },
    {
      p: {
        tr: "Faiz ve enflasyon düşükken iki yol neredeyse aynı sonucu verir: %3 faiz ve %2 enflasyonda basit fark 1 puan, kesin sonuç 1,03 ÷ 1,02 − 1, yani yaklaşık %0,98'dir. İkisi yükseldikçe aradaki fark açılır.",
        en: "When rates and inflation are low, the two methods barely differ: with a 3% rate and 2% inflation, the simple difference is 1 point and the exact result 1.03 ÷ 1.02 − 1, about 0.98%. The gap widens as both rise.",
      },
    },
    {
      note: {
        tr: "Kısa kural: kesin reel faiz = basit fark ÷ (1 + enflasyon). Enflasyon %30 iken basit fark kesin sonucun 1,3 katı, %50 iken 1,5 katı çıkar. Yani yüksek enflasyonda basit fark, reel faizi pozitif de olsa negatif de olsa olduğundan daha uç gösterir.",
        en: "A short rule: exact real rate = simple difference ÷ (1 + inflation). With 30% inflation the simple difference is 1.3 times the exact result; with 50%, 1.5 times. So when inflation is high, it makes the real rate look more extreme than it is, whether positive or negative.",
      },
    },
    { h: { tr: "Geçmiş enflasyon mu, beklenen enflasyon mu?", en: "Past or expected inflation?" } },
    {
      p: {
        tr: "Hesapta hangi enflasyonun kullanıldığı da sonucu değiştirir. İki yaygın yaklaşım var:",
        en: "The choice of inflation figure also changes the result. There are two common approaches:",
      },
    },
    {
      terms: [
        {
          term: { tr: "Geriye dönük (ex post) reel faiz", en: "Backward-looking (ex post) real rate" },
          def: {
            tr: "Gerçekleşmiş enflasyonla, çoğunlukla son açıklanan yıllık enflasyonla hesaplanır. Rakam bellidir ve herkes için aynıdır; ama geçmiş 12 ayı anlatır.",
            en: "Uses realised inflation, usually the latest published annual figure. The number is known and the same for everyone, but it describes the past 12 months.",
          },
        },
        {
          term: { tr: "İleriye dönük (ex ante) reel faiz", en: "Forward-looking (ex ante) real rate" },
          def: {
            tr: "Önümüzdeki dönem için beklenen enflasyonla hesaplanır. Beklenti doğrudan gözlenemez; anketlerden ya da enflasyona endeksli tahvillerin fiyatlarından tahmin edilir, bu yüzden sonuç kaynağa göre değişir.",
            en: "Uses the inflation expected over the coming period. Expectations cannot be observed directly; they are estimated from surveys or inflation-linked bond prices, so results vary by source.",
          },
        },
      ],
    },
    {
      p: {
        tr: "Bugün açılan bir mevduat ya da çekilen bir kredi gelecekte geri ödenir; o paranın değerini aradaki dönemde gerçekleşecek enflasyon belirler. Para politikası da ekonomiyi gecikmeyle etkiler. Bu yüzden politika yapıcılar, para politikasının ne kadar sıkı olduğunu değerlendirirken çoğu zaman ileriye dönük reel faize bakar.",
        en: "A deposit or loan made today is repaid in the future, and what that money is worth depends on the inflation in between. Monetary policy also works with a lag. So when judging how tight policy is, policymakers often look at the forward-looking real rate.",
      },
    },
    {
      p: {
        tr: "İki ölçü, enflasyon hızla değişirken birbirinden ayrılır. Enflasyon düşerken beklenen enflasyon genellikle geçmiş 12 ayınkinden düşüktür; bu durumda ileriye dönük reel faiz, geriye dönük olandan yüksek çıkar. Enflasyon yükselirken çoğu zaman tersi olur.",
        en: "The two measures drift apart when inflation moves quickly. When it is falling, expected inflation is usually below the past 12 months' figure, so the forward-looking real rate is higher than the backward-looking one. When inflation is rising, the reverse is often true.",
      },
    },
    { h: { tr: "Negatif ve pozitif reel faiz", en: "Negative and positive real rates" } },
    {
      p: {
        tr: "Reel faiz **pozitif** olduğunda faiz enflasyonun üzerindedir: o faizle değerlendirilen paranın satın alma gücü artar, borç alan da aldığından fazla satın alma gücünü geri öder. **Negatif** olduğunda durum tersine döner: hesaptaki tutar artsa bile aynı parayla daha az şey alınır, borcun gerçek yükü ise zamanla erir.",
        en: "When the real rate is **positive**, the interest rate is above inflation: money earning it gains purchasing power, and borrowers repay more purchasing power than they received. When it is **negative**, the reverse holds: a growing balance still buys less, while the real burden of debt shrinks over time.",
      },
    },
    {
      p: {
        tr: "Bu yüzden pozitif reel faiz genellikle borçlanmayı ve harcamayı frenler, tasarrufu özendirir; negatif reel faiz ise tersi yönde etki eder. Bu etkiler zaman alır ve her zaman aynı güçte görülmez; ayrıntıları [faiz değişince ne olduğunu anlatan rehberde](/rehber/faiz-degisince-ne-olur) bulabilirsiniz.",
        en: "So a positive real rate generally restrains borrowing and spending and encourages saving; a negative one tends to do the opposite. These effects take time and vary in strength; the [guide to what happens when rates change](/rehber/faiz-degisince-ne-olur) covers them in more detail.",
      },
    },
    {
      p: {
        tr: "Reel faizin pozitif olması, tek başına para politikasının sıkı olduğunu göstermez. Ekonomistler bunu, ekonomiyi ne hızlandıran ne de yavaşlatan **nötr faiz** ile karşılaştırır; ancak nötr faiz doğrudan gözlenemez, yalnızca tahmin edilebilir.",
        en: "A positive real rate does not by itself mean policy is tight. Economists compare it with the **neutral rate**, which neither speeds up nor slows down the economy, but which can only be estimated, not observed.",
      },
    },
    { h: { tr: "Sitedeki reel faiz tablosu", en: "The real rate table on this site" } },
    {
      p: {
        tr: "[Reel faiz](/reel-faiz) tablosu, her ekonomi için politika faizinden açıklanmış son yıllık tüketici enflasyonunu çıkarır. Yani **geriye dönük** bir ölçüdür ve **basit fark** yöntemiyle hesaplanır: kaba bir göstergedir, ama her ekonomiye aynı yöntemi uygular.",
        en: "The [real interest rate](/reel-faiz) table subtracts the latest published annual consumer price inflation from each economy's policy rate. So it is a **backward-looking** measure based on the **simple difference**: rough, but consistent across economies.",
      },
    },
    {
      ul: {
        tr: [
          "**Faiz:** her merkez bankasının güncel politika faizi (ECB için mevduat kolaylığı faizi). Fed tek bir oran değil bir hedef aralık açıkladığı için aralığın orta noktası kullanılır.",
          "**Enflasyon:** tüketici fiyatlarındaki yıllık artış; her ekonomi için açıklanmış en son rakam.",
          "**Zamanlama:** enflasyon rakamı geçmiş bir döneme, çoğunlukla bir önceki aya aittir ve dönem kapandıktan birkaç gün ile birkaç hafta içinde açıklanır. Faiz bugünün, enflasyon geçmişin rakamıdır. Tablodaki değer hem faiz kararıyla hem de yeni enflasyon verisiyle değişir.",
        ],
        en: [
          "**Rate:** each central bank's current policy rate (for the ECB, the deposit facility rate). The Fed announces a target range rather than a single rate, so its midpoint is used.",
          "**Inflation:** the annual rise in consumer prices, the latest figure published for each economy.",
          "**Timing:** the inflation figure covers a past period, usually the previous month, and comes out within a few days to a few weeks of that period ending. The rate is today's; the inflation figure is from the past. The figures in the table change with both rate decisions and new inflation data.",
        ],
      },
    },
    {
      p: {
        tr: "Haberlerde ya da merkez bankası açıklamalarında geçen reel faiz, beklenen enflasyonla ya da başka bir enflasyon ölçüsüyle hesaplandığında tablodakinden farklı çıkabilir.",
        en: "Real rates quoted in the news or by central banks may differ from the table if they use expected inflation or another inflation measure.",
      },
    },
    { h: { tr: "Tablonun sınırları", en: "What the table leaves out" } },
    {
      ul: {
        tr: [
          "**Mevduat ve kredi faizi, politika faizi değildir.** Bankaların uyguladığı faizler vadeye, tutara ve riske göre politika faizinin altında ya da üstünde olabilir.",
          "**Vergi ve masraflar hesaba katılmaz.** Faiz gelirinden alınan vergiler (örneğin mevduattaki stopaj) ve kredi masrafları, elde kalan ya da ödenen tutarı değiştirir.",
          "**Tek bir enflasyon ölçüsü yoktur.** Manşet enflasyon sepetin tamamını kapsar; çekirdek enflasyon enerji ve gıda gibi oynak kalemleri dışarıda bırakır ve tanımı ülkeden ülkeye değişir. Merkez bankasının hedeflediği ölçü de farklı olabilir: Fed'in %2 hedefi, kişisel tüketim harcamaları (PCE) fiyat endeksine göre tanımlanır.",
        ],
        en: [
          "**Deposit and loan rates are not the policy rate.** Banks' rates can sit below or above it depending on maturity, amount and risk.",
          "**Taxes and fees are ignored.** Tax on interest income (such as withholding tax on deposits) and loan fees change what is actually kept or paid.",
          "**There is no single inflation measure.** Headline inflation covers the whole basket; core inflation excludes volatile items such as energy and food, with definitions varying by country. A central bank may also target another measure: the Fed's 2% target uses the personal consumption expenditures (PCE) price index.",
        ],
      },
    },
    {
      note: {
        tr: "Tablo bir göstergedir; bir mevduatın getirisini ya da bir kredinin maliyetini göstermez. Bu rehber genel mekanizmayı anlatır, yatırım tavsiyesi değildir.",
        en: "The table is an indicator: it does not show the return on any deposit or the cost of any loan. This guide explains general mechanisms and is not investment advice.",
      },
    },
    {
      p: {
        tr: "Yazıda geçen terimlerin kısa tanımlarını [sözlükte](/rehber/sozluk) bulabilirsiniz.",
        en: "Short definitions of the terms used here are in the [glossary](/rehber/sozluk).",
      },
    },
  ],
};
