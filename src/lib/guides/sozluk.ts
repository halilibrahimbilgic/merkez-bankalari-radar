import type { Guide } from "../guides";

/** Sitede ve faiz kararı haberlerinde sık geçen terimlerin kısa, tarafsız tanımları. Gruplar içinde Türkçe alfabe sırası. */
export const guide: Guide = {
  slug: "sozluk",
  title: { tr: "Terimler sözlüğü", en: "Glossary" },
  description: {
    tr: "Baz puan, şahin, güvercin, ileriye dönük yönlendirme, OIS, reel faiz, PPK, FOMC… Faiz kararlarını izlerken sık geçen terimlerin kısa tanımları.",
    en: "Basis point, hawkish, dovish, forward guidance, OIS, real rate, FOMC… Short definitions of terms that come up when following rate decisions.",
  },
  updatedOn: "2026-10-15",
  blocks: [
    {
      p: {
        tr: "Faiz kararlarını izlerken sık karşılaşılan terimler, dört başlık altında. Tanımlar genel kullanımı anlatır; bankalar arasında ayrıntılar farklı olabilir.",
        en: "Terms you often meet when following rate decisions, under four headings. The definitions describe general usage; details can differ between banks.",
      },
    },

    { h: { tr: "Temel kavramlar", en: "Basic concepts" } },
    {
      terms: [
        {
          term: { tr: "Baz puan (bp)", en: "Basis point (bp)" },
          def: {
            tr: "Yüzde puanın yüzde biri: 1 baz puan 0,01 puan, 25 baz puan 0,25 puandır. Faiz değişiklikleri genellikle baz puanla anlatılır.",
            en: "One hundredth of a percentage point: 1 basis point is 0.01 points and 25 basis points are 0.25 points. Rate changes are usually expressed in basis points.",
          },
        },
        {
          term: { tr: "Enflasyon (manşet ve çekirdek)", en: "Inflation (headline and core)" },
          def: {
            tr: "Fiyatlar genel düzeyinin artış hızı, çoğunlukla tüketici fiyat endeksinin bir yıl öncesine göre değişimi. Manşet enflasyon bütün kalemleri kapsar; çekirdek enflasyon enerji ve gıda gibi oynak kalemleri dışarıda bırakır, tanımı ülkeden ülkeye değişir.",
            en: "The pace at which the general price level rises, usually the change in the consumer price index over a year. Headline inflation covers all items; core inflation leaves out volatile items such as energy and food, and its definition varies by country.",
          },
        },
        {
          term: { tr: "Enflasyon beklentisi", en: "Inflation expectations" },
          def: {
            tr: "Hane halkının, şirketlerin, ekonomistlerin ya da piyasaların gelecekteki enflasyona dair beklentisi. Merkez bankaları yakından izler, çünkü ücret ve fiyat kararlarını etkiler.",
            en: "What households, firms, economists or markets expect inflation to be in the future. Central banks watch it closely because it influences wage and price setting.",
          },
        },
        {
          term: { tr: "Nötr faiz", en: "Neutral rate" },
          def: {
            tr: "Ekonomiyi ne hızlandıran ne de yavaşlatan teorik faiz düzeyi. Doğrudan gözlenemez, tahmin edilir; politika faizinin bunun üzerinde ya da altında olması duruşun sıkı mı gevşek mi olduğunu anlatmak için kullanılır.",
            en: "The theoretical rate that neither speeds up nor slows down the economy. It cannot be observed directly, only estimated; whether the policy rate is above or below it is used to describe policy as tight or loose.",
          },
        },
        {
          term: { tr: "Politika faizi", en: "Policy rate" },
          def: {
            tr: "Merkez bankasının para politikasını yönlendirmek için belirlediği kısa vadeli faiz. Adı ve biçimi bankaya göre değişir (aşağıdaki son başlığa bakın).",
            en: "The short-term rate a central bank sets to steer monetary policy. Its name and form vary by bank (see the last heading below).",
          },
        },
        {
          term: { tr: "Reel faiz", en: "Real interest rate" },
          def: {
            tr: "Enflasyondan arındırılmış faiz. Kabaca faizden enflasyon çıkarılarak bulunur; yüksek enflasyonda kesin hesap farklıdır. [Reel faiz tablosu](/reel-faiz), [ayrıntılı yazı](/rehber/reel-faiz-nedir).",
            en: "The interest rate adjusted for inflation, roughly the rate minus inflation; when inflation is high the exact calculation differs. See the [real rate table](/reel-faiz) and the [detailed guide](/rehber/reel-faiz-nedir).",
          },
        },
      ],
    },

    { h: { tr: "Kararlar ve iletişim", en: "Decisions and communication" } },
    {
      terms: [
        {
          term: { tr: "Faiz artırımı (sıkılaştırma)", en: "Rate hike (tightening)" },
          def: {
            tr: "Politika faizinin yükseltilmesi. Borçlanmayı pahalılaştırarak talebi ve enflasyonu yavaşlatmayı amaçlar.",
            en: "Raising the policy rate. It aims to slow demand and inflation by making borrowing more expensive.",
          },
        },
        {
          term: { tr: "Faiz indirimi (gevşeme)", en: "Rate cut (easing)" },
          def: {
            tr: "Politika faizinin düşürülmesi. Borçlanmayı ucuzlatarak ekonomik faaliyeti desteklemeyi amaçlar.",
            en: "Lowering the policy rate. It aims to support economic activity by making borrowing cheaper.",
          },
        },
        {
          term: { tr: "Güvercin", en: "Dovish" },
          def: {
            tr: "Büyümeye ve istihdama ağırlık veren, daha düşük faize eğilimli tutum ya da ifade. Sitedeki [şahin/güvercin skoru](/skor) konuşmaların tonunu −10 (çok güvercin) ile +10 (çok şahin) arasında ölçer.",
            en: "A stance or remark that gives weight to growth and jobs and leans towards lower rates. The site's [hawk/dove score](/skor) rates the tone of speeches from −10 (very dovish) to +10 (very hawkish).",
          },
        },
        {
          term: { tr: "İleriye dönük yönlendirme", en: "Forward guidance" },
          def: {
            tr: "Merkez bankasının gelecekteki politika adımlarına dair verdiği ipuçları; bir tarihe, bir koşula ya da verilere bağlanabilir. Bir taahhüt değildir.",
            en: "Hints a central bank gives about its future policy steps, which may be tied to a date, a condition or incoming data. It is not a commitment.",
          },
        },
        {
          term: { tr: "Karar metni", en: "Policy statement" },
          def: {
            tr: "Kararla birlikte yayımlanan, bankanın ekonomiyi nasıl gördüğünü ve kararın gerekçesini anlatan açıklama. Bir öncekine göre değişen ifadeler yakından izlenir; [kararlar](/kararlar) sayfası farkı gösterir.",
            en: "The text published with the decision, setting out how the bank sees the economy and why it decided as it did. Changes from the previous statement are closely watched; the [decisions](/kararlar) page shows them.",
          },
        },
        {
          term: { tr: "Karşı oy (muhalefet şerhi)", en: "Dissent" },
          def: {
            tr: "Kurul üyesinin çoğunluğun kararından farklı yönde oy kullanması. Fed, BoE ve BoJ gibi bankalar karşı oyları isimleriyle yayımlar.",
            en: "A committee member voting differently from the majority. Banks such as the Fed, the BoE and the BoJ publish dissents by name.",
          },
        },
        {
          term: { tr: "Nokta grafiği", en: "Dot plot" },
          def: {
            tr: "Fed'in yılda dört kez yayımladığı ekonomik projeksiyonlarda, her FOMC katılımcısının ileriki yıllar için uygun gördüğü faizi isimsiz gösteren grafik. Görüştür, taahhüt değildir.",
            en: "A chart in the Fed's quarterly economic projections showing, anonymously, the rate each FOMC participant sees as appropriate for coming years. It shows views, not commitments.",
          },
        },
        {
          term: { tr: "Sabit tutma", en: "Hold" },
          def: {
            tr: "Politika faizinin değiştirilmemesi. Metinde yapılan değişikliklerle birlikte şahin ya da güvercin bir mesaj taşıyabilir.",
            en: "Leaving the policy rate unchanged. Together with changes in the statement, it can still carry a hawkish or dovish message.",
          },
        },
        {
          term: { tr: "Şahin", en: "Hawkish" },
          def: {
            tr: "Enflasyonla mücadeleyi öne çıkaran, daha yüksek faize eğilimli tutum ya da ifade.",
            en: "A stance or remark that puts fighting inflation first and leans towards higher rates.",
          },
        },
        {
          term: { tr: "Toplantı özeti (tutanak)", en: "Minutes" },
          def: {
            tr: "Kurul toplantısındaki tartışmaların özeti. Bazı bankalar kararla aynı gün, bazıları birkaç hafta sonra yayımlar.",
            en: "A summary of the committee's discussion. Some banks publish it on the day of the decision, others a few weeks later.",
          },
        },
      ],
    },

    { h: { tr: "Piyasalar ve beklentiler", en: "Markets and expectations" } },
    {
      terms: [
        {
          term: { tr: "Aktarım mekanizması", en: "Transmission mechanism" },
          def: {
            tr: "Politika faizindeki değişikliğin piyasa faizlerine, kredi ve mevduat koşullarına, kura, harcamalara ve sonunda enflasyona yayılma süreci. [Faiz değişince ne olur?](/rehber/faiz-degisince-ne-olur)",
            en: "How a change in the policy rate spreads to market rates, credit and deposit conditions, the currency, spending and finally inflation. See [what happens when rates change](/rehber/faiz-degisince-ne-olur).",
          },
        },
        {
          term: { tr: "Anket beklentisi", en: "Survey expectation" },
          def: {
            tr: "Ekonomistlere ve piyasa katılımcılarına sorularak derlenen beklenti; çoğunlukla ortalama ya da medyan olarak verilir.",
            en: "An expectation gathered by asking economists and market participants, usually reported as an average or a median.",
          },
        },
        {
          term: { tr: "Getiri eğrisi", en: "Yield curve" },
          def: {
            tr: "Farklı vadelerdeki faizleri vadeye göre gösteren eğri. Eğimi, piyasanın gelecekteki faizlere ve büyümeye dair beklentisi hakkında ipucu verir.",
            en: "A curve showing interest rates across maturities. Its slope gives clues about what the market expects for future rates and growth.",
          },
        },
        {
          term: { tr: "Nicel genişleme ve sıkılaştırma", en: "Quantitative easing and tightening (QE/QT)" },
          def: {
            tr: "Merkez bankasının tahvil alarak bilançosunu büyütmesi (genişleme) ya da bu varlıkları azaltarak küçültmesi (sıkılaştırma). Uzun vadeli faizleri etkilemeye yönelik, politika faizi dışındaki bir araçtır.",
            en: "A central bank growing its balance sheet by buying bonds (easing) or shrinking it by reducing those holdings (tightening). It is a tool besides the policy rate, aimed mainly at longer-term rates.",
          },
        },
        {
          term: { tr: "OIS", en: "OIS" },
          def: {
            tr: "Gecelik endeksli faiz takası (overnight index swap): sabit bir faiz ile bir dönem boyunca gerçekleşen gecelik faizin değiş tokuşu. Fiyatları, piyasanın gelecekteki gecelik faiz beklentisini yansıtır.",
            en: "Overnight index swap: an exchange of a fixed rate for the overnight rate realised over a period. Its prices reflect what the market expects the overnight rate to be.",
          },
        },
        {
          term: { tr: "Piyasa fiyatlaması", en: "Market pricing" },
          def: {
            tr: "Vadeli işlem, OIS ve opsiyon fiyatlarından çıkarılan faiz beklentisi. [Faiz olasılığı](/faiz-olasiligi) sayfasında Fed ve BoE için gösterilir.",
            en: "The rate expectation implied by futures, OIS and option prices. Shown for the Fed and the BoE on the [rate probabilities](/faiz-olasiligi) page.",
          },
        },
        {
          term: { tr: "SOFR", en: "SOFR" },
          def: {
            tr: "ABD'de teminatlı gecelik borçlanma faizi (Secured Overnight Financing Rate). Fed politikasına dair piyasa beklentilerinin önemli bir kısmı SOFR'a bağlı araçlardan okunur.",
            en: "The Secured Overnight Financing Rate in the United States. Much of the market's view on Fed policy is read from instruments linked to SOFR.",
          },
        },
        {
          term: { tr: "SONIA", en: "SONIA" },
          def: {
            tr: "İngiltere'de sterlin cinsinden teminatsız gecelik faiz ortalaması (Sterling Overnight Index Average). Bank Rate'in birkaç baz puan altında seyreder; sterlin OIS eğrisinin dayanağıdır.",
            en: "The Sterling Overnight Index Average, the average unsecured overnight sterling rate. It runs a few basis points below Bank Rate and underlies the sterling OIS curve.",
          },
        },
        {
          term: { tr: "Sürpriz", en: "Surprise" },
          def: {
            tr: "Karar ile karardan önceki beklenti arasındaki fark. Sitede baz puanla ölçülür; nasıl hesaplandığı [beklenti nasıl ölçülür](/rehber/beklenti-nasil-olculur) yazısında.",
            en: "The gap between a decision and the expectation before it. The site measures it in basis points; the method is explained in [how expectations are measured](/rehber/beklenti-nasil-olculur).",
          },
        },
        {
          term: { tr: "Zorunlu karşılık", en: "Reserve requirement" },
          def: {
            tr: "Bankaların topladıkları mevduatın bir kısmını merkez bankasında tutma yükümlülüğü. Oranın değiştirilmesi bankaların kredi verebileceği fonu etkiler.",
            en: "The requirement for banks to hold part of their deposits at the central bank. Changing the ratio affects the funds banks can lend.",
          },
        },
      ],
    },

    { h: { tr: "Kurumlar ve oranlar", en: "Institutions and rates" } },
    {
      terms: [
        {
          term: { tr: "Ağırlıklı ortalama fonlama maliyeti (AOFM)", en: "Weighted average cost of funding (CBRT)" },
          def: {
            tr: "TCMB'nin bankalara sağladığı fonların ortalama faizi; bankaların fiilen ödediği faiz. Fonlamanın tamamı bir hafta vadeli repo ihalesinden yapıldığında politika faizine eşittir. TCMB ihaleye ara verip bankaları koridorun üst bandından fonladığında politika faizinin üstüne çıkar: faiz değiştirilmeden yapılan bir sıkılaştırmadır (ör. 3 Mart–24 Ağustos 2026'da politika faizi %37, AOFM %40).",
            en: "The average rate on the funds the CBRT provides to banks, i.e. the rate banks actually pay. It equals the policy rate when all funding goes through the one-week repo auction. When the CBRT suspends the auction and funds banks at the top of the corridor, it rises above the policy rate: tightening without a rate change (for example, from 3 March to 24 August 2026 the policy rate was 37% and the funding cost 40%).",
          },
        },
        {
          term: { tr: "Ara hedef (TCMB)", en: "Interim target (CBRT)" },
          def: {
            tr: "TCMB'nin yıl sonları için koyduğu ve Enflasyon Raporu'nda açıkladığı enflasyon hedefleri; orta vadeli yüzde 5 hedefine giden yoldaki duraklar. Raporun yıl sonu tahmini ise TCMB'nin beklediği enflasyondur ve ara hedeften ayrışabilir (Enflasyon Raporu 2026-III: 2026 için ara hedef yüzde 24, tahmin yüzde 28).",
            en: "The inflation targets the CBRT sets for year-ends and publishes in its Inflation Report — waypoints towards the 5% medium-term target. The report's year-end forecast is the inflation the CBRT expects and can differ from the interim target (Inflation Report 2026-III: 24% interim target and 28% forecast for 2026).",
          },
        },
        {
          term: { tr: "Bir hafta vadeli repo ihale faizi", en: "One-week repo auction rate" },
          def: {
            tr: "TCMB'nin politika faizi: bankalara bir hafta vadeyle sağladığı fonun faizi.",
            en: "The CBRT's policy rate: the rate on funds it provides to banks for one week.",
          },
        },
        {
          term: { tr: "Faiz koridoru", en: "Interest rate corridor" },
          def: {
            tr: "TCMB'nin gecelik borç alma faizi (alt bant) ile gecelik borç verme faizi (üst bant) arasındaki aralık. Politika faizi bu aralığın içindedir; kısa vadeli piyasa faizleri ve fiilî fonlama maliyeti de aralığın içinde oluşur.",
            en: "The range between the CBRT's overnight borrowing rate (lower band) and overnight lending rate (upper band). The policy rate sits inside it, and short-term market rates and the actual funding cost settle within it.",
          },
        },
        {
          term: { tr: "Fed hedef aralığı", en: "Fed target range" },
          def: {
            tr: "Fed'in politika faizi tek bir oran değil, federal fon faizi için 0,25 puan genişliğinde bir aralıktır (ör. %3,50–3,75).",
            en: "The Fed's policy rate is not a single rate but a range 0.25 points wide for the federal funds rate (for example 3.50–3.75%).",
          },
        },
        {
          term: { tr: "FOMC", en: "FOMC" },
          def: {
            tr: "Federal Açık Piyasa Komitesi: Fed'in faiz kararlarını veren kurulu; yılda sekiz planlı toplantı yapar.",
            en: "The Federal Open Market Committee, which makes the Fed's rate decisions; it holds eight scheduled meetings a year.",
          },
        },
        {
          term: { tr: "Mevduat kolaylığı faizi (DFR)", en: "Deposit facility rate (DFR)" },
          def: {
            tr: "ECB'nin politika faizi: bankaların ECB'ye gecelik yatırdığı paraya uygulanan faiz.",
            en: "The ECB's policy rate: the rate on banks' overnight deposits with the ECB.",
          },
        },
        {
          term: { tr: "MPC", en: "MPC" },
          def: {
            tr: "İngiltere Merkez Bankası'nın dokuz üyeli Para Politikası Komitesi; Bank Rate'i oylamayla belirler ve oyları yayımlar.",
            en: "The Bank of England's nine-member Monetary Policy Committee, which sets Bank Rate by vote and publishes the votes.",
          },
        },
        {
          term: { tr: "PPK", en: "MPC (CBRT)" },
          def: {
            tr: "TCMB Para Politikası Kurulu: Türkiye'de politika faizine karar veren kurul.",
            en: "The CBRT's Monetary Policy Committee, which decides the policy rate in Türkiye.",
          },
        },
        {
          term: { tr: "Yönetim Konseyi (ECB)", en: "Governing Council (ECB)" },
          def: {
            tr: "ECB'nin faiz kararlarını veren organı; ECB Yönetim Kurulu üyeleri ile euro bölgesi ülkelerinin merkez bankası başkanlarından oluşur.",
            en: "The ECB body that makes rate decisions, made up of the members of the ECB's Executive Board and the governors of the euro area national central banks.",
          },
        },
      ],
    },
  ],
};
