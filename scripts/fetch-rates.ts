/**
 * Geçmiş Fed toplantılarının karar oranlarını FRED'den doldurur ve
 * data/seed/meetings.json dosyasını günceller.
 *
 *   npm run fetch:rates
 *
 * Fed hedef aralığı bir bant olduğu için üst sınır decisionRate, alt sınır
 * decisionRateLower olarak saklanır. Yeni aralık karar gününün ertesi iş günü
 * yürürlüğe girer; bu yüzden karardan sonraki değer "yeni", karardan önceki
 * değer "önceki" oran kabul edilir.
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { fetchSeries, SERIES, valueAsOf, type Observation } from "../src/lib/sources/fred";
import type { Meeting } from "../src/lib/types";

config({ path: ".env.local", quiet: true });

const SEED = path.join(process.cwd(), "data", "seed", "meetings.json");

async function main() {
  const file = JSON.parse(await readFile(SEED, "utf8")) as {
    fetchedAt: string;
    meetings: Meeting[];
  };

  const fedPast = file.meetings.filter(
    (m) => m.bankCode === "fed" && new Date(m.meetingAt) < new Date(),
  );
  if (fedPast.length === 0) {
    console.log("Doldurulacak geçmiş Fed toplantısı yok.");
    return;
  }

  const start = fedPast[0].meetingAt.slice(0, 10);
  const [upper, lower] = await Promise.all([
    fetchSeries(SERIES.targetUpper, { start }),
    fetchSeries(SERIES.targetLower, { start }),
  ]);
  console.log(`FRED: ${upper.length} üst / ${lower.length} alt sınır gözlemi`);

  let filled = 0;
  for (const m of file.meetings) {
    if (m.bankCode !== "fed") continue;
    if (new Date(m.meetingAt) >= new Date()) continue;

    const day = m.meetingAt.slice(0, 10);
    const before = dayOffset(day, -1);
    // Yeni aralık ertesi gün yürürlükte; hafta sonuna denk gelirse
    // valueAsOf en yakın önceki gözlemi bulur, bu yüzden +4 gün bakılır.
    const after = dayOffset(day, 4);

    const newUpper = valueAsOf(upper, after);
    const newLower = valueAsOf(lower, after);
    const oldUpper = valueAsOf(upper, before);

    if (newUpper === undefined || oldUpper === undefined) continue;

    m.decisionRate = newUpper;
    m.decisionRateLower = newLower;
    m.previousRate = oldUpper;
    m.status = "done";
    filled++;
  }

  await writeFile(SEED, JSON.stringify(file, null, 2) + "\n", "utf8");
  console.log(`→ ${filled} Fed toplantısına karar oranı yazıldı.`);

  // Son 6 kararı özet olarak göster — gözle doğrulama için.
  for (const m of file.meetings.filter((x) => x.bankCode === "fed" && x.decisionRate).slice(-6)) {
    const bps = Math.round(((m.decisionRate ?? 0) - (m.previousRate ?? 0)) * 100);
    console.log(
      `   ${m.meetingAt.slice(0, 10)}  ${m.decisionRateLower}-${m.decisionRate}%  ` +
        (bps === 0 ? "(değişiklik yok)" : `(${bps > 0 ? "+" : ""}${bps} bp)`),
    );
  }
}

function dayOffset(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
