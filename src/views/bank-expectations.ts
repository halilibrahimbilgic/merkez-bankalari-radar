import type { ExpectationChip } from "@/components/BankSummaryList";
import type { OddsRow } from "@/components/RateOdds";
import { getExpectations } from "@/lib/data/expectations";
import { getProbabilitySnapshot } from "@/lib/data/probabilities";
import { getCurrentRates } from "@/lib/data/rates";
import { moveOdds } from "@/lib/implied-path";
import { fmtPercent, L, type Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/time";
import type { BankCode } from "@/lib/types";

/** Sıradaki karar için beklentinin özeti — bir banka için hangisi varsa. */
export interface BankExpectation {
  odds?: OddsRow[];
  /** Varsayılan "Piyasa fiyatlaması". */
  oddsTitle?: string;
  oddsNote?: string;
  /** Anket beklentisi (TCMB) — piyasa fiyatlamasından ayrı başlıkla. */
  surveyNote?: string;
  /** Telefon listesi için tek bakışlık özet: en olası sonuç. */
  chip?: ExpectationChip;
}

/**
 * Ana sayfa kartları, telefon listesi ve banka sayfası aynı beklentiyi
 * gösterir; hesap tek yerde. Kaynaklar ve türleri ARCHITECTURE.md §6:
 * Fed ve BoE piyasa fiyatlaması, ECB ve TCMB anket.
 */
export async function getBankExpectations(lang: Lang, now: Date): Promise<Partial<Record<BankCode, BankExpectation>>> {
  const t = L(lang);
  const [probability, expectations, rates] = await Promise.all([
    getProbabilitySnapshot(),
    getExpectations(),
    getCurrentRates(),
  ]);

  // BoE: OIS eğrisinden sıradaki MPC için fiyatlanan 25 bp adım ihtimali.
  const boeNext = expectations.boe?.meetings.find((m) => new Date(m.meetingAt) > now);
  const boeMove = boeNext && moveOdds(boeNext.changeBp);
  const boeOdds: OddsRow[] | undefined = boeMove && [
    { direction: "up", label: t("Artırım", "Hike"), pct: boeMove.direction === "hike" ? boeMove.pct : 0 },
    { direction: "flat", label: t("Sabit", "Hold"), pct: boeMove.direction === "hold" ? 100 : 100 - boeMove.pct },
    { direction: "down", label: t("İndirim", "Cut"), pct: boeMove.direction === "cut" ? boeMove.pct : 0 },
  ];

  // ECB: analist anketinin olasılık verdiği, henüz yapılmamış ilk toplantı.
  const ecbNext = expectations.ecb?.meetings.find((m) => m.odds && new Date(m.meetingAt) > now);
  const ecbOdds: OddsRow[] | undefined = ecbNext?.odds && [
    { direction: "up", label: t("Artırım", "Hike"), pct: ecbNext.odds.hike },
    { direction: "flat", label: t("Sabit", "Hold"), pct: ecbNext.odds.hold },
    { direction: "down", label: t("İndirim", "Cut"), pct: ecbNext.odds.cut },
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

  // Fed olasılıkları yalnızca Fed için — kaynağımız Fed Funds/SOFR
  // üzerinedir, diğer bankalar için karşılığı yok.
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

  const top = (rows?: OddsRow[]) => rows?.reduce((a, b) => (b.pct > a.pct ? b : a));
  const chipFrom = (row: OddsRow | undefined, suffix = ""): ExpectationChip | undefined =>
    row && { direction: row.direction, text: `${fmtPercent(row.pct, lang, 0)} ${row.label.toLocaleLowerCase(lang === "en" ? "en" : "tr")}${suffix}` };
  const tcmbCurrent = rates.find((r) => r.bankCode === "tcmb")?.rate;

  return {
    fed: {
      odds: fedOdds,
      // Toplantı bazlı değil: banka sayfasında "sıradaki toplantı"nın altında
      // durduğu için başlık bunu ayrıca söyler.
      oddsTitle: fedOdds && t("Piyasa fiyatlaması · üç aylık ortalama faiz", "Market pricing · three-month average rate"),
      oddsNote:
        window &&
        t(
          `${formatDate(window.startDate, lang)} itibarıyla başlayan üç aylık dönem için ortalama faiz`,
          `Average rate over the three-month period starting ${formatDate(window.startDate, lang)}`,
        ),
      chip: chipFrom(top(fedOdds), t(" (3 ay ort.)", " (3-month avg.)")),
    },
    ecb: {
      odds: ecbOdds,
      oddsTitle:
        ecbNext &&
        t(`Analist anketi · ${formatDate(ecbNext.meetingAt, lang)}`, `Analyst survey · ${formatDate(ecbNext.meetingAt, lang)}`),
      chip: chipFrom(top(ecbOdds)),
    },
    boe: {
      odds: boeOdds,
      oddsTitle:
        boeNext &&
        t(
          `Piyasa fiyatlaması · ${formatDate(boeNext.meetingAt, lang)} MPC`,
          `Market pricing · ${formatDate(boeNext.meetingAt, lang)} MPC`,
        ),
      oddsNote: boeOdds && t("OIS eğrisinden yaklaşık, 25 bp adım varsayımıyla", "Approximate, from the OIS curve, assuming 25 bp steps"),
      chip: chipFrom(top(boeOdds)),
    },
    tcmb: {
      surveyNote: tcmbNote,
      chip:
        tcmbNext && tcmbCurrent !== undefined
          ? {
              direction:
                tcmbNext.expectedRate > tcmbCurrent ? "up" : tcmbNext.expectedRate < tcmbCurrent ? "down" : "flat",
              text: t(`anket ${fmtPercent(tcmbNext.expectedRate, lang)}`, `survey ${fmtPercent(tcmbNext.expectedRate, lang)}`),
            }
          : undefined,
    },
  };
}
