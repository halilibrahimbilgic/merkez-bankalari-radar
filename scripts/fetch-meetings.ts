/**
 * Fed, ECB ve TCMB resmi takvimlerini çeker, birleştirip data/seed/meetings.json
 * dosyasına yazar. DATABASE_URL tanımlıysa aynı kayıtları meetings tablosuna da
 * upsert eder.
 *
 *   npm run fetch:meetings
 */
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fetchFomcMeetings } from "../src/lib/sources/fomc";
import { fetchEcbMeetings } from "../src/lib/sources/ecb";
import { fetchTcmbMeetings } from "../src/lib/sources/tcmb";
import type { ScrapedMeeting } from "../src/lib/sources/shared";
import { meetingId } from "../src/lib/data/ids";
import type { Meeting } from "../src/lib/types";

const OUT = path.join(process.cwd(), "data", "seed", "meetings.json");

const SOURCES = [
  { name: "Fed (FOMC)", run: fetchFomcMeetings },
  { name: "ECB (Governing Council)", run: fetchEcbMeetings },
  { name: "TCMB (PPK)", run: fetchTcmbMeetings },
];

async function main() {
  const all: ScrapedMeeting[] = [];
  let failed = 0;

  for (const src of SOURCES) {
    try {
      const rows = await src.run();
      if (rows.length === 0) {
        console.warn(`⚠  ${src.name}: 0 kayıt — sayfa yapısı değişmiş olabilir`);
        failed++;
      } else {
        console.log(`✓  ${src.name}: ${rows.length} toplantı`);
      }
      all.push(...rows);
    } catch (err) {
      failed++;
      console.error(`✗  ${src.name}: ${(err as Error).message}`);
    }
  }

  if (all.length === 0) {
    console.error("Hiç veri çekilemedi; mevcut seed dosyası korunuyor.");
    process.exit(1);
  }

  const meetings: Meeting[] = all
    .map((m) => ({
      id: meetingId(m.bankCode, m.meetingAt, m.type),
      bankCode: m.bankCode,
      meetingAt: m.meetingAt,
      timeTbd: m.timeTbd,
      type: m.type,
      status: (new Date(m.meetingAt) < new Date() ? "done" : "scheduled") as
        | "done"
        | "scheduled",
      sourceUrl: m.sourceUrl,
    }))
    .sort((a, b) => a.meetingAt.localeCompare(b.meetingAt));

  // Aynı banka+an için tekrar eden kayıtları ele (kaynak sayfalarda örtüşme olabilir)
  const unique = [...new Map(meetings.map((m) => [m.id, m])).values()];

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(
    OUT,
    JSON.stringify(
      { fetchedAt: new Date().toISOString(), meetings: unique },
      null,
      2,
    ) + "\n",
    "utf8",
  );

  console.log(`\n→ ${unique.length} toplantı yazıldı: ${path.relative(process.cwd(), OUT)}`);
  if (failed > 0) console.log(`   (${failed} kaynak sorunlu — logu kontrol et)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
