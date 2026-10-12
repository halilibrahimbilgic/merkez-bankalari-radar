import type { Metadata } from "next";
import Link from "next/link";
import { BankCard } from "@/components/BankCard";
import { BankTag, ScoreBadge } from "@/components/ScoreBadge";
import { EmptyState, Row, Rows, SectionHeader } from "@/components/ui";
import type { OddsRow } from "@/components/RateOdds";
import { CALENDAR_BANK_CODES } from "@/lib/banks";
import { getUpcomingMeetings } from "@/lib/data/meetings";
import { getCurrentRates } from "@/lib/data/rates";
import { getProbabilitySnapshot } from "@/lib/data/probabilities";
import { getBankScoreSummaries, getSpeeches } from "@/lib/data/speeches";
import { getExpectations } from "@/lib/data/expectations";
import { moveOdds } from "@/lib/implied-path";
import { fmtPercent, L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { speechTitle } from "@/lib/speech-i18n";
import { countdownLabel, formatDate } from "@/lib/time";

export function homeMetadata(lang: Lang): Metadata {
  // Başlık ve açıklama kök düzenden gelir; burada yalnızca dil karşılıkları.
  return { alternates: languageAlternates(lang, "/") };
}

export async function HomePage({ lang }: { lang: Lang }) {
  const t = L(lang);
  const p = (path: string) => localePath(lang, path);
  const now = new Date();

  const [upcoming, rates, scores, probability, recentSpeeches, expectations] = await Promise.all([
    getUpcomingMeetings({ now }),
    getCurrentRates(),
    getBankScoreSummaries(),
    getProbabilitySnapshot(),
    getSpeeches({ scoredOnly: true, limit: 4 }),
    getExpectations(),
  ]);

  // BoE: OIS eğrisinden sıradaki MPC için fiyatlanan 25 bp adım ihtimali.
  const boeNext = expectations.boe?.meetings.find((m) => new Date(m.meetingAt) > now);
  const boeMove = boeNext && moveOdds(boeNext.changeBp);
  const boeOdds: OddsRow[] | undefined = boeMove && [
    { direction: "up", label: t("Artırım", "Hike"), pct: boeMove.direction === "hike" ? boeMove.pct : 0 },
    { direction: "flat", label: t("Sabit", "Hold"), pct: boeMove.direction === "hold" ? 100 : 100 - boeMove.pct },
    { direction: "down", label: t("İndirim", "Cut"), pct: boeMove.direction === "cut" ? boeMove.pct : 0 },
  ];

  // TCMB: anketin henüz gerçekleşmemiş ilk toplantısı.
  const tcmbNext = expectations.tcmb?.meetings.find((m) => new Date(m.meetingAt) > now);
  const tcmbNote =
    tcmbNext &&
    t(
      `${formatDate(tcmbNext.meetingAt, lang)} PPK için ${fmtPercent(tcmbNext.expectedRate, lang)}` +
        (expectations.tcmb?.yearEnd !== undefined
          ? `, yıl sonu için ${fmtPercent(expectations.tcmb.yearEnd, lang)}`
          : ""),
      `${fmtPercent(tcmbNext.expectedRate, lang)} for the ${formatDate(tcmbNext.meetingAt, lang)} meeting` +
        (expectations.tcmb?.yearEnd !== undefined
          ? `, ${fmtPercent(expectations.tcmb.yearEnd, lang)} by year-end`
          : ""),
    );

  // Fed olasılıkları yalnızca Fed kartında gösterilir — kaynağımız
  // Fed Funds/SOFR üzerinedir, diğer bankalar için karşılığı yok.
  const window = probability?.windows[0];
  const fedOdds: OddsRow[] | undefined =
    window && window.probHikePct !== undefined && window.probCutPct !== undefined
      ? [
          { direction: "up", label: t("Aralığın üzeri", "Above range"), pct: window.probHikePct },
          {
            direction: "flat",
            label: t("Aralık içinde", "Within range"),
            pct: Math.max(0, 100 - window.probHikePct - window.probCutPct),
          },
          { direction: "down", label: t("Aralığın altı", "Below range"), pct: window.probCutPct },
        ]
      : undefined;

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

      <section aria-labelledby="bankalar-baslik">
        <h2 id="bankalar-baslik" className="sr-only">
          {t("Bankalara genel bakış", "Bank overview")}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {CALENDAR_BANK_CODES.map((code) => (
            <BankCard
              key={code}
              lang={lang}
              bankCode={code}
              nextMeeting={upcoming.find((m) => m.bankCode === code)}
              currentRate={rates.find((r) => r.bankCode === code)}
              score={scores.find((s) => s.bankCode === code)}
              odds={code === "fed" ? fedOdds : code === "boe" ? boeOdds : undefined}
              oddsTitle={
                code === "boe" && boeNext
                  ? t(
                      `Piyasa fiyatlaması · ${formatDate(boeNext.meetingAt, lang)} MPC`,
                      `Market pricing · ${formatDate(boeNext.meetingAt, lang)} MPC`,
                    )
                  : undefined
              }
              oddsNote={
                code === "fed" && window
                  ? t(
                      `${formatDate(window.startDate, lang)} itibarıyla başlayan üç aylık dönem için ortalama faiz`,
                      `Average rate over the three-month period starting ${formatDate(window.startDate, lang)}`,
                    )
                  : code === "boe" && boeOdds
                    ? t("OIS eğrisinden yaklaşık, 25 bp adım varsayımıyla", "Approximate, from the OIS curve, assuming 25 bp steps")
                    : undefined
              }
              surveyNote={code === "tcmb" ? tcmbNote : undefined}
            />
          ))}
        </div>
      </section>

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
                <BankTag code={m.bankCode} lang={lang} />
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
                <Link href={p(`/konusma/${s.id}`)} className="flex-1 hover:text-accent">
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
