import type { Metadata } from "next";
import { getMeetingsFetchedAt } from "@/lib/data/meetings";
import { L, languageAlternates, type Lang } from "@/lib/i18n";
import { formatDate, formatTimeTrt } from "@/lib/time";

export function aboutMetadata(lang: Lang): Metadata {
  const t = L(lang);
  return {
    title: t("Metodoloji ve kaynaklar", "Methodology and sources"),
    description: t(
      "Faiz Radar'ın veri kaynakları, hesaplama yöntemi ve güncelleme sıklığı.",
      "Faiz Radar's data sources, methods and update frequency.",
    ),
    alternates: languageAlternates(lang, "/hakkinda"),
  };
}

interface Source {
  name: string;
  url: string;
  note: string;
}

const SOURCES: Record<Lang, Source[]> = {
  tr: [
    {
      name: "Federal Reserve — FOMC takvimi",
      url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
      note: "Toplantı tarihleri. Karar, toplantının ikinci günü 14:00 New York saatinde açıklanır.",
    },
    {
      name: "ECB — Governing Council takvimi",
      url: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html",
      note: "Para politikası toplantısının ikinci günü, 14:15 Frankfurt saatinde karar; 14:45'te basın toplantısı.",
    },
    {
      name: "Bank of England — MPC takvimi ve oylama geçmişi",
      url: "https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates",
      note: "Bank Rate kararı duyuru günü 12:00 Londra saatinde; geçmiş karar oranları MPC oylama geçmişi dosyasından.",
    },
    {
      name: "Bank of Japan — MPM takvimi ve karar metinleri",
      url: "https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm",
      note: "Karar toplantının son günü, toplantı biter bitmez açıklanır; saat önceden duyurulmadığı için gün olarak gösterilir. Politika faizi, her kararın metnindeki hedef cümlesinden okunur.",
    },
    {
      name: "Reserve Bank of Australia — kurul takvimi ve F1 tablosu",
      url: "https://www.rba.gov.au/schedules-events/board-meeting-schedules.html",
      note: "Karar toplantının ikinci günü 14:30 Sidney saatinde açıklanır; nakit faiz hedefinin geçmişi RBA F1 istatistik tablosundan.",
    },
    {
      name: "Atlanta Fed — Market Probability Tracker",
      url: "https://www.atlantafed.org/research-and-data/data/market-probability-tracker",
      note: "Faiz olasılıkları. CME 3 aylık SOFR opsiyon fiyatlarından türetilen dağılımlar; toplantı bazlı değil, üçer aylık ortalama faiz üzerinedir.",
    },
    {
      name: "FRED (St. Louis Fed)",
      url: "https://fred.stlouisfed.org/",
      note: "Fed hedef aralığının geçmişi (DFEDTARU / DFEDTARL) — geçmiş toplantıların karar oranlarını doldurmak için.",
    },
    {
      name: "BIS — Central Bankers' Speeches",
      url: "https://www.bis.org/cbspeeches/index.htm",
      note: "Konuşma metinleri. Besleme yalnızca son 25 konuşmayı verir ve sayfalama kabul etmez; arşiv günlük çalışan işle zaman içinde birikir. Tam metin yalnızca yayımcısının şartları izin veriyorsa (Fed Board, ECB, BoJ, RBA) lisans notuyla gösterilir; Bank of England ve bölgesel/ulusal bankaların konuşmalarında kaynağa bağlantı verilir.",
    },
    {
      name: "ECB Data Portal (SDMX)",
      url: "https://data.ecb.europa.eu/",
      note: "Mevduat kolaylığı faizi — ECB'nin güncel politika faizi ve geçmiş karar oranları.",
    },
    {
      name: "TCMB EVDS",
      url: "https://evds3.tcmb.gov.tr/",
      note: "Bir hafta vadeli repo (politika) faizi, TP.PY.P02.1H — TCMB'nin güncel faizi ve geçmiş PPK karar oranları.",
    },
    {
      name: "TCMB — Duyuru takvimi",
      url: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Takvim",
      note: "PPK toplantı kararı, toplantı günü 14:00 Türkiye saatinde açıklanır.",
    },
  ],
  en: [
    {
      name: "Federal Reserve — FOMC calendar",
      url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
      note: "Meeting dates. The decision is announced on the second day of the meeting at 14:00 New York time.",
    },
    {
      name: "ECB — Governing Council calendar",
      url: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html",
      note: "Decision on the second day of the monetary policy meeting at 14:15 Frankfurt time; press conference at 14:45.",
    },
    {
      name: "Bank of England — MPC dates and voting history",
      url: "https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates",
      note: "The Bank Rate decision is announced at 12:00 London time on announcement day; past decision rates come from the MPC voting history file.",
    },
    {
      name: "Bank of Japan — MPM schedule and policy statements",
      url: "https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm",
      note: "The decision is announced on the last day of the meeting as soon as it ends; because the time is not announced in advance, it is shown as a day. The policy rate is read from the target sentence in each statement.",
    },
    {
      name: "Reserve Bank of Australia — board schedule and table F1",
      url: "https://www.rba.gov.au/schedules-events/board-meeting-schedules.html",
      note: "The decision is announced on the second day of the meeting at 14:30 Sydney time; the cash rate target history comes from RBA statistical table F1.",
    },
    {
      name: "Atlanta Fed — Market Probability Tracker",
      url: "https://www.atlantafed.org/research-and-data/data/market-probability-tracker",
      note: "Rate probabilities. Distributions derived from CME three-month SOFR option prices; they refer to three-month average rates, not to individual meetings.",
    },
    {
      name: "FRED (St. Louis Fed)",
      url: "https://fred.stlouisfed.org/",
      note: "History of the Fed's target range (DFEDTARU / DFEDTARL) — used to fill in decision rates for past meetings.",
    },
    {
      name: "BIS — Central Bankers' Speeches",
      url: "https://www.bis.org/cbspeeches/index.htm",
      note: "Speech texts. The feed only returns the latest 25 speeches and does not support paging; the archive builds up over time through the daily job. The full text is shown with a licence notice only where the publisher's terms allow it (Fed Board, ECB, BoJ, RBA); for the Bank of England and regional/national banks we link to the source.",
    },
    {
      name: "ECB Data Portal (SDMX)",
      url: "https://data.ecb.europa.eu/",
      note: "Deposit facility rate — the ECB's current policy rate and past decision rates.",
    },
    {
      name: "CBRT EVDS",
      url: "https://evds3.tcmb.gov.tr/",
      note: "One-week repo (policy) rate, TP.PY.P02.1H — the CBRT's current rate and past MPC decision rates.",
    },
    {
      name: "CBRT — Announcement calendar",
      url: "https://www.tcmb.gov.tr/wps/wcm/connect/TR/TCMB+TR/Main+Menu/Duyurular/Takvim",
      note: "The MPC decision is announced on the meeting day at 14:00 Turkey time.",
    },
  ],
};

export async function AboutPage({ lang }: { lang: Lang }) {
  const t = L(lang);
  const fetchedAt = await getMeetingsFetchedAt();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {t("Metodoloji ve kaynaklar", "Methodology and sources")}
        </h1>
        <p className="mt-2 max-w-2xl text-muted">
          {t(
            "Hangi veriyi nereden aldığımızı ve nasıl işlediğimizi açıkça yazıyoruz. Şeffaflık, bu tür bir ürünün en önemli parçasıdır.",
            "We state openly which data we take from where and how we process it. Transparency is the most important part of a product like this.",
          )}
        </p>
      </header>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("Şu anda kullanılan kaynaklar", "Sources currently in use")}</h2>
        <ul className="space-y-3">
          {SOURCES[lang].map((s) => (
            <li key={s.url} className="card p-4">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-medium text-accent hover:underline"
              >
                {s.name}
              </a>
              <p className="prose-width mt-1 text-sm text-muted">{s.note}</p>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("Saat dilimi", "Time zone")}</h2>
        <p className="prose-width text-muted">
          {t(
            "Toplantı anları kaynağın yerel saatinden okunur ve UTC olarak saklanır; sitede Türkiye saatine (TRT, UTC+3) çevrilerek gösterilir. Yaz saati uygulaması olan ülkelerde (ABD, Euro Bölgesi, Birleşik Krallık) TRT karşılığı yıl içinde bir saat kayabilir — bu yüzden sabit fark varsaymıyor, her toplantıyı ayrı ayrı çeviriyoruz.",
            "Meeting times are read in the source's local time and stored in UTC; the site shows them converted to Turkey time (TRT, UTC+3). In places with daylight saving time (the US, the euro area, the UK) the TRT equivalent can shift by an hour during the year — so we do not assume a fixed offset but convert each meeting individually.",
          )}
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("Güncelleme sıklığı", "Update frequency")}</h2>
        <p className="prose-width text-muted">
          {t(
            "Takvim verisi zamanlanmış bir işle günde bir kez resmî sayfalardan yeniden çekilir. Sayfalar en fazla bir saatlik önbellekle sunulur.",
            "Calendar data is re-fetched from the official pages once a day by a scheduled job. Pages are served with a cache of at most one hour.",
          )}
        </p>
        {fetchedAt && (
          <p className="mt-2 text-sm text-muted tabular">
            {t("Verinin son değiştiği zaman", "Data last changed")}: {formatDate(fetchedAt, lang)},{" "}
            {formatTimeTrt(fetchedAt)} TRT
          </p>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("Faiz olasılığı hesabı", "How rate probabilities are computed")}</h2>
        <div className="prose-width space-y-3 text-muted">
          {lang === "en" ? (
            <>
              <p>
                We do not compute the probabilities ourselves. The reason: market-based
                probabilities require Fed funds or SOFR futures/options prices; these are licensed
                CME data, and CME&apos;s terms of use prohibit automated scraping of its pages.
                Writing our own calculation engine would not remove this constraint — the input
                data itself is licensed.
              </p>
              <p>
                So we show the Market Probability Tracker distributions that the Atlanta Fed
                publishes publicly, as they are, and state the source clearly. This data may be used
                for personal and educational purposes only, and the site is positioned
                accordingly.
              </p>
              <p>
                An important distinction: these distributions do not belong to a single FOMC meeting
                but to the <em>average</em> overnight rate over three-month periods. They cannot be
                compared directly with CME FedWatch-style &quot;probability of a 25 basis point cut
                at the meeting&quot; figures.
              </p>
            </>
          ) : (
            <>
              <p>
                Olasılıkları kendimiz hesaplamıyoruz. Bunun nedeni şudur: piyasa bazlı olasılık
                için Fed Funds ya da SOFR vadeli işlem/opsiyon fiyatları gerekir; bu fiyatlar
                CME&apos;nin lisanslı verisidir ve CME kendi sayfalarından otomatik veri
                çekilmesini kullanım şartlarıyla yasaklamıştır. Kendi hesaplama motorumuzu yazmak
                bu kısıtı ortadan kaldırmaz — girdi verisinin kendisi lisanslıdır.
              </p>
              <p>
                Bu yüzden Atlanta Fed&apos;in kamuya açık olarak yayımladığı Market Probability
                Tracker dağılımlarını olduğu gibi gösteriyor ve kaynağını açıkça belirtiyoruz. Bu
                veri yalnızca kişisel ve eğitim amaçlı kullanıma izinlidir; sitenin
                konumlandırması da buna göredir.
              </p>
              <p>
                Önemli bir ayrım: bu dağılımlar tek bir FOMC toplantısına ait değil, üçer aylık
                dönemlerde <em>ortalama</em> gecelik faize ilişkindir. CME FedWatch tarzı
                &quot;toplantıda 25 baz puan indirim ihtimali&quot; rakamlarıyla doğrudan
                karşılaştırılamaz.
              </p>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("Şahin/güvercin skorlaması", "Hawk/dove scoring")}</h2>
        <div className="prose-width space-y-3 text-muted">
          {lang === "en" ? (
            <>
              <p>
                Speeches are summarised and scored on a scale from -10 (very dovish) to +10 (very
                hawkish) by a language model (Claude). The score measures the speech&apos;s
                monetary policy stance; speeches on financial stability or supervision score 0 if
                they carry no signal.
              </p>
              <p>
                Three safeguards address the consistency risk: every speech is read with the same
                fixed prompt template, the output is constrained by a schema (the score is always a
                number within range) and every step of the scale is defined explicitly in the
                prompt. Each record stores which model and which prompt version produced it — if
                the prompt changes, old and new scores can be told apart.
              </p>
              <p>
                A score of zero can mean two different things: a balanced stance, or a speech that
                carries no monetary policy signal at all. We separate them — speeches on regulation
                and supervision are marked &quot;no signal&quot; and are left out of bank averages,
                which they would otherwise pull artificially towards zero.
              </p>
              <p>
                Summaries and scores are generated automatically; they have a margin of error and
                are no substitute for the original text. Each speech page links to the source.
                BIS publishes only the introductory section of some speeches as HTML; these entries
                are clearly marked.
              </p>
              <p>
                <strong className="text-foreground">Scoring is automated with a language model.</strong>{" "}
                Speech texts are collected every day; the summary and score are produced in the
                same daily job by Claude, with a fixed prompt and scale. The summary is written in
                Turkish and English at the same time. Because the number of speeches scored per run
                is limited, new entries may briefly remain unscored; the size of this gap is shown
                openly on the speech archive and score pages.
              </p>
            </>
          ) : (
            <>
              <p>
                Konuşmalar bir dil modeliyle (Claude) özetlenir ve -10 (çok güvercin) ile +10 (çok
                şahin) arasında puanlanır. Skor, konuşmanın para politikası duruşunu ölçer;
                finansal istikrar veya denetim konulu konuşmalar sinyal taşımıyorsa 0 puan alır.
              </p>
              <p>
                Plandaki tutarlılık riskine karşı üç önlem alınmıştır: her konuşma aynı sabit
                prompt şablonuyla okunur, çıktı şema ile kısıtlanır (puan her zaman aralık içinde
                bir sayıdır) ve ölçeğin her basamağı prompt içinde açıkça tanımlanır. Her kaydın
                yanında hangi model ve hangi prompt sürümüyle üretildiği saklanır — prompt
                değişirse eski ve yeni skorlar ayırt edilebilir.
              </p>
              <p>
                Sıfır puan iki farklı şey olabilir: dengeli bir duruş, ya da hiç para politikası
                sinyali taşımayan bir konuşma. Bunları ayırıyoruz — düzenleme ve denetim
                konuşmaları &quot;sinyalsiz&quot; işaretlenir ve banka ortalamalarına katılmaz,
                aksi hâlde ortalamayı yapay olarak sıfıra çekerlerdi.
              </p>
              <p>
                Özet ve skor otomatik üretilir; hata payı vardır ve orijinal metnin yerini tutmaz.
                Her konuşma sayfasında kaynak metne bağlantı verilir. BIS bazı konuşmaların
                yalnızca giriş bölümünü HTML olarak yayımlar; bu kayıtlar arayüzde açıkça
                işaretlenir.
              </p>
              <p>
                <strong className="text-foreground">Skorlama bir dil modeliyle otomatik yapılır.</strong>{" "}
                Konuşma metinleri her gün toplanır; özet ve skor aynı günlük işte, sabit bir
                prompt ve ölçekle Claude tarafından üretilir. Özet Türkçe ve İngilizce olarak
                birlikte yazılır. İş başına skorlanan konuşma sayısı sınırlı olduğundan yeni
                kayıtlar kısa süre skorsuz kalabilir; bu boşluğun büyüklüğü konuşma arşivi ve skor
                sayfalarında açıkça gösterilir.
              </p>
            </>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("Sorumluluk reddi", "Disclaimer")}</h2>
        <p className="prose-width text-muted">
          {t(
            "Bu site kişisel kullanım ve eğitim amaçlıdır. Buradaki bilgiler yatırım tavsiyesi değildir. Veriler resmî kaynaklardan otomatik derlenir; hata veya gecikme olabilir. Karar vermeden önce merkez bankalarının kendi duyurularını esas alın.",
            "This site is for personal and educational use. The information here is not investment advice. Data is compiled automatically from official sources and may contain errors or delays. Rely on the central banks' own announcements before making any decision.",
          )}
        </p>
      </section>
    </div>
  );
}
