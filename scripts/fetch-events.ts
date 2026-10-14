/**
 * Önümüzdeki konuşma ve yayınlar → data/seed/events.json ("Bu hafta" bölümü).
 *
 *   npm run fetch:events
 *
 * Kaynaklar: src/lib/sources/speaking-calendars.ts (Fed Yönetim Kurulu
 * takvimi, ECB Yönetim Kurulu'nun haftalık programı). Pencere: dünden üç
 * hafta sonrasına. Bir kaynak hata verirse o bankanın önceki kayıtları
 * korunur ve iş hata koduyla biter (current-rates ile aynı kural).
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fetchEcbEvents, fetchFedEvents, type CalendarEvent } from "../src/lib/sources/speaking-calendars";
import { trtDayKey } from "../src/lib/time";
import type { BankCode } from "../src/lib/types";

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

  const sources: [BankCode, () => Promise<CalendarEvent[]>][] = [
    ["fed", () => fetchFedEvents(from, to)],
    ["ecb", fetchEcbEvents],
  ];
  const events: CalendarEvent[] = [];
  let failed = 0;
  for (const [bank, fetcher] of sources) {
    try {
      const got = (await fetcher()).filter(inWindow);
      events.push(...got);
      console.log(`✓  ${bank}: ${got.length} etkinlik`);
    } catch (err) {
      console.error(`✗  ${bank}: ${(err as Error).message}`);
      events.push(...previous.filter((e) => e.bankCode === bank && inWindow(e)));
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
