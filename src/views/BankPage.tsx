import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCalendar } from "@/components/AddToCalendar";
import { ExpectationDetails } from "@/components/BankCard";
import { MeetingRow } from "@/components/MeetingRow";
import { formatScore, ScoreBadge, scoreToneClass } from "@/components/ScoreBadge";
import { getLatestStatementScores } from "@/lib/data/statements";
import { Term } from "@/components/Term";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { Stat } from "@/components/ui";
import {
  bankCountry,
  bankFullName,
  bankName,
  bankRateName,
  getBank,
} from "@/lib/banks";
import { getPastMeetings, getUpcomingMeetings } from "@/lib/data/meetings";
import { formatCurrentRate, getCurrentRate } from "@/lib/data/rates";
import { getBankScoreSummaries, getSpeeches } from "@/lib/data/speeches";
import { getInflationFor } from "@/lib/data/inflation";
import { fmtNum, fmtPercent, fmtPercentRange, fmtSignedPercent, L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { forwardRealRate, realRate } from "@/lib/real-rates";
import { getExpectations } from "@/lib/data/expectations";
import { speechTitle } from "@/lib/speech-i18n";
import { formatDate, formatDateShort, formatMeeting, formatTimeTrt, monthLabel, trtDayKey } from "@/lib/time";
import { getTcmbFunding } from "@/lib/data/tcmb-funding";
import { EVDS_URL } from "@/lib/sources/evds";
import {
  divergencePeriods,
  fundingNow,
  periodSentence,
  valueAt,
  type DivergencePeriod,
  type FundingNow,
  type TcmbFunding,
} from "@/lib/tcmb-funding";
import { isPendingDecision, pendingNote } from "@/lib/decision-format";
import { getBankExpectations } from "./bank-expectations";

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

  return {
    title: !next
      ? t(`${name} faiz kararları`, `${name} rate decisions`)
      : time
        ? t(
            `${name} faiz kararı ne zaman, saat kaçta? ${date}, ${time}`,
            `When is the next ${name} rate decision? ${date}, ${time} Turkey time`,
          )
        : t(`${name} faiz kararı ne zaman? ${date}`, `When is the next ${name} rate decision? ${date}`),
    // Önce cevap; faiz adı ayraçla — "Fed Fed Funds", "BoJ Kısa vadeli…" gibi
    // ad tekrarı ve cümle ortasında büyük harf olmasın.
    description: [
      next &&
        (time
          ? t(`Sıradaki karar ${date}, Türkiye saatiyle ${time}.`, `Next decision: ${date}, ${time} Turkey time.`)
          : t(
              `Sıradaki karar ${date}; açıklama saati önceden duyurulmuyor.`,
              `Next decision: ${date}; the announcement time is not published in advance.`,
            )),
      rate &&
        t(
          `Güncel faiz: ${formatCurrentRate(rate, lang)} · ${bank.rateNameTr} · ${formatDate(rate.asOf, lang)} itibarıyla.`,
          `Current rate: ${formatCurrentRate(rate, lang)} · ${bank.rateNameEn} · since ${formatDate(rate.asOf, lang)}.`,
        ),
      t(
        "Geçmiş kararlar ve Türkiye saatiyle toplantı takvimi.",
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

  return (
    <div className="space-y-8">
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
          <ul className="overflow-hidden card opacity-80">
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

      {speeches.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">{t("Son konuşmalar", "Recent speeches")}</h2>
            <Link
              href={`${p("/konusmalar")}?banka=${bank.code}`}
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

/**
 * TCMB: politika faizi, fiilî fonlama (AOFM) ve faiz koridoru, son 12 ay.
 * Ayrışma olmasa da durur: okur iki oranın aynı olduğunu da görsün.
 */
function FundingSection({
  funding,
  state,
  today,
  now,
  lang,
}: {
  funding: TcmbFunding;
  state: FundingNow;
  today: string;
  now: Date;
  lang: Lang;
}) {
  const t = L(lang);
  // Pencere /kararlar'daki faiz döngüsüyle aynı: on iki ay önceki ayın başı.
  const from = new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), 1)).toISOString().slice(0, 10);
  const past = divergencePeriods(funding, today).filter((p): p is DivergencePeriod & { end: string } => !!p.end && p.end > from);
  const diff = Math.round((state.aofm - state.policy) * 100) / 100;

  // Günlük satırlar: kategorik x ekseni zamanı eşit aralıklı göstersin.
  const rows: Record<string, string | number | null>[] = [];
  for (let ms = Date.parse(`${from}T00:00:00Z`); ms <= Date.parse(`${today}T00:00:00Z`); ms += 86_400_000) {
    const date = new Date(ms).toISOString().slice(0, 10);
    rows.push({
      label: formatDateShort(`${date}T12:00:00Z`, lang),
      lower: valueAt(funding.lower, date) ?? null,
      upper: valueAt(funding.upper, date) ?? null,
      aofm: valueAt(funding.aofm, date) ?? null,
      policy: valueAt(funding.policy, date) ?? null,
    });
  }

  return (
    <section aria-labelledby="fiili-fonlama" className="card p-5">
      <h2 id="fiili-fonlama" className="scroll-mt-4 text-lg font-semibold">
        {t("Fiilî fonlama ve faiz koridoru", "Effective funding and the rate corridor")}
      </h2>
      <p className="prose-width mt-1 text-sm text-muted">
        {t(
          "Politika faizi, TCMB'nin bir hafta vadeli repo ihalesindeki faizdir. Bankaların fiilen ödediği ortalama faiz ise ",
          "The policy rate is the rate at the CBRT's one-week repo auction. The rate banks actually pay on average is the ",
        )}
        <Term id="agirlikli-ortalama-fonlama-maliyeti-aofm" lang={lang}>
          {t("ağırlıklı ortalama fonlama maliyetidir (AOFM)", "weighted average cost of funding")}
        </Term>
        {t(
          ". TCMB ihaleye ara verip bankaları ",
          ". When the CBRT suspends the auction and funds banks at the top of the ",
        )}
        <Term id="faiz-koridoru" lang={lang}>
          {t("faiz koridorunun", "rate corridor")}
        </Term>
        {t(
          " üst bandından fonladığında AOFM politika faizinin üstüne çıkar: faiz değiştirilmeden yapılan bir sıkılaştırmadır.",
          ", the funding cost rises above the policy rate: tightening without a rate change.",
        )}
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">
        <Stat compact label={t("Politika faizi", "Policy rate")} value={fmtPercent(state.policy, lang)} />
        <Stat
          compact
          label={t("Fiilî fonlama (AOFM)", "Average funding cost")}
          value={fmtPercent(state.aofm, lang)}
          note={
            diff === 0
              ? t("politika faiziyle aynı", "same as the policy rate")
              : t(
                  `politika faizinin ${fmtNum(Math.abs(diff), lang)} puan ${diff > 0 ? "üstünde" : "altında"}`,
                  `${fmtNum(Math.abs(diff), lang)} points ${diff > 0 ? "above" : "below"} the policy rate`,
                )
          }
        />
        {state.lower !== undefined && state.upper !== undefined && (
          <Stat
            compact
            label={t("Faiz koridoru", "Rate corridor")}
            value={fmtPercentRange(state.lower, state.upper, lang)}
            note={t("gecelik borç alma–verme", "overnight borrowing–lending")}
          />
        )}
      </div>

      {state.divergence && <p className="prose-width mt-3 text-sm font-medium">{periodSentence(state.divergence, lang, state)}</p>}
      {past.length > 0 && (
        <div className="prose-width mt-3 space-y-1 text-sm text-muted">
          <p className="font-medium text-foreground">{t("Son 12 ayda", "In the last 12 months")}</p>
          {past.map((p) => (
            <p key={p.start}>{periodSentence(p, lang)}</p>
          ))}
        </div>
      )}

      <div className="mt-4">
        <TimeSeriesChart
          data={rows}
          // Politika faizi en son çizilir: iki oran aynıyken AOFM onun altında kalır, ayrışınca görünür.
          series={[
            { key: "lower", name: t("Alt bant", "Lower band"), color: "var(--muted)", dashed: true },
            { key: "upper", name: t("Üst bant", "Upper band"), color: "var(--muted)", dashed: true },
            { key: "aofm", name: t("Fiilî fonlama (AOFM)", "Average funding cost"), color: "var(--series-2)" },
            { key: "policy", name: t("Politika faizi", "Policy rate"), color: "var(--series-1)" },
          ]}
          unit="rate"
          lang={lang}
          stepped
          dots={false}
        />
      </div>
      <p className="mt-2 text-xs text-muted">
        {t("Kaynak: ", "Source: ")}
        <a href={EVDS_URL} target="_blank" rel="noopener noreferrer nofollow" className="text-accent hover:underline">
          TCMB EVDS
        </a>
        {t(
          " — bir hafta vadeli repo faizi, AOFM, gecelik borç alma ve borç verme faizleri. Karar günü AOFM o günün fonlamasını eski oranla gösterir, yeni orana ertesi iş günü geçer.",
          " — one-week repo rate, average funding cost, overnight borrowing and lending rates. On decision days the funding cost still reflects the old rate and moves to the new one the next business day.",
        )}
      </p>
    </section>
  );
}
