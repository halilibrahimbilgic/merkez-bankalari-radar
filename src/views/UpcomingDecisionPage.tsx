import type { Metadata } from "next";
import Link from "next/link";
import { AddToCalendar } from "@/components/AddToCalendar";
import { ExpectationDetails } from "@/components/BankCard";
import { JsonLd } from "@/components/JsonLd";
import { Countdown } from "@/components/Countdown";
import { BankTag, formatScore, scoreLabel, scoreToneClass } from "@/components/ScoreBadge";
import { Card, Stat } from "@/components/ui";
import { BANKS, bankFullName, bankName, bankRateName, bankWithCountryTr } from "@/lib/banks";
import { getUpcomingDecision, type UpcomingDecision } from "@/lib/data/decisions";
import { getExpectations } from "@/lib/data/expectations";
import { formatCurrentRate, getCurrentRate } from "@/lib/data/rates";
import { decisionSentence, isPendingDecision, pendingNote } from "@/lib/decision-format";
import { L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { countdownLabel, formatDate, formatTimeTrt, formatWeekday, monthLabel } from "@/lib/time";
import { breadcrumbLd, eventLd, homeCrumb } from "@/lib/json-ld";
import { getBankExpectations } from "./bank-expectations";
import { expectationText } from "./WeekAhead";

/**
 * Yaklaşan karar sayfası (/karar/<id>, sonuç gelmeden): "TCMB aralık faiz
 * kararı ne zaman, ne bekleniyor?" sorusunun cevabı. Haber siteleri her
 * toplantı için ayrı haber yazıyor ve ay adıyla yapılan aramalarda üstte;
 * bizde bu sorgunun tek karşılığı genel banka sayfasıydı. Karar açıklanınca
 * aynı adres sonuç sayfasına döner (DecisionPage), dizindeki yeri korunur.
 */

const dayMonth = {
  tr: new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long" }),
  en: new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", day: "numeric", month: "long" }),
};

export async function upcomingDecisionMetadata(lang: Lang, id: string): Promise<Metadata> {
  const now = new Date();
  const u = await getUpcomingDecision(id, now);
  if (!u) return {};
  const t = L(lang);
  const m = u.meeting;
  const bank = BANKS[m.bankCode];
  const name = bankName(bank, lang);
  const month = monthLabel(m.meetingAt, lang);
  const day = dayMonth[lang].format(new Date(m.meetingAt));
  const time = m.timeTbd ? undefined : formatTimeTrt(m.meetingAt);
  const rate = await getCurrentRate(m.bankCode);
  const expectation = await expectationSentence(u, lang, now);

  return {
    title: t(
      `${bankWithCountryTr(m.bankCode)} ${month} faiz kararı ne zaman? ${day}${time ? `, ${time}` : ""}`,
      `${name} ${month} rate decision: ${day}${time ? `, ${time} Turkey time` : ""}`,
    ),
    description: [
      t(
        `${bankFullName(bank, lang)} (${name}) ${month} toplantısı: karar ${formatDate(m.meetingAt, lang)} ${formatWeekday(m.meetingAt, lang)}${time ? `, Türkiye saatiyle ${time}` : "; açıklama saati önceden duyurulmuyor"}.`,
        `${bankFullName(bank, lang)} ${month} meeting: decision on ${formatWeekday(m.meetingAt, lang)} ${formatDate(m.meetingAt, lang)}${time ? `, ${time} Turkey time` : "; the announcement time is not published in advance"}.`,
      ),
      rate && t(`Güncel faiz ${formatCurrentRate(rate, lang)}.`, `Current rate ${formatCurrentRate(rate, lang)}.`),
      expectation,
      u.previous &&
        t(
          `Önceki karar (${formatDate(u.previous.meeting.meetingAt, lang)}): ${decisionSentence(u.previous.meeting, lang)}.`,
          `Previous decision (${formatDate(u.previous.meeting.meetingAt, lang)}): ${decisionSentence(u.previous.meeting, lang)}.`,
        ),
    ]
      .filter(Boolean)
      .join(" "),
    alternates: languageAlternates(lang, `/karar/${m.id}`),
  };
}

/** Toplantıya ait beklenti tek cümlede (BoE, ECB, TCMB); yoksa undefined. */
async function expectationSentence(u: UpcomingDecision, lang: Lang, now: Date): Promise<string | undefined> {
  if (isPendingDecision(u.meeting, now)) return undefined;
  const [expectations, rate] = await Promise.all([getExpectations(), getCurrentRate(u.meeting.bankCode)]);
  return expectationText(u.meeting, expectations, rate?.rate, lang);
}

export async function UpcomingDecisionPage({ lang, upcoming }: { lang: Lang; upcoming: UpcomingDecision }) {
  const t = L(lang);
  const p = (path: string) => localePath(lang, path);
  const now = new Date();
  const m = upcoming.meeting;
  const bank = BANKS[m.bankCode];
  const name = bankName(bank, lang);
  const pending = isPendingDecision(m, now);
  const rate = await getCurrentRate(m.bankCode);
  const time = m.timeTbd ? undefined : formatTimeTrt(m.meetingAt);
  // Sıradaki toplantıda banka sayfasıyla aynı ayrıntılı beklenti; daha
  // uzaktakinde (ikinci toplantı) yalnızca toplantı bazlı cümle.
  const detailed = upcoming.isNext && !pending ? (await getBankExpectations(lang, now))[m.bankCode] : undefined;
  const sentence = detailed ? undefined : await expectationSentence(upcoming, lang, now);
  const prev = upcoming.previous;
  const summary = prev?.statement?.summary;
  const title = t(
    `${name} ${monthLabel(m.meetingAt, lang)} faiz kararı`,
    `${name} ${monthLabel(m.meetingAt, lang)} rate decision`,
  );

  return (
    <article className="space-y-8">
      <JsonLd
        data={[
          breadcrumbLd(lang, [homeCrumb(lang), { name: t("Kararlar", "Decisions"), path: "/kararlar" }, { name: title, path: `/karar/${m.id}` }]),
          eventLd({
            lang,
            id: m.id,
            name: title,
            description: t(
              `${bankFullName(bank, lang)} (${name}) faiz kararı: ${formatDate(m.meetingAt, lang)}${time ? `, Türkiye saatiyle ${time}` : ""}.`,
              `${bankFullName(bank, lang)} rate decision: ${formatDate(m.meetingAt, lang)}${time ? `, ${time} Turkey time` : ""}.`,
            ),
            at: m.meetingAt,
            timeTbd: m.timeTbd,
            organizer: { name: bankFullName(bank, "en"), url: bank.websiteUrl },
          }),
        ]}
      />
      <header>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
          <BankTag code={m.bankCode} lang={lang} />
          <span>{t("Yaklaşan karar", "Upcoming decision")}</span>
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-lg">
          {pending
            ? pendingNote(m, lang)
            : time
              ? t(
                  // Sayıya ek getirilmez (decision-format.ts): "14:00'te" yerine ayrı cümle.
                  `Karar ${formatDate(m.meetingAt, lang)} ${formatWeekday(m.meetingAt, lang)} açıklanacak, saat ${time} (Türkiye saati).`,
                  `The decision will be announced on ${formatWeekday(m.meetingAt, lang)} ${formatDate(m.meetingAt, lang)} at ${time} Turkey time.`,
                )
              : t(
                  `Karar ${formatDate(m.meetingAt, lang)} ${formatWeekday(m.meetingAt, lang)} açıklanacak; saat önceden duyurulmuyor.`,
                  `The decision will be announced on ${formatWeekday(m.meetingAt, lang)} ${formatDate(m.meetingAt, lang)}; the time is not published in advance.`,
                )}
        </p>
        {!pending && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="tabular text-muted">
              {time ? (
                <Countdown meetingAt={m.meetingAt} initialLabel={countdownLabel(m.meetingAt, now, lang)} lang={lang} />
              ) : (
                countdownLabel(m.meetingAt, now, lang)
              )}
            </span>
            <AddToCalendar meeting={m} lang={lang} />
          </div>
        )}
      </header>

      <Card>
        <h2 className="text-lg font-semibold">{t("Şu anki faiz", "Current rate")}</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-3">
          {rate && <Stat compact label={bankRateName(bank, lang)} value={formatCurrentRate(rate, lang)} />}
          {rate && <Stat compact label={t("Şu tarihten beri", "Since")} value={formatDate(rate.asOf, lang)} />}
        </div>
        {m.type === "projections" && (
          <p className="mt-3 text-sm text-muted">
            {t(
              "Bu toplantıda kararla birlikte üyelerin faiz ve ekonomi tahminleri (nokta grafiği) de açıklanır.",
              "At this meeting, members' rate and economic projections (the dot plot) are released with the decision.",
            )}
          </p>
        )}
      </Card>

      <Card>
        <h2 className="text-lg font-semibold">{t("Ne bekleniyor?", "What is expected?")}</h2>
        {pending ? (
          <p className="mt-2 text-muted">{pendingNote(m, lang)}</p>
        ) : detailed && (detailed.odds || detailed.surveyNote) ? (
          <ExpectationDetails
            odds={detailed.odds}
            oddsTitle={detailed.oddsTitle}
            oddsNote={detailed.oddsNote}
            surveyNote={detailed.surveyNote}
            lang={lang}
          />
        ) : sentence ? (
          <p className="mt-2">{sentence}</p>
        ) : m.bankCode === "boj" || m.bankCode === "rba" ? (
          <p className="prose-width mt-2 text-muted">
            {t(
              "Bu banka için yeniden yayımlanabilir bir beklenti kaynağı yok: piyasa verisi borsaların lisanslı ürünü.",
              "There is no republishable expectation source for this bank: the market data is the exchanges' licensed product.",
            )}
          </p>
        ) : (
          <p className="prose-width mt-2 text-muted">
            {t(
              "Bu toplantı için beklenti henüz oluşmadı; toplantı yaklaştıkça burada görünecek.",
              "No expectation for this meeting yet; it will appear here as the meeting approaches.",
            )}
          </p>
        )}
        {!pending && m.bankCode !== "boj" && m.bankCode !== "rba" && (
          <Link
            href={`${p("/faiz-olasiligi")}#${m.bankCode}`}
            className="mt-2 inline-flex min-h-9 items-center text-sm text-accent hover:underline"
          >
            {t("Beklentinin ayrıntısı ve seyri →", "Expectation details and history →")}
          </Link>
        )}
      </Card>

      {prev && (
        <Card>
          <h2 className="text-lg font-semibold">{t("Önceki karar", "Previous decision")}</h2>
          <p className="mt-2">
            <Link href={p(`/karar/${prev.meeting.id}`)} className="text-accent hover:underline">
              {formatDate(prev.meeting.meetingAt, lang)}
            </Link>
            : {decisionSentence(prev.meeting, lang)}.
          </p>
          {summary && (
            <p className="prose-width mt-2 text-sm text-muted">
              {lang === "en" ? summary.headlineEn : summary.headlineTr}
              {summary.score !== undefined && (
                <>
                  {" "}
                  {t("Karar metninin tonu:", "Tone of the statement:")}{" "}
                  <span className={`font-semibold ${scoreToneClass(summary.score)}`}>
                    {formatScore(summary.score, lang)} ({scoreLabel(summary.score, lang)})
                  </span>
                  .
                </>
              )}
            </p>
          )}
        </Card>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Link href={p(`/banka/${m.bankCode}`)} className="inline-flex min-h-9 items-center text-accent hover:underline">
          {t(`${name} sayfası`, `${name} page`)}
        </Link>
        <Link href={p("/takvim")} className="inline-flex min-h-9 items-center text-accent hover:underline">
          {t("Tüm toplantı takvimi", "Full meeting calendar")}
        </Link>
        <Link href={p("/kararlar")} className="inline-flex min-h-9 items-center text-accent hover:underline">
          {t("Geçmiş kararlar", "Past decisions")}
        </Link>
      </div>
    </article>
  );
}
