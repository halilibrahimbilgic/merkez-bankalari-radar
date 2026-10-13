/**
 * Beklenti geçmişini kaynakların arşivinden bir kez doldurur (ya da onarır).
 * Günlük iş (fetch:expectations) yalnızca son veriyi ekler; bu script
 * 2026 başından bugüne eksikleri kapatır. Tekrar çalıştırmak zararsızdır:
 * aynı günün noktası yenisiyle değişir.
 *
 *   npx tsx scripts/backfill-expectations.ts
 *
 * BoE: "OIS daily data_2025 to present" arşivi + bu ayın dosyası (~12 MB)
 * ECB: 2025 sonundan bu yana bütün SMA turları (PDF)
 * Fed: 2025 sonundan bu yana bütün NY Fed SME turları
 * TCMB: günlük iş zaten 2026'nın bütün aylarını her koşuda yeniden işler.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fetchBoeOisArchive, fetchBoeOisCurves, fetchSonia, BOE_YIELD_CURVES_URL } from "../src/lib/sources/boe-ois";
import { fetchSmaRound, listSmaResults, SMA_LIST_URL, SMA_PAGE_URL } from "../src/lib/sources/ecb-sma";
import { fetchSmeRound, listSmeDataFiles, SME_PAGE_URL } from "../src/lib/sources/nyfed-sme";
import { fetchText } from "../src/lib/sources/shared";
import type { BankCode, Meeting } from "../src/lib/types";
import { boePoints, loadHistory, mergeBank, saveHistory, smaPoints, smePoints } from "./expectation-history";

const FROM = "2026-01-01";
/** Yılın ilk kararlarına bilgi taşıyan turlar 2025'in son aylarında yayımlandı. */
const SURVEYS_FROM = "2025-12-01";

async function main() {
  const { meetings } = JSON.parse(
    await readFile(path.join(process.cwd(), "data", "seed", "meetings.json"), "utf8"),
  ) as { meetings: Meeting[] };
  const { rates } = JSON.parse(
    await readFile(path.join(process.cwd(), "data", "seed", "current-rates.json"), "utf8"),
  ) as { rates: { bankCode: BankCode; rate: number }[] };
  const decisions = (code: BankCode) =>
    meetings.filter((m) => m.bankCode === code && m.status !== "cancelled").sort((a, b) => a.meetingAt.localeCompare(b.meetingAt));
  const history = await loadHistory();

  // BoE
  const curves = [...(await fetchBoeOisArchive()), ...(await fetchBoeOisCurves())].filter((c) => c.date >= FROM);
  const sonia = await fetchSonia("2025-12-15");
  const boe = boePoints(curves, decisions("boe"), sonia, rates.find((r) => r.bankCode === "boe")!.rate);
  console.log(`BoE: ${curves.length} eğri günü → ${mergeBank(history, "boe", { source: "boe-ois", kind: "market", sourceUrl: BOE_YIELD_CURVES_URL }, boe)} nokta`);

  // ECB SMA
  const rounds = listSmaResults(await fetchText(SMA_LIST_URL)).filter((r) => r.publishedOn >= SURVEYS_FROM);
  for (const r of rounds.reverse()) {
    const round = await fetchSmaRound(r.url, r.publishedOn);
    const n = mergeBank(history, "ecb", { source: "ecb-sma", kind: "survey", sourceUrl: SMA_PAGE_URL }, smaPoints(round, decisions("ecb")));
    console.log(`ECB SMA ${r.publishedOn}: ${n} nokta`);
  }

  // Fed SME
  const files = listSmeDataFiles(await fetchText(SME_PAGE_URL)).filter((f) => f.round >= SURVEYS_FROM.slice(0, 7));
  for (const f of files.reverse()) {
    const round = await fetchSmeRound(f.url, f.round);
    const n = mergeBank(history, "fed", { source: "nyfed-sme", kind: "survey", sourceUrl: SME_PAGE_URL }, smePoints(round, decisions("fed")));
    console.log(`NY Fed SME ${f.round} (yanıtlar ${round.releaseDate}–${round.dueDate}): ${n} nokta`);
  }

  await saveHistory(history);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
