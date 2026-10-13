import type { Guide } from "../guides";

/** Bir faiz kararı açıklandığında nelere, hangi sırayla bakılacağını sade dille anlatır: faiz, baz puan, karar metni, oylar, tahminler ve beklentiyle fark. */
export const guide: Guide = {
  slug: "faiz-karari-nasil-okunur",
  title: { tr: "Faiz kararı nasıl okunur?", en: "How to read a rate decision" },
  description: {
    tr: "Faiz kararında nelere bakılır: politika faizi, baz puan, karar metni, oylar, tahminler ve piyasayı asıl hareket ettiren şey, kararın beklentiden farkı.",
    en: "What to look at in a rate decision: the policy rate, basis points, the statement, votes, projections and what really moves markets, the gap with expectations.",
  },
  updatedOn: "2026-10-13",
  blocks: [
    {
      p: {
        tr: "Faiz kararı tek bir rakamdan ibaret değildir: faiz, karar metni, varsa oylar ve tahminler birlikte okunur. Piyasalar için çoğu zaman en önemlisi ise kararın beklentiden farkıdır.",
        en: "A rate decision is more than one number: the rate, the statement, any vote and any new forecasts are read together. For markets, what often matters most is the gap between the decision and expectations.",
      },
    },

    { h: { tr: "Açıklanan faiz ve adımın büyüklüğü", en: "The rate and the size of the move" } },
    {
      p: {
        tr: "Merkez bankaları ekonomiyi esas olarak kısa vadeli bir faizle yönlendirir: **politika faizi**. Adı ve biçimi bankaya göre değişir:",
        en: "Central banks steer the economy mainly through one short-term rate, the **policy rate**. Its name and form vary by bank:",
      },
    },
    {
      terms: [
        {
          term: { tr: "Fed (ABD)", en: "Fed (United States)" },
          def: {
            tr: "**Federal fon faizi hedef aralığı**: bankalar arası gecelik faiz için tek bir oran değil, 0,25 yüzde puanı genişliğinde bir aralık.",
            en: "**Federal funds target range**: not a single rate but a range 0.25 percentage points wide for the overnight rate between banks.",
          },
        },
        {
          term: { tr: "ECB (Euro Bölgesi)", en: "ECB (euro area)" },
          def: {
            tr: "**Mevduat kolaylığı faizi**: bankaların merkez bankasına gecelik yatırdığı paraya uygulanan faiz. ECB'nin belirlediği üç faizden politikayı yönlendiren budur.",
            en: "**Deposit facility rate**: the rate on banks' overnight deposits with the central bank. Of the three rates the ECB sets, this is the one that steers policy.",
          },
        },
        {
          term: { tr: "TCMB (Türkiye)", en: "CBRT (Türkiye)" },
          def: {
            tr: "**Bir hafta vadeli repo ihale faiz oranı**: TCMB'nin bankalara bir hafta vadeyle fon sağladığı faiz; kararı Para Politikası Kurulu (PPK) verir.",
            en: "**One-week repo auction rate**: the rate at which the CBRT lends to banks for a week, set by its Monetary Policy Committee.",
          },
        },
        {
          term: { tr: "BoE (Birleşik Krallık)", en: "BoE (United Kingdom)" },
          def: {
            tr: "**Bank Rate**: bankaların BoE'de tuttuğu rezervlere ödenen faiz; dokuz üyeli Para Politikası Kurulu (MPC) oylamayla belirler.",
            en: "**Bank Rate**: the rate paid on banks' reserves at the BoE, set by a vote of the nine-member Monetary Policy Committee (MPC).",
          },
        },
        {
          term: { tr: "BoJ (Japonya)", en: "BoJ (Japan)" },
          def: {
            tr: "**Kısa vadeli politika faizi**: BoJ'nin, bankalar arası teminatsız gecelik faizin civarında kalmasını hedeflediği düzey.",
            en: "**Short-term policy interest rate**: the level around which the BoJ guides the uncollateralised overnight interbank rate.",
          },
        },
        {
          term: { tr: "RBA (Avustralya)", en: "RBA (Australia)" },
          def: {
            tr: "**Nakit faiz hedefi** (cash rate target): bankalar arası gecelik borçlanma faizi için belirlenen hedef.",
            en: "**Cash rate target**: the target for the interest rate on overnight loans between banks.",
          },
        },
      ],
    },
    {
      p: {
        tr: "Değişiklikler **baz puan** ile ölçülür: 1 baz puan 0,01 yüzde puanıdır, yani 25 baz puan 0,25 puan eder. Gelişmiş ülkelerin merkez bankaları genellikle 25 baz puanlık adımlarla, hızlı dönemlerde 50 ya da 75 baz puanla hareket eder; enflasyonun yüksek olduğu ekonomilerde tek adım yüzlerce baz puanı bulabilir. Faizi sabit tutmak da bir karardır.",
        en: "Changes are measured in **basis points**: one basis point is 0.01 percentage points, so 25 basis points are 0.25 points. Central banks in advanced economies usually move in 25 basis point steps, with 50 or 75 in faster cycles; where inflation is high, a single move can run to hundreds. Holding the rate is a decision too.",
      },
    },

    { h: { tr: "Karar metni ve oylar", en: "The statement and the vote" } },
    {
      p: {
        tr: "Kararla birlikte bir **karar metni** yayımlanır: banka enflasyonu, büyümeyi, istihdamı ve riskleri nasıl gördüğünü anlatır. Çoğu banka metnin iskeletini toplantıdan toplantıya büyük ölçüde korur; bu yüzden tek bir ifadenin eklenmesi ya da çıkarılması bile sinyal olabilir.",
        en: "Each decision comes with a **statement** on how the bank sees inflation, growth, jobs and risks. Most banks keep its structure largely unchanged between meetings, so even one phrase added or dropped can be a signal.",
      },
    },
    {
      p: {
        tr: "En çok izlenen kısım **ileriye dönük yönlendirme** (forward guidance), yani sonraki adımlara dair ipuçlarıdır. Yönlendirme bir tarihe (“en az şu zamana kadar”), bir koşula (“enflasyonda kalıcı bir düşüş görülene kadar”) ya da veriye (“toplantı toplantı, veriye bağlı”) bağlanabilir. Bir söz değildir; koşullar değişirse o da değişir.",
        en: "The most closely watched part is **forward guidance**: hints about next steps. It may be tied to a date (“at least until…”), a condition (“until there is a lasting fall in inflation”) or incoming data (“data-dependent, meeting by meeting”). It is not a promise; it changes when conditions do.",
      },
    },
    {
      p: {
        tr: "Metnin tonu genellikle iki kelimeyle özetlenir. **Şahin** ton enflasyonla mücadeleyi öne çıkarır ve daha yüksek faize eğilimlidir; **güvercin** ton büyümeye ve istihdama daha çok ağırlık verir ve daha düşük faize eğilimlidir.",
        en: "The tone is usually summed up in two words. A **hawkish** tone puts fighting inflation first and leans towards higher rates; a **dovish** tone gives more weight to growth and jobs and leans towards lower rates.",
      },
    },
    {
      p: {
        tr: "Bazı bankalar oy dağılımını da yayımlar; Fed, BoE ve BoJ kimin karşı oy verdiğini isimleriyle açıklar, ECB ise bireysel oyları yayımlamaz. Bölünmüş bir oylama kurulun sonraki adımı tartıştığına işaret edebilir; karşı oyların yönü de önemlidir.",
        en: "Some banks publish the vote; the Fed, the BoE and the BoJ name any dissenters, while the ECB does not publish individual votes. A split vote can suggest the committee is debating its next move, and the direction of any dissent matters too.",
      },
    },

    { h: { tr: "Basın toplantısı ve tahminler", en: "Press conferences and projections" } },
    {
      p: {
        tr: "Fed ve ECB gibi bankalarda başkan her toplantıdan sonra basın toplantısı yapar; orada söylenen tek bir cümle bazen karardan daha çok ilgi görür. Bazı toplantılarda tahminler de güncellenir:",
        en: "The heads of the Fed and the ECB, among others, give a press conference after every meeting, and a single remark there can draw more attention than the decision. Some meetings also bring new forecasts:",
      },
    },
    {
      ul: {
        tr: [
          "**Fed**: Ekonomik Projeksiyonlar Özeti (SEP), yılda dört kez. İçindeki **nokta grafiği** (dot plot), her Fed yöneticisinin önümüzdeki yıllar için uygun gördüğü faizi isimsiz gösterir; noktalar taahhüt değil, görüştür.",
          "**ECB**: uzmanların hazırladığı enflasyon ve büyüme projeksiyonları, yılda dört kez.",
          "**BoE**: Para Politikası Raporu (Monetary Policy Report), yılda dört kez.",
          "**TCMB**: Enflasyon Raporu, yılda dört kez; enflasyon tahminleri burada açıklanır.",
          "**BoJ** ve **RBA**: benzer raporlar, yine yılda dört kez.",
        ],
        en: [
          "**Fed**: the Summary of Economic Projections (SEP), four times a year. Its **dot plot** shows, anonymously, the rate each Fed policymaker sees as appropriate for the coming years; the dots are views, not a commitment.",
          "**ECB**: staff projections for inflation and growth, four times a year.",
          "**BoE**: the Monetary Policy Report, four times a year.",
          "**CBRT**: the Inflation Report, four times a year, which sets out its inflation forecasts.",
          "**BoJ** and **RBA**: similar reports, also four times a year.",
        ],
      },
    },

    { h: { tr: "Piyasa için asıl mesele: beklentiyle fark", en: "What moves markets: the gap with expectations" } },
    {
      p: {
        tr: "Piyasalar kararı beklemez: tahvil faizleri, kur ve hisse fiyatları olası sonucu çoğu zaman karar açıklanmadan önce yansıtır. Bu yüzden tam beklendiği gibi gelen bir karar genellikle sınırlı tepki görür.",
        en: "Markets do not wait for the decision: bond yields, currencies and share prices often reflect the likely outcome well before it is announced. A decision that comes exactly as expected therefore tends to draw a muted reaction.",
      },
    },
    {
      p: {
        tr: "Piyasayı asıl hareket ettiren **sürpriz**, yani karar ile beklenti arasındaki farktır: beklenenden sıkı bir karar şahin, gevşek bir karar güvercin sürpriz sayılır. Bir indirim bile şahin karşılanabilir; örneğin daha büyük bir indirim bekleniyorsa ya da metin ileride daha az indirim olacağını ima ediyorsa.",
        en: "What moves markets is the **surprise**, the gap between decision and expectation: tighter than expected is a hawkish surprise, looser a dovish one. Even a rate cut can be read as hawkish, for example if a bigger cut was expected or the statement hints at fewer cuts ahead.",
      },
    },
    {
      p: {
        tr: "[Faiz olasılığı](/faiz-olasiligi) sayfasında beklenti Fed ve BoE için piyasa fiyatlarından, ECB ve TCMB için anketlerden gelir. Fed için gösterilen Atlanta Fed olasılıkları tek bir toplantıya değil, üçer aylık dönemlerin ortalama faizine aittir. Yöntemleri [beklentinin nasıl ölçüldüğünü](/rehber/beklenti-nasil-olculur) anlatan yazı ele alıyor.",
        en: "On the [rate probabilities](/faiz-olasiligi) page, expectations come from market prices for the Fed and the BoE, and from surveys for the ECB and the CBRT. The Atlanta Fed probabilities shown for the Fed cover the average rate over three-month periods, not a single meeting. The guide on [how expectations are measured](/rehber/beklenti-nasil-olculur) explains the methods.",
      },
    },
    {
      note: {
        tr: "[Kararlar](/kararlar) sayfası geçmiş kararları, veri bulunan yerde karardan önceki beklentiyle yan yana koyar ve karar metninde önceki toplantıya göre neyin değiştiğini gösterir.",
        en: "The [decisions](/kararlar) page sets past decisions beside the pre-decision expectation, where one is available, and shows what changed in the statement since the previous meeting.",
      },
    },

    { h: { tr: "Piyasa tepkisi nasıl okunur?", en: "Reading the market reaction" } },
    {
      p: {
        tr: "Genel olarak, beklenenden şahin bir sonuç iki yıllık tahvil faizi gibi kısa vadeli faizleri yükseltme ve ülkenin parasını güçlendirme eğilimindedir; güvercin bir sürpriz çoğu zaman tersini yapar. Bunlar kural değil, eğilimdir. Başka haberler de fiyatları etkiler ve ilk tepki basın toplantısında ya da sonraki günlerde tersine dönebilir. Uzun vadeli faizler enflasyon beklentisini ve risk algısını da yansıtır; hisse senetleri iki yönde de tepki verebilir.",
        en: "In general, a more hawkish outcome than expected tends to push up short-term government bond yields, such as the two-year yield, and to strengthen the currency; a dovish surprise often does the opposite. These are tendencies, not rules. Other news also moves prices, and the first reaction can reverse during the press conference or in the days after. Long-term yields also reflect inflation expectations and risk sentiment, and shares can react either way.",
      },
    },
    {
      p: {
        tr: "Kararın mevduat ve kredi faizlerine, harcamalara ve enflasyona etkisi ise zamanla ortaya çıkar. Bu etkileri [faiz değişince ne olduğunu](/rehber/faiz-degisince-ne-olur) anlatan yazı ele alıyor.",
        en: "The effect on deposit and loan rates, spending and inflation takes time to come through. The guide on [what happens when rates change](/rehber/faiz-degisince-ne-olur) covers these effects.",
      },
    },

    { h: { tr: "Kısa kontrol listesi", en: "A short checklist" } },
    {
      p: {
        tr: "Karar açıklandığında sırayla bakılacaklar:",
        en: "What to look at, in order:",
      },
    },
    {
      ul: {
        tr: [
          "**Ne zaman?** Karar günü ve Türkiye saatiyle kaçta açıklanacağı; başka ülkelerdeki yaz saati geçişleri bunu bir saat kaydırabilir: [takvim](/takvim).",
          "**Ne bekleniyordu?** Karardan önceki piyasa fiyatlaması ya da anket: [faiz olasılığı](/faiz-olasiligi).",
          "**Ne karar verildi?** Faiz değişti mi, kaç baz puan? Beklenen bu muydu?",
          "**Metinde ne değişti?** Değişen ifadeler ve ileriye dönük yönlendirme: [kararlar](/kararlar).",
          "**Oylar nasıldı?** Yayımlanıyorsa oy birliği mi, bölünmüş mü; karşı oylar hangi yönde?",
          "**Faiz dışında yeni ne var?** Tahminler, nokta grafiği, basın toplantısı.",
          "**Piyasa ne dedi?** Kısa vadeli faizlerde ve kurda ilk tepki; bu tepkinin kalıcı olup olmadığı.",
        ],
        en: [
          "**When?** The date and the announcement time in Turkey time, which can move by an hour when other countries change their clocks: [calendar](/takvim).",
          "**What was expected?** Market pricing or surveys beforehand: [rate probabilities](/faiz-olasiligi).",
          "**What was decided?** Did the rate change, and by how many basis points? Was that expected?",
          "**What changed in the statement?** Changed wording and the forward guidance: [decisions](/kararlar).",
          "**How did they vote?** Where published: unanimous or split, and which way did any dissent lean?",
          "**What else is new?** Projections, the dot plot, the press conference.",
          "**How did markets react?** The first move in short-term yields and the currency, and whether it lasts.",
        ],
      },
    },
  ],
};
