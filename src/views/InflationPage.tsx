import type { Metadata } from "next";
import Link from "next/link";
import { Countdown } from "@/components/Countdown";
import { BankTag } from "@/components/ScoreBadge";
import { TimeSeriesChart } from "@/components/TimeSeriesChart";
import { Card, Stat, TableFrame, Th } from "@/components/ui";
import { BANKS, bankCountry } from "@/lib/banks";
import { getEvents } from "@/lib/data/events";
import { getInflation } from "@/lib/data/inflation";
import { getCurrentRate } from "@/lib/data/rates";
import { getTrInflation } from "@/lib/data/tr-inflation";
import { fmtNum, fmtPercent, fmtSignedPercent, L, languageAlternates, localePath, type Lang } from "@/lib/i18n";
import { INFLATION_SOURCES } from "@/lib/sources/inflation";
import { countdownLabel, formatDate, formatTimeTrt, formatWeekday, monthLabel, monthShortLabel } from "@/lib/time";
import { monthlyExpectation, nextRelease, type TrInflation } from "@/lib/tr-inflation";
import type { BankCode } from "@/lib/types";
import { TcmbInflationOutlook } from "./BankPage";

/**
 * Türkiye enflasyonu (/enflasyon): sıradaki açıklama günü ve saati, son
 * rakam ve anket beklentisiyle farkı, Ocak 2024'ten seyri, TCMB'nin tahmini
 * ve ara hedefi, reel faiz. Veri: src/lib/tr-inflation.ts.
 */

const monthName = {
  tr: new Intl.DateTimeFormat("tr-TR", { month: "long", timeZone: "UTC" }),
  en: new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }),
};
const dayMonth = {
  tr: new Intl.DateTimeFormat("tr-TR", { timeZone: "Europe/Istanbul", day: "numeric", month: "long" }),
  en: new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Istanbul", day: "numeric", month: "long" }),
};
const mid = (period: string) => `${period}-15T12:00:00Z`;
const month = (period: string, lang: Lang) => monthName[lang].format(new Date(mid(period)));
const monthYear = (period: string, lang: Lang) => monthLabel(mid(period), lang);

export async function inflationMetadata(lang: Lang): Promise<Metadata> {
  const t = L(lang);
  const data = await getTrInflation();
  const last = data?.history.at(-1);
  const next = data && nextRelease(data, new Date());
  const expected = data && next && monthlyExpectation(data.survey, next.period);
  const nextWhen = next && `${dayMonth[lang].format(new Date(next.at))}, ${formatTimeTrt(next.at)}`;
  return {
    title:
      next && nextWhen
        ? t(
            `Enflasyon ne zaman açıklanacak? ${month(next.period, "tr")} verisi ${nextWhen}`,
            `When is Turkey's inflation released? ${month(next.period, "en")} data on ${nextWhen} Turkey time`,
          )
        : t("Türkiye enflasyonu", "Turkey inflation"),
    description: [
      last &&
        t(
          `${monthYear(last.period, lang)}: yıllık enflasyon ${fmtPercent(last.yoy, lang)}, aylık ${fmtPercent(last.mom, lang)}.`,
          `${monthYear(last.period, lang)}: annual inflation ${fmtPercent(last.yoy, lang)}, monthly ${fmtPercent(last.mom, lang)}.`,
        ),
      next &&
        t(
          `${monthYear(next.period, lang)} verisi ${formatDate(next.at, lang)} ${formatWeekday(next.at, lang)}, saat ${formatTimeTrt(next.at)} (Türkiye saati) açıklanacak${expected ? `; anket beklentisi aylık ${fmtPercent(expected.value, lang)}` : ""}.`,
          `${monthYear(next.period, lang)} data is released on ${formatWeekday(next.at, lang)} ${formatDate(next.at, lang)} at ${formatTimeTrt(next.at)} Turkey time${expected ? `; survey expectation ${fmtPercent(expected.value, lang)} m/m` : ""}.`,
        ),
      t(
        "Anket beklentisi, TCMB'nin yıl sonu tahmini ve ara hedefi, reel faiz ve açıklama takvimi.",
        "Survey expectations, the CBRT's year-end forecast and interim target, the real rate and the release calendar.",
      ),
    ]
      .filter(Boolean)
      .join(" "),
    alternates: languageAlternates(lang, "/enflasyon"),
  };
}

export async function InflationPage({ lang }: { lang: Lang }) {
  const t = L(lang);
  const p = (path: string) => localePath(lang, path);
  const now = new Date();
  const data = await getTrInflation();
  if (!data || data.history.length === 0) {
    return <p className="card p-5 text-muted">{t("Enflasyon verisi henüz yok.", "No inflation data yet.")}</p>;
  }
  const last = data.history.at(-1)!;
  const next = nextRelease(data, now);
  const lastExpected = monthlyExpectation(data.survey, last.period);
  const nextExpected = next && monthlyExpectation(data.survey, next.period);
  const surprise = lastExpected && Math.round((last.mom - lastExpected.value) * 100) / 100;
  const rate = await getCurrentRate("tcmb");

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("Türkiye enflasyonu", "Turkey inflation")}</h1>
        {next && (
          <>
            <p className="mt-2 text-lg">
              {next.pending
                ? t(
                    `${monthYear(next.period, lang)} enflasyonu açıklandı; rakam kısa süre içinde burada.`,
                    `${monthYear(next.period, lang)} inflation has been released; the figure will be here shortly.`,
                  )
                : // Sayıya ek getirilmez (decision-format.ts): "10:00'da" yerine ayrı cümle.
                  t(
                    `${monthYear(next.period, lang)} enflasyonu ${formatDate(next.at, lang)} ${formatWeekday(next.at, lang)} açıklanacak, saat ${formatTimeTrt(next.at)} (Türkiye saati).`,
                    `${monthYear(next.period, lang)} inflation will be released on ${formatWeekday(next.at, lang)} ${formatDate(next.at, lang)} at ${formatTimeTrt(next.at)} Turkey time.`,
                  )}
            </p>
            {!next.pending && (
              <p className="mt-1 text-sm text-muted tabular">
                <Countdown meetingAt={next.at} initialLabel={countdownLabel(next.at, now, lang)} lang={lang} />
                {" · "}
                {t("Kaynak: TÜİK veri takvimi", "Source: TurkStat release calendar")}
              </p>
            )}
          </>
        )}
      </header>

      <section aria-labelledby="son-veri" className="space-y-3">
        <h2 id="son-veri" className="text-lg font-semibold">
          {t(`Son veri: ${monthYear(last.period, lang)}`, `Latest: ${monthYear(last.period, lang)}`)}
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <Stat compact label={t("Yıllık enflasyon", "Annual inflation")} value={fmtPercent(last.yoy, lang)} />
          <Stat compact label={t("Aylık enflasyon", "Monthly inflation")} value={fmtPercent(last.mom, lang)} />
          {lastExpected && (
            <Stat compact label={t("Anket beklentisi (aylık)", "Survey expectation (m/m)")} value={fmtPercent(lastExpected.value, lang)} />
          )}
          {nextExpected && next && (
            <Stat
              compact
              label={t(`${month(next.period, lang)} için beklenti (aylık)`, `Expected for ${month(next.period, lang)} (m/m)`)}
              value={fmtPercent(nextExpected.value, lang)}
            />
          )}
        </div>
        {lastExpected && surprise !== undefined && (
          <p className="prose-width text-sm text-muted">
            {Math.abs(surprise) < 0.1
              ? t(
                  `Aylık enflasyon, ${monthYear(lastExpected.round, lang)} Piyasa Katılımcıları Anketi'ndeki beklentiyle uyumlu.`,
                  `Monthly inflation was in line with the ${monthYear(lastExpected.round, lang)} Survey of Market Participants.`,
                )
              : t(
                  `Aylık enflasyon, ${monthYear(lastExpected.round, lang)} Piyasa Katılımcıları Anketi'ndeki beklentinin ${fmtNum(Math.abs(surprise), lang)} puan ${surprise > 0 ? "üstünde" : "altında"}.`,
                  `Monthly inflation came in ${fmtNum(Math.abs(surprise), lang)} points ${surprise > 0 ? "above" : "below"} the ${monthYear(lastExpected.round, lang)} Survey of Market Participants.`,
                )}
          </p>
        )}
      </section>

      <HistorySection data={data} lang={lang} />

      <TcmbInflationOutlook lang={lang} />

      {rate && (
        <Card>
          <h2 className="text-lg font-semibold">{t("Reel faiz", "Real interest rate")}</h2>
          <p className="prose-width mt-2">
            {t(
              `Politika faizi ${fmtPercent(rate.rate, lang)}, yıllık enflasyon ${fmtPercent(last.yoy, lang)}: aradaki fark ${fmtSignedPercent(Math.round((rate.rate - last.yoy) * 100) / 100, lang)}.`,
              `Policy rate ${fmtPercent(rate.rate, lang)}, annual inflation ${fmtPercent(last.yoy, lang)}: a gap of ${fmtSignedPercent(Math.round((rate.rate - last.yoy) * 100) / 100, lang)}.`,
            )}{" "}
            <Link href={p("/reel-faiz")} className="text-accent hover:underline">
              {t("Altı ekonomide reel faiz →", "Real rates in six economies →")}
            </Link>
          </p>
        </Card>
      )}

      <ReleaseCalendar data={data} now={now} lang={lang} />
      <OtherEconomies lang={lang} now={now} />

      <p className="prose-width text-xs text-muted">
        {t(
          "Kaynaklar: TÜFE TÜİK'ten, TCMB'nin EVDS sistemi üzerinden (2025=100 serisi, aylık ve yıllık değişim); beklentiler TCMB Piyasa Katılımcıları Anketi; açıklama günleri TÜİK veri takvimi. Yatırım tavsiyesi değildir.",
          "Sources: CPI from TurkStat via the CBRT's EVDS (2025=100 series, monthly and annual change); expectations from the CBRT Survey of Market Participants; release dates from TurkStat's calendar. Not investment advice.",
        )}
      </p>
    </div>
  );
}

function HistorySection({ data, lang }: { data: TrInflation; lang: Lang }) {
  const t = L(lang);
  const first = data.history[0];
  const chart = data.history.map((h) => ({ label: monthLabel(mid(h.period), lang), yoy: h.yoy }));
  const recent = data.history.slice(-12).reverse();
  return (
    <section aria-labelledby="seyir" className="space-y-3">
      <div>
        <h2 id="seyir" className="text-lg font-semibold">
          {t(`Yıllık enflasyon, ${monthYear(first.period, lang)} sonrası`, `Annual inflation since ${monthYear(first.period, lang)}`)}
        </h2>
      </div>
      <Card>
        <TimeSeriesChart
          data={chart}
          series={[{ key: "yoy", name: t("Yıllık TÜFE", "Annual CPI"), color: "var(--series-1)" }]}
          unit="rate"
          lang={lang}
        />
      </Card>
      <TableFrame minWidth="30rem">
        <thead>
          <tr className="border-b border-border-strong text-left text-muted">
            <Th>{t("Ay", "Month")}</Th>
            <Th align="right">{t("Aylık", "Monthly")}</Th>
            <Th align="right">{t("Beklenti", "Expected")}</Th>
            <Th align="right">{t("Fark (puan)", "Gap (pts)")}</Th>
            <Th align="right">{t("Yıllık", "Annual")}</Th>
          </tr>
        </thead>
        <tbody>
          {recent.map((h) => {
            const e = monthlyExpectation(data.survey, h.period);
            const gap = e && Math.round((h.mom - e.value) * 100) / 100;
            return (
              <tr key={h.period} className="border-b border-border last:border-b-0">
                {/* Kısa ay adı: telefonda "Ekim 2026" iki satıra düşüyordu. */}
                <td className="whitespace-nowrap px-4 py-2.5">{monthShortLabel(mid(h.period), lang)}</td>
                <td className="tabular px-4 py-2.5 text-right">{fmtPercent(h.mom, lang)}</td>
                <td className="tabular px-4 py-2.5 text-right text-muted">{e ? fmtPercent(e.value, lang) : "—"}</td>
                <td className="tabular px-4 py-2.5 text-right">
                  {gap === undefined ? "—" : `${gap > 0 ? "+" : gap < 0 ? "−" : ""}${fmtNum(Math.abs(gap), lang)}`}
                </td>
                <td className="tabular px-4 py-2.5 text-right font-semibold">{fmtPercent(h.yoy, lang)}</td>
              </tr>
            );
          })}
        </tbody>
      </TableFrame>
      <p className="prose-width text-xs text-muted">
        {t(
          "Beklenti: o ayın Piyasa Katılımcıları Anketi'ndeki aylık TÜFE beklentisi (anket ayın ortasında, veri ertesi ayın başında yayımlanır). Fark pozitifse enflasyon beklentinin üstünde gelmiştir.",
          "Expected: the monthly CPI expectation in that month's Survey of Market Participants (the survey is published mid-month, the data early the next month). A positive gap means inflation came in above expectations.",
        )}
      </p>
    </section>
  );
}

function ReleaseCalendar({ data, now, lang }: { data: TrInflation; now: Date; lang: Lang }) {
  const t = L(lang);
  const upcoming = data.releases.filter((r) => Date.parse(r.at) > now.getTime()).slice(0, 6);
  if (upcoming.length === 0) return null;
  return (
    <section aria-labelledby="takvim" className="space-y-3">
      <h2 id="takvim" className="text-lg font-semibold">
        {t("Açıklama takvimi", "Release calendar")}
      </h2>
      <ul className="card divide-y divide-border">
        {upcoming.map((r) => (
          <li key={r.at} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
            <span>{t(`${monthYear(r.period, lang)} enflasyonu`, `${monthYear(r.period, lang)} inflation`)}</span>
            <span className="tabular text-muted">
              {formatDate(r.at, lang)} {formatWeekday(r.at, lang)} · {formatTimeTrt(r.at)} TRT
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Diğer beş ekonominin son okuması ve takvimdeki sıradaki açıklama günü. */
async function OtherEconomies({ lang, now }: { lang: Lang; now: Date }) {
  const t = L(lang);
  const [readings, events] = await Promise.all([getInflation(), getEvents()]);
  const others = readings.filter((r) => r.bankCode !== "tcmb");
  const nextCpi = (code: BankCode) =>
    events.filter((e) => e.kind === "cpi" && e.bankCode === code && Date.parse(e.at) > now.getTime()).sort((a, b) => a.at.localeCompare(b.at))[0];
  return (
    <section aria-labelledby="diger" className="space-y-3">
      <h2 id="diger" className="text-lg font-semibold">
        {t("Diğer ekonomiler", "Other economies")}
      </h2>
      <TableFrame minWidth="30rem">
        <thead>
          <tr className="border-b border-border-strong text-left text-muted">
            <Th>{t("Ekonomi", "Economy")}</Th>
            <Th align="right">{t("Yıllık enflasyon", "Annual inflation")}</Th>
            <Th align="right">{t("Sıradaki veri", "Next release")}</Th>
          </tr>
        </thead>
        <tbody>
          {others.map((r) => {
            const e = nextCpi(r.bankCode);
            return (
              <tr key={r.bankCode} className="border-b border-border last:border-b-0">
                <td className="px-4 py-2.5">
                  <span className="inline-flex items-center gap-2">
                    <BankTag code={r.bankCode} lang={lang} />
                    {bankCountry(BANKS[r.bankCode], lang)}
                  </span>
                </td>
                <td className="tabular px-4 py-2.5 text-right">
                  {fmtPercent(r.yoy, lang, 1)}
                  <div className="text-xs text-muted">
                    {monthYear(r.period, lang)}
                    {r.flash && t(", öncü", ", flash")}
                    {" · "}
                    <a href={INFLATION_SOURCES[r.bankCode].url} className="hover:text-accent">
                      {INFLATION_SOURCES[r.bankCode][lang]}
                    </a>
                  </div>
                </td>
                <td className="tabular px-4 py-2.5 text-right text-muted">
                  {e ? `${formatDate(e.at, lang)} · ${formatTimeTrt(e.at)}` : "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </TableFrame>
      <p className="prose-width text-xs text-muted">
        {t(
          "Saatler Türkiye saatiyle. Takvim üç hafta ileriye bakar; Euro Bölgesi'nin takvimi makinece okunamıyor.",
          "Times in Turkey time. The calendar looks three weeks ahead; Eurostat's calendar is not machine-readable.",
        )}
      </p>
    </section>
  );
}
