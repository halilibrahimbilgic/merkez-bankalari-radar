/**
 * Fed dışındaki bankalar için faiz beklentileri → data/seed/expectations.json
 *
 *   npm run fetch:expectations
 *
 * TCMB: Piyasa Katılımcıları Anketi (EVDS) — ekonomist beklentisi, aylık.
 *       EVDS_API_KEY gerekir; yoksa atlanır.
 * BoE:  BoE'nin günlük OIS forward eğrisinden türetilen piyasa fiyatlaması
 *       (src/lib/implied-path.ts). Güncel Bank Rate current-rates.json'dan
 *       okunur — bu yüzden fetch:current-rates'ten SONRA çalışır.
 *
 * ECB:  Survey of Monetary Analysts — analist anketi, yılda 8 tur, PDF.
 *
 * Fed'in olasılıkları ayrı (fetch:probabilities, Atlanta Fed). BoJ ve RBA
 * için ücretsiz ve yayımlanabilir bir kaynak yok (ARCHITECTURE.md §6).
 *
 * Birleştirir, üzerine yazmaz: bir kaynak hata verirse önceki kaydı korunur
 * ve iş hata koduyla biter (current-rates ile aynı kural).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { impliedPath } from "../src/lib/implied-path";
import { BOE_YIELD_CURVES_URL, fetchBoeOisForwards } from "../src/lib/sources/boe-ois";
import { fetchEcbSma, summarizeChange } from "../src/lib/sources/ecb-sma";
import { fetchTcmbSurvey, mapSurveyMeetings, TCMB_SURVEY_PAGE_URL } from "../src/lib/sources/tcmb-survey";
import type { Expectations } from "../src/lib/expectations";
import type { BankCode, Meeting } from "../src/lib/types";

config({ path: ".env.local", quiet: true });

const SEED = path.join(process.cwd(), "data", "seed");
const OUT = path.join(SEED, "expectations.json");

async function readJson<T>(file: string): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(path.join(SEED, file), "utf8")) as T;
  } catch {
    return undefined;
  }
}

async function main() {
  const previous = await readJson<Expectations>("expectations.json");
  const { meetings } = (await readJson<{ meetings: Meeting[] }>("meetings.json")) ?? { meetings: [] };
  const { rates } = (await readJson<{ rates: { bankCode: BankCode; rate: number }[] }>(
    "current-rates.json",
  )) ?? { rates: [] };
  const decisions = (code: BankCode) =>
    meetings
      .filter((m) => m.bankCode === code && m.status !== "cancelled")
      .sort((a, b) => a.meetingAt.localeCompare(b.meetingAt));

  const out: Expectations = { fetchedAt: new Date().toISOString() };
  const failed: string[] = [];

  // TCMB — anket
  const evdsKey = process.env.EVDS_API_KEY;
  if (!evdsKey) {
    console.log("–  TCMB: EVDS_API_KEY yok, atlandı");
    if (previous?.tcmb) out.tcmb = previous.tcmb;
  } else {
    try {
      const survey = await fetchTcmbSurvey(evdsKey);
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
      };
      console.log(`✓  TCMB anketi ${survey.period}: ${survey.meetings.join(" / ")}`);
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
    const curve = await fetchBoeOisForwards();
    const path_ = impliedPath(curve, decisions("boe"), current);
    if (path_.length === 0) throw new Error("eğri tarihinden sonra MPC toplantısı yok");
    out.boe = {
      kind: "market",
      asOf: curve.date,
      sourceUrl: BOE_YIELD_CURVES_URL,
      currentRate: current,
      meetings: path_,
    };
    console.log(
      `✓  BoE OIS ${curve.date}: ` + path_.map((m) => `${m.meetingAt.slice(0, 10)} ${m.impliedRate}`).join(", "),
    );
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
  } catch (err) {
    console.error(`✗  ECB SMA: ${(err as Error).message}`);
    failed.push("ecb");
    if (previous?.ecb) out.ecb = previous.ecb;
  }

  await writeFile(OUT, JSON.stringify(out, null, 2) + "\n", "utf8");
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
