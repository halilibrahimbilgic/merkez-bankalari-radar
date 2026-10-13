import type { Guide } from "../guides";

/** Faiz beklentisinin iki ölçüsünü (piyasa fiyatlaması ve anketler) ve sitedeki "sürpriz" hesabının nasıl yapıldığını anlatır. */
export const guide: Guide = {
  slug: "beklenti-nasil-olculur",
  title: { tr: "Piyasa beklentisi nasıl ölçülür?", en: "How are rate expectations measured?" },
  description: {
    tr: "Faiz beklentisi piyasa fiyatlarından ve anketlerden nasıl çıkarılır, olasılıklar nasıl okunur, bir kararın sürpriz olup olmadığı nasıl ölçülür?",
    en: "How rate expectations are read from market prices and surveys, how to read the probabilities, and how a decision's surprise is measured.",
  },
  updatedOn: "2026-10-13",
  blocks: [
    {
      p: {
        tr: "Bir faiz kararının önemi büyük ölçüde beklentiden ne kadar saptığına bağlıdır. Beklentiyi ölçmenin iki yaygın yolu var: **piyasa fiyatlaması** ve **anketler**. İkisi farklı şeyleri ölçer ve zaman zaman ayrışır.",
        en: "How much a rate decision matters depends largely on how far it departs from expectations. There are two common ways to measure those expectations: **market pricing** and **surveys**. They measure different things and sometimes disagree.",
      },
    },

    { h: { tr: "Piyasa fiyatlaması", en: "Market pricing" } },
    {
      p: {
        tr: "Getirisi gelecekteki gecelik faize bağlı finansal araçlar vardır: faiz vadeli işlemleri, **OIS** (gecelik endeksli faiz takası) ve bunlara dayalı opsiyonlar. Bu araçların bugünkü fiyatı, piyasanın önümüzdeki aylarda ortalama gecelik faizin ne olacağını düşündüğünü yansıtır. Fiyatlardan çıkarılan bu yol, toplantı tarihlerine bölünerek her toplantıda beklenen değişime çevrilebilir.",
        en: "Some financial instruments pay off according to the future overnight rate: interest rate futures, **OIS** (overnight index swaps) and options on them. Their prices today reflect what the market expects the average overnight rate to be over the coming months. That implied path can be split at meeting dates and turned into the change expected at each meeting.",
      },
    },
    {
      p: {
        tr: "Beklenen değişim olasılığa da çevrilebilir, ama bir varsayımla: yalnızca \"değişiklik yok\" ya da \"25 baz puan\" seçenekleri varsa, fiyatlanan +13 baz puan, yaklaşık %50 ihtimalle bir artırım demektir. Gerçekte daha büyük adım ihtimali, vade primi ve eğrinin yumuşatılması bu rakamı etkiler; bu yüzden sonuç **yaklaşık** okunmalıdır.",
        en: "The expected change can also be turned into a probability, but only under an assumption: if the only options are \"no change\" or \"25 basis points\", a priced +13 basis points means roughly a 50% chance of a hike. In reality, the possibility of a larger move, term premia and the smoothing of the curve all affect the figure, so the result should be read as **approximate**.",
      },
    },
    {
      p: {
        tr: "Sitede BoE için bu yöntem kullanılır: İngiltere Merkez Bankası'nın yayımladığı günlük OIS eğrisi, o gün gerçekleşen gecelik faize (SONIA) göre okunur. Fed için gösterilen Atlanta Fed olasılıkları ise başka bir şeydir: tek bir toplantıya değil, **üçer aylık dönemlerde ortalama faizin** hangi bantta kalacağına aittir. \"Eylül–Aralık döneminde ortalama faizin bugünkü aralığın üzerinde olma ihtimali %X\" diye okunur; \"Eylül toplantısında artırım ihtimali %X\" diye değil.",
        en: "The site uses this method for the BoE: the daily OIS curve published by the Bank of England, read against that day's actual overnight rate (SONIA). The Atlanta Fed probabilities shown for the Fed are something else: they do not refer to a single meeting but to which band the **average rate over a three-month period** will fall into. They read as \"the probability that the average rate over September–December is above today's range is X%\", not \"the probability of a hike at the September meeting is X%\".",
      },
    },

    { h: { tr: "Anketler", en: "Surveys" } },
    {
      p: {
        tr: "Anketlerde ekonomistlere ve piyasa katılımcılarına doğrudan sorulur. Sitede üç anket kullanılır:",
        en: "Surveys ask economists and market participants directly. The site uses three:",
      },
    },
    {
      ul: {
        tr: [
          "**TCMB Piyasa Katılımcıları Anketi**: ayda bir yayımlanır; sonraki toplantılar ve yıl sonu için politika faizi beklentisinin ortalamasını verir.",
          "**ECB Survey of Monetary Analysts**: her para politikası toplantısından önce yapılır, sonuçları toplantıdan sonra yayımlanır; medyan beklentiyi ve analistlerin her değişim büyüklüğüne verdiği olasılıkları içerir.",
          "**New York Fed Survey of Market Expectations**: her FOMC toplantısından önce yapılır, sonuçları birkaç hafta sonra yayımlanır; toplantı bazında beklenti ve olasılık dağılımı verir.",
        ],
        en: [
          "**CBRT Survey of Market Participants**: published monthly; gives the average expected policy rate for the next meetings and the end of the year.",
          "**ECB Survey of Monetary Analysts**: run before each monetary policy meeting, results published after it; includes the median expectation and the odds analysts give to each size of change.",
          "**New York Fed Survey of Market Expectations**: run before each FOMC meeting, results published a few weeks later; gives meeting-by-meeting expectations and probability distributions.",
        ],
      },
    },
    {
      p: {
        tr: "Anketler bir görüşün nabzını tutar ama seyrek yapılır ve belli bir takvimle yayımlanır; anketten sonra gelen veri ya da açıklama yansıtılmaz. Ortalama ile medyan da farklı şeyler söyleyebilir: katılımcıların çoğu \"sabit\" beklerken birkaçının büyük bir indirim beklemesi ortalamayı düşürür.",
        en: "Surveys take the pulse of opinion, but they are infrequent and follow a publication schedule; data or remarks that arrive after the survey are not reflected. The average and the median can also tell different stories: if most participants expect a hold but a few expect a big cut, the average is pulled down.",
      },
    },

    { h: { tr: "İkisi neden ayrışır?", en: "Why can the two disagree?" } },
    {
      p: {
        tr: "Piyasa fiyatı her işlem gününde değişir ve gerçek parayla ortaya konan bir tahmindir; içinde risk primi de vardır. Anket ise belirli bir günde toplanmış görüşlerdir. Önemli bir veri ya da konuşma anketten sonra geldiyse, piyasa fiyatlaması anketten hızla uzaklaşabilir. Bu yüzden sitede her beklentinin türü ve tarihi açıkça yazılır.",
        en: "Market prices change every trading day and represent a forecast backed by real money, with a risk premium built in. A survey is a set of views collected on a given date. If important data or a speech arrives after the survey, market pricing can quickly move away from it. That is why the site always states the type and date of each expectation.",
      },
    },

    { h: { tr: "Sürpriz nasıl ölçülür?", en: "How is a surprise measured?" } },
    {
      p: {
        tr: "[Kararlar](/kararlar) sayfasında her karar, **bir önceki karardan sonra ve bu karardan önce** oluşmuş son beklentiyle karşılaştırılır: BoE için karardan önceki iş gününün eğrisi, anketlerde yanıtları karardan önce toplanmış son tur. Daha eski bir beklenti kullanılmaz, çünkü araya giren kararın sürprizini bir sonrakine yazardı.",
        en: "On the [decisions](/kararlar) page, each decision is compared with the latest expectation formed **after the previous decision and before this one**: for the BoE, the curve from the last business day before the decision; for surveys, the latest round whose responses were collected before the decision. Older expectations are not used, because they would carry the surprise of the decision in between into the next one.",
      },
    },
    {
      ul: {
        tr: [
          "Fark = karar − beklenen oran, baz puan olarak. Pozitif fark beklenenden **sıkı** (şahin), negatif fark beklenenden **gevşek** (güvercin) bir karardır.",
          "Fark 10 baz puanın altındaysa karar **beklentiyle uyumlu** sayılır.",
          "10 ile 25 baz puan arası \"beklentiden biraz şahin/güvercin\", 25 baz puan ve üstü **sürpriz** diye gösterilir.",
        ],
        en: [
          "Gap = decision − expected rate, in basis points. A positive gap is a decision **tighter** than expected (hawkish), a negative gap one **looser** than expected (dovish).",
          "A gap below 10 basis points counts as **in line with expectations**.",
          "Between 10 and 25 basis points is shown as \"slightly more hawkish/dovish than expected\", and 25 or more as a **surprise**.",
        ],
      },
    },
    {
      note: {
        tr: "Anket sonuçları toplantıdan sonra yayımlanabildiği için bazı kararların karşılaştırması karar gününde değil, anket yayımlanınca tamamlanır. BoJ ve RBA için yeniden yayımlanabilir bir beklenti kaynağı olmadığından sürpriz hesaplanmaz.",
        en: "Because survey results can be published after the meeting, the comparison for some decisions is completed when the survey comes out rather than on the day. No surprise is calculated for the BoJ and RBA, as there is no expectation source for them that can be republished.",
      },
    },
    {
      p: {
        tr: "Güncel beklentiler [faiz olasılığı](/faiz-olasiligi) sayfasında, kaynakların ayrıntısı [metodoloji](/hakkinda) sayfasında. Bir kararı baştan sona okumak için [faiz kararı nasıl okunur](/rehber/faiz-karari-nasil-okunur) yazısına bakabilirsiniz.",
        en: "Current expectations are on the [rate probabilities](/faiz-olasiligi) page and source details on the [methodology](/hakkinda) page. To read a decision from start to finish, see [how to read a rate decision](/rehber/faiz-karari-nasil-okunur).",
      },
    },
  ],
};
