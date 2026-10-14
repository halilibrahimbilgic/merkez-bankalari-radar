/**
 * Fed dışındaki bankalar için faiz beklentileri → data/seed/expectations.json
 * ve beklentilerin seyri → data/history/expectations.json
 *
 *   npm run fetch:expectations
 *
 * TCMB: Piyasa Katılımcıları Anketi (EVDS) — ekonomist beklentisi, aylık.
 *       EVDS_API_KEY gerekir; yoksa atlanır. Yayım günleri TCMB veri takviminden.
 * BoE:  BoE'nin günlük OIS forward eğrisinden türetilen piyasa fiyatlaması
 *       (src/lib/implied-path.ts), taban SONIA. Güncel Bank Rate
 *       current-rates.json'dan okunur — bu yüzden fetch:current-rates'ten
 *       SONRA çalışır.
 * ECB:  Survey of Monetary Analysts — analist anketi, yılda 8 tur, PDF.
 * Fed:  yalnızca geçmişe — NY Fed Survey of Market Expectations (toplantı
 *       bazlı; karar kartı için). Sayfadaki Fed olasılıkları ayrı
 *       (fetch:probabilities, Atlanta Fed).
 *
 * BoJ ve RBA için ücretsiz ve yayımlanabilir bir kaynak yok (ARCHITECTURE.md §6).
 *
 * Birleştirir, üzerine yazmaz: bir kaynak hata verirse önceki kaydı korunur
 * ve iş hata koduyla biter (current-rates ile aynı kural). Geçmiş yalnızca
 * büyür; aynı günün noktası yenisiyle değişir.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { impliedPath } from "../src/lib/implied-path";
import { BOE_YIELD_CURVES_URL, fetchBoeOisCurves, fetchSonia, soniaOn } from "../src/lib/sources/boe-ois";
import { fetchEcbSma, SMA_PAGE_URL, summarizeChange } from "../src/lib/sources/ecb-sma";
import { fetchSmeRound, listSmeDataFiles, SME_PAGE_URL } from "../src/lib/sources/nyfed-sme";
import { fetchText } from "../src/lib/sources/shared";
import {
  fetchPkaReleaseDates,
  fetchTcmbSurveyHistory,
  mapSurveyMeetings,
  TCMB_SURVEY_PAGE_URL,
} from "../src/lib/sources/tcmb-survey";
import { trtDayKey } from "../src/lib/time";
import type { Expectations } from "../src/lib/expectations";
import type { BankCode, Meeting } from "../src/lib/types";
import { boePoints, loadHistory, mergeBank, saveHistory, smaPoints, smePoints, tcmbPoints } from "./expectation-history";

config({ path: ".env.local", quiet: true });

const SEED = path.join(process.cwd(), "data", "seed");
const OUT = path.join(SEED, "expectations.json");

/** Geçmiş bu günden başlar — çok bankalı takvim arşivi 2026'dan. */
const HISTORY_FROM = "2026-01-01";

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path.join(SEED, file), "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function main() {
  const previous = await readJson<Expectations>("expectations.json");
  const history = await loadHistory();
  const { meetings } = (await readJson<{ meetings: Meeting[] }>("meetings.json")) ?? { meetings: [] };
  const { rates } = (await readJson<{ rates: { bankCode: BankCode; rate: number }[] }>(
    "current-rates.json",
  )) ?? { rates: [] };
  const decisions = (code: BankCode) =>
    meetings
      .filter((m) => m.bankCode === code && m.status !== "cancelled")
      .sort((a, b) => a.meetingAt.localeCompare(b.meetingAt));
  const today = trtDayKey(new Date().toISOString());

  const out: Expectations = { fetchedAt: new Date().toISOString() };
  const failed: string[] = [];

  // TCMB — anket
  const evdsKey = process.env.EVDS_API_KEY;
  if (!evdsKey) {
    console.log("–  TCMB: EVDS_API_KEY yok, atlandı");
    if (previous?.tcmb) out.tcmb = previous.tcmb;
  } else {
    try {
      const surveys = await fetchTcmbSurveyHistory(evdsKey, HISTORY_FROM);
      const survey = surveys.at(-1);
      if (!survey) throw new Error("EVDS anket: dolu ay bulunamadı");
      const mapped = mapSurveyMeetings(survey, decisions("tcmb"));
      out.tcmb = {
        kind: "survey",
        period: survey.period,
        sourceUrl: TCMB_SURVEY_PAGE_URL,
        meetings: mapped.map(({ meeting, expectedRate }) => ({
          meetingId: meeting.id,
          meetingAt: meeting.meetingAt,
          expectedRate,
        })),
        yearEnd: survey.yearEnd,
        months12: survey.months12,
        inflation12: survey.inflation12,
        inflationYearEnd: survey.inflationYearEnd,
      };
      console.log(`✓  TCMB anketi ${survey.period}: ${survey.meetings.join(" / ")}`);

      // Yayım günleri: takvim yoksa geçmişte kayıtlı gün, o da yoksa (yeni
      // ay) bugün — "ilk görüldüğü gün" güvenli bir üst sınırdır.
      let releases = new Map<string, string>();
      try {
        releases = await fetchPkaReleaseDates(Number(today.slice(0, 4)));
      } catch (err) {
        console.warn(`⚠  TCMB veri takvimi: ${(err as Error).message} — ilk görülme günü kullanılacak`);
      }
      const known = new Map<string, string>();
      for (const list of Object.values(history.banks.tcmb?.meetings ?? {})) {
        for (const p of list) if (p.round) known.set(p.round, p.date);
      }
      const n = mergeBank(
        history,
        "tcmb",
        { source: "tcmb-pka", kind: "survey", sourceUrl: TCMB_SURVEY_PAGE_URL },
        tcmbPoints(surveys, decisions("tcmb"), releases, (period) =>
          known.get(period) ?? (period === survey.period ? today : undefined),
        ),
      );
      console.log(`   geçmiş: ${n} nokta`);
    } catch (err) {
      console.error(`✗  TCMB anketi: ${(err as Error).message}`);
      failed.push("tcmb");
      if (previous?.tcmb) out.tcmb = previous.tcmb;
    }
  }

  // BoE — OIS piyasa fiyatlaması
  try {
    const current = rates.find((r) => r.bankCode === "boe")?.rate;
    if (current === undefined) throw new Error("güncel Bank Rate yok (önce fetch:current-rates)");
    const curves = await fetchBoeOisCurves();
    const curve = curves[curves.length - 1];
    const sonia = await fetchSonia(shiftDay(curves[0].date, -10));
    const overnight = soniaOn(sonia, curve.date);
    if (overnight === undefined) throw new Error(`${curve.date} için SONIA yok`);
    const path_ = impliedPath(curve, decisions("boe"), current, overnight);
    if (path_.length === 0) throw new Error("eğri tarihinden sonra MPC toplantısı yok");
    out.boe = {
      kind: "market",
      asOf: curve.date,
      sourceUrl: BOE_YIELD_CURVES_URL,
      currentRate: current,
      meetings: path_,
    };
    console.log(
      `✓  BoE OIS ${curve.date} (SONIA ${overnight}): ` +
        path_.map((m) => `${m.meetingAt.slice(0, 10)} ${m.impliedRate}`).join(", "),
    );
    const n = mergeBank(
      history,
      "boe",
      { source: "boe-ois", kind: "market", sourceUrl: BOE_YIELD_CURVES_URL },
      boePoints(curves, decisions("boe"), sonia, current),
    );
    console.log(`   geçmiş: ${curves.length} gün, ${n} nokta`);
  } catch (err) {
    console.error(`✗  BoE OIS: ${(err as Error).message}`);
    failed.push("boe");
    if (previous?.boe) out.boe = previous.boe;
  }

  // ECB — analist anketi (SMA, PDF)
  try {
    const sma = await fetchEcbSma();
    const ecbMeetings = decisions("ecb");
    const odds = [sma.firstChange, sma.secondChange];
    const meetingsOut: NonNullable<Expectations["ecb"]>["meetings"] = [];
    sma.path.forEach((row, i) => {
      // Aylık satır = o aydaki Yönetim Konseyi para politikası toplantısı.
      const m = ecbMeetings.find((x) => x.meetingAt.slice(0, 7) === row.month);
      if (!m) return;
      const bins = i < 2 ? odds[i] : undefined;
      meetingsOut.push({
        meetingId: m.id,
        meetingAt: m.meetingAt,
        median: row.median,
        p25: row.p25,
        p75: row.p75,
        odds: bins && summarizeChange(bins),
      });
    });
    if (meetingsOut.length === 0) throw new Error("anketteki aylar takvimdeki toplantılarla eşleşmedi");
    out.ecb = { kind: "survey", publishedOn: sma.publishedOn, sourceUrl: sma.sourceUrl, meetings: meetingsOut.slice(0, 8) };
    console.log(`✓  ECB SMA ${sma.publishedOn}: ${meetingsOut.slice(0, 3).map((m) => `${m.meetingAt.slice(0, 10)} ${m.median}`).join(", ")}`);
    mergeBank(history, "ecb", { source: "ecb-sma", kind: "survey", sourceUrl: SMA_PAGE_URL }, smaPoints(sma, ecbMeetings));
  } catch (err) {
    console.error(`✗  ECB SMA: ${(err as Error).message}`);
    failed.push("ecb");
    if (previous?.ecb) out.ecb = previous.ecb;
  }

  // Fed — NY Fed SME (yalnızca geçmiş). Tur başına bir kez indirilir.
  try {
    const seen = new Set(
      Object.values(history.banks.fed?.meetings ?? {}).flatMap((list) => list.map((p) => p.round)),
    );
    const files = listSmeDataFiles(await fetchText(SME_PAGE_URL)).filter((f) => f.round >= HISTORY_FROM.slice(0, 7));
    for (const f of files.slice(0, 2).filter((f) => !seen.has(f.round))) {
      const round = await fetchSmeRound(f.url, f.round);
      const n = mergeBank(
        history,
        "fed",
        { source: "nyfed-sme", kind: "survey", sourceUrl: SME_PAGE_URL },
        smePoints(round, decisions("fed")),
      );
      console.log(`✓  NY Fed SME ${round.round} (yanıtlar ${round.releaseDate}–${round.dueDate}): ${n} nokta`);
    }
  } catch (err) {
    console.error(`✗  NY Fed SME: ${(err as Error).message}`);
    failed.push("fed-sme");
  }

  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  await saveHistory(history);
  if (failed.length > 0) process.exit(1);
}

function shiftDay(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
