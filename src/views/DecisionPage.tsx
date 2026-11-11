import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { JsonLd } from "@/components/JsonLd";
import { BankTag } from "@/components/ScoreBadge";
import { surpriseText } from "@/components/SurpriseBadge";
import { BANKS, bankFullName, bankName } from "@/lib/banks";
import { breadcrumbLd, eventLd, homeCrumb } from "@/lib/json-ld";
import { getDecisionView, getUpcomingDecision } from "@/lib/data/decisions";
import { UpcomingDecisionPage, upcomingDecisionMetadata } from "./UpcomingDecisionPage";
import { decisionParts, decisionSentence, decisionPath, formatExpectedRate } from "@/lib/decision-format";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { formatDate, formatTimeTrt, formatWeekday, trtDayKey } from "@/lib/time";
import { getTcmbFunding } from "@/lib/data/tcmb-funding";
import { divergencePeriods, DIVERGENCE_PP, periodsBetween, valueAt } from "@/lib/tcmb-funding";
import { DecisionCard } from "./decision/DecisionCard";
import { ExpectationCard } from "./decision/ExpectationCard";
import { StatementSection } from "./decision/StatementSection";
import { MinutesSection } from "./decision/MinutesSection";

export async function decisionMetadata(lang: Lang, id: string): Promise<Metadata> {
  const view = await getDecisionView(id);
  if (!view) return upcomingDecisionMetadata(lang, id);
  const t = L(lang);
  const m = view.meeting;
  const name = bankName(BANKS[m.bankCode], lang);
  const e = view.expectation;
  return {
    title: t(`${name} faiz kararı, ${formatDate(m.meetingAt, lang)}`, `${name} rate decision, ${formatDate(m.meetingAt, lang)}`),
    description: [
      `${decisionSentence(m, lang)}.`,
      e &&
        t(
          `Karardan önceki beklenti ${formatExpectedRate(m.bankCode, e.point.rate, lang)}: ${surpriseText(e.surprise.label, lang)}.`,
          `Expectation before the decision ${formatExpectedRate(m.bankCode, e.point.rate, lang)}: ${surpriseText(e.surprise.label, lang)}.`,
        ),
      view.statement?.summary && (lang === "en" ? view.statement.summary.headlineEn : view.statement.summary.headlineTr),
    ]
      .filter(Boolean)
      .join(" "),
    alternates: languageAlternates(lang, `/karar/${m.id}`),
  };
}

export async function DecisionPage({ lang, id }: { lang: Lang; id: string }) {
  const view = await getDecisionView(id);
  if (!view) {
    // Sonucu gelmemiş karar: aynı adreste yaklaşan karar sayfası.
    const upcoming = await getUpcomingDecision(id);
    if (!upcoming) notFound();
    return <UpcomingDecisionPage lang={lang} upcoming={upcoming} />;
  }
  const t = L(lang);
  const p = (path: string) => localePath(lang, path);
  const now = new Date();
  const m = view.meeting;
  const bank = BANKS[m.bankCode];
  const name = bankName(bank, lang);
  const parts = decisionParts(m, lang);
  // TCMB: önceki karardan bu karara kadar fiilî fonlama politika faizinden ayrıştıysa.
  const funding = m.bankCode === "tcmb" ? await getTcmbFunding() : undefined;
  const day = trtDayKey(m.meetingAt);
  const fundingPeriods = funding
    ? periodsBetween(
        divergencePeriods(funding, trtDayKey(now.toISOString())),
        view.previous && trtDayKey(view.previous.meetingAt),
        day,
      )
    : [];
  const aofmOnDay = funding && valueAt(funding.aofm, day);
  const fundingNote =
    fundingPeriods.length > 0
      ? {
          periods: fundingPeriods,
          // Karar günü AOFM o günün fonlamasını eski oranla gösterir: önceki oranla kıyaslanır.
          onDay:
            aofmOnDay !== undefined && m.previousRate !== undefined && Math.abs(aofmOnDay - m.previousRate) >= DIVERGENCE_PP
              ? aofmOnDay
              : undefined,
        }
      : undefined;

  const title = t(`${name} faiz kararı, ${formatDate(m.meetingAt, lang)}`, `${name} rate decision, ${formatDate(m.meetingAt, lang)}`);

  return (
    <article className="space-y-8">
      <JsonLd
        data={[
          breadcrumbLd(lang, [homeCrumb(lang), { name: t("Kararlar", "Decisions"), path: "/kararlar" }, { name: title, path: `/karar/${m.id}` }]),
          eventLd({
            lang,
            id: m.id,
            name: title,
            // Sonuç gelince etkinlik silinmez; açıklama kararı söyler.
            description: `${decisionSentence(m, lang)}.`,
            at: m.meetingAt,
            timeTbd: m.timeTbd,
            organizer: { name: bankFullName(bank, "en"), url: bank.websiteUrl },
          }),
        ]}
      />
      <header>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <BankTag code={m.bankCode} lang={lang} />
          <span className="tabular">
            {formatWeekday(m.meetingAt, lang)} ·{" "}
            {m.timeTbd ? t("saat açıklanmadı", "time not announced") : `${formatTimeTrt(m.meetingAt)} TRT`}
          </span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {t(`${name} faiz kararı`, `${name} rate decision`)}
          <span className="text-base font-normal text-muted"> · {formatDate(m.meetingAt, lang)}</span>
        </h1>
        <p className="mt-1 text-lg">
          {parts.lead} <span className="whitespace-nowrap tabular">{parts.rate}</span>.
        </p>
      </header>

      <DecisionCard view={view} lang={lang} funding={fundingNote} />
      <ExpectationCard view={view} lang={lang} />
      <StatementSection view={view} lang={lang} />
      <MinutesSection view={view} lang={lang} />

      <nav aria-label={t("Bu bankanın diğer kararları", "Other decisions by this bank")} className="flex flex-wrap justify-between gap-3 text-sm">
        {view.previous && decisionPath(view.previous, now) ? (
          <Link href={p(`/karar/${view.previous.id}`)} className="inline-flex min-h-9 items-center text-accent hover:underline">
            ← {t("Önceki karar", "Previous decision")} ({formatDate(view.previous.meetingAt, lang)})
          </Link>
        ) : (
          <span />
        )}
        {view.next && decisionPath(view.next, now) && (
          <Link href={p(`/karar/${view.next.id}`)} className="inline-flex min-h-9 items-center text-accent hover:underline">
            {t("Sonraki karar", "Next decision")} ({formatDate(view.next.meetingAt, lang)}) →
          </Link>
        )}
      </nav>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href={p("/kararlar")} className="inline-flex min-h-9 items-center text-accent hover:underline">
          {t("← Tüm kararlar", "← All decisions")}
        </Link>
        <Link href={p(`/banka/${m.bankCode}`)} className="inline-flex min-h-9 items-center text-accent hover:underline">
          {t(`${name} sayfası`, `${name} page`)}
        </Link>
      </div>
    </article>
  );
}

