/**
 * Önümüzdeki konuşma ve yayınlar → data/seed/events.json ("Bu hafta" bölümü).
 *
 *   npm run fetch:events
 *
 * Kaynaklar: src/lib/sources/speaking-calendars.ts (Fed Yönetim Kurulu
 * takvimi, ECB Yönetim Kurulu'nun haftalık programı) ve
 * release-calendars.ts (beş ekonominin TÜFE açıklama takvimi; ABD için
 * FRED_API_KEY). Pencere: dünden üç hafta sonrasına. Bir kaynak hata
 * verirse yalnızca o kaynağın önceki kayıtları korunur ve iş hata koduyla
 * biter (current-rates ile aynı kural).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import {
  fetchAuCpiReleases,
  fetchJpCpiReleases,
  fetchTrCpiReleases,
  fetchUkCpiReleases,
  fetchUsCpiReleases,
} from "../src/lib/sources/release-calendars";
import { fetchEcbEvents, fetchFedEvents, type CalendarEvent } from "../src/lib/sources/speaking-calendars";
import { trtDayKey } from "../src/lib/time";
config({ path: ".env.local", quiet: true });

const OUT = path.join(process.cwd(), "data", "seed", "events.json");

function shift(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  let previous: CalendarEvent[] = [];
  try {
    previous = (JSON.parse(await readFile(OUT, "utf8")) as { events: CalendarEvent[] }).events;
  } catch {
    // ilk koşu
  }
  const today = trtDayKey(new Date().toISOString());
  const from = shift(today, -1);
  const to = shift(today, 21);
  const inWindow = (e: CalendarEvent) => e.at.slice(0, 10) >= from && e.at.slice(0, 10) <= to;

  // [ad, getirici, önceki kayıtlardan hangileri bu kaynağın] — hata olursa
  // yalnızca o kaynağın eski kayıtları korunur.
  const cpi = (bank: string) => (e: CalendarEvent) => e.kind === "cpi" && e.bankCode === bank;
  const sources: [string, () => Promise<CalendarEvent[]>, (e: CalendarEvent) => boolean][] = [
    ["Fed takvimi", () => fetchFedEvents(from, to), (e) => e.bankCode === "fed" && e.kind !== "cpi"],
    ["ECB programı", fetchEcbEvents, (e) => e.bankCode === "ecb" && e.kind !== "cpi"],
    ["ABD TÜFE", () => fetchUsCpiReleases(from, to), cpi("fed")],
    ["Türkiye TÜFE", () => fetchTrCpiReleases(from, to), cpi("tcmb")],
    ["İngiltere TÜFE", () => fetchUkCpiReleases(from, to), cpi("boe")],
    ["Japonya TÜFE", () => fetchJpCpiReleases(from, to), cpi("boj")],
    ["Avustralya TÜFE", () => fetchAuCpiReleases(from, to), cpi("rba")],
  ];
  const events: CalendarEvent[] = [];
  let failed = 0;
  for (const [name, fetcher, mine] of sources) {
    try {
      const got = (await fetcher()).filter(inWindow);
      events.push(...got);
      console.log(`✓  ${name}: ${got.length}`);
    } catch (err) {
      console.error(`✗  ${name}: ${(err as Error).message}`);
      events.push(...previous.filter((e) => mine(e) && inWindow(e)));
      failed++;
    }
  }

  events.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  await writeFile(OUT, JSON.stringify({ fetchedAt: new Date().toISOString(), events }, null, 2) + "\n", "utf8");
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
