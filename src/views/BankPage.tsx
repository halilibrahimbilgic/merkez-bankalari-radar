import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCalendar } from "@/components/AddToCalendar";
import { JsonLd } from "@/components/JsonLd";
import { ExpectationDetails } from "@/components/BankCard";
import { MeetingRow } from "@/components/MeetingRow";
import { formatScore, formatScoreDelta, ScoreBadge, scoreToneClass } from "@/components/ScoreBadge";
import { getLatestStatementScores } from "@/lib/data/statements";
import { bankCountry, bankFullName, bankName, bankRateName, bankWithCountryTr, getBank } from "@/lib/banks";
import { getPastMeetings, getUpcomingMeetings } from "@/lib/data/meetings";
import { formatCurrentRate, getCurrentRate } from "@/lib/data/rates";
import { getBankScoreSummaries, getSpeeches } from "@/lib/data/speeches";
import { getInflationFor } from "@/lib/data/inflation";
import { fmtPercent, fmtSignedPercent, L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { forwardRealRate, realRate } from "@/lib/real-rates";
import { getExpectations } from "@/lib/data/expectations";
import { speechTitle } from "@/lib/speech-i18n";
import { formatDate, formatDayMonth, formatMeeting, formatTimeTrt, monthLabel, trtDayKey } from "@/lib/time";
import { getTcmbFunding } from "@/lib/data/tcmb-funding";
import { fundingNow } from "@/lib/tcmb-funding";
import { isPendingDecision, pendingNote } from "@/lib/decision-format";
import { breadcrumbLd, homeCrumb } from "@/lib/json-ld";
import { getBankExpectations } from "./bank-expectations";
import { bankFaqLd } from "./bank-faq";
import { FundingSection } from "./bank/FundingSection";
import { CommitteeTone } from "./bank/CommitteeTone";
import { TcmbInflationOutlook } from "./bank/TcmbInflationOutlook";

export async function bankMetadata(lang: Lang, code: string): Promise<Metadata> {
  const bank = getBank(code);
  if (!bank) return {};
  const t = L(lang);
  const name = bankName(bank, lang);

  // Başlık, insanların gerçekten aradığı soruyla başlar ("TCMB faiz kararı ne
  // zaman, saat kaçta") ve cevabı içerir; tarih ve faiz günlük veriyle
  // güncellenir. Saati duyurulmayan kararda (BoJ) saat sorulmaz.
  const [next] = await getUpcomingMeetings({ bankCode: bank.code });
  const rate = await getCurrentRate(bank.code);
  const date = next && formatDate(next.meetingAt, lang);
  const time = next && !next.timeTbd ? formatTimeTrt(next.meetingAt) : undefined;
  // Başlıkta yıl yok: Google ~60 karakterden sonrasını kesiyor ve yaklaşan
  // karar zaten en yakın tarihtir (açıklamada yıllı tarih var).
  const dayMonth = next && formatDayMonth(next.meetingAt, lang);

  // Türkçe aramalar kısaltmayla olduğu kadar ülkeyle de yapılıyor ("japonya
  // faiz kararı ne zaman", Search Console, Kasım 2026): başlıkta ikisi birden.
  // Kısa tutuldu, Google uzun başlığı kesiyor; TCMB'ye ek gerekmez.
  const tr = bankWithCountryTr(bank.code);
  const year = (next?.meetingAt ?? new Date().toISOString()).slice(0, 4);

  return {
    // `absolute`: "· Faiz Radar" eki bu başlıkları 60 karakterin üstüne taşırdı.
    title: !next
      ? t(`${tr} faiz kararları`, `${name} rate decisions`)
      : {
          absolute: time
            ? t(
                `${tr} faiz kararı ne zaman, saat kaçta? ${dayMonth}, ${time}`,
                `When is the ${name} rate decision? ${dayMonth}, ${time} Turkey time`,
              )
            : t(`${tr} faiz kararı ne zaman? ${dayMonth}`, `When is the ${name} rate decision? ${dayMonth}`),
        },
    // Önce cevap; faiz adı ayraçla — "Fed Fed Funds", "BoJ Kısa vadeli…" gibi
    // ad tekrarı ve cümle ortasında büyük harf olmasın.
    description: [
      next &&
        (time
          ? t(`${bank.fullTr} (${name}): sıradaki karar ${date}, Türkiye saatiyle ${time}.`, `Next decision: ${date}, ${time} Turkey time.`)
          : t(
              `${bank.fullTr} (${name}): sıradaki karar ${date}; açıklama saati önceden duyurulmuyor.`,
              `Next decision: ${date}; the announcement time is not published in advance.`,
            )),
      rate &&
        t(
          `Güncel faiz: ${formatCurrentRate(rate, lang)} · ${bank.rateNameTr} · ${formatDate(rate.asOf, lang)} itibarıyla.`,
          `Current rate: ${formatCurrentRate(rate, lang)} · ${bank.rateNameEn} · since ${formatDate(rate.asOf, lang)}.`,
        ),
      t(
        // Saat zaten ilk cümlede "Türkiye saatiyle" geçiyorsa tekrar etme.
        time ? `${year} toplantı tarihleri ve geçmiş kararlar.` : `Türkiye saatiyle ${year} toplantı tarihleri ve geçmiş kararlar.`,
        "Past decisions and the meeting calendar in Turkey time.",
      ),
    ]
      .filter(Boolean)
      .join(" "),
    alternates: languageAlternates(lang, `/banka/${bank.code}`),
  };
}

export async function BankPage({ lang, code }: { lang: Lang; code: string }) {
  const bank = getBank(code);
  if (!bank) notFound();
  const t = L(lang);
  const p = (path: string) => localePath(lang, path);
  const name = bankName(bank, lang);

  const now = new Date();
  const upcoming = await getUpcomingMeetings({ bankCode: bank.code, now });
  const past = await getPastMeetings({ bankCode: bank.code, limit: 12, now });
  // Saati geçmiş, sonucu gelmemiş karar sıradakinin önüne geçer (isPendingDecision).
  const pending = past.find((m) => isPendingDecision(m, now));
  const next = pending ?? upcoming[0];
  const later = pending ? upcoming : upcoming.slice(1);
  const currentRate = await getCurrentRate(bank.code);
  const speeches = await getSpeeches({ bankCode: bank.code, limit: 5 });
  const scoreSummary = (await getBankScoreSummaries()).find((s) => s.bankCode === bank.code);
  const statementScore = (await getLatestStatementScores())[bank.code];
  const inflation = await getInflationFor(bank.code);
  const real = currentRate && inflation ? realRate(currentRate, inflation) : undefined;
  const survey = bank.code === "tcmb" ? (await getExpectations()).tcmb : undefined;
  const forward = real && survey?.inflation12 !== undefined ? forwardRealRate(real.policy, survey.inflation12) : undefined;
  const expectation = (await getBankExpectations(lang, now))[bank.code];
  const hasExpectation = !!(expectation?.odds || expectation?.surveyNote);
  // TCMB: bankaların fiilen ödediği faiz politika faizinden ayrışabilir (src/lib/tcmb-funding.ts).
  const funding = bank.code === "tcmb" ? await getTcmbFunding() : undefined;
  const today = trtDayKey(now.toISOString());
  const fundingState = funding && fundingNow(funding, today);

  const structured = [
    breadcrumbLd(lang, [homeCrumb(lang), { name, path: `/banka/${bank.code}` }]),
    bankFaqLd({
      lang,
      bank,
      next,
      rate: currentRate && { text: formatCurrentRate(currentRate, lang), since: formatDate(currentRate.asOf, lang) },
    }),
  ].filter((d) => d !== undefined);

  return (
    <div className="space-y-8">
      <JsonLd data={structured} />
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {name}{" "}
          <span className="text-base font-normal text-muted">({bankFullName(bank, lang)})</span>
        </h1>
        <p className="mt-1 text-muted">
          {bankCountry(bank, lang)} · {bankRateName(bank, lang)}
        </p>
        <a
          href={bank.websiteUrl}
          rel="noopener noreferrer nofollow"
          target="_blank"
          className="mt-1 inline-block text-sm text-accent hover:underline"
        >
          {t("Resmî takvim sayfası →", "Official calendar page →")}
        </a>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {currentRate && (
          <section className="card p-5">
            <div className="text-sm text-muted">{t("Güncel politika faizi", "Current policy rate")}</div>
            <div className="mt-1 text-2xl font-semibold tabular">
              {formatCurrentRate(currentRate, lang)}
            </div>
            <div className="mt-1 text-sm text-muted tabular">
              {t(
                `${formatDate(currentRate.asOf, lang)} itibarıyla`,
                `Since ${formatDate(currentRate.asOf, lang)}`,
              )}
            </div>
            {fundingState?.divergence && (
              <a href="#fiili-fonlama" className="mt-1 inline-flex min-h-6 items-center text-sm font-medium text-accent tabular hover:underline">
                {t(
                  `Fiilî fonlama ${fmtPercent(fundingState.aofm, lang)} →`,
                  `Effective funding ${fmtPercent(fundingState.aofm, lang)} →`,
                )}
              </a>
            )}
          </section>
        )}
        {real && (
          <section className="card p-5">
            <div className="text-sm text-muted">
              <Link href={p("/reel-faiz")} className="hover:text-accent">
                {t("Reel faiz", "Real interest rate")}
              </Link>
            </div>
            <div className="mt-1 text-2xl font-semibold tabular">{fmtSignedPercent(real.real, lang)}</div>
            <div className="mt-1 text-sm text-muted tabular">
              {t(
                `Yıllık enflasyon ${fmtPercent(real.inflation.yoy, lang, 1)} (${monthLabel(`${real.inflation.period}-15T12:00:00Z`, lang)})`,
                `Annual inflation ${fmtPercent(real.inflation.yoy, lang, 1)} (${monthLabel(`${real.inflation.period}-15T12:00:00Z`, lang)})`,
              )}
            </div>
            {forward && (
              <div className="mt-1 text-sm text-muted tabular">
                <Link href={`${p("/reel-faiz")}#ileriye-donuk`} className="hover:text-accent">
                  {t(
                    `Beklenen enflasyona göre ${fmtSignedPercent(forward.real, lang)}`,
                    `${fmtSignedPercent(forward.real, lang)} against expected inflation`,
                  )}
                </Link>
              </div>
            )}
          </section>
        )}
        {(scoreSummary || statementScore) && (
          <section className="card p-5">
            <div className="text-sm text-muted">{t("Şahin/güvercin eğilimi", "Hawk/dove tilt")}</div>
            {scoreSummary ? (
              <>
                <div className="mt-1 text-2xl">
                  <ScoreBadge score={scoreSummary.averageScore} lang={lang} />
                </div>
                <div className="mt-1 text-sm text-muted tabular">
                  {t(
                    `${scoreSummary.speechCount} sinyalli konuşmanın ortalaması`,
                    `Average of ${scoreSummary.speechCount} speeches with a policy signal`,
                  )}
                </div>
              </>
            ) : (
              <div className="mt-1 text-sm text-muted">{t("Skorlanmış konuşma yok.", "No scored speeches.")}</div>
            )}
            {/* Komitenin ortak sesi: son karar metninin aynı ölçekteki puanı. */}
            {statementScore && (
              <div className="mt-1 text-sm tabular">
                <Link href={p(`/karar/${statementScore.meetingId}`)} className="inline-flex min-h-6 items-center text-muted hover:text-accent">
                  {t("Son karar metni:", "Latest statement:")}&nbsp;
                  <span className={`font-semibold ${scoreToneClass(statementScore.score)}`}>
                    {formatScore(statementScore.score, lang)}
                  </span>
                  {statementScore.previousScore !== undefined && (
                    <>&nbsp;({formatScoreDelta(statementScore.score, statementScore.previousScore, lang)})</>
                  )}
                </Link>
              </div>
            )}
          </section>
        )}
      </div>

      {next ? (
        <section className="card p-5">
          <div className="text-sm text-muted">
            {pending ? t("Karar günü", "Decision day") : t("Sıradaki toplantı", "Next meeting")}
          </div>
          <div className="mt-1 text-lg font-semibold tabular">
            {formatMeeting(next.meetingAt, next.timeTbd, lang)}
          </div>
          {!pending && <AddToCalendar meeting={next} lang={lang} className="mt-1" />}
          <Link
            href={p(`/karar/${next.id}`)}
            className="mt-1 inline-flex min-h-9 items-center text-sm text-accent hover:underline"
          >
            {t("Bu toplantının sayfası →", "This meeting's page →")}
          </Link>
          {/* "Ne bekleniyor?" banka sayfasının asıl sorusu; önceden yalnızca ana sayfada vardı.
              Bekleyen kararda beklenti bir sonraki toplantıya ait olurdu: yerine not. */}
          {pending ? (
            <p className="mt-2 text-sm font-medium">{pendingNote(pending, lang)}</p>
          ) : hasExpectation ? (
            <>
              <ExpectationDetails
                odds={expectation?.odds}
                oddsTitle={expectation?.oddsTitle}
                oddsNote={expectation?.oddsNote}
                surveyNote={expectation?.surveyNote}
                lang={lang}
              />
              <Link
                href={`${p("/faiz-olasiligi")}#${bank.code}`}
                className="mt-2 inline-flex min-h-9 items-center text-sm text-accent hover:underline"
              >
                {t("Beklentinin ayrıntısı ve seyri →", "Expectation details and history →")}
              </Link>
            </>
          ) : (
            // BoJ ve RBA için kaynak yok (ARCHITECTURE.md §6); diğerlerinde veri geçici olarak eksik olabilir.
            (bank.code === "boj" || bank.code === "rba") && (
              <p className="mt-4 border-t border-border pt-3 text-sm text-muted">
                {t(
                  "Bu banka için yeniden yayımlanabilir bir beklenti kaynağı yok: piyasa verisi borsaların lisanslı ürünü.",
                  "There is no republishable expectation source for this bank: the market data is the exchanges' licensed product.",
                )}
              </p>
            )
          )}
        </section>
      ) : (
        <p className="card p-5 text-muted">
          {t("Bu banka için henüz takvim verisi yok.", "No calendar data for this bank yet.")}
        </p>
      )}

      {funding && fundingState && (
        <FundingSection funding={funding} state={fundingState} today={today} now={now} lang={lang} />
      )}
      {bank.code === "tcmb" && (
        <div className="space-y-2">
          <TcmbInflationOutlook lang={lang} />
          <Link href={p("/enflasyon")} className="inline-flex min-h-9 items-center text-sm text-accent hover:underline">
            {t("Türkiye enflasyonu: açıklama takvimi ve aylık seyir →", "Turkey inflation: release calendar and monthly path →")}
          </Link>
        </div>
      )}

      {later.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("Yaklaşan toplantılar", "Upcoming meetings")}</h2>
          <ul className="overflow-hidden card">
            {later.map((m) => (
              <MeetingRow key={m.id} meeting={m} now={now} lang={lang} />
            ))}
          </ul>
        </section>
      )}

      {past.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("Geçmiş toplantılar", "Past meetings")}</h2>
          <ul className="overflow-hidden card">
            {past.map((m) => (
              <MeetingRow key={m.id} meeting={m} now={now} lang={lang} />
            ))}
          </ul>
          <p className="mt-2 text-sm text-muted">
            {t(
              "Karar oranları Fed için FRED, ECB için ECB Data Portal, TCMB için EVDS, BoE için MPC oylama geçmişinden, RBA için F1 tablosundan, BoJ için karar metinlerinden doldurulur.",
              "Decision rates come from FRED for the Fed, the ECB Data Portal for the ECB, EVDS for the CBRT, the MPC voting history for the BoE, table F1 for the RBA and the policy statements for the BoJ.",
            )}
          </p>
        </section>
      )}

      <CommitteeTone bankCode={bank.code} now={now} lang={lang} />

      {speeches.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">{t("Son konuşmalar", "Recent speeches")}</h2>
            <Link
              href={p(`/konusmalar/${bank.code}`)}
              className="text-sm text-accent hover:underline"
            >
              {t("Tümü →", "All →")}
            </Link>
          </div>
          <ul className="overflow-hidden card">
            {speeches.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border px-4 py-3 last:border-b-0"
              >
                <span className="text-sm text-muted tabular">{formatDate(s.speechDate, lang)}</span>
                <Link href={p(`/konusma/${s.id}`)} className="min-w-56 flex-1 hover:text-accent">
                  {s.speakerName} — {speechTitle(s, lang)}
                </Link>
                <ScoreBadge score={s.hawkDoveScore} hasPolicySignal={s.hasPolicySignal} lang={lang} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <Link href={p("/takvim")} className="inline-block text-sm text-accent hover:underline">
        {t("← Tüm takvim", "← Full calendar")}
      </Link>
    </div>
  );
}
