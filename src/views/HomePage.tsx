import type { Metadata } from "next";
import Link from "next/link";
import { BankCard } from "@/components/BankCard";
import { BankSummaryList } from "@/components/BankSummaryList";
import { BankTag, ScoreBadge } from "@/components/ScoreBadge";
import { EmptyState, Row, Rows, SectionHeader } from "@/components/ui";
import { CALENDAR_BANK_CODES } from "@/lib/banks";
import { getAllMeetings, getUpcomingMeetings } from "@/lib/data/meetings";
import { getCurrentRates } from "@/lib/data/rates";
import { getProbabilitySnapshot } from "@/lib/data/probabilities";
import { getBankScoreSummaries, getSpeeches } from "@/lib/data/speeches";
import { getNews } from "@/lib/data/news";
import { getDecisionViews } from "@/lib/data/decisions";
import { getInflation } from "@/lib/data/inflation";
import { getTcmbFunding } from "@/lib/data/tcmb-funding";
import { realRate } from "@/lib/real-rates";
import { fundingNow } from "@/lib/tcmb-funding";
import { isPendingDecision } from "@/lib/decision-format";
import { getBankExpectations } from "./bank-expectations";
import { DecisionRow } from "./DecisionsPage";
import { WeekAhead } from "./WeekAhead";
import { NewsList } from "@/components/NewsList";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { speechTitle } from "@/lib/speech-i18n";
import { countdownLabel, formatDate, trtDayKey } from "@/lib/time";

export function homeMetadata(lang: Lang): Metadata {
  // Başlık ve açıklama kök düzenden gelir; burada yalnızca dil karşılıkları.
  return { alternates: languageAlternates(lang, "/") };
}

export async function HomePage({ lang }: { lang: Lang }) {
  const t = L(lang);
  const p = (path: string) => localePath(lang, path);
  const now = new Date();

  const [upcoming, rates, scores, probability, recentSpeeches, expectations, allMeetings] = await Promise.all([
    getUpcomingMeetings({ now }),
    getCurrentRates(),
    getBankScoreSummaries(),
    getProbabilitySnapshot(),
    getSpeeches({ scoredOnly: true, limit: 4 }),
    getBankExpectations(lang, now),
    getAllMeetings(),
  ]);
  // Saati geçmiş, sonucu henüz gelmemiş karar sıradakinin önüne geçer: karar
  // anında kart bir sonraki toplantıya atlamasın (isPendingDecision).
  const nextOf = (code: (typeof CALENDAR_BANK_CODES)[number]) =>
    allMeetings.filter((m) => m.bankCode === code && isPendingDecision(m, now)).at(-1) ??
    upcoming.find((m) => m.bankCode === code);
  const [news, decisions, inflation, funding] = await Promise.all([
    getNews({ limit: 4 }),
    getDecisionViews({ now }),
    getInflation(),
    getTcmbFunding(),
  ]);
  const tcmbFunding = funding && fundingNow(funding, trtDayKey(now.toISOString()));
  const realRateOf = (code: (typeof CALENDAR_BANK_CODES)[number]) => {
    const rate = rates.find((r) => r.bankCode === code);
    const infl = inflation.find((i) => i.bankCode === code);
    return rate && infl ? realRate(rate, infl) : undefined;
  };

  return (
    <div className="space-y-10">
      <section>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {t(
            "Merkez bankası faiz kararlarını Türkçe takip et",
            "Follow central bank rate decisions in Turkey time",
          )}
        </h1>
        <p className="prose-width mt-2 text-muted">
          {t(
            "Fed, ECB, TCMB, BoE, BoJ ve RBA toplantı takvimi Türkiye saatiyle; piyasanın fiyatladığı beklentiler ve yetkili konuşmalarının şahin/güvercin skoru tek yerde.",
            "The Fed, ECB, CBRT, BoE, BoJ and RBA meeting calendar in Turkey time, market-implied expectations and a hawk/dove score of policymakers' speeches, in one place.",
          )}
        </p>
        {probability && (
          <p className="mt-2 text-sm text-muted tabular">
            {t(
              `Piyasa verisi ${formatDate(probability.asOf, lang)} kapanışı itibarıyla.`,
              `Market data as of the close of ${formatDate(probability.asOf, lang)}.`,
            )}
          </p>
        )}
      </section>

      <WeekAhead lang={lang} now={now} />

      <section aria-labelledby="bankalar-baslik">
        <h2 id="bankalar-baslik" className="sr-only">
          {t("Bankalara genel bakış", "Bank overview")}
        </h2>
        <BankSummaryList
          now={now}
          lang={lang}
          rows={CALENDAR_BANK_CODES.map((code) => ({
            code,
            next: nextOf(code),
            rate: rates.find((r) => r.bankCode === code),
            real: realRateOf(code),
            chip: expectations[code]?.chip,
            funding: code === "tcmb" ? tcmbFunding : undefined,
          }))}
        />
        <div className="hidden gap-4 sm:grid md:grid-cols-2 lg:grid-cols-3">
          {CALENDAR_BANK_CODES.map((code) => (
            <BankCard
              key={code}
              lang={lang}
              bankCode={code}
              nextMeeting={nextOf(code)}
              currentRate={rates.find((r) => r.bankCode === code)}
              score={scores.find((s) => s.bankCode === code)}
              odds={expectations[code]?.odds}
              oddsTitle={expectations[code]?.oddsTitle}
              oddsNote={expectations[code]?.oddsNote}
              surveyNote={expectations[code]?.surveyNote}
              realRate={realRateOf(code)}
              funding={code === "tcmb" ? tcmbFunding : undefined}
            />
          ))}
        </div>
      </section>

      {decisions.length > 0 && (
        <section>
          <SectionHeader
            title={t("Son kararlar", "Latest decisions")}
            description={t(
              "Karar, karardan önceki beklentiyle karşılaştırıldığında: uyumlu mu, sürpriz mi?",
              "Each decision compared with the expectation before it: in line or a surprise?",
            )}
            action={{ href: p("/kararlar"), label: t("Tüm kararlar", "All decisions") }}
          />
          <Rows>
            {decisions.slice(0, 5).map((v) => (
              <DecisionRow key={v.meeting.id} view={v} lang={lang} />
            ))}
          </Rows>
        </section>
      )}

      {news.length > 0 && (
        <section>
          <SectionHeader
            title={t("Son haberler", "Latest news")}
            action={{ href: p("/haberler"), label: t("Tüm haberler", "All news") }}
          />
          <NewsList items={news} lang={lang} />
        </section>
      )}

      <section>
        <SectionHeader
          title={t("Yaklaşan toplantılar", "Upcoming meetings")}
          action={{ href: p("/takvim"), label: t("Tüm takvim", "Full calendar") }}
        />
        {upcoming.length === 0 ? (
          <EmptyState>{t("Takvim verisi henüz yüklenmedi.", "Calendar data has not been loaded yet.")}</EmptyState>
        ) : (
          <Rows>
            {upcoming.slice(0, 6).map((m) => (
              <Row key={m.id}>
                {/* Sabit genişlik: etiket boyları farklı (TCMB/Fed), tarihler alt alta hizalansın. */}
                <span className="w-16 shrink-0">
                  <BankTag code={m.bankCode} lang={lang} />
                </span>
                <span className="tabular flex-1">{formatDate(m.meetingAt, lang)}</span>
                <span className="text-sm text-muted">{countdownLabel(m.meetingAt, now, lang)}</span>
              </Row>
            ))}
          </Rows>
        )}
      </section>

      {recentSpeeches.length > 0 && (
        <section>
          <SectionHeader
            title={t("Son skorlanan konuşmalar", "Latest scored speeches")}
            action={{ href: p("/konusmalar"), label: t("Konuşma arşivi", "Speech archive") }}
          />
          <Rows>
            {recentSpeeches.map((s) => (
              <Row key={s.id}>
                <BankTag code={s.bankCode} lang={lang} />
                {/* Asgari genişlik: dar ekranda puan rozeti başlığı sıkıştırmak yerine alt satıra iner. */}
                <Link href={p(`/konusma/${s.id}`)} className="min-w-56 flex-1 hover:text-accent">
                  {s.speakerName} — {speechTitle(s, lang)}
                </Link>
                <ScoreBadge score={s.hawkDoveScore} hasPolicySignal={s.hasPolicySignal} lang={lang} />
              </Row>
            ))}
          </Rows>
        </section>
      )}
    </div>
  );
}
