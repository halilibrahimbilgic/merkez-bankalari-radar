import type { Guide } from "../guides";

/** Politika faizindeki değişikliğin mevduata, krediye, kura, tahvile ve enflasyona nasıl ve ne kadar sürede yansıdığını genel mekanizma olarak anlatır. */
export const guide: Guide = {
  slug: "faiz-degisince-ne-olur",
  title: { tr: "Faiz değişince ne olur?", en: "What happens when interest rates change?" },
  description: {
    tr: "Faiz artışı ya da indirimi mevduata, krediye, kura, tahvile ve enflasyona nasıl yansır? Aktarım mekanizması, gecikmeler ve beklentiler sade dille.",
    en: "How does a rate rise or cut feed through to deposits, loans, the currency, bonds and inflation? Transmission, time lags and expectations in plain language.",
  },
  updatedOn: "2026-10-13",
  blocks: [
    {
      p: {
        tr: "Merkez bankası politika faizini değiştirdiğinde etkisi bir anda her yere yayılmaz; finansal sistem üzerinden, farklı hızlarda ve farklı güçte ilerler. Ekonomistler buna **aktarım mekanizması** der. Bu yazı mekanizmanın genel işleyişini anlatır; kişisel kararlar için tavsiye değildir.",
        en: "When a central bank changes its policy rate, the effect does not reach everything at once; it travels through the financial system at different speeds and with different strength. Economists call this the **transmission mechanism**. This guide explains how it generally works; it is not advice for personal decisions.",
      },
    },

    { h: { tr: "İlk tepki: piyasa faizleri", en: "First reaction: market rates" } },
    {
      p: {
        tr: "Politika faizi bankaların merkez bankasından borçlandığı ya da orada para tuttuğu kısa vadeli faizdir. Bu yüzden ilk değişen, bankalar arası gecelik faiz ve kısa vadeli tahvil faizleridir; bunlar çoğu zaman karardan önce bile, beklentiyle birlikte hareket eder. Daha uzun vadeli faizler ise yalnızca bugünkü kararı değil, ilerideki kararlara dair beklentiyi, enflasyon beklentisini ve risk algısını da yansıtır.",
        en: "The policy rate is the short-term rate at which banks borrow from, or hold money at, the central bank. So the first things to move are overnight interbank rates and short-term government bond yields, often even before the decision, as expectations shift. Longer-term rates reflect not just today's decision but expectations about future decisions, inflation expectations and risk sentiment too.",
      },
    },

    { h: { tr: "Mevduat ve kredi faizleri", en: "Deposit and loan rates" } },
    {
      p: {
        tr: "Bankalar hem mevduata ödedikleri hem de kredide aldıkları faizi zamanla politika faizine ve piyasa faizlerine göre ayarlar. Bu ayar genellikle **gecikmeli** ve **tam olmayabilir**: rekabet, bankanın fon ihtiyacı, kredinin riski ve düzenlemeler de fiyatı belirler. Faiz artışında kredi faizleri çoğu zaman mevduat faizlerinden daha hızlı yükselir; indirimde ise tersi görülebilir.",
        en: "Over time, banks adjust both the rate they pay on deposits and the rate they charge on loans to the policy rate and market rates. The adjustment is usually **delayed** and **not always one-for-one**: competition, the bank's funding needs, the riskiness of the loan and regulation also shape prices. When rates rise, loan rates often go up faster than deposit rates; when rates fall, the opposite can happen.",
      },
    },
    {
      ul: {
        tr: [
          "**Değişken faizli krediler** (faizi belirli aralıklarla piyasa faizine göre güncellenenler) yeni düzeye görece hızlı uyum sağlar.",
          "**Sabit faizli mevcut krediler** sözleşme süresince etkilenmez; değişiklik yeni kullanılan kredilerde görülür.",
          "**Vadeli mevduat** için yeni faiz, mevcut vade dolup yeniden açıldığında geçerli olur.",
          "Kredi kartı ve tüketici kredisi gibi ürünlerde yasal üst sınırlar ya da kurallar varsa aktarım bunlarla da sınırlanabilir.",
        ],
        en: [
          "**Variable-rate loans** (whose rate is reset to market rates at set intervals) adjust to the new level relatively quickly.",
          "**Existing fixed-rate loans** are unaffected for the life of the contract; the change shows up in new borrowing.",
          "For **time deposits**, the new rate applies when the current term ends and the deposit is renewed.",
          "Where products such as credit cards or consumer loans have legal caps or rules, those can also limit the pass-through.",
        ],
      },
    },

    { h: { tr: "Kur", en: "The exchange rate" } },
    {
      p: {
        tr: "Bir ülkenin faizleri diğerlerine göre yükselirse o ülkenin varlıkları yatırımcı için daha getirili hâle gelir; bu, sermaye girişini ve paranın değerini **destekleyebilir**. Faiz indirimi ya da beklenenden gevşek bir karar tersi yönde baskı yaratabilir. Ama kur yalnızca faize bağlı değildir: risk algısı, enflasyon, cari denge, küresel koşullar ve politikaya duyulan güven de belirleyicidir. Bu yüzden faiz ile kur arasında mekanik bir kural yoktur; aynı karar farklı zamanlarda farklı tepki görebilir.",
        en: "If a country's rates rise relative to others, its assets offer investors a higher return, which **can support** capital inflows and the currency's value. A cut, or a decision looser than expected, can push the other way. But exchange rates depend on much more than interest rates: risk sentiment, inflation, the current account, global conditions and confidence in policy all matter. So there is no mechanical rule linking rates and the currency; the same decision can meet different reactions at different times.",
      },
    },

    { h: { tr: "Tahviller ve hisseler", en: "Bonds and shares" } },
    {
      p: {
        tr: "Tahvil fiyatları faizle ters yönde hareket eder: piyasa faizleri yükselince elde tutulan düşük kuponlu tahvillerin fiyatı düşer, faizler inince yükselir. Hisse senetlerinde etki iki yönlüdür: daha yüksek faiz gelecekteki kazançların bugünkü değerini azaltabilir ve borçlanmayı pahalılaştırabilir; ama faiz artışı ekonominin güçlü olmasından kaynaklanıyorsa şirket kârları da artıyor olabilir.",
        en: "Bond prices move opposite to yields: when market rates rise, the price of existing lower-coupon bonds falls, and when rates fall it rises. For shares the effect works both ways: higher rates can reduce the present value of future earnings and make borrowing dearer, but if rates are rising because the economy is strong, company profits may be growing too.",
      },
    },

    { h: { tr: "Harcama, büyüme ve enflasyon — gecikmeli", en: "Spending, growth and inflation — with a lag" } },
    {
      p: {
        tr: "Faiz yükselince borçlanmak pahalılaşır, tasarruf etmek daha çekici olur; hane halkı ve şirketler harcamayı ve yatırımı erteleyebilir. Talep yavaşladıkça fiyat artışlarının da yavaşlaması beklenir. Faiz indirimi ise tersi yönde çalışır. Bu etkiler **uzun ve değişken gecikmelerle** ortaya çıkar: sıkça bir ila iki yıllık bir süreden söz edilir, ama süre ülkeden ülkeye ve dönemden döneme değişir. Bu yüzden merkez bankaları bugünkü enflasyona değil, birkaç çeyrek sonrasına bakarak karar vermeye çalışır.",
        en: "When rates rise, borrowing becomes more expensive and saving more attractive, so households and firms may postpone spending and investment. As demand slows, price growth is expected to slow too; a cut works the other way. These effects come through with **long and variable lags**: one to two years is a commonly cited range, but the timing differs between countries and periods. That is why central banks try to set policy with an eye on inflation several quarters ahead rather than today's figure.",
      },
    },

    { h: { tr: "Beklentiler ve güvenilirlik", en: "Expectations and credibility" } },
    {
      p: {
        tr: "Faiz yalnızca bugünkü düzeyiyle değil, gelecekte nasıl değişeceğine dair beklentiyle de etkili olur. Piyasalar bir artırımı ya da indirimi önceden **fiyatladıysa** karar günü fiyatlar az hareket eder; asıl etki karar beklentiden saparsa görülür. Merkez bankasının enflasyon hedefine ulaşacağına güven varsa ücret ve fiyat belirleyenler de buna göre davranır; bu da politikanın işini kolaylaştırır.",
        en: "Interest rates work not only through their current level but through expectations of where they are heading. If markets have already **priced in** a hike or a cut, prices move little on the day; the real effect comes when the decision departs from expectations. If people trust the central bank to reach its inflation target, those setting wages and prices act accordingly, which makes policy's job easier.",
      },
    },

    { h: { tr: "Türkiye için birkaç not", en: "A few notes on Türkiye" } },
    {
      p: {
        tr: "Türkiye'de politika faizi tek araç değildir: TCMB zorunlu karşılıklar, likidite yönetimi ve makroihtiyati tedbirler gibi araçlarla da kredi ve mevduat koşullarını etkiler. Bu yüzden piyasadaki fonlama maliyeti zaman zaman politika faizinden ayrışabilir. Enflasyonun yüksek olduğu dönemlerde faizin düzeyi kadar enflasyona göre konumu da önemlidir; buna [reel faiz](/reel-faiz) denir ve [ayrı bir yazıda](/rehber/reel-faiz-nedir) anlatılıyor.",
        en: "In Türkiye the policy rate is not the only tool: the CBRT also shapes credit and deposit conditions through reserve requirements, liquidity management and macroprudential measures, so the actual cost of funding in the market can at times diverge from the policy rate. When inflation is high, where the rate stands relative to inflation matters as much as its level; this is the [real interest rate](/reel-faiz), explained in [a separate guide](/rehber/reel-faiz-nedir).",
      },
    },
    {
      note: {
        tr: "Bu yazı genel mekanizmayı anlatır; hangi ürünün, ne zaman, kimin için uygun olduğunu söylemez. Kişisel finans kararları kişinin kendi durumuna, vadesine ve riskine bağlıdır.",
        en: "This guide describes the general mechanism; it does not say which product suits whom, or when. Personal financial decisions depend on one's own circumstances, time horizon and risk.",
      },
    },
    {
      p: {
        tr: "Kararların beklentiyle nasıl karşılaştığını [kararlar](/kararlar) sayfasında, bir kararı okurken nelere bakılacağını [faiz kararı nasıl okunur](/rehber/faiz-karari-nasil-okunur) yazısında bulabilirsiniz.",
        en: "You can see how decisions compared with expectations on the [decisions](/kararlar) page, and what to look for when reading one in [how to read a rate decision](/rehber/faiz-karari-nasil-okunur).",
      },
    },
  ],
};
